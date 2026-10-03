export const ADMIN_NAV = [
    { to: '/dashboard', label: 'Dashboard', icon: 'fa-th-large', end: true, section: null },

    { to: '/pedidos', label: 'Pedidos', icon: 'fa-shopping-cart', section: 'Comercial' },
    { to: '/agendamentos', label: 'Agendamentos', icon: 'fa-calendar-alt', section: 'Comercial' },
    { to: '/clientes', label: 'Clientes', icon: 'fa-user-friends', section: 'Comercial' },
    { to: '/representantes', label: 'Representantes', icon: 'fa-handshake', section: 'Comercial' },
    { to: '/frota', label: 'Frota', icon: 'fa-truck', section: 'Comercial' },

    { to: '/mobile', label: 'Acesso PWA (Mobile)', icon: 'fa-mobile-alt', section: 'Comercial' },

    { to: '/produtos', label: 'Produtos', icon: 'fa-box', section: 'Produção' },
    { to: '/estoque', label: 'Estoque', icon: 'fa-warehouse', section: 'Produção' },
    { to: '/fornecedores', label: 'Fornecedores', icon: 'fa-user-tie', section: 'Produção' },

    { to: '/funcionarios', label: 'Funcionários', icon: 'fa-users', section: 'Recursos Humanos' },
    { to: '/ferias', label: 'Férias', icon: 'fa-umbrella-beach', section: 'Recursos Humanos' },
    { to: '/ausencias', label: 'Ausências', icon: 'fa-calendar-times', section: 'Recursos Humanos' },
    { to: '/cipa', label: 'CIPA', icon: 'fa-hard-hat', section: 'Recursos Humanos' },

    { to: '/financeiro', label: 'Financeiro', icon: 'fa-wallet', section: 'Administrativo' },
    { to: '/relatorios', label: 'Relatórios', icon: 'fa-chart-bar', section: 'Administrativo' },
    { to: '/empresa', label: 'Empresa', icon: 'fa-building', section: 'Administrativo' },
    { to: '/emitir-nfe', label: 'Emitir NFe', icon: 'fa-file-invoice-dollar', section: 'Administrativo' },

    {
        to: '/configuracoes',
        label: 'Configurações',
        icon: 'fa-cog',
        section: 'Sistema',
        children: [
            {
                to: '/configuracoes/formas-pagamento',
                label: 'Formas de pagamento',
                icon: 'fa-credit-card',
                group: 'Cadastros',
            },
            {
                to: '/configuracoes/cargos',
                label: 'Cargos',
                icon: 'fa-id-badge',
                group: 'Cadastros',
            },
            {
                to: '/configuracoes/bancos',
                label: 'Bancos',
                icon: 'fa-university',
                group: 'Cadastros',
            },
            {
                to: '/configuracoes/frete-cidades',
                label: 'Custo de frete',
                icon: 'fa-truck-loading',
                group: 'Logística',
            },
            {
                to: '/configuracoes/naturezas-nfe',
                label: 'Naturezas NF-e',
                icon: 'fa-file-alt',
                group: 'Fiscal',
            },
            {
                to: '/configuracoes/nfe',
                label: 'NF-e / SEFAZ',
                icon: 'fa-file-signature',
                group: 'Fiscal',
            },
            {
                to: '/configuracoes/auditoria',
                label: 'Auditoria',
                icon: 'fa-clipboard-list',
                group: 'Sistema',
            },
            {
                to: '/configuracoes/usuarios',
                label: 'Usuários',
                icon: 'fa-user-shield',
                group: 'Sistema',
            },
        ],
    },
];

export const ADMIN_NAV_SECTIONS = [
    null,
    'Comercial',
    'Produção',
    'Recursos Humanos',
    'Administrativo',
    'Sistema',
];

export const ADMIN_READY_MODULES = new Set([
    '/dashboard',
    '/funcionarios',
    '/fornecedores',
    '/empresa',
    '/clientes',
    '/representantes',
    '/pedidos',
    '/agendamentos',
    '/emitir-nfe',
    '/produtos',
    '/estoque',
    '/frota',
    '/ferias',
    '/ausencias',
    '/cipa',
    '/financeiro',
    '/relatorios',
    '/configuracoes',
    '/configuracoes/formas-pagamento',
    '/configuracoes/cargos',
    '/configuracoes/bancos',
    '/configuracoes/frete-cidades',
    '/configuracoes/naturezas-nfe',
    '/configuracoes/nfe',
    '/configuracoes/auditoria',
    '/configuracoes/usuarios',
    '/mobile',
]);

export const USER_PERFIS = ['Administrador', 'Administrativo', 'Contabilidade', 'Gestor', 'Representante'];

export function getAdminPageAccessList() {
    return ADMIN_NAV.flatMap((item) => {
        if (Array.isArray(item.children) && item.children.length) {
            return item.children.map((child) => ({
                to: child.to,
                label: child.label,
                group: child.group || 'Configurações',
                icon: child.icon,
            }));
        }
        return [{
            to: item.to,
            label: item.label,
            group: item.section || 'Módulos',
            icon: item.icon,
        }];
    });
}

export function defaultPermissoesPorPerfil(perfil) {
    const all = getAdminPageAccessList().map((item) => item.to);
    if (perfil === 'Administrador') return all;
    if (perfil === 'Administrativo') {
        return [
            '/dashboard',
            '/clientes',
            '/representantes',
            '/fornecedores',
            '/produtos',
            '/frota',
            '/pedidos',
            '/agendamentos',
            '/emitir-nfe',
            '/funcionarios',
            '/configuracoes/formas-pagamento',
            '/configuracoes/cargos',
            '/configuracoes/bancos',
            '/configuracoes/frete-cidades',
        ];
    }
    if (perfil === 'Contabilidade') {
        return [
            '/dashboard',
            '/pedidos',
            '/emitir-nfe',
            '/financeiro',
            '/relatorios',
            '/configuracoes/formas-pagamento',
            '/configuracoes/naturezas-nfe',
            '/configuracoes/nfe',
            '/configuracoes/auditoria',
        ];
    }
    if (perfil === 'Gestor') {
        return all.filter((path) => path !== '/configuracoes/usuarios');
    }
    if (perfil === 'Representante') {
        return ['/mobile'];
    }
    return all;
}

export function userCanAccessPath(user, pathname) {
    if (!user) return false;

    const path = String(pathname || '').split('?')[0];
    if (!path) return false;

    const list = Array.isArray(user.permissoes) ? user.permissoes : [];
    const perfil = user.perfil || user.role || '';
    const effective = list.length ? list : defaultPermissoesPorPerfil(perfil);
    if (!effective.length) return false;

    if (effective.some((item) => path === item || path.startsWith(`${item}/`))) {
        return true;
    }

    if (path === '/configuracoes') {
        return effective.some((item) => String(item).startsWith('/configuracoes/'));
    }

    return false;
}

export function filterAdminNavForUser(user) {
    if (!user) return [];

    return ADMIN_NAV
        .map((item) => {
            if (Array.isArray(item.children) && item.children.length) {
                const children = item.children.filter((child) => userCanAccessPath(user, child.to));
                if (!children.length) return null;
                return { ...item, children };
            }
            return userCanAccessPath(user, item.to) ? item : null;
        })
        .filter(Boolean);
}

export function groupAdminNavBySection(items) {
    const list = Array.isArray(items) ? items : [];
    const sections = [];

    ADMIN_NAV_SECTIONS.forEach((section) => {
        const children = list.filter((item) => (item.section || null) === section);
        if (!children.length) return;
        sections.push({ section, items: children });
    });

    // Itens sem section conhecida (fallback)
    const known = new Set(ADMIN_NAV_SECTIONS);
    const orphans = list.filter((item) => !known.has(item.section || null));
    if (orphans.length) {
        sections.push({ section: 'Outros', items: orphans });
    }

    return sections;
}

export function getPageTitle(pathname = '') {
    const path = String(pathname || '').split('?')[0];
    if (!path || path === '/' || path === '/dashboard') return 'Dashboard';

    const entries = ADMIN_NAV.flatMap((item) => [item, ...(item.children || [])]);
    const exact = entries.find((item) => item.to === path);
    if (exact) return exact.label;

    const parent = entries
        .filter((item) => item.to !== '/dashboard' && path.startsWith(`${item.to}/`))
        .sort((a, b) => b.to.length - a.to.length)[0];

    const last = path.split('/').filter(Boolean).pop();
    if (parent && last === 'novo') return `${parent.label} · Novo`;
    if (parent && last === 'editar') return `${parent.label} · Editar`;
    if (parent) return parent.label;

    return 'Dashboard';
}
