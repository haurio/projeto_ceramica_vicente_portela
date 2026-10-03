import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Form } from 'react-bootstrap';
import AusenciasCalendar, { buildAusenciasDayMap } from '../../components/admin/ausencias/AusenciasCalendar';
import { fetchAusencias, updateAusencia } from '../../api/ausencias';
import { showToast } from '../../utils/toast';
import { formatDateBr, formatPeriodo, toIsoDate } from '../../utils/feriasUtils';
import {
    extractAusenciaYears,
    filterAusencias,
    summarizeAusencias,
    toneForAusenciaStatus,
} from '../../utils/ausenciasUtils';

const FILTERS = [
    { id: 'todos', label: 'Todos' },
    { id: 'Registrada', label: 'Registradas' },
    { id: 'Justificada', label: 'Justificadas' },
    { id: 'Não Justificada', label: 'Não justificadas' },
    { id: 'Cancelada', label: 'Canceladas' },
];

function AusenciaRow({ item, onOpen, onCancel }) {
    const tone = toneForAusenciaStatus(item.status);

    return (
        <article className={`admin-ausencias-row is-${tone}`}>
            <div className="admin-ausencias-row-body">
                <div className="admin-ausencias-row-title">
                    <strong>{item.funcionario_nome || 'Funcionário'}</strong>
                    <span className={`admin-ausencias-tag is-${tone}`}>{item.status || 'Registrada'}</span>
                </div>
                <span className="admin-ausencias-row-detail">
                    {item.tipo} · {formatPeriodo(item.data_inicio, item.data_fim)}
                    {item.comprovacao_url ? ' · com comprovante' : ''}
                    {item.ferias_id ? ' · vinculada a férias' : ''}
                </span>
            </div>
            <span className="admin-ausencias-row-metric">{item.dias || 1}d</span>
            <div className="admin-ausencias-row-actions">
                <button type="button" className="admin-ferias-action-btn" onClick={() => onOpen(item)}>
                    Abrir
                </button>
                {item.status !== 'Cancelada' && onCancel ? (
                    <button type="button" className="admin-ferias-action-btn is-danger" onClick={() => onCancel(item)}>
                        Cancelar
                    </button>
                ) : null}
            </div>
        </article>
    );
}

export default function AusenciasPage() {
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
    const [statusFilter, setStatusFilter] = useState('todos');
    const [selectedDay, setSelectedDay] = useState(toIsoDate(new Date()));
    const [cancellingId, setCancellingId] = useState(null);

    const loadAusencias = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchAusencias();
            setItems(Array.isArray(data) ? data : []);
        } catch (error) {
            showToast('error', error.message || 'Erro ao carregar ausências.');
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAusencias();
    }, [loadAusencias]);

    const years = useMemo(() => extractAusenciaYears(items), [items]);

    useEffect(() => {
        if (!years.includes(Number(selectedYear)) && years.length) {
            setSelectedYear(String(years[0]));
        }
    }, [years, selectedYear]);

    useEffect(() => {
        const year = Number(selectedYear);
        setSelectedDay((prev) => {
            const current = prev ? new Date(`${prev}T12:00:00`) : new Date();
            if (current.getFullYear() === year) return prev;
            const today = new Date();
            return today.getFullYear() === year ? toIsoDate(today) : `${year}-01-01`;
        });
    }, [selectedYear]);

    const filtered = useMemo(
        () => filterAusencias(items, { year: selectedYear, status: statusFilter }),
        [items, selectedYear, statusFilter]
    );

    const summarySource = useMemo(
        () => filterAusencias(items, { year: selectedYear }),
        [items, selectedYear]
    );
    const summary = useMemo(() => summarizeAusencias(summarySource), [summarySource]);

    const dayMap = useMemo(() => buildAusenciasDayMap(filtered), [filtered]);
    const dayEvents = dayMap.get(selectedDay) || [];

    const handleOpen = (item) => {
        navigate(`/ausencias/${item.id}/editar`);
    };

    const handleCancel = async (item) => {
        const motivo = window.prompt('Informe a justificativa do cancelamento (opcional):');
        if (motivo === null) return;

        setCancellingId(item.id);
        try {
            await updateAusencia(item.id, {
                funcionario_id: item.funcionario_id,
                tipo: item.tipo,
                data_inicio: item.data_inicio,
                data_fim: item.data_fim,
                justificativa: String(motivo).trim() || item.justificativa || 'Cancelada pelo responsável',
                status: 'Cancelada',
            });
            showToast('success', 'Ausência cancelada com sucesso.');
            await loadAusencias();
        } catch (error) {
            showToast('error', error.message || 'Erro ao cancelar ausência.');
        } finally {
            setCancellingId(null);
        }
    };

    return (
        <div className="admin-page-fill admin-ausencias-fill">
            <section className="admin-panel-card admin-page-card admin-ausencias-page">
                <div className="admin-ausencias-top">
                    <div className="admin-module-header d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
                        <h2 className="mb-0 fw-bold">
                            <i className="fas fa-calendar-times me-2" aria-hidden="true" />
                            Controle de Ausências
                        </h2>
                        <div className="admin-ferias-toolbar-actions">
                            <Form.Select
                                className="admin-ferias-year-filter"
                                value={selectedYear}
                                onChange={(event) => setSelectedYear(event.target.value)}
                                aria-label="Filtrar por ano"
                            >
                                {years.map((year) => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </Form.Select>
                            <Button variant="primary" onClick={() => navigate('/ausencias/novo')}>
                                <i className="fas fa-plus me-2" aria-hidden="true" />
                                Registrar ausência
                            </Button>
                        </div>
                    </div>

                    <div className="admin-ausencias-summary">
                        <button
                            type="button"
                            className={`admin-ausencias-summary-card is-info${statusFilter === 'Registrada' ? ' is-active' : ''}`}
                            onClick={() => setStatusFilter(statusFilter === 'Registrada' ? 'todos' : 'Registrada')}
                        >
                            <i className="fas fa-clipboard-list" aria-hidden="true" />
                            <div>
                                <strong>{loading ? '—' : summary.registradas}</strong>
                                <span>Registradas</span>
                            </div>
                        </button>
                        <button
                            type="button"
                            className={`admin-ausencias-summary-card is-success${statusFilter === 'Justificada' ? ' is-active' : ''}`}
                            onClick={() => setStatusFilter(statusFilter === 'Justificada' ? 'todos' : 'Justificada')}
                        >
                            <i className="fas fa-check-circle" aria-hidden="true" />
                            <div>
                                <strong>{loading ? '—' : summary.justificadas}</strong>
                                <span>Justificadas</span>
                            </div>
                        </button>
                        <button
                            type="button"
                            className={`admin-ausencias-summary-card is-warning${statusFilter === 'Não Justificada' ? ' is-active' : ''}`}
                            onClick={() => setStatusFilter(statusFilter === 'Não Justificada' ? 'todos' : 'Não Justificada')}
                        >
                            <i className="fas fa-exclamation-circle" aria-hidden="true" />
                            <div>
                                <strong>{loading ? '—' : summary.naoJustificadas}</strong>
                                <span>Não justificadas</span>
                            </div>
                        </button>
                        <button
                            type="button"
                            className={`admin-ausencias-summary-card is-danger${statusFilter === 'Cancelada' ? ' is-active' : ''}`}
                            onClick={() => setStatusFilter(statusFilter === 'Cancelada' ? 'todos' : 'Cancelada')}
                        >
                            <i className="fas fa-ban" aria-hidden="true" />
                            <div>
                                <strong>{loading ? '—' : summary.canceladas}</strong>
                                <span>Canceladas</span>
                            </div>
                        </button>
                    </div>

                    <div className="admin-ausencias-filters" role="tablist" aria-label="Filtrar ausências">
                        {FILTERS.map((filter) => (
                            <button
                                key={filter.id}
                                type="button"
                                role="tab"
                                aria-selected={statusFilter === filter.id}
                                className={`admin-ferias-filter-chip${statusFilter === filter.id ? ' is-active' : ''}`}
                                onClick={() => setStatusFilter(filter.id)}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <p className="text-muted mb-0">Carregando ausências...</p>
                ) : (
                    <div className="admin-ausencias-layout">
                        <aside className="admin-ausencias-side">
                            <AusenciasCalendar
                                value={selectedDay}
                                onChange={setSelectedDay}
                                dayMap={dayMap}
                                year={Number(selectedYear)}
                            />
                            <div className="admin-ausencias-day-panel">
                                <h3>{formatDateBr(selectedDay)}</h3>
                                {dayEvents.length === 0 ? (
                                    <p className="admin-ferias-empty">Nenhuma ausência neste dia.</p>
                                ) : (
                                    <ul className="admin-ausencias-day-list">
                                        {dayEvents.map((item) => (
                                            <li key={item.id}>
                                                <button type="button" onClick={() => handleOpen(item)}>
                                                    <strong>{item.funcionario_nome}</strong>
                                                    <span>{item.tipo}</span>
                                                    <span className={`admin-ausencias-tag is-${toneForAusenciaStatus(item.status)}`}>
                                                        {item.status}
                                                    </span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </aside>

                        <div className="admin-ausencias-main">
                            <section className="admin-ausencias-block">
                                <header className="admin-ausencias-block-head">
                                    <h3>Ausências em {selectedYear}</h3>
                                    <span>{filtered.length}</span>
                                </header>
                                {filtered.length === 0 ? (
                                    <p className="admin-ferias-empty">Nenhuma ausência encontrada.</p>
                                ) : (
                                    <div className="admin-ausencias-row-list">
                                        {filtered.map((item) => (
                                            <AusenciaRow
                                                key={item.id}
                                                item={item}
                                                onOpen={handleOpen}
                                                onCancel={cancellingId ? null : handleCancel}
                                            />
                                        ))}
                                    </div>
                                )}
                            </section>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}
