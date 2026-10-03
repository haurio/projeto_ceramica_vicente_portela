import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ForcePasswordChangeModal from '../../components/admin/ForcePasswordChangeModal';
import AdminUserMenu from '../../components/admin/AdminUserMenu';
import {
    filterAdminNavForUser,
    getPageTitle,
    groupAdminNavBySection,
    userCanAccessPath,
} from '../../data/adminNav';
import { showToast } from '../../utils/toast';
import { getShortName, getUserInitials } from '../../utils/userDisplay';
import { getAppVersionLabel } from '../../config/appInfo';

function isPathActive(pathname, to, end = false) {
    if (end) return pathname === to;
    return pathname === to || pathname.startsWith(`${to}/`);
}

export default function AdminLayout() {
    const { user, logout, refreshSession, loading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);

    useEffect(() => {
        refreshSession();
    }, [refreshSession]);

    useEffect(() => {
        document.title = getPageTitle(location.pathname);
        return () => {
            document.title = 'Cerâmica Vicente Portela';
        };
    }, [location.pathname]);

    const navItems = useMemo(() => filterAdminNavForUser(user), [user]);
    const navSections = useMemo(() => groupAdminNavBySection(navItems), [navItems]);

    useEffect(() => {
        if (loading || !user) return;



        if (!navItems.length) {
            showToast(
                'error',
                'Você não tem permissão para acessar este sistema. Este cadastro é exclusivo do sistema Mobile no celular.'
            );
            logout().finally(() => navigate('/login', { replace: true }));
            return;
        }

        const path = location.pathname.split('?')[0];

        if (path === '/' || path === '/dashboard') {
            if (!userCanAccessPath(user, '/dashboard')) {
                const first = navItems[0]?.children?.[0]?.to || navItems[0]?.to || null;
                if (first) navigate(first, { replace: true });
            }
            return;
        }

        if (!userCanAccessPath(user, path)) {
            showToast('warning', 'Você não tem permissão para acessar esta página.');
            const fallback = userCanAccessPath(user, '/dashboard')
                ? '/dashboard'
                : (navItems[0]?.children?.[0]?.to || navItems[0]?.to || '/dashboard');
            navigate(fallback, { replace: true });
        }
    }, [loading, user, location.pathname, navigate, navItems, logout]);

    const rawName = user?.full_name?.trim() || user?.username || '';
    const displayName = getShortName(rawName) || rawName;
    const userRole = user?.perfil || user?.role || 'Administrador';
    const appVersionLabel = getAppVersionLabel();
    const initials = getUserInitials(rawName || 'U');

    const activeSection = useMemo(() => (
        navItems.find((item) => (
            Array.isArray(item.children)
            && item.children.length > 0
            && isPathActive(location.pathname, item.to)
        )) || null
    ), [location.pathname, navItems]);

    const hasSecondary = Boolean(activeSection);

    const handleLogout = async () => {
        setLoggingOut(true);

        try {
            await logout();
            navigate('/login', { replace: true });
        } catch (error) {
            showToast('error', error.message || 'Erro ao sair.');
        } finally {
            setLoggingOut(false);
        }
    };

    return (
        <div className={`admin-shell${hasSecondary ? ' has-secondary' : ''}${sidebarOpen ? ' sidebar-open' : ''}`}>
            <aside className="admin-sidebar">
                <div className="admin-sidebar-brand">
                    <img src="/image/Logotipos/Logo.png" alt="Cerâmica Vicente Portela" />
                </div>

                <nav className="admin-sidebar-nav" aria-label="Menu principal">
                    {navSections.map((group) => (
                        <div className="admin-nav-section" key={group.section || 'principal'}>
                            {group.section ? (
                                <span className="admin-nav-section-label">{group.section}</span>
                            ) : null}
                            <div className="admin-nav-section-links">
                                {group.items.map((item) => {
                                    const hasChildren = Array.isArray(item.children) && item.children.length > 0;
                                    const parentActive = isPathActive(location.pathname, item.to, item.end);

                                    return (
                                        <NavLink
                                            key={item.to}
                                            to={hasChildren ? (item.children[0]?.to || item.to) : item.to}
                                            end={item.end}
                                            className={() => `admin-nav-link${parentActive ? ' active' : ''}`}
                                            onClick={(event) => {
                                                setSidebarOpen(false);
                                                const target = hasChildren ? (item.children[0]?.to || item.to) : item.to;
                                                event.preventDefault();
                                                navigate(target, { state: { resetView: Date.now() }, replace: location.pathname === target });
                                            }}
                                        >
                                            <i className={`fas ${item.icon}`} aria-hidden="true" />
                                            <span>{item.label}</span>
                                        </NavLink>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                <div className="admin-sidebar-footer">
                    <div className="admin-sidebar-user">
                        <div className="admin-sidebar-user-main">
                            <AdminUserMenu initials={initials} />
                            <div className="admin-user-info">
                                <strong>{loading && !displayName ? 'A carregar...' : displayName}</strong>
                                <span className="admin-user-role">{userRole}</span>
                                <span className="admin-sidebar-version">{appVersionLabel}</span>
                            </div>
                        </div>
                        <button
                            type="button"
                            className="admin-sidebar-logout"
                            onClick={handleLogout}
                            disabled={loggingOut}
                            title={loggingOut ? 'Saindo...' : 'Sair'}
                            aria-label={loggingOut ? 'Saindo...' : 'Sair'}
                        >
                            <i className="fas fa-sign-out-alt" aria-hidden="true" />
                        </button>
                    </div>
                </div>
            </aside>

            <div className="admin-main">
                <button
                    type="button"
                    className="admin-menu-toggle"
                    onClick={() => setSidebarOpen((current) => !current)}
                    aria-label="Alternar menu"
                >
                    <i className="fas fa-bars" aria-hidden="true" />
                </button>

                {hasSecondary ? (
                    <div className="admin-workspace">
                        <aside className="admin-secondary-sidebar">
                            <div className="admin-secondary-head">
                                <span className="admin-secondary-kicker">Módulo</span>
                                <h2>{activeSection.label}</h2>
                            </div>

                            <nav className="admin-secondary-nav">
                                {['Cadastros', 'Logística', 'Fiscal', 'Sistema'].map((groupLabel) => {
                                    const children = (activeSection.children || []).filter(
                                        (child) => (child.group || 'Cadastros') === groupLabel
                                    );
                                    if (!children.length) return null;
                                    return (
                                        <div className="admin-secondary-group" key={groupLabel}>
                                            <span className="admin-secondary-group-label">{groupLabel}</span>
                                            {children.map((child) => (
                                                <NavLink
                                                    key={child.to}
                                                    to={child.to}
                                                    className={({ isActive }) => `admin-secondary-link${isActive ? ' active' : ''}`}
                                                    onClick={(event) => {
                                                        setSidebarOpen(false);
                                                        event.preventDefault();
                                                        navigate(child.to, {
                                                            state: { resetView: Date.now() },
                                                            replace: location.pathname === child.to,
                                                        });
                                                    }}
                                                >
                                                    <i className={`fas ${child.icon}`} aria-hidden="true" />
                                                    <span>{child.label}</span>
                                                </NavLink>
                                            ))}
                                        </div>
                                    );
                                })}
                            </nav>
                        </aside>

                        <main className="admin-content admin-content-workspace">
                            <Outlet key={`${location.pathname}-${location.state?.resetView || 'init'}`} />
                        </main>
                    </div>
                ) : (
                    <main className="admin-content">
                        <Outlet key={`${location.pathname}-${location.state?.resetView || 'init'}`} />
                    </main>
                )}
            </div>

            {sidebarOpen && (
                <button
                    type="button"
                    className="admin-sidebar-backdrop"
                    aria-label="Fechar menu"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <ForcePasswordChangeModal />
        </div>
    );
}
