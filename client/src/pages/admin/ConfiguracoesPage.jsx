import { Navigate, useLocation } from 'react-router-dom';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import FormasPagamentoPanel from '../../components/admin/config/FormasPagamentoPanel';
import AuditoriaPanel from '../../components/admin/config/AuditoriaPanel';
import NfeConfigPanel from '../../components/admin/config/NfeConfigPanel';
import UsuariosPanel from '../../components/admin/config/UsuariosPanel';
import NaturezasNfePanel from '../../components/admin/config/NaturezasNfePanel';
import FreteCidadesPanel from '../../components/admin/config/FreteCidadesPanel';
import CargosPanel from '../../components/admin/config/CargosPanel';
import BancosPanel from '../../components/admin/config/BancosPanel';

const SECTIONS = {
    'formas-pagamento': {
        title: 'Formas de pagamento',
        icon: 'fa-credit-card',
        subtitle: 'Defina formas, juros e prazos usados nos pedidos',
        Component: FormasPagamentoPanel,
    },
    'naturezas-nfe': {
        title: 'Naturezas NF-e',
        icon: 'fa-file-alt',
        hideHeader: true,
        Component: NaturezasNfePanel,
    },
    'frete-cidades': {
        title: 'Custo de frete',
        icon: 'fa-truck-loading',
        hideHeader: true,
        Component: FreteCidadesPanel,
    },
    cargos: {
        title: 'Cargos',
        icon: 'fa-id-badge',
        hideHeader: true,
        Component: CargosPanel,
    },
    bancos: {
        title: 'Bancos',
        icon: 'fa-university',
        hideHeader: true,
        Component: BancosPanel,
    },
    nfe: {
        title: 'NF-e / SEFAZ (Minas Gerais)',
        icon: 'fa-file-signature',
        subtitle: 'Certificado A1, ambiente e status da SEFAZ MG',
        Component: NfeConfigPanel,
    },
    auditoria: {
        title: 'Auditoria',
        icon: 'fa-clipboard-list',
        subtitle: 'Histórico de criações, alterações e aprovações',
        Component: AuditoriaPanel,
    },
    usuarios: {
        title: 'Usuários e permissões',
        icon: 'fa-user-shield',
        subtitle: 'Cadastre usuários, perfis e páginas liberadas',
        Component: UsuariosPanel,
    },
};

export default function ConfiguracoesPage() {
    const location = useLocation();
    const parts = location.pathname.split('/').filter(Boolean);
    const sectionKey = parts[parts.length - 1] === 'configuracoes'
        ? null
        : parts[parts.length - 1];
    const resetKey = location.state?.resetView || 'init';

    if (!sectionKey) {
        return <Navigate to="/configuracoes/formas-pagamento" replace />;
    }

    const section = SECTIONS[sectionKey];
    if (!section) {
        return <Navigate to="/configuracoes/formas-pagamento" replace />;
    }

    const Component = section.Component;

    return (
        <div className="admin-page-fill admin-config-page admin-formas-fill">
            <section className="admin-panel-card admin-page-card admin-config-card admin-formas-page">
                {section.hideHeader ? null : (
                    <div className="admin-formas-top">
                        <AdminPageHeader
                            title={section.title}
                            icon={section.icon}
                        />
                        {section.subtitle ? (
                            <p className="admin-config-subtitle">{section.subtitle}</p>
                        ) : null}
                    </div>
                )}
                <div className="admin-formas-scroll">
                    <Component key={`${sectionKey}-${resetKey}`} />
                </div>
            </section>
        </div>
    );
}
