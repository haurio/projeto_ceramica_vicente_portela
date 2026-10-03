import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ToastContainer, Bounce } from 'react-toastify';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminLayout from './pages/admin/AdminLayout';
import DashboardPage from './pages/admin/DashboardPage';
import FuncionariosPage from './pages/admin/FuncionariosPage';
import FuncionarioFormPage from './pages/admin/FuncionarioFormPage';
import FornecedoresPage from './pages/admin/FornecedoresPage';
import FornecedorFormPage from './pages/admin/FornecedorFormPage';
import EmpresaPage from './pages/admin/EmpresaPage';
import EmpresaFormPage from './pages/admin/EmpresaFormPage';
import ClientesPage from './pages/admin/ClientesPage';
import ClienteFormPage from './pages/admin/ClienteFormPage';
import RepresentantesPage from './pages/admin/RepresentantesPage';
import RepresentanteFormPage from './pages/admin/RepresentanteFormPage';
import ProdutosPage from './pages/admin/ProdutosPage';
import ProdutoFormPage from './pages/admin/ProdutoFormPage';
import EstoquePage from './pages/admin/EstoquePage';
import FrotaPage from './pages/admin/FrotaPage';
import FrotaFormPage from './pages/admin/FrotaFormPage';
import FeriasPage from './pages/admin/FeriasPage';
import FeriasFormPage from './pages/admin/FeriasFormPage';
import AusenciasPage from './pages/admin/AusenciasPage';
import AusenciasFormPage from './pages/admin/AusenciasFormPage';
import PedidosPage from './pages/admin/PedidosPage';
import PedidoFormPage from './pages/admin/PedidoFormPage';
import AgendamentosPage from './pages/admin/AgendamentosPage';
import EmitirNfePage from './pages/admin/EmitirNfePage';
import ConfiguracoesPage from './pages/admin/ConfiguracoesPage';
import CipaPage from './pages/admin/CipaPage';
import FinanceiroPage from './pages/admin/FinanceiroPage';
import RelatoriosPage from './pages/admin/RelatoriosPage';
import ComingSoonPage from './pages/admin/ComingSoonPage';
import MobileLoginPage from './pages/mobile/MobileLoginPage';
import MobileLayout from './pages/mobile/MobileLayout';
import MobileHomePage from './pages/mobile/MobileHomePage';
import MobileClientesPage from './pages/mobile/MobileClientesPage';
import MobileClienteFormPage from './pages/mobile/MobileClienteFormPage';
import MobilePedidosPage from './pages/mobile/MobilePedidosPage';
import MobilePedidoFormPage from './pages/mobile/MobilePedidoFormPage';
import MobilePedidoDetailPage from './pages/mobile/MobilePedidoDetailPage';
import MobileProtectedRoute from './components/mobile/MobileProtectedRoute';

function GenericComingSoon() {
    return (
        <ComingSoonPage
            title="Módulo em desenvolvimento"
            description="Esta área será disponibilizada na migração completa para React."
        />
    );
}

function AdminLegacyRedirect() {
    const location = useLocation();
    const rest = location.pathname.replace(/^\/admin\/?/, '');
    const to = rest ? `/${rest}${location.search}${location.hash}` : `/dashboard${location.search}${location.hash}`;
    return <Navigate to={to} replace />;
}

function AppRoutes() {
    const panel = (
        <ProtectedRoute>
            <AdminLayout />
        </ProtectedRoute>
    );

    return (
        <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/mobile/login" element={<MobileLoginPage />} />
            <Route
                path="/mobile"
                element={(
                    <MobileProtectedRoute>
                        <MobileLayout />
                    </MobileProtectedRoute>
                )}
            >
                <Route index element={<MobileHomePage />} />
                <Route path="clientes" element={<MobileClientesPage />} />
                <Route path="clientes/novo" element={<MobileClienteFormPage />} />
                <Route path="clientes/:clienteId/editar" element={<MobileClienteFormPage />} />
                <Route path="pedidos" element={<MobilePedidosPage />} />
                <Route path="pedidos/novo" element={<MobilePedidoFormPage />} />
                <Route path="pedidos/:pedidoId" element={<MobilePedidoDetailPage />} />
            </Route>
            <Route path="/admin/*" element={<AdminLegacyRedirect />} />
            <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
            <Route element={panel}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/funcionarios" element={<FuncionariosPage />} />
                <Route path="/funcionarios/novo" element={<FuncionarioFormPage />} />
                <Route path="/funcionarios/:employeeId/editar" element={<FuncionarioFormPage />} />
                <Route path="/fornecedores" element={<FornecedoresPage />} />
                <Route path="/fornecedores/novo" element={<FornecedorFormPage />} />
                <Route path="/fornecedores/:fornecedorId/editar" element={<FornecedorFormPage />} />
                <Route path="/empresa" element={<EmpresaPage />} />
                <Route path="/empresa/novo" element={<EmpresaFormPage />} />
                <Route path="/empresa/:empresaId/editar" element={<EmpresaFormPage />} />
                <Route path="/clientes" element={<ClientesPage />} />
                <Route path="/clientes/novo" element={<ClienteFormPage />} />
                <Route path="/clientes/:clienteId/editar" element={<ClienteFormPage />} />
                <Route path="/representantes" element={<RepresentantesPage />} />
                <Route path="/representantes/novo" element={<RepresentanteFormPage />} />
                <Route path="/representantes/:representanteId/editar" element={<RepresentanteFormPage />} />
                <Route path="/produtos" element={<ProdutosPage />} />
                <Route path="/produtos/novo" element={<ProdutoFormPage />} />
                <Route path="/produtos/:produtoId/editar" element={<ProdutoFormPage />} />
                <Route path="/estoque" element={<EstoquePage />} />
                <Route path="/frota" element={<FrotaPage />} />
                <Route path="/frota/novo" element={<FrotaFormPage />} />
                <Route path="/frota/:veiculoId/editar" element={<FrotaFormPage />} />
                <Route path="/ferias" element={<FeriasPage />} />
                <Route path="/ferias/novo" element={<FeriasFormPage />} />
                <Route path="/ferias/:feriasId/editar" element={<FeriasFormPage />} />
                <Route path="/ausencias" element={<AusenciasPage />} />
                <Route path="/ausencias/novo" element={<AusenciasFormPage />} />
                <Route path="/ausencias/:ausenciaId/editar" element={<AusenciasFormPage />} />
                <Route path="/cipa" element={<CipaPage />} />
                <Route path="/financeiro" element={<FinanceiroPage />} />
                <Route path="/pedidos" element={<PedidosPage />} />
                <Route path="/pedidos/novo" element={<PedidoFormPage />} />
                <Route path="/pedidos/:pedidoId/editar" element={<PedidoFormPage />} />
                <Route path="/agendamentos" element={<AgendamentosPage />} />
                <Route path="/emitir-nfe" element={<EmitirNfePage />} />
                <Route path="/notas-fiscais" element={<Navigate to="/emitir-nfe" replace />} />
                <Route path="/configuracoes" element={<ConfiguracoesPage />} />
                <Route path="/configuracoes/:section" element={<ConfiguracoesPage />} />
                <Route path="/relatorios" element={<RelatoriosPage />} />
                <Route path="/relatorios/:reportId" element={<RelatoriosPage />} />
                <Route path="/pagamentos" element={<Navigate to="/financeiro" replace />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <AppRoutes />
            </BrowserRouter>

            <ToastContainer
                position="top-right"
                autoClose={1800}
                newestOnTop
                closeOnClick
                pauseOnHover
                draggable
                theme="colored"
                transition={Bounce}
                limit={4}
            />
        </AuthProvider>
    );
}
