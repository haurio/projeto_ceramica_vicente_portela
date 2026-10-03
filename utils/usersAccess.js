const PERFIS = ['Administrador', 'Administrativo', 'Contabilidade', 'Gestor', 'Representante'];

/** Catálogo de páginas do admin (espelha o menu). */
const PAGINAS_ACESSO = [
    { to: '/dashboard', label: 'Dashboard', group: 'Principal' },
    { to: '/funcionarios', label: 'Funcionários', group: 'Cadastros' },
    { to: '/fornecedores', label: 'Fornecedores', group: 'Cadastros' },
    { to: '/empresa', label: 'Empresa', group: 'Cadastros' },
    { to: '/clientes', label: 'Clientes', group: 'Cadastros' },
    { to: '/representantes', label: 'Representantes', group: 'Cadastros' },
    { to: '/produtos', label: 'Produtos', group: 'Cadastros' },
    { to: '/estoque', label: 'Estoque', group: 'Cadastros' },
    { to: '/frota', label: 'Frota', group: 'Cadastros' },
    { to: '/pedidos', label: 'Pedidos', group: 'Operacional' },
    { to: '/agendamentos', label: 'Agendamentos', group: 'Operacional' },
    { to: '/emitir-nfe', label: 'Emitir NFe', group: 'Fiscal' },
    { to: '/ferias', label: 'Férias', group: 'RH' },
    { to: '/ausencias', label: 'Ausências', group: 'RH' },
    { to: '/cipa', label: 'CIPA', group: 'RH' },
    { to: '/financeiro', label: 'Financeiro', group: 'Gestão' },
    { to: '/relatorios', label: 'Relatórios', group: 'Gestão' },
    { to: '/configuracoes/formas-pagamento', label: 'Formas de pagamento', group: 'Configurações' },
    { to: '/configuracoes/cargos', label: 'Cargos', group: 'Configurações' },
    { to: '/configuracoes/bancos', label: 'Bancos', group: 'Configurações' },
    { to: '/configuracoes/frete-cidades', label: 'Custo de frete', group: 'Configurações' },
    { to: '/configuracoes/naturezas-nfe', label: 'Naturezas NF-e', group: 'Configurações' },
    { to: '/configuracoes/nfe', label: 'NF-e / SEFAZ', group: 'Configurações' },
    { to: '/configuracoes/auditoria', label: 'Auditoria', group: 'Configurações' },
    { to: '/configuracoes/usuarios', label: 'Usuários', group: 'Configurações' },
    { to: '/mobile', label: 'Acesso PWA (Mobile)', group: 'Principal' },
];

const ALL_PATHS = PAGINAS_ACESSO.map((item) => item.to);

const DEFAULTS_POR_PERFIL = {
    Administrador: [...ALL_PATHS],
    Administrativo: [
        '/dashboard',
        '/clientes',
        '/representantes',
        '/fornecedores',
        '/produtos',
        '/estoque',
        '/frota',
        '/pedidos',
        '/agendamentos',
        '/emitir-nfe',
        '/funcionarios',
        '/configuracoes/formas-pagamento',
        '/configuracoes/cargos',
        '/configuracoes/bancos',
        '/configuracoes/frete-cidades',
    ],
    Contabilidade: [
        '/dashboard',
        '/pedidos',
        '/emitir-nfe',
        '/financeiro',
        '/relatorios',
        '/configuracoes/formas-pagamento',
        '/configuracoes/naturezas-nfe',
        '/configuracoes/nfe',
        '/configuracoes/auditoria',
    ],
    Gestor: [
        '/dashboard',
        '/funcionarios',
        '/fornecedores',
        '/empresa',
        '/clientes',
        '/representantes',
        '/produtos',
        '/estoque',
        '/frota',
        '/pedidos',
        '/agendamentos',
        '/emitir-nfe',
        '/ferias',
        '/ausencias',
        '/cipa',
        '/financeiro',
        '/relatorios',
        '/configuracoes/formas-pagamento',
        '/configuracoes/cargos',
        '/configuracoes/bancos',
        '/configuracoes/frete-cidades',
        '/configuracoes/naturezas-nfe',
        '/configuracoes/nfe',
        '/configuracoes/auditoria',
    ],
    // Acesso ao ERP admin fica bloqueado; o PWA usará rotas próprias depois.
    Representante: ['/mobile'],
};

function resolvePerfil(value) {
    const raw = String(value || '').trim();
    return PERFIS.includes(raw) ? raw : 'Administrador';
}

function parsePermissoes(raw) {
    let list = raw;
    if (typeof list === 'string') {
        try {
            list = JSON.parse(list);
        } catch (_error) {
            list = [];
        }
    }
    if (!Array.isArray(list)) {
        if (list && typeof list === 'object') {
            list = Object.keys(list).filter((key) => list[key]);
        } else {
            list = [];
        }
    }
    const allowed = new Set(ALL_PATHS);
    return [...new Set(list.map((item) => String(item || '').trim()).filter((item) => allowed.has(item)))];
}

function defaultPermissoes(perfil) {
    return [...(DEFAULTS_POR_PERFIL[resolvePerfil(perfil)] || ALL_PATHS)];
}

function normalizePermissoes(perfil, raw) {
    const parsed = parsePermissoes(raw);
    if (parsed.length) return parsed;
    return defaultPermissoes(resolvePerfil(perfil));
}

function mapUserRow(row) {
    const perfil = resolvePerfil(row.perfil);
    const permissoes = normalizePermissoes(perfil, row.permissoes);
    return {
        id: row.id,
        username: row.username,
        email: row.email,
        full_name: row.full_name,
        status: row.status || 'Ativo',
        perfil,
        permissoes,
        forcar_troca_senha: Boolean(row.forcar_troca_senha),
        created_at: row.created_at || null,
        updated_at: row.updated_at || null,
    };
}

function sessionUserFromRow(row) {
    const mapped = mapUserRow(row);
    return {
        id: mapped.id,
        email: mapped.email,
        username: mapped.username,
        full_name: mapped.full_name,
        status: mapped.status,
        role: mapped.perfil,
        perfil: mapped.perfil,
        permissoes: mapped.permissoes,
        must_change_password: mapped.forcar_troca_senha,
    };
}

function validateStrongPassword(password) {
    const value = String(password || '');
    if (value.length < 8) {
        return 'A senha deve ter pelo menos 8 caracteres.';
    }
    if (!/[A-Z]/.test(value)) {
        return 'A senha deve ter pelo menos uma letra maiúscula.';
    }
    if (!/[0-9]/.test(value)) {
        return 'A senha deve ter pelo menos um número.';
    }
    if (!/[^A-Za-z0-9]/.test(value)) {
        return 'A senha deve ter pelo menos um caractere especial.';
    }
    return null;
}

function pathAllowed(permissoes, pathname, perfil) {
    const path = String(pathname || '').split('?')[0];
    if (!path) return false;
    const list = parsePermissoes(permissoes);
    const effective = list.length ? list : defaultPermissoes(perfil);
    if (effective.some((item) => path === item || path.startsWith(`${item}/`))) return true;
    if (path === '/configuracoes') {
        return effective.some((item) => item.startsWith('/configuracoes/'));
    }
    return false;
}

module.exports = {
    PERFIS,
    PAGINAS_ACESSO,
    ALL_PATHS,
    resolvePerfil,
    parsePermissoes,
    defaultPermissoes,
    normalizePermissoes,
    mapUserRow,
    sessionUserFromRow,
    pathAllowed,
    validateStrongPassword,
};
