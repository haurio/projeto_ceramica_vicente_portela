import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchPedido, patchPedidoPagamentosStatus, patchPedidoStatus } from '../../api/pedidos';
import { useMobilePageHeader } from '../../context/MobileHeaderContext';
import { formatStatusLabel, statusClass } from '../../utils/mobileStatus';
import { emitPedidoUpdated, onPedidoUpdated } from '../../utils/syncChannel';
import { showToast } from '../../utils/toast';

function money(value) {
    return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(value) {
    const raw = String(value || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return '—';
    const [y, m, d] = raw.split('-');
    return `${d}/${m}/${y}`;
}

export default function MobilePedidoDetailPage() {
    const { pedidoId } = useParams();
    const navigate = useNavigate();
    const [pedido, setPedido] = useState(null);
    const [loading, setLoading] = useState(true);

    const loadPedido = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const data = await fetchPedido(pedidoId);
            setPedido(data);
        } catch (error) {
            if (!silent) {
                showToast('error', error.message || 'Erro ao carregar pedido.');
                navigate('/mobile/pedidos', { replace: true });
            }
        } finally {
            if (!silent) setLoading(false);
        }
    }, [pedidoId, navigate]);

    useEffect(() => {
        loadPedido();
        const intervalId = setInterval(() => {
            loadPedido(true);
        }, 3000);
        const unsubscribe = onPedidoUpdated((data) => {
            if (!data?.id || String(data.id) === String(pedidoId)) {
                loadPedido(true);
            }
        });
        return () => {
            clearInterval(intervalId);
            unsubscribe();
        };
    }, [loadPedido, pedidoId]);

    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [cancelMotivo, setCancelMotivo] = useState('');

    const updateStatus = async (newStatus, motivo = null) => {
        setPedido((prev) => prev ? { ...prev, status: newStatus, situacao: newStatus, motivo_cancelamento: motivo } : prev);
        try {
            await patchPedidoStatus(pedidoId, newStatus, motivo);
            emitPedidoUpdated(pedidoId, { status: newStatus, motivo_cancelamento: motivo });
            showToast('success', 'Status atualizado!');
            loadPedido(true);
        } catch (error) {
            loadPedido(true);
            showToast('error', error.message || 'Erro ao atualizar status.');
        }
    };

    const handleStatusChange = async (e) => {
        const newStatus = e.target.value;
        if (newStatus === 'Cancelado') {
            setCancelMotivo('');
            setCancelModalOpen(true);
            return;
        }
        await updateStatus(newStatus);
    };

    const handleConfirmCancel = async () => {
        const motivo = cancelMotivo.trim();
        if (!motivo) {
            showToast('error', 'Informe o motivo do cancelamento.');
            return;
        }
        setCancelModalOpen(false);
        await updateStatus('Cancelado', motivo);
    };

    const handlePaymentStatusChange = async (e) => {
        const newStatus = e.target.value;
        try {
            await patchPedidoPagamentosStatus(pedidoId, newStatus);
            emitPedidoUpdated(pedidoId, { payment_status: newStatus });
            showToast('success', 'Status de pagamento atualizado!');
            loadPedido(true);
        } catch (error) {
            loadPedido(true);
            showToast('error', error.message || 'Erro ao atualizar pagamento.');
        }
    };

    const headerTitle = pedido
        ? (pedido.numero || `Pedido #${pedido.id}`)
        : 'Pedido';

    useMobilePageHeader(loading ? 'Pedido' : headerTitle, {
        showBack: true,
        backTo: '/mobile/pedidos',
    });

    if (loading && !pedido) return <p className="mobile-empty">Carregando...</p>;
    if (!pedido) return null;

    const itens = Array.isArray(pedido.itens) ? pedido.itens : [];
    const subtotal = itens.reduce((acc, item) => acc + Number(item.subtotal || 0), 0);
    const total = Number((
        subtotal - Number(pedido.desconto || 0) + Number(pedido.frete || 0)
    ).toFixed(2));

    const statusAtual = pedido.status || pedido.situacao || '—';
    const isCancelado = statusAtual === 'Cancelado';
    const pgStatusRaw = isCancelado
        ? 'Anulado'
        : (pedido.pagamentos && pedido.pagamentos.length > 0
            ? pedido.pagamentos[0].status || 'Pendente'
            : 'Pendente');
    const pgStatus = formatStatusLabel(pgStatusRaw);

    return (
        <div className="mobile-page is-form-page">
            <div className="mobile-page-scroll">
            <section className="mobile-detail-card">
                <p><span>Cliente</span><strong>{pedido.cliente_nome || '—'}</strong></p>
                <p><span>Data</span><strong>{formatDate(pedido.data_pedido)}</strong></p>
                <p>
                    <span>Status</span>
                    <strong style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                        <span className={`mobile-status ${statusClass(statusAtual)}`}>
                            {formatStatusLabel(statusAtual)}
                        </span>
                        <select
                            value={statusAtual || 'Pendente'}
                            onChange={handleStatusChange}
                            aria-label="Alterar status"
                            style={{
                                position: 'absolute', top: 0, left: 0,
                                width: '100%', height: '100%', opacity: 0, cursor: 'pointer'
                            }}
                        >
                            <option value="Rascunho">Rascunho</option>
                            <option value="Pré-venda">Pré-venda</option>
                            <option value="Em análise">Em análise</option>
                            <option value="Pendente">Pendente</option>
                            <option value="Aguardando pagamento">Aguardando pagamento</option>
                            <option value="Aguardando carregamento">Aguardando carregamento</option>
                            <option value="Aguardando entrega">Aguardando entrega</option>
                            <option value="Confirmado">Confirmado</option>
                            <option value="Entregue">Entregue</option>
                            <option value="Cancelado">Cancelado</option>
                        </select>
                    </strong>
                </p>
                <p>
                    <span>Pagamento</span>
                    <strong style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                        <span className={`mobile-status ${statusClass(pgStatus)}`}>
                            {pgStatus}
                        </span>
                        <select
                            value={isCancelado ? 'Anulado' : (pgStatus === 'Pago' ? 'Pago' : pgStatus === 'Anulado' ? 'Anulado' : 'Pendente')}
                            onChange={handlePaymentStatusChange}
                            aria-label="Alterar status do pagamento"
                            disabled={isCancelado}
                            style={{
                                position: 'absolute', top: 0, left: 0,
                                width: '100%', height: '100%', opacity: 0, cursor: isCancelado ? 'not-allowed' : 'pointer'
                            }}
                        >
                            <option value="Pendente">Pendente</option>
                            <option value="Pago">Pago</option>
                            <option value="Anulado">Anulado</option>
                        </select>
                    </strong>
                </p>
                {pedido.motivo_cancelamento && (
                    <div style={{
                        marginTop: '0.65rem',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '12px',
                        background: 'rgba(180, 40, 40, 0.08)',
                        border: '1px solid rgba(180, 40, 40, 0.2)'
                    }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9b1c1c', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.2rem' }}>
                            <i className="fas fa-ban" /> Motivo do Cancelamento:
                        </span>
                        <p style={{ margin: 0, fontSize: '0.84rem', color: '#681818', fontWeight: 600, lineHeight: 1.35 }}>
                            {pedido.motivo_cancelamento}
                        </p>
                    </div>
                )}
                {pedido.observacoes && (
                    <p><span>Obs.</span><strong>{pedido.observacoes}</strong></p>
                )}
            </section>

            <section className="mobile-section">
                <div className="mobile-section-head">
                    <h3>Itens</h3>
                </div>
                <ul className="mobile-list">
                    {itens.map((item) => (
                        <li key={item.id || `${item.produto_id}-${item.nome}`}>
                            <div className="mobile-list-item">
                                <div>
                                    <strong>{item.produto_nome || item.nome || `Produto #${item.produto_id}`}</strong>
                                    <span>
                                        {item.quantidade} {item.unidade || 'un'} × {money(item.preco_unitario)}
                                    </span>
                                </div>
                                <div className="mobile-list-meta">
                                    <em>{money(item.subtotal)}</em>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            </section>

            <div className="mobile-total" style={{ marginTop: '16px' }}>
                <span>Total</span>
                <strong>{money(pedido.total ?? total)}</strong>
            </div>
            </div>

            {cancelModalOpen && (
                <>
                    <div className="mobile-modal-backdrop" onClick={() => setCancelModalOpen(false)} />
                    <div className="mobile-modal" role="dialog" aria-modal="true">
                        <h2 style={{ color: '#9b1c1c' }}>
                            <i className="fas fa-ban" style={{ marginRight: '0.4rem' }} />
                            Cancelar Pedido
                        </h2>
                        <p>Informe o motivo do cancelamento. O representante terá acesso a essa justificativa.</p>
                        <div style={{ marginBottom: '1rem' }}>
                            <textarea
                                rows={3}
                                value={cancelMotivo}
                                onChange={(e) => setCancelMotivo(e.target.value)}
                                placeholder="Ex: Cliente desistiu da compra, dados incorretos, etc."
                                style={{
                                    width: '100%',
                                    padding: '0.65rem 0.75rem',
                                    borderRadius: '12px',
                                    border: '1px solid var(--mobile-line)',
                                    background: '#fff',
                                    fontSize: '0.88rem',
                                    fontFamily: 'inherit',
                                    resize: 'none'
                                }}
                                autoFocus
                            />
                        </div>
                        <button
                            type="button"
                            onClick={handleConfirmCancel}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: '14px',
                                background: '#9b1c1c',
                                color: '#fff',
                                border: 'none',
                                fontWeight: 700,
                                fontSize: '0.92rem',
                                cursor: 'pointer',
                                marginBottom: '0.5rem'
                            }}
                        >
                            Confirmar Cancelamento
                        </button>
                        <button
                            type="button"
                            className="mobile-modal-cancel"
                            onClick={() => setCancelModalOpen(false)}
                        >
                            Voltar
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
