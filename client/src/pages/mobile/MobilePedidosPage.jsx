import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { fetchPedidos } from '../../api/pedidos';
import { formatStatusLabel, statusClass } from '../../utils/mobileStatus';
import { onPedidoUpdated } from '../../utils/syncChannel';
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

export default function MobilePedidosPage() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState('');

    const loadPedidos = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const data = await fetchPedidos();
            setItems(Array.isArray(data) ? data : []);
        } catch (error) {
            showToast('error', error.message || 'Erro ao listar pedidos.');
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadPedidos();
        const intervalId = setInterval(() => {
            loadPedidos(true);
        }, 3000);
        const unsubscribe = onPedidoUpdated(() => {
            loadPedidos(true);
        });
        return () => {
            clearInterval(intervalId);
            unsubscribe();
        };
    }, [loadPedidos]);

    const filtered = useMemo(() => {
        const term = q.trim().toLowerCase();
        if (!term) return items;
        return items.filter((item) => {
            const blob = [
                item.numero,
                item.cliente_nome,
            ].join(' ').toLowerCase();
            return blob.includes(term);
        });
    }, [items, q]);

    return (
        <div className="mobile-page is-list-page">
            <div className="mobile-list-toolbar">
                <label className="mobile-search" style={{ margin: 0, flex: 1 }}>
                    <i className="fas fa-search" aria-hidden="true" />
                    <input
                        type="search"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Buscar por número ou cliente"
                    />
                </label>
                <Link to="/mobile/pedidos/novo" className="mobile-list-add" aria-label="Novo pedido">
                    <i className="fas fa-plus"></i>
                </Link>
            </div>

            <div className="mobile-page-scroll">
            {loading && <p className="mobile-empty">Carregando pedidos...</p>}
            {!loading && !filtered.length && (
                <div className="mobile-empty">
                    <strong>Nenhum pedido encontrado</strong>
                    Crie uma pré-venda pelo botão + acima para enviar à fábrica.
                </div>
            )}

            <ul className="mobile-list">
                {filtered.map((pedido) => {
                    const status = pedido.status || pedido.situacao || '—';
                    return (
                        <li key={pedido.id}>
                            <Link to={`/mobile/pedidos/${pedido.id}`} className={`mobile-list-item ${statusClass(status)}`}>
                                <div className="mobile-list-item-main">
                                    <div className="mobile-list-item-info">
                                        <strong>{pedido.numero || `#${pedido.id}`}</strong>
                                        <span>
                                            {pedido.cliente_nome || 'Cliente'}
                                            {' · '}
                                            {formatDate(pedido.data_pedido)}
                                        </span>
                                        {pedido.motivo_cancelamento && status === 'Cancelado' && (
                                            <span style={{ color: '#9b1c1c', fontSize: '0.72rem', fontWeight: 600, display: 'block', marginTop: '0.15rem' }}>
                                                Motivo: {pedido.motivo_cancelamento}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="mobile-list-meta">
                                    <em>{money(pedido.total)}</em>
                                    <span className={`mobile-status ${statusClass(status)}`}>{formatStatusLabel(status)}</span>
                                </div>
                            </Link>
                        </li>
                    );
                })}
            </ul>
            </div>
        </div>
    );
}
