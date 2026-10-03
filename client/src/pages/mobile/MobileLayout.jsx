import { useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { MobileHeaderProvider, useMobileHeaderState } from '../../context/MobileHeaderContext';
import { useAuth } from '../../context/AuthContext';

function resolveRouteHeader(pathname) {
    if (pathname === '/mobile' || pathname === '/mobile/') {
        return { title: null, showBack: false };
    }
    if (pathname === '/mobile/clientes/novo') {
        return { title: 'Novo Cliente', subtitle: 'Adicionar cadastro', showBack: true, backTo: '/mobile/clientes' };
    }
    if (/^\/mobile\/clientes\/[^/]+\/editar$/.test(pathname)) {
        return { title: 'Editar Cliente', subtitle: 'Atualizar cadastro', showBack: true, backTo: '/mobile/clientes' };
    }
    if (pathname === '/mobile/pedidos/novo') {
        return { title: 'Novo Pedido', subtitle: 'Criar pré-venda', showBack: true, backTo: '/mobile/pedidos' };
    }
    if (pathname === '/mobile/clientes') {
        return { title: 'Clientes', subtitle: 'Carteira de contatos', showBack: false };
    }
    if (pathname === '/mobile/pedidos') {
        return { title: 'Pedidos', subtitle: 'Histórico de vendas', showBack: false };
    }
    if (/^\/mobile\/pedidos\/[^/]+$/.test(pathname)) {
        return { title: 'Detalhes do Pedido', subtitle: 'Visualizar', showBack: true, backTo: '/mobile/pedidos' };
    }
    return null;
}

function MobileShell() {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const headerState = useMobileHeaderState();
    const [showCreateMenu, setShowCreateMenu] = useState(false);

    const routeHeader = useMemo(
        () => resolveRouteHeader(location.pathname),
        [location.pathname]
    );
    const pageHeader = headerState?.pageHeader || routeHeader;

    const handleLogout = async () => {
        await logout();
        navigate('/mobile/login', { replace: true });
    };

    const handleBack = () => {
        if (pageHeader?.backTo) {
            navigate(pageHeader.backTo);
            return;
        }
        navigate(-1);
    };

    const goCreate = (to) => {
        navigate(to);
    };

    const firstName = (user) => {
        const raw = user?.full_name || user?.nome || user?.username || '';
        return raw.split(/\s+/)[0] || 'Representante';
    };

    return (
        <div className="mobile-app">
            <header className="mobile-app-header">
                <div className="mobile-app-header-left" style={{ flex: 1, display: 'flex', width: '100%' }}>
                    {pageHeader?.showBack && (
                        <button
                            type="button"
                            className="mobile-app-back"
                            onClick={handleBack}
                            aria-label="Voltar"
                        >
                            <i className="fas fa-arrow-left" aria-hidden="true" />
                        </button>
                    )}
                    <div className="mobile-app-header-brand" style={{ display: 'flex', alignItems: 'center', flex: 1, gap: '0.5rem', textDecoration: 'none' }}>
                        <Link to="/mobile" style={{ display: 'flex', alignItems: 'center' }}>
                            <img
                                src="/image/Logotipos/Log%C3%B3tipo%20Cer%C3%A2mica%20Vicente%20Portela.png"
                                alt="Cerâmica Vicente Portela"
                                style={{ height: '42px', width: 'auto', objectFit: 'contain' }}
                            />
                        </Link>
                        
                        <div style={{ flex: 1, textAlign: 'center', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            {!pageHeader?.title ? (
                                <>
                                    <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.8px', opacity: 0.9, marginBottom: '0.1rem', fontFamily: '"Inter", sans-serif' }}>Portal do Representante</span>
                                    <span style={{ fontSize: '1.05rem', fontWeight: 700, lineHeight: 1.1, fontFamily: '"Playfair Display", serif', letterSpacing: '0.3px' }}>Olá, {firstName(user)}</span>
                                </>
                            ) : (
                                <>
                                    {pageHeader.subtitle && (
                                        <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.8px', opacity: 0.9, marginBottom: '0.1rem', fontFamily: '"Inter", sans-serif' }}>{pageHeader.subtitle}</span>
                                    )}
                                    <span style={{ fontFamily: '"Playfair Display", serif', fontSize: '1.15rem', fontWeight: 700, letterSpacing: '0.3px', lineHeight: 1.1 }}>{pageHeader.title}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <button
                    type="button"
                    className="mobile-app-logout"
                    onClick={handleLogout}
                    aria-label="Sair"
                    title="Sair"
                >
                    <i className="fas fa-sign-out-alt" aria-hidden="true" />
                </button>
            </header>

            <main className="mobile-app-main">
                <Outlet />
            </main>

            <nav className="mobile-app-tabbar" aria-label="Navegação principal">
                <NavLink
                    to="/mobile"
                    end
                    className={({ isActive }) => `mobile-app-tab${isActive ? ' is-active' : ''}`}
                >
                    <i className="fas fa-home" aria-hidden="true" />
                    <span>Início</span>
                </NavLink>

                <NavLink
                    to="/mobile/clientes"
                    className={({ isActive }) => `mobile-app-tab${isActive ? ' is-active' : ''}`}
                >
                    <i className="fas fa-users" aria-hidden="true" />
                    <span>Clientes</span>
                </NavLink>

                <NavLink
                    to="/mobile/pedidos"
                    className={({ isActive }) => `mobile-app-tab${isActive ? ' is-active' : ''}`}
                    end
                >
                    <i className="fas fa-clipboard-list" aria-hidden="true" />
                    <span>Pedidos</span>
                </NavLink>
            </nav>
        </div>
    );
}

export default function MobileLayout() {
    return (
        <MobileHeaderProvider>
            <MobileShell />
        </MobileHeaderProvider>
    );
}
