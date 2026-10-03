import { useEffect, useRef, useState } from 'react';
import { Button, Modal } from 'react-bootstrap';
import { fetchSistemaStatus } from '../../api/sistema';
import { APP_VERSION, getAppVersionLabel } from '../../config/appInfo';
import { showToast } from '../../utils/toast';
import AdminModalClose from './AdminModalClose';

function statusTone(status) {
    if (status === 'online') return 'online';
    if (status === 'offline') return 'offline';
    return 'unknown';
}

export default function AdminUserMenu({
    initials,
}) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [aboutOpen, setAboutOpen] = useState(false);
    const [statusOpen, setStatusOpen] = useState(false);
    const [statusLoading, setStatusLoading] = useState(false);
    const [statusData, setStatusData] = useState(null);
    const rootRef = useRef(null);

    useEffect(() => {
        if (!menuOpen) return undefined;

        const handlePointer = (event) => {
            if (!rootRef.current?.contains(event.target)) {
                setMenuOpen(false);
            }
        };
        const handleKey = (event) => {
            if (event.key === 'Escape') setMenuOpen(false);
        };

        document.addEventListener('mousedown', handlePointer);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handlePointer);
            document.removeEventListener('keydown', handleKey);
        };
    }, [menuOpen]);

    const openAbout = () => {
        setMenuOpen(false);
        setAboutOpen(true);
    };

    const openStatus = async () => {
        setMenuOpen(false);
        setStatusOpen(true);
        setStatusLoading(true);
        try {
            const data = await fetchSistemaStatus();
            setStatusData(data);
        } catch (error) {
            setStatusData(null);
            showToast('error', error.message || 'Erro ao consultar status das APIs.');
        } finally {
            setStatusLoading(false);
        }
    };

    const refreshStatus = async () => {
        setStatusLoading(true);
        try {
            const data = await fetchSistemaStatus();
            setStatusData(data);
        } catch (error) {
            showToast('error', error.message || 'Erro ao atualizar status.');
        } finally {
            setStatusLoading(false);
        }
    };

    return (
        <>
            <div className="admin-user-menu" ref={rootRef}>
                <button
                    type="button"
                    className={`admin-user-avatar is-button${menuOpen ? ' is-open' : ''}`}
                    onClick={() => setMenuOpen((current) => !current)}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    title="Conta e sistema"
                >
                    {initials}
                </button>

                {menuOpen ? (
                    <div className="admin-user-menu-panel" role="menu">
                        <button type="button" className="admin-user-menu-item" role="menuitem" onClick={openAbout}>
                            <i className="fas fa-info-circle" aria-hidden="true" />
                            <span>Sobre</span>
                        </button>
                        <button type="button" className="admin-user-menu-item" role="menuitem" onClick={openStatus}>
                            <i className="fas fa-heartbeat" aria-hidden="true" />
                            <span>Status da API</span>
                        </button>
                    </div>
                ) : null}
            </div>

            <Modal
                show={aboutOpen}
                onHide={() => setAboutOpen(false)}
                centered
                className="admin-sistema-modal admin-sistema-about-modal"
                dialogClassName="admin-sistema-about-dialog"
            >
                <Modal.Header>
                    <Modal.Title>
                        <i className="fas fa-info-circle me-2" aria-hidden="true" />
                        Sobre o sistema
                    </Modal.Title>
                    <AdminModalClose onClick={() => setAboutOpen(false)} />
                </Modal.Header>
                <Modal.Body>
                    <div className="admin-sistema-about">
                        <img
                            src={`/image/Logotipos/${encodeURIComponent('Logótipo Cerâmica Vicente Portela.png')}`}
                            alt="Cerâmica Vicente Portela"
                        />
                        <h3>Sistema de Gestão Cerâmica Vicente Portela</h3>
                        <p>
                            Este painel concentra a rotina administrativa da empresa em um só lugar:
                            cadastros, pedidos e entregas, estoque, frota, financeiro, RH
                            (férias, ausências e CIPA), emissão de NF-e e configurações de acesso.
                        </p>
                        <div className="admin-sistema-about-meta">
                            <div>
                                <span>Versão</span>
                                <strong>{APP_VERSION}</strong>
                            </div>
                            <div>
                                <span>Ambiente</span>
                                <strong>{getAppVersionLabel().split(' - ').pop()}</strong>
                            </div>
                            <div>
                                <span>Empresa</span>
                                <strong>Cerâmica Vicente Portela Ltda.</strong>
                            </div>
                            <div>
                                <span>CNPJ</span>
                                <strong>09.207.910/0001-14</strong>
                            </div>
                        </div>
                        <p className="admin-sistema-about-note">
                            O objetivo é organizar lançamentos, controles e permissões por perfil,
                            para facilitar o dia a dia da operação com segurança e rastreabilidade.
                        </p>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button type="button" variant="secondary" onClick={() => setAboutOpen(false)}>
                        Fechar
                    </Button>
                </Modal.Footer>
            </Modal>

            <Modal
                show={statusOpen}
                onHide={() => setStatusOpen(false)}
                centered
                size="lg"
                className="admin-estoque-modal admin-sistema-modal"
            >
                <Modal.Header>
                    <Modal.Title>
                        <i className="fas fa-heartbeat me-2" aria-hidden="true" />
                        Status das APIs
                    </Modal.Title>
                    <AdminModalClose onClick={() => setStatusOpen(false)} />
                </Modal.Header>
                <Modal.Body>
                    {statusLoading ? (
                        <div className="admin-sistema-status-loading" aria-live="polite">
                            <span className="admin-sistema-spinner" aria-hidden="true" />
                            <p>Consultando integrações...</p>
                        </div>
                    ) : null}

                    {!statusLoading && statusData ? (
                        <div className="admin-sistema-status">
                            <div className="admin-sistema-status-summary">
                                <span>
                                    {statusData.summary?.online || 0}/{statusData.summary?.total || 0} online
                                </span>
                                <small>
                                    Atualizado em{' '}
                                    {statusData.checked_at
                                        ? new Date(statusData.checked_at).toLocaleString('pt-BR')
                                        : '—'}
                                </small>
                            </div>

                            <ul className="admin-sistema-status-list">
                                {(statusData.services || []).map((service) => (
                                    <li key={service.id} data-tone={statusTone(service.status)}>
                                        <div className="admin-sistema-status-head">
                                            <strong>{service.name}</strong>
                                            <span className={`admin-sistema-status-pill is-${statusTone(service.status)}`}>
                                                {service.status === 'online' ? 'Online' : 'Offline'}
                                            </span>
                                        </div>
                                        <p>{service.description}</p>
                                        <div className="admin-sistema-status-meta">
                                            <span>{service.message || '—'}</span>
                                            {Number.isFinite(service.latency_ms) ? (
                                                <span>{service.latency_ms} ms</span>
                                            ) : null}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : null}

                    {!statusLoading && !statusData ? (
                        <p className="text-muted mb-0">Não foi possível carregar o status.</p>
                    ) : null}
                </Modal.Body>
                <Modal.Footer>
                    <Button type="button" variant="secondary" onClick={() => setStatusOpen(false)}>
                        Fechar
                    </Button>
                    <Button type="button" variant="primary" onClick={refreshStatus} disabled={statusLoading}>
                        {statusLoading ? 'Atualizando...' : 'Atualizar'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
}
