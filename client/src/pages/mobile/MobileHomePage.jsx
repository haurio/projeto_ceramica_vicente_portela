import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchClientes } from '../../api/clientes';
import { fetchPedidos } from '../../api/pedidos';
import { useAuth } from '../../context/AuthContext';
import { getShortName } from '../../utils/userDisplay';
import { formatStatusLabel, statusClass } from '../../utils/mobileStatus';
import { onPedidoUpdated } from '../../utils/syncChannel';
import { showToast } from '../../utils/toast';

function money(value) {
    return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function firstName(user) {
    const raw = user?.full_name || user?.nome || user?.username || '';
    const short = getShortName(raw);
    return short.split(/\s+/)[0] || 'Representante';
}

export default function MobileHomePage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        clientes: 0,
        pedidos: 0,
        pendentes: 0,
        totalMes: 0,
    });
    const [recentes, setRecentes] = useState([]);

    const loadHomeData = (silent = false) => {
        if (!silent) setLoading(true);
        Promise.all([fetchClientes(), fetchPedidos()])
            .then(([clientes, pedidos]) => {
                const list = Array.isArray(pedidos) ? pedidos : [];
                const now = new Date();
                const mes = now.getMonth();
                const ano = now.getFullYear();
                const isCancelado = (p) => {
                    const s = String(p.status || p.situacao || '').trim().toLowerCase();
                    return s === 'cancelado';
                };
                const ativos = list.filter((p) => !isCancelado(p));
                const doMes = ativos.filter((p) => {
                    const d = String(p.data_pedido || '').slice(0, 10);
                    if (!d) return false;
                    const dt = new Date(`${d}T12:00:00`);
                    return dt.getMonth() === mes && dt.getFullYear() === ano;
                });
                const pendentes = ativos.filter((p) => {
                    const s = String(p.status || p.situacao || '');
                    return s === 'Pendente' || s === 'Rascunho' || s === 'Aguardando pagamento' || s === 'Pré-venda';
                });

                setStats({
                    clientes: Array.isArray(clientes) ? clientes.length : 0,
                    pedidos: ativos.length,
                    pendentes: pendentes.length,
                    totalMes: doMes.reduce((acc, p) => acc + Number(p.total || 0), 0),
                });
                setRecentes(list.slice(0, 5));
            })
            .catch((error) => {
                if (!silent) showToast('error', error.message || 'Erro ao carregar início.');
            })
            .finally(() => {
                if (!silent) setLoading(false);
            });
    };

    useEffect(() => {
        loadHomeData();
        const unsubscribe = onPedidoUpdated(() => {
            loadHomeData(true);
        });
        return () => {
            unsubscribe();
        };
    }, []);

    return (
        <div className="mobile-home">
            <section className="mobile-home-summary">
                <h3>Visão Geral</h3>
                <div className="mobile-home-stats">
                    {[
                        { icon: 'fa-dollar-sign', label: 'Mês Atual', value: loading ? '—' : money(stats.totalMes) },
                        { icon: 'fa-clock', label: 'Pendentes', value: loading ? '—' : stats.pendentes },
                        { icon: 'fa-box', label: 'Pedidos', value: loading ? '—' : stats.pedidos },
                        { icon: 'fa-users', label: 'Clientes', value: loading ? '—' : stats.clientes },
                    ].map(({ icon, label, value }) => (
                        <div key={label} className="mobile-home-stat">
                            <div className="mobile-home-stat-label">
                                <i className={`fas ${icon}`} aria-hidden="true" />
                                <span>{label}</span>
                            </div>
                            <strong>{value}</strong>
                        </div>
                    ))}
                </div>
            </section>

            <section className="mobile-home-recent">
                <div className="mobile-section-head">
                    <h3>Pedidos Recentes</h3>
                    <Link to="/mobile/pedidos">Ver todos</Link>
                </div>

                <div className="mobile-page-scroll">
                    {loading && <p className="mobile-empty">Carregando carteira...</p>}
                    {!loading && !recentes.length && (
                        <div className="mobile-empty">
                            <strong>Nenhum pedido ainda</strong>
                            Crie sua primeira pré-venda.
                        </div>
                    )}

                    <ul className="mobile-list">
                        {recentes.map((pedido) => {
                            const status = pedido.status || pedido.situacao || '—';
                            return (
                                <li key={pedido.id}>
                                    <Link to={`/mobile/pedidos/${pedido.id}`} className={`mobile-list-item ${statusClass(status)}`}>
                                        <div className="mobile-list-item-main">
                                            <div className="mobile-list-item-info">
                                                <strong>{pedido.numero || `#${pedido.id}`}</strong>
                                                <span>{pedido.cliente_nome || 'Cliente'}</span>
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
            </section>
        </div>
    );
}
