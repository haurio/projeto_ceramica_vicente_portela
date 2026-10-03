import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminDateFieldProvider, AdminDateRangeField } from '../AdminDateField';
import { fetchAuditoria } from '../../../api/config';
import { showToast } from '../../../utils/toast';

function toIso(d) {
    return d.toISOString().slice(0, 10);
}

function monthStartIso() {
    const now = new Date();
    return toIso(new Date(now.getFullYear(), now.getMonth(), 1));
}

function todayIso() {
    return toIso(new Date());
}

function formatDateTime(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString('pt-BR');
}

function initialsFromName(value) {
    const parts = String(value || '')
        .replace(/\(.*?\)/g, ' ')
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
}

const ACAO_LABEL = {
    criar: 'Criou',
    editar: 'Alterou',
    excluir: 'Excluiu',
    aprovar: 'Aprovou',
    confirmar: 'Confirmou',
    cancelar: 'Cancelou',
    entregar: 'Entregou',
};

const MODULOS = [
    { value: '', label: 'Todos' },
    { value: 'pedidos', label: 'Pedidos' },
    { value: 'formas_pagamento', label: 'Formas' },
    { value: 'clientes', label: 'Clientes' },
    { value: 'produtos', label: 'Produtos' },
    { value: 'usuarios', label: 'Usuários' },
    { value: 'nfe', label: 'NF-e' },
    { value: 'funcionarios', label: 'Funcionários' },
    { value: 'frota', label: 'Frota' },
    { value: 'estoque', label: 'Estoque' },
];

export default function AuditoriaPanel() {
    const defaults = useMemo(() => ({
        inicio: monthStartIso(),
        fim: todayIso(),
    }), []);
    const [itens, setItens] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modulo, setModulo] = useState('');
    const [busca, setBusca] = useState('');
    const [inicio, setInicio] = useState(defaults.inicio);
    const [fim, setFim] = useState(defaults.fim);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                inicio,
                fim,
                limit: 150,
            };
            if (modulo) params.modulo = modulo;
            if (busca.trim()) params.q = busca.trim();
            const data = await fetchAuditoria(params);
            setItens(Array.isArray(data) ? data : []);
        } catch (error) {
            showToast('error', error.message || 'Erro ao carregar auditoria.');
            setItens([]);
        } finally {
            setLoading(false);
        }
    }, [modulo, busca, inicio, fim]);

    useEffect(() => {
        const timer = setTimeout(() => {
            load();
        }, 250);
        return () => clearTimeout(timer);
    }, [load]);

    return (
        <AdminDateFieldProvider>
            <div className="admin-config-auditoria">
                <div className="admin-config-editor-head">
                    <div>
                        <h4>Registros</h4>
                        <p>Quem criou, alterou, excluiu ou aprovou itens no sistema.</p>
                    </div>
                </div>

                <div className="admin-auditoria-toolbar">
                    <div className="admin-auditoria-chips" role="tablist" aria-label="Filtrar módulo">
                        {MODULOS.map((item) => (
                            <button
                                key={item.value || 'all'}
                                type="button"
                                role="tab"
                                aria-selected={modulo === item.value}
                                className={`admin-chip${modulo === item.value ? ' is-active' : ''}`}
                                onClick={() => setModulo(item.value)}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>

                    <div className="admin-auditoria-filters">
                        <AdminDateRangeField
                            label="Período"
                            name="auditoria_periodo"
                            inicio={inicio}
                            fim={fim}
                            onChange={({ inicio: nextInicio, fim: nextFim }) => {
                                setInicio(nextInicio || defaults.inicio);
                                setFim(nextFim || defaults.fim);
                            }}
                        />
                        <label className="admin-auditoria-search">
                            <i className="fas fa-search" aria-hidden="true" />
                            <input
                                type="search"
                                value={busca}
                                onChange={(event) => setBusca(event.target.value)}
                                placeholder="Buscar usuário, ação..."
                            />
                        </label>
                    </div>
                </div>

                {loading ? <p className="text-muted mb-0">Carregando auditoria...</p> : null}
                {!loading && itens.length === 0 ? (
                    <p className="text-muted mb-0">Nenhum registro encontrado no período.</p>
                ) : null}

                {!loading && itens.length > 0 ? (
                    <div className="admin-auditoria-list">
                        {itens.map((item) => {
                            const dados = typeof item.dados_json === 'string'
                                ? (() => { try { return JSON.parse(item.dados_json); } catch { return null; } })()
                                : item.dados_json;
                            const usuario = item.usuario_exibicao || item.usuario || 'sistema';
                            const login = item.usuario_login || dados?._actor?.username || '';
                            return (
                                <article className="admin-auditoria-item" key={item.id}>
                                    <div className="admin-auditoria-user" title={usuario}>
                                        <span className="admin-auditoria-avatar" aria-hidden="true">
                                            {initialsFromName(usuario)}
                                        </span>
                                        <div className="admin-auditoria-user-text">
                                            <strong>{usuario}</strong>
                                            {login && !String(usuario).includes(`(${login})`) ? (
                                                <small>@{login}</small>
                                            ) : null}
                                        </div>
                                    </div>

                                    <div className="admin-auditoria-item-main">
                                        <strong>
                                            {ACAO_LABEL[item.acao] || item.acao}
                                            {item.entidade ? ` · ${item.entidade}` : ''}
                                            {item.entidade_id ? ` #${item.entidade_id}` : ''}
                                        </strong>
                                        <p>{item.descricao || '—'}</p>
                                    </div>

                                    <div className="admin-auditoria-item-meta">
                                        <span className="admin-auditoria-mod">{item.modulo}</span>
                                        <span>{formatDateTime(item.criado_em)}</span>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                ) : null}
            </div>
        </AdminDateFieldProvider>
    );
}
