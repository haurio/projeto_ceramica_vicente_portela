import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Form } from 'react-bootstrap';
import StatusBadge from '../../components/admin/StatusBadge';
import FeriasCalendar, { buildFeriasDayMap } from '../../components/admin/ferias/FeriasCalendar';
import { fetchFeriasPanorama, updateFerias } from '../../api/ferias';
import { showRequiredFieldsToast, showToast } from '../../utils/toast';
import { formatDateBr, formatPeriodo, toIsoDate } from '../../utils/feriasUtils';

const EMPTY_PANORAMA = {
    ano: new Date().getFullYear(),
    anos: [new Date().getFullYear()],
    summary: { vencidas: 0, pendentes: 0, proximas: 0, andamento: 0, tiradas: 0 },
    vencidas: [],
    pendentes: [],
    proximas: [],
    andamento: [],
    tiradas: [],
    agendadas: [],
};

const FILTERS = [
    { id: 'todos', label: 'Todos' },
    { id: 'vencidas', label: 'Vencidas' },
    { id: 'pendentes', label: 'Não tirou' },
    { id: 'proximas', label: 'Próximas' },
    { id: 'tiradas', label: 'Já tiradas' },
];

function FeriasRow({
    item,
    tone,
    detail,
    metric,
    primaryLabel,
    onPrimary,
    onCancel,
    statusLabel,
}) {
    const badge = statusLabel || item.status || 'Pendente';

    return (
        <article className={`admin-ferias-row is-${tone}`}>
            <div className="admin-ferias-row-body">
                <div className="admin-ferias-row-title">
                    <strong>{item.funcionario_nome || 'Funcionário'}</strong>
                    <span className={`admin-ferias-tag is-${tone}${tone === 'danger' ? ' is-pulse' : ''}`}>{badge}</span>
                </div>
                <span className="admin-ferias-row-detail">{detail}</span>
            </div>
            {metric ? <span className="admin-ferias-row-metric">{metric}</span> : null}
            <div className="admin-ferias-row-actions">
                <button
                    type="button"
                    className={`admin-ferias-action-btn${tone === 'danger' || tone === 'warning' ? ' is-accent' : ''}`}
                    onClick={() => onPrimary(item)}
                >
                    {primaryLabel}
                </button>
                {!item.virtual && item.status !== 'Cancelada' && item.status !== 'Concluída' && onCancel ? (
                    <button type="button" className="admin-ferias-action-btn is-danger" onClick={() => onCancel(item)}>
                        Cancelar
                    </button>
                ) : null}
            </div>
        </article>
    );
}

function SectionBlock({ title, count, tone = 'danger', children, empty }) {
    return (
        <section className={`admin-ferias-block is-${tone}`}>
            <header className="admin-ferias-block-head">
                <h3>{title}</h3>
                <span>{count}</span>
            </header>
            {count === 0 ? <p className="admin-ferias-empty">{empty}</p> : children}
        </section>
    );
}

export default function FeriasPage() {
    const navigate = useNavigate();
    const [panorama, setPanorama] = useState(EMPTY_PANORAMA);
    const [loading, setLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
    const [statusFilter, setStatusFilter] = useState('todos');
    const [cancellingId, setCancellingId] = useState(null);
    const [selectedDay, setSelectedDay] = useState(toIsoDate(new Date()));

    const loadPanorama = useCallback(async (ano) => {
        setLoading(true);

        try {
            const data = await fetchFeriasPanorama(ano);
            setPanorama({ ...EMPTY_PANORAMA, ...data });
            if (data?.ano) {
                setSelectedYear((prev) => {
                    const next = String(data.ano);
                    return prev === next ? prev : next;
                });
            }
        } catch (error) {
            showToast('error', error.message || 'Erro ao carregar panorama de férias.');
            setPanorama(EMPTY_PANORAMA);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadPanorama(selectedYear);
    }, [loadPanorama, selectedYear]);

    useEffect(() => {
        const year = Number(selectedYear);
        setSelectedDay((prev) => {
            const current = prev ? new Date(`${prev}T12:00:00`) : new Date();
            if (current.getFullYear() === year) return prev;

            const today = new Date();
            return today.getFullYear() === year
                ? toIsoDate(today)
                : `${year}-01-01`;
        });
    }, [selectedYear]);

    const calendarItems = useMemo(() => ([
        ...(panorama.proximas || []),
        ...(panorama.andamento || []),
        ...(panorama.tiradas || []),
        ...(panorama.agendadas || []),
    ].filter((item, index, list) => {
        const id = item.ferias_id || `${item.funcionario_id}-${item.data_inicio}`;
        return list.findIndex((entry) => (entry.ferias_id || `${entry.funcionario_id}-${entry.data_inicio}`) === id) === index;
    })), [panorama]);

    const dayMap = useMemo(() => buildFeriasDayMap(calendarItems), [calendarItems]);
    const dayEvents = dayMap.get(selectedDay) || [];

    const show = (key) => statusFilter === 'todos' || statusFilter === key;

    const openSchedule = (item) => {
        const params = new URLSearchParams({
            funcionario_id: String(item.funcionario_id),
            periodo: item.periodo_aquisitivo_inicio || '',
        });
        navigate(`/ferias/novo?${params.toString()}`);
    };

    const handlePrimary = (item) => {
        if (item.virtual || !item.ferias_id) {
            openSchedule(item);
            return;
        }
        navigate(`/ferias/${item.ferias_id}/editar`);
    };

    const handleCancel = async (item) => {
        const id = item.ferias_id || item.id;
        const motivo = window.prompt('Informe o motivo do cancelamento das férias:');
        if (motivo === null) return;

        if (!String(motivo).trim()) {
            showRequiredFieldsToast();
            return;
        }

        setCancellingId(id);

        try {
            await updateFerias(id, {
                funcionario_id: item.funcionario_id,
                periodo_aquisitivo_inicio: item.periodo_aquisitivo_inicio,
                data_inicio: item.data_inicio,
                data_fim: item.data_fim,
                dias_concedidos: item.dias_concedidos || 30,
                status: 'Cancelada',
                motivo: String(motivo).trim(),
            });
            showToast('success', 'Férias canceladas com sucesso.');
            await loadPanorama(selectedYear);
        } catch (error) {
            showToast('error', error.message || 'Erro ao cancelar férias.');
        } finally {
            setCancellingId(null);
        }
    };

    return (
        <div className="admin-page-fill admin-ferias-fill">
            <section className="admin-panel-card admin-page-card admin-ferias-page">
                <div className="admin-ferias-top">
                    <div className="admin-module-header d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
                        <h2 className="mb-0 fw-bold">
                            <i className="fas fa-umbrella-beach me-2" aria-hidden="true" />
                            Controle de Férias
                        </h2>
                        <div className="admin-ferias-toolbar-actions">
                            <Form.Select
                                className="admin-ferias-year-filter"
                                value={selectedYear}
                                onChange={(event) => setSelectedYear(event.target.value)}
                                aria-label="Filtrar por ano"
                            >
                                {(panorama.anos || []).map((year) => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </Form.Select>
                            <Button variant="primary" onClick={() => navigate('/ferias/novo')}>
                                <i className="fas fa-calendar-plus me-2" aria-hidden="true" />
                                Agendar férias
                            </Button>
                        </div>
                    </div>

                    <div className="admin-ferias-summary">
                        <button
                            type="button"
                            className={`admin-ferias-summary-card is-danger${statusFilter === 'vencidas' ? ' is-active' : ''}`}
                            onClick={() => setStatusFilter(statusFilter === 'vencidas' ? 'todos' : 'vencidas')}
                        >
                            <i className="fas fa-exclamation-triangle" aria-hidden="true" />
                            <div>
                                <strong>{loading ? '—' : panorama.summary.vencidas}</strong>
                                <span>Vencidas</span>
                            </div>
                        </button>
                        <button
                            type="button"
                            className={`admin-ferias-summary-card is-warning${statusFilter === 'pendentes' ? ' is-active' : ''}`}
                            onClick={() => setStatusFilter(statusFilter === 'pendentes' ? 'todos' : 'pendentes')}
                        >
                            <i className="fas fa-hourglass-half" aria-hidden="true" />
                            <div>
                                <strong>{loading ? '—' : panorama.summary.pendentes}</strong>
                                <span>Não tirou</span>
                            </div>
                        </button>
                        <button
                            type="button"
                            className={`admin-ferias-summary-card is-info${statusFilter === 'proximas' ? ' is-active' : ''}`}
                            onClick={() => setStatusFilter(statusFilter === 'proximas' ? 'todos' : 'proximas')}
                        >
                            <i className="fas fa-plane-departure" aria-hidden="true" />
                            <div>
                                <strong>{loading ? '—' : panorama.summary.proximas}</strong>
                                <span>Próximas</span>
                            </div>
                        </button>
                        <button
                            type="button"
                            className={`admin-ferias-summary-card is-success${statusFilter === 'tiradas' ? ' is-active' : ''}`}
                            onClick={() => setStatusFilter(statusFilter === 'tiradas' ? 'todos' : 'tiradas')}
                        >
                            <i className="fas fa-check-circle" aria-hidden="true" />
                            <div>
                                <strong>{loading ? '—' : panorama.summary.tiradas}</strong>
                                <span>Tiradas</span>
                            </div>
                        </button>
                    </div>

                    <div className="admin-ferias-filters" role="tablist" aria-label="Filtrar férias">
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
                    <p className="text-muted mb-0">Carregando férias...</p>
                ) : (
                    <div className="admin-ferias-layout">
                        <aside className="admin-ferias-side">
                            <FeriasCalendar
                                value={selectedDay}
                                onChange={setSelectedDay}
                                dayMap={dayMap}
                                year={Number(selectedYear)}
                            />

                            <div className="admin-ferias-day-panel">
                                <h3>{formatDateBr(selectedDay)}</h3>
                                {dayEvents.length === 0 ? (
                                    <p className="admin-ferias-empty">Nenhuma férias marcada neste dia.</p>
                                ) : (
                                    <ul className="admin-ferias-day-list">
                                        {dayEvents.map((item) => (
                                            <li key={item.ferias_id || `${item.funcionario_id}-${item.data_inicio}`}>
                                                <button type="button" onClick={() => handlePrimary(item)}>
                                                    <strong>{item.funcionario_nome}</strong>
                                                    <span>{formatPeriodo(item.data_inicio, item.data_fim)}</span>
                                                    <StatusBadge status={item.status} />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </aside>

                        <div className="admin-ferias-main">
                            {show('vencidas') && (
                                <SectionBlock
                                    title="Vencidas"
                                    count={panorama.vencidas.length}
                                    tone="danger"
                                    empty={`Nenhuma férias vencida em ${selectedYear}.`}
                                >
                                    <div className="admin-ferias-row-list">
                                        {panorama.vencidas.map((item) => (
                                            <FeriasRow
                                                key={item.ferias_id || `v-${item.funcionario_id}-${item.periodo_aquisitivo_inicio}`}
                                                item={item}
                                                tone="danger"
                                                statusLabel="Vencida"
                                                detail={`Prazo até ${formatDateBr(item.concessivo_fim)}`}
                                                metric={`${item.dias_atrasados || 0}d atraso`}
                                                primaryLabel={item.virtual ? 'Agendar' : 'Abrir'}
                                                onPrimary={handlePrimary}
                                                onCancel={cancellingId ? null : handleCancel}
                                            />
                                        ))}
                                    </div>
                                </SectionBlock>
                            )}

                            {show('pendentes') && (
                                <SectionBlock
                                    title="Ainda não tirou"
                                    count={panorama.pendentes.length}
                                    tone="warning"
                                    empty={`Ninguém pendente em ${selectedYear}.`}
                                >
                                    <div className="admin-ferias-row-list">
                                        {panorama.pendentes.map((item) => (
                                            <FeriasRow
                                                key={`p-${item.funcionario_id}-${item.periodo_aquisitivo_inicio}`}
                                                item={item}
                                                tone="warning"
                                                statusLabel="Não tirou"
                                                detail={`Até ${formatDateBr(item.concessivo_fim)}`}
                                                metric={`${item.dias_restantes || 0}d restantes`}
                                                primaryLabel="Agendar"
                                                onPrimary={handlePrimary}
                                            />
                                        ))}
                                    </div>
                                </SectionBlock>
                            )}

                            {show('proximas') && (
                                <SectionBlock
                                    title="Próximas"
                                    count={panorama.proximas.length}
                                    tone="info"
                                    empty={`Nenhuma férias próxima em ${selectedYear}.`}
                                >
                                    <div className="admin-ferias-row-list">
                                        {panorama.proximas.map((item) => (
                                            <FeriasRow
                                                key={item.ferias_id || `n-${item.funcionario_id}-${item.data_inicio}`}
                                                item={item}
                                                tone="info"
                                                statusLabel="Próxima"
                                                detail={formatPeriodo(item.data_inicio, item.data_fim)}
                                                metric={`em ${item.dias_restantes || 0}d`}
                                                primaryLabel="Abrir"
                                                onPrimary={handlePrimary}
                                                onCancel={cancellingId ? null : handleCancel}
                                            />
                                        ))}
                                    </div>
                                </SectionBlock>
                            )}

                            {show('todos') && panorama.andamento?.length > 0 && (
                                <SectionBlock
                                    title="Em andamento"
                                    count={panorama.andamento.length}
                                    tone="info"
                                    empty=""
                                >
                                    <div className="admin-ferias-row-list">
                                        {panorama.andamento.map((item) => (
                                            <FeriasRow
                                                key={item.ferias_id}
                                                item={item}
                                                tone="info"
                                                statusLabel="Em andamento"
                                                detail={formatPeriodo(item.data_inicio, item.data_fim)}
                                                metric={`${item.dias_concedidos || 0} dias`}
                                                primaryLabel="Abrir"
                                                onPrimary={handlePrimary}
                                            />
                                        ))}
                                    </div>
                                </SectionBlock>
                            )}

                            {show('todos') && panorama.agendadas?.length > 0 && (
                                <SectionBlock
                                    title="Agendadas"
                                    count={panorama.agendadas.length}
                                    tone="planned"
                                    empty=""
                                >
                                    <div className="admin-ferias-row-list">
                                        {panorama.agendadas.map((item) => (
                                            <FeriasRow
                                                key={item.ferias_id || `a-${item.funcionario_id}-${item.data_inicio}`}
                                                item={item}
                                                tone="planned"
                                                statusLabel="Agendada"
                                                detail={formatPeriodo(item.data_inicio, item.data_fim)}
                                                metric={`${item.dias_concedidos || 0} dias`}
                                                primaryLabel="Abrir"
                                                onPrimary={handlePrimary}
                                                onCancel={cancellingId ? null : handleCancel}
                                            />
                                        ))}
                                    </div>
                                </SectionBlock>
                            )}

                            {show('tiradas') && (
                                <SectionBlock
                                    title="Já tiradas"
                                    count={panorama.tiradas.length}
                                    tone="success"
                                    empty={`Nenhuma férias concluída em ${selectedYear}.`}
                                >
                                    <div className="admin-ferias-row-list">
                                        {panorama.tiradas.map((item) => (
                                            <FeriasRow
                                                key={item.ferias_id}
                                                item={item}
                                                tone="success"
                                                statusLabel="Tirada"
                                                detail={formatPeriodo(item.data_inicio, item.data_fim)}
                                                metric={`${item.dias_concedidos || 0} dias`}
                                                primaryLabel="Abrir"
                                                onPrimary={handlePrimary}
                                            />
                                        ))}
                                    </div>
                                </SectionBlock>
                            )}
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}
