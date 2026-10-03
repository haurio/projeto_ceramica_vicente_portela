import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { Button, Col, Form, Modal, Row } from 'react-bootstrap';
import {
    fetchEstoque,
    fetchEstoqueMovimentos,
    registrarEntradaEstoque,
    registrarSaidaEstoque,
} from '../../../api/estoque';
import AdminDateField, { AdminDateFieldProvider, AdminDateRangeField } from '../AdminDateField';
import AdminFloatField from '../AdminFloatField';
import AdminModalClose from '../AdminModalClose';
import { exportEstoqueHistoricoPdf } from '../../../utils/exportEstoqueHistoricoPdf';
import { showRequiredFieldsToast, showToast } from '../../../utils/toast';

function todayIso() {
    return new Date().toISOString().slice(0, 10);
}

function formatDateBr(value) {
    if (!value) return '—';
    const raw = String(value).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return String(value);
    const [y, m, d] = raw.split('-');
    return `${d}/${m}/${y}`;
}

function formatQty(value, unidade = 'un') {
    const amount = Number(value) || 0;
    return `${amount.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ${unidade || 'un'}`;
}

function formatQtyShort(value) {
    const amount = Number(value) || 0;
    return amount.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

const TIPO_LABEL = {
    entrada: 'Entrada',
    saida: 'Saída',
    ajuste: 'Ajuste',
};

const MOTIVO_LABEL = {
    producao: 'Produção',
    ajuste_manual: 'Ajuste manual',
    perda: 'Perda',
    outro: 'Outro',
    pedido: 'Pedido',
    compra: 'Compra',
};

const SAIDA_MOTIVOS = [
    { value: 'perda', label: 'Perda' },
    { value: 'ajuste_manual', label: 'Ajuste manual' },
    { value: 'outro', label: 'Outro' },
];

function emptyLine() {
    return { produto_id: '', quantidade: '' };
}

function formatNfeLabel(item) {
    if (item.tipo === 'entrada') {
        return { text: 'Sem NF', tone: 'muted' };
    }
    if (item.nfe_numero) {
        return {
            text: `NF-e ${item.nfe_numero}`,
            tone: 'nfe',
            title: item.nfe_chave ? `Chave: ${item.nfe_chave}` : undefined,
        };
    }
    if (item.pedido_numero) {
        return { text: 'Sem NF-e', tone: 'warn', title: `Pedido ${item.pedido_numero}` };
    }
    if (item.motivo === 'pedido') {
        return { text: 'Sem NF-e', tone: 'warn' };
    }
    return { text: 'Sem NF', tone: 'muted' };
}

function StockRow({ item }) {
    const qty = Number(item.estoque) || 0;
    const tone = qty <= 0 ? 'danger' : qty < 50 ? 'warning' : 'success';

    return (
        <article className={`admin-estoque-row is-${tone}`}>
            <div className="admin-estoque-row-body">
                <div className="admin-estoque-row-title">
                    <strong>{item.nome}</strong>
                    <span className={`admin-estoque-tag is-${tone}${tone !== 'success' ? ' is-blink' : ''}`}>
                        {qty <= 0 ? 'Zerado' : qty < 50 ? 'Baixo' : 'Ok'}
                    </span>
                </div>
                <span className="admin-estoque-row-detail">
                    {item.codigo ? `${item.codigo} · ` : ''}
                    {item.categoria || 'Sem categoria'}
                    {item.ultima_data
                        ? ` · última: ${formatDateBr(item.ultima_data)}${item.ultimo_tipo ? ` (${TIPO_LABEL[item.ultimo_tipo] || item.ultimo_tipo})` : ''}`
                        : ' · sem movimentações'}
                </span>
            </div>
            <span className="admin-estoque-row-metric">
                {formatQtyShort(qty)}
                <small>{item.unidade || 'un'}</small>
            </span>
        </article>
    );
}

function HistoryRow({ item }) {
    const signed = item.tipo === 'saida'
        ? `−${formatQty(item.quantidade, item.unidade)}`
        : `+${formatQty(item.quantidade, item.unidade)}`;
    const nfe = formatNfeLabel(item);

    return (
        <article className={`admin-estoque-hist-row is-${item.tipo}`}>
            <div className="admin-estoque-hist-badge" aria-hidden="true">
                <i className={`fas ${item.tipo === 'saida' ? 'fa-arrow-down' : item.tipo === 'ajuste' ? 'fa-sliders-h' : 'fa-arrow-up'}`} />
            </div>
            <div className="admin-estoque-hist-body">
                <div className="admin-estoque-hist-title">
                    <strong>
                        {item.produto_codigo ? `${item.produto_codigo} — ` : ''}
                        {item.produto_nome}
                    </strong>
                    <span className={`admin-estoque-tipo is-${item.tipo}`}>
                        {TIPO_LABEL[item.tipo] || item.tipo}
                    </span>
                    <span
                        className={`admin-estoque-nfe is-${nfe.tone}`}
                        title={nfe.title}
                    >
                        {nfe.text}
                    </span>
                </div>
                <span className="admin-estoque-hist-detail">
                    <span className="admin-estoque-hist-date">{formatDateBr(item.data_movimento)}</span>
                    <span className="admin-estoque-hist-sep">·</span>
                    <span>{MOTIVO_LABEL[item.motivo] || item.motivo}</span>
                    {item.pedido_numero ? (
                        <>
                            <span className="admin-estoque-hist-sep">·</span>
                            <span>{item.pedido_numero}</span>
                        </>
                    ) : null}
                    {item.nfe_chave ? (
                        <>
                            <span className="admin-estoque-hist-sep">·</span>
                            <span className="admin-estoque-hist-chave" title={item.nfe_chave}>
                                Chave {String(item.nfe_chave).slice(0, 8)}…
                            </span>
                        </>
                    ) : null}
                    {item.observacao ? (
                        <>
                            <span className="admin-estoque-hist-sep">·</span>
                            <span className="admin-estoque-hist-obs">{item.observacao}</span>
                        </>
                    ) : null}
                </span>
            </div>
            <div className="admin-estoque-hist-metrics">
                <strong className={`is-${item.tipo}`}>{signed}</strong>
                <span>saldo {formatQty(item.saldo_apos, item.unidade)}</span>
            </div>
        </article>
    );
}

const EstoquePanel = forwardRef(function EstoquePanel({ active = true, mode = 'estoque' }, ref) {
    const isMovimentacoes = mode === 'movimentacoes';
    const view = isMovimentacoes ? 'historico' : 'saldos';
    const [saldos, setSaldos] = useState([]);
    const [movimentos, setMovimentos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMovimentos, setLoadingMovimentos] = useState(false);
    const [saving, setSaving] = useState(false);

    const [showProducao, setShowProducao] = useState(false);
    const [showSaida, setShowSaida] = useState(false);

    const [producaoForm, setProducaoForm] = useState({
        data_movimento: todayIso(),
        observacao: '',
        linhas: [emptyLine()],
    });
    const [producaoInvalid, setProducaoInvalid] = useState({});

    const [saidaForm, setSaidaForm] = useState({
        data_movimento: todayIso(),
        motivo: 'perda',
        observacao: '',
        produto_id: '',
        quantidade: '',
    });
    const [saidaInvalid, setSaidaInvalid] = useState({});

    const [histFilters, setHistFilters] = useState({
        produto_id: '',
        tipo: '',
        de: '',
        ate: '',
    });

    const produtoOptions = useMemo(
        () => saldos.map((item) => ({
            id: String(item.produto_id),
            label: item.codigo ? `${item.codigo} — ${item.nome}` : item.nome,
            unidade: item.unidade,
            estoque: item.estoque,
        })),
        [saldos]
    );

    const summary = useMemo(() => {
        const totalProdutos = saldos.length;
        const totalUnidades = saldos.reduce((acc, item) => acc + (Number(item.estoque) || 0), 0);
        const zerados = saldos.filter((item) => (Number(item.estoque) || 0) <= 0).length;
        const baixos = saldos.filter((item) => {
            const qty = Number(item.estoque) || 0;
            return qty > 0 && qty < 50;
        }).length;
        return { totalProdutos, totalUnidades, zerados, baixos };
    }, [saldos]);

    const loadSaldos = async () => {
        setLoading(true);
        try {
            const data = await fetchEstoque();
            setSaldos(Array.isArray(data) ? data : []);
        } catch (error) {
            showToast('error', error.message || 'Erro ao carregar estoque.');
            setSaldos([]);
        } finally {
            setLoading(false);
        }
    };

    const loadMovimentos = async (filters = histFilters) => {
        setLoadingMovimentos(true);
        try {
            const data = await fetchEstoqueMovimentos(filters);
            setMovimentos(Array.isArray(data) ? data : []);
        } catch (error) {
            showToast('error', error.message || 'Erro ao carregar histórico.');
            setMovimentos([]);
        } finally {
            setLoadingMovimentos(false);
        }
    };

    useEffect(() => {
        if (!active) return;
        loadSaldos();
    }, [active, isMovimentacoes]);

    useEffect(() => {
        if (!active || view !== 'historico') return undefined;

        const timer = window.setTimeout(() => {
            loadMovimentos(histFilters);
        }, 250);

        return () => window.clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active, view, histFilters.produto_id, histFilters.tipo, histFilters.de, histFilters.ate]);

    const openProducao = () => {
        setProducaoForm({
            data_movimento: todayIso(),
            observacao: '',
            linhas: [emptyLine()],
        });
        setProducaoInvalid({});
        setShowProducao(true);
    };

    const openSaida = () => {
        setSaidaForm({
            data_movimento: todayIso(),
            motivo: 'perda',
            observacao: '',
            produto_id: '',
            quantidade: '',
        });
        setSaidaInvalid({});
        setShowSaida(true);
    };

    useImperativeHandle(ref, () => ({
        openProducao,
        openSaida,
    }));

    const updateLinha = (index, field, value) => {
        setProducaoForm((current) => {
            const linhas = current.linhas.map((linha, i) => (
                i === index ? { ...linha, [field]: value } : linha
            ));
            return { ...current, linhas };
        });
        setProducaoInvalid((current) => {
            const next = { ...current };
            delete next[`linha_${index}_${field}`];
            delete next.linhas;
            return next;
        });
    };

    const addLinha = () => {
        setProducaoForm((current) => ({
            ...current,
            linhas: [...current.linhas, emptyLine()],
        }));
    };

    const removeLinha = (index) => {
        setProducaoForm((current) => ({
            ...current,
            linhas: current.linhas.length <= 1
                ? [emptyLine()]
                : current.linhas.filter((_, i) => i !== index),
        }));
    };

    const handleProducaoSubmit = async (event) => {
        event.preventDefault();

        const nextInvalid = {};
        if (!producaoForm.data_movimento) nextInvalid.data_movimento = true;

        const itens = [];
        producaoForm.linhas.forEach((linha, index) => {
            if (!linha.produto_id) nextInvalid[`linha_${index}_produto_id`] = true;
            if (!linha.quantidade || Number(linha.quantidade) <= 0) {
                nextInvalid[`linha_${index}_quantidade`] = true;
            }
            if (linha.produto_id && Number(linha.quantidade) > 0) {
                itens.push({
                    produto_id: Number(linha.produto_id),
                    quantidade: Number(linha.quantidade),
                });
            }
        });

        if (!itens.length) nextInvalid.linhas = true;
        setProducaoInvalid(nextInvalid);

        if (Object.keys(nextInvalid).length > 0) {
            showRequiredFieldsToast();
            return;
        }

        setSaving(true);
        try {
            await registrarEntradaEstoque({
                data_movimento: producaoForm.data_movimento,
                motivo: 'producao',
                observacao: producaoForm.observacao.trim() || null,
                itens,
            });
            showToast('success', 'Produção do dia registrada com sucesso.');
            setShowProducao(false);
            await loadSaldos();
            if (view === 'historico') await loadMovimentos();
        } catch (error) {
            showToast('error', error.message || 'Erro ao registrar produção.');
        } finally {
            setSaving(false);
        }
    };

    const handleSaidaSubmit = async (event) => {
        event.preventDefault();

        const nextInvalid = {};
        if (!saidaForm.data_movimento) nextInvalid.data_movimento = true;
        if (!saidaForm.produto_id) nextInvalid.produto_id = true;
        if (!saidaForm.quantidade || Number(saidaForm.quantidade) <= 0) nextInvalid.quantidade = true;
        if (!saidaForm.motivo) nextInvalid.motivo = true;

        setSaidaInvalid(nextInvalid);

        if (Object.keys(nextInvalid).length > 0) {
            showRequiredFieldsToast();
            return;
        }

        setSaving(true);
        try {
            await registrarSaidaEstoque({
                data_movimento: saidaForm.data_movimento,
                motivo: saidaForm.motivo,
                observacao: saidaForm.observacao.trim() || null,
                itens: [{
                    produto_id: Number(saidaForm.produto_id),
                    quantidade: Number(saidaForm.quantidade),
                }],
            });
            showToast('success', 'Saída de estoque registrada com sucesso.');
            setShowSaida(false);
            await loadSaldos();
            if (view === 'historico') await loadMovimentos();
        } catch (error) {
            showToast('error', error.message || 'Erro ao registrar saída.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <AdminDateFieldProvider>
            <div className={`admin-estoque-panel${isMovimentacoes ? ' is-movimentacoes' : ''}`}>
                {!isMovimentacoes ? (
                    <div className="admin-estoque-summary">
                        <div className="admin-estoque-summary-card is-info">
                            <i className="fas fa-boxes" aria-hidden="true" />
                            <strong>{loading ? '—' : summary.totalProdutos}</strong>
                            <span>Produtos ativos</span>
                        </div>
                        <div className="admin-estoque-summary-card is-success">
                            <i className="fas fa-cubes" aria-hidden="true" />
                            <strong>{loading ? '—' : formatQtyShort(summary.totalUnidades)}</strong>
                            <span>Unidades em estoque</span>
                        </div>
                        <div className="admin-estoque-summary-card is-warning">
                            <i className="fas fa-exclamation-triangle" aria-hidden="true" />
                            <strong>{loading ? '—' : summary.baixos}</strong>
                            <span>Estoque baixo</span>
                        </div>
                        <div className="admin-estoque-summary-card is-danger">
                            <i className="fas fa-ban" aria-hidden="true" />
                            <strong>{loading ? '—' : summary.zerados}</strong>
                            <span>Zerados</span>
                        </div>
                    </div>
                ) : null}

                {isMovimentacoes ? (
                    <div className="admin-estoque-toolbar">
                        <p className="admin-estoque-mov-lead">
                            Entradas de produção não usam NF. Saídas de pedido exibem a NF-e quando houver emissão.
                        </p>
                        <Button
                            type="button"
                            variant="outline-danger"
                            className="admin-estoque-export-btn"
                            disabled={loadingMovimentos || movimentos.length === 0}
                            onClick={async () => {
                                try {
                                    const produtoLabel = histFilters.produto_id
                                        ? (produtoOptions.find((item) => item.id === histFilters.produto_id)?.label || '')
                                        : '';
                                    await exportEstoqueHistoricoPdf(movimentos, {
                                        ...histFilters,
                                        produtoLabel,
                                    });
                                    showToast('success', 'PDF do histórico gerado.');
                                } catch (error) {
                                    showToast('error', error.message || 'Erro ao exportar PDF.');
                                }
                            }}
                        >
                            <i className="fas fa-file-pdf me-2" aria-hidden="true" />
                            Exportar PDF
                        </Button>
                    </div>
                ) : null}

                {!isMovimentacoes ? (
                    <section className="admin-estoque-block">
                        <header className="admin-estoque-block-head">
                            <h3>Saldos atuais</h3>
                            <span>{loading ? '—' : saldos.length}</span>
                        </header>
                        {loading ? (
                            <p className="admin-estoque-empty">Carregando estoque...</p>
                        ) : saldos.length === 0 ? (
                            <p className="admin-estoque-empty">Nenhum produto ativo encontrado.</p>
                        ) : (
                            <div className="admin-estoque-list">
                                {saldos.map((item) => (
                                    <StockRow key={item.produto_id} item={item} />
                                ))}
                            </div>
                        )}
                    </section>
                ) : (
                    <section className="admin-estoque-block">
                        <header className="admin-estoque-block-head">
                            <h3>{isMovimentacoes ? 'Movimentações de entrada e saída' : 'Histórico de movimentações'}</h3>
                            <span>{loadingMovimentos ? '—' : movimentos.length}</span>
                        </header>

                        <Form
                            className="admin-estoque-hist-filters"
                            onSubmit={(event) => event.preventDefault()}
                        >
                            <div className="admin-estoque-hist-filters-grid">
                                <AdminFloatField
                                    as="select"
                                    label="Produto"
                                    name="produto_id"
                                    value={histFilters.produto_id}
                                    onChange={(event) => setHistFilters((current) => ({
                                        ...current,
                                        produto_id: event.target.value,
                                    }))}
                                >
                                    <option value="">Todos</option>
                                    {produtoOptions.map((item) => (
                                        <option key={item.id} value={item.id}>{item.label}</option>
                                    ))}
                                </AdminFloatField>

                                <AdminFloatField
                                    as="select"
                                    label="Tipo"
                                    name="tipo"
                                    value={histFilters.tipo}
                                    onChange={(event) => setHistFilters((current) => ({
                                        ...current,
                                        tipo: event.target.value,
                                    }))}
                                >
                                    <option value="">Todos</option>
                                    <option value="entrada">Entrada</option>
                                    <option value="saida">Saída</option>
                                    <option value="ajuste">Ajuste</option>
                                </AdminFloatField>

                                <AdminDateRangeField
                                    label="Período"
                                    name="periodo"
                                    inicio={histFilters.de}
                                    fim={histFilters.ate}
                                    onChange={({ inicio, fim }) => setHistFilters((current) => ({
                                        ...current,
                                        de: inicio || '',
                                        ate: fim || '',
                                    }))}
                                />

                                <div className="admin-estoque-hist-filter-actions">
                                    <Button
                                        type="button"
                                        variant="primary"
                                        className="admin-estoque-hist-clear-btn"
                                        disabled={loadingMovimentos || (
                                            !histFilters.produto_id
                                            && !histFilters.tipo
                                            && !histFilters.de
                                            && !histFilters.ate
                                        )}
                                        onClick={() => setHistFilters({
                                            produto_id: '',
                                            tipo: '',
                                            de: '',
                                            ate: '',
                                        })}
                                    >
                                        <i className="fas fa-eraser me-2" aria-hidden="true" />
                                        Limpar campos
                                    </Button>
                                </div>
                            </div>
                        </Form>

                        {loadingMovimentos ? (
                            <p className="admin-estoque-empty">Carregando histórico...</p>
                        ) : movimentos.length === 0 ? (
                            <p className="admin-estoque-empty">Nenhuma movimentação encontrada.</p>
                        ) : (
                            <div className="admin-estoque-hist-scroll">
                                <div className="admin-estoque-hist-list">
                                    {movimentos.map((item) => (
                                        <HistoryRow key={item.id} item={item} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>
                )}

                <Modal
                    show={showProducao}
                    onHide={() => !saving && setShowProducao(false)}
                    centered
                    size="lg"
                    backdrop="static"
                    className="admin-estoque-modal"
                >
                    <Form noValidate onSubmit={handleProducaoSubmit} className="admin-estoque-modal-form admin-funcionario-form">
                        <Modal.Header>
                            <Modal.Title>
                                <i className="fas fa-industry me-2" aria-hidden="true" />
                                Produção do dia
                            </Modal.Title>
                            <AdminModalClose onClick={() => setShowProducao(false)} disabled={saving} />
                        </Modal.Header>
                        <Modal.Body>
                            <p className="admin-estoque-modal-lead">
                                Lance a produção de um ou mais produtos. O saldo é atualizado na hora.
                            </p>

                            <div className="admin-estoque-modal-section">
                                <h4>Dados gerais</h4>
                                <Row className="g-3">
                                    <Col md={4}>
                                        <AdminDateField
                                            label="Data da produção"
                                            name="data_movimento"
                                            value={producaoForm.data_movimento}
                                            onChange={(event) => {
                                                setProducaoForm((current) => ({
                                                    ...current,
                                                    data_movimento: event.target.value,
                                                }));
                                                setProducaoInvalid((current) => {
                                                    const next = { ...current };
                                                    delete next.data_movimento;
                                                    return next;
                                                });
                                            }}
                                            required
                                            isInvalid={Boolean(producaoInvalid.data_movimento)}
                                        />
                                    </Col>
                                    <Col md={8}>
                                        <AdminFloatField
                                            label="Observação (opcional)"
                                            name="observacao"
                                            value={producaoForm.observacao}
                                            onChange={(event) => setProducaoForm((current) => ({
                                                ...current,
                                                observacao: event.target.value,
                                            }))}
                                        />
                                    </Col>
                                </Row>
                            </div>

                            <div className="admin-estoque-modal-section">
                                <div className="admin-estoque-modal-section-head">
                                    <h4>Produtos produzidos</h4>
                                    <button type="button" className="admin-estoque-link-btn" onClick={addLinha} disabled={saving}>
                                        <i className="fas fa-plus" aria-hidden="true" />
                                        Adicionar linha
                                    </button>
                                </div>

                                <div className="admin-estoque-prod-lines">
                                    {producaoForm.linhas.map((linha, index) => (
                                        <div className="admin-estoque-prod-line" key={`prod-line-${index}`}>
                                            <span className="admin-estoque-prod-line-index">{index + 1}</span>
                                            <div className="admin-estoque-prod-line-fields">
                                                <AdminFloatField
                                                    as="select"
                                                    label="Produto"
                                                    name={`produto_${index}`}
                                                    value={linha.produto_id}
                                                    onChange={(event) => updateLinha(index, 'produto_id', event.target.value)}
                                                    required
                                                    isInvalid={Boolean(producaoInvalid[`linha_${index}_produto_id`])}
                                                >
                                                    <option value="">Selecione</option>
                                                    {produtoOptions.map((item) => (
                                                        <option key={item.id} value={item.id}>{item.label}</option>
                                                    ))}
                                                </AdminFloatField>
                                                <AdminFloatField
                                                    label="Quantidade"
                                                    name={`quantidade_${index}`}
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={linha.quantidade}
                                                    onChange={(event) => updateLinha(index, 'quantidade', event.target.value)}
                                                    required
                                                    isInvalid={Boolean(producaoInvalid[`linha_${index}_quantidade`])}
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                className="admin-estoque-prod-line-remove"
                                                disabled={saving || producaoForm.linhas.length <= 1}
                                                onClick={() => removeLinha(index)}
                                                aria-label="Remover linha"
                                                title="Remover"
                                            >
                                                <i className="fas fa-trash-alt" aria-hidden="true" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Modal.Body>
                        <Modal.Footer>
                            <Button type="button" variant="outline-secondary" disabled={saving} onClick={() => setShowProducao(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" variant="primary" disabled={saving}>
                                {saving ? 'Salvando...' : 'Registrar produção'}
                            </Button>
                        </Modal.Footer>
                    </Form>
                </Modal>

                <Modal
                    show={showSaida}
                    onHide={() => !saving && setShowSaida(false)}
                    centered
                    backdrop="static"
                    className="admin-estoque-modal"
                >
                    <Form noValidate onSubmit={handleSaidaSubmit} className="admin-estoque-modal-form admin-funcionario-form">
                        <Modal.Header>
                            <Modal.Title>
                                <i className="fas fa-minus-circle me-2" aria-hidden="true" />
                                Registrar saída
                            </Modal.Title>
                            <AdminModalClose onClick={() => setShowSaida(false)} disabled={saving} />
                        </Modal.Header>
                        <Modal.Body>
                            <p className="admin-estoque-modal-lead">
                                Baixe estoque por perda, ajuste ou outro motivo. Não permite saldo negativo.
                            </p>

                            <div className="admin-estoque-modal-section">
                                <h4>Movimentação</h4>
                                <Row className="g-3">
                                    <Col md={6}>
                                        <AdminDateField
                                            label="Data"
                                            name="data_movimento"
                                            value={saidaForm.data_movimento}
                                            onChange={(event) => {
                                                setSaidaForm((current) => ({
                                                    ...current,
                                                    data_movimento: event.target.value,
                                                }));
                                                setSaidaInvalid((current) => {
                                                    const next = { ...current };
                                                    delete next.data_movimento;
                                                    return next;
                                                });
                                            }}
                                            required
                                            isInvalid={Boolean(saidaInvalid.data_movimento)}
                                        />
                                    </Col>
                                    <Col md={6}>
                                        <AdminFloatField
                                            as="select"
                                            label="Motivo"
                                            name="motivo"
                                            value={saidaForm.motivo}
                                            onChange={(event) => {
                                                setSaidaForm((current) => ({
                                                    ...current,
                                                    motivo: event.target.value,
                                                }));
                                                setSaidaInvalid((current) => {
                                                    const next = { ...current };
                                                    delete next.motivo;
                                                    return next;
                                                });
                                            }}
                                            required
                                            isInvalid={Boolean(saidaInvalid.motivo)}
                                        >
                                            {SAIDA_MOTIVOS.map((item) => (
                                                <option key={item.value} value={item.value}>{item.label}</option>
                                            ))}
                                        </AdminFloatField>
                                    </Col>
                                    <Col md={12}>
                                        <AdminFloatField
                                            as="select"
                                            label="Produto"
                                            name="produto_id"
                                            value={saidaForm.produto_id}
                                            onChange={(event) => {
                                                setSaidaForm((current) => ({
                                                    ...current,
                                                    produto_id: event.target.value,
                                                }));
                                                setSaidaInvalid((current) => {
                                                    const next = { ...current };
                                                    delete next.produto_id;
                                                    return next;
                                                });
                                            }}
                                            required
                                            isInvalid={Boolean(saidaInvalid.produto_id)}
                                        >
                                            <option value="">Selecione</option>
                                            {produtoOptions.map((item) => (
                                                <option key={item.id} value={item.id}>
                                                    {item.label} (saldo: {formatQty(item.estoque, item.unidade)})
                                                </option>
                                            ))}
                                        </AdminFloatField>
                                    </Col>
                                    <Col md={6}>
                                        <AdminFloatField
                                            label="Quantidade"
                                            name="quantidade"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={saidaForm.quantidade}
                                            onChange={(event) => {
                                                setSaidaForm((current) => ({
                                                    ...current,
                                                    quantidade: event.target.value,
                                                }));
                                                setSaidaInvalid((current) => {
                                                    const next = { ...current };
                                                    delete next.quantidade;
                                                    return next;
                                                });
                                            }}
                                            required
                                            isInvalid={Boolean(saidaInvalid.quantidade)}
                                        />
                                    </Col>
                                    <Col md={6}>
                                        <AdminFloatField
                                            label="Observação (opcional)"
                                            name="observacao"
                                            value={saidaForm.observacao}
                                            onChange={(event) => setSaidaForm((current) => ({
                                                ...current,
                                                observacao: event.target.value,
                                            }))}
                                        />
                                    </Col>
                                </Row>
                            </div>
                        </Modal.Body>
                        <Modal.Footer>
                            <Button type="button" variant="outline-secondary" disabled={saving} onClick={() => setShowSaida(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" variant="danger" disabled={saving}>
                                {saving ? 'Salvando...' : 'Registrar saída'}
                            </Button>
                        </Modal.Footer>
                    </Form>
                </Modal>
            </div>
        </AdminDateFieldProvider>
    );
});

export default EstoquePanel;
