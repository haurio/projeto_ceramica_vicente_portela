import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchClientes } from '../../api/clientes';
import { formatStatusLabel, isCreditBlocked, statusClass } from '../../utils/mobileStatus';
import { onClienteUpdated } from '../../utils/syncChannel';
import { showToast } from '../../utils/toast';

function creditLabel(status) {
    const raw = String(status || '').trim();
    return formatStatusLabel(raw || 'Pendente');
}

export default function MobileClientesPage() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState('');

    const loadClientes = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const data = await fetchClientes();
            setItems(Array.isArray(data) ? data : []);
        } catch (error) {
            if (!silent) showToast('error', error.message || 'Erro ao listar clientes.');
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadClientes();
        const intervalId = setInterval(() => {
            loadClientes(true);
        }, 4000);
        const unsubscribe = onClienteUpdated(() => {
            loadClientes(true);
        });
        return () => {
            clearInterval(intervalId);
            unsubscribe();
        };
    }, [loadClientes]);

    const filtered = useMemo(() => {
        const term = q.trim().toLowerCase();
        if (!term) return items;
        return items.filter((item) => {
            const blob = [
                item.nome_razao_social,
                item.cidade,
                item.estado,
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
                        placeholder="Buscar por nome ou cidade"
                    />
                </label>
                <Link to="/mobile/clientes/novo" className="mobile-list-add" aria-label="Novo cliente">
                    <i className="fas fa-plus"></i>
                </Link>
            </div>

            <div className="mobile-page-scroll">
                {loading && <p className="mobile-empty">Carregando clientes...</p>}
                {!loading && !filtered.length && (
                    <div className="mobile-empty">
                        <strong>Nenhum cliente encontrado</strong>
                        Cadastre um novo cliente no botão + acima.
                    </div>
                )}

                <ul className="mobile-list">
                {filtered.map((cliente) => {
                    const credito = creditLabel(cliente.status_credito);
                    const blocked = isCreditBlocked(cliente.status_credito);
                    const cardClass = `mobile-list-item mobile-client-card${blocked ? ' is-blocked' : ''}`;
                    const body = (
                        <>
                            <span className={`mobile-status mobile-credit-status ${statusClass(credito)}`}>
                                <i className="fas fa-credit-card" aria-hidden="true" />
                                {' '}{credito}
                            </span>
                            <div className="mobile-list-item-main">
                                <div className="mobile-list-item-info">
                                    <span className="mobile-client-line mobile-client-name">
                                        <i className="fas fa-user" aria-hidden="true" />
                                        <strong>{cliente.nome_razao_social}</strong>
                                    </span>
                                    <span className="mobile-client-line">
                                        <i className="fas fa-map-marker-alt" aria-hidden="true" />
                                        {[cliente.cidade, cliente.estado].filter(Boolean).join(' / ') || 'Sem cidade'}
                                    </span>
                                    {cliente.telefone_principal ? (
                                        <span className="mobile-client-line">
                                            <i className="fas fa-phone-alt" aria-hidden="true" />
                                            {cliente.telefone_principal}
                                        </span>
                                    ) : null}
                                </div>
                            </div>
                        </>
                    );
                    return (
                        <li key={cliente.id}>
                            {blocked ? (
                                <div
                                    className={cardClass}
                                    role="note"
                                    onClick={() => showToast('warning', 'Crédito bloqueado. Não é possível abrir o cadastro nem criar pedido.')}
                                >
                                    {body}
                                </div>
                            ) : (
                                <Link to={`/mobile/clientes/${cliente.id}/editar`} className={cardClass}>
                                    {body}
                                </Link>
                            )}
                        </li>
                    );
                })}
            </ul>
            </div>
        </div>
    );
}
