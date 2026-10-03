import { CONTACT_INFO, WHATSAPP_URL } from '../data/landingData';
import MapModal from './MapModal';

export default function Footer({ onOpenLegal }) {
    const currentYear = new Date().getFullYear();

    return (
        <>
            <footer className="site-footer" id="contato">
                <div className="site-footer-main">
                    <div className="container">
                        <div className="site-footer-grid">
                            <div className="site-footer-brand">
                                <a href="/" className="site-footer-logo">
                                    <img src="/image/Logotipos/Logo.png" alt="Cerâmica Vicente Portela" />
                                </a>
                                <p className="site-footer-tagline">
                                    Tijolos, blocos e lajotas com tradição familiar e fabricação própria em Minas Gerais.
                                </p>
                                <p className="site-footer-cnpj">CNPJ: {CONTACT_INFO.cnpj}</p>
                            </div>

                            <div className="site-footer-block site-footer-contact">
                                <h4>Contato</h4>
                                <ul className="site-footer-list">
                                    <li>
                                        <i className="fas fa-map-marker-alt" aria-hidden="true" />
                                        <button
                                            type="button"
                                            className="site-footer-address-btn"
                                            data-bs-toggle="modal"
                                            data-bs-target="#mapModal"
                                        >
                                            <span>{CONTACT_INFO.addressFooterLine1}</span>
                                            <span>{CONTACT_INFO.addressFooterLine2}</span>
                                        </button>
                                    </li>
                                    <li>
                                        <i className="fas fa-phone" aria-hidden="true" />
                                        <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                                            {CONTACT_INFO.phone}
                                        </a>
                                    </li>
                                    <li>
                                        <i className="fas fa-envelope" aria-hidden="true" />
                                        <a href={`mailto:${CONTACT_INFO.email}`}>{CONTACT_INFO.email}</a>
                                    </li>
                                </ul>
                            </div>

                            <div className="site-footer-block site-footer-social-block">
                                <h4>Redes sociais</h4>
                                <div className="site-footer-social">
                                    <a href={CONTACT_INFO.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                                        <i className="fab fa-facebook-f" aria-hidden="true" />
                                    </a>
                                    <a href={CONTACT_INFO.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                                        <i className="fab fa-instagram" aria-hidden="true" />
                                    </a>
                                    <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
                                        <i className="fab fa-whatsapp" aria-hidden="true" />
                                    </a>
                                </div>
                                <div className="site-footer-legal-links">
                                    <button type="button" onClick={() => onOpenLegal?.('privacy')}>
                                        Política de Privacidade
                                    </button>
                                    <button type="button" onClick={() => onOpenLegal?.('cookies')}>
                                        Política de Cookies
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="site-footer-bottom">
                    <div className="container site-footer-bottom-inner">
                        <p>© {currentYear} {CONTACT_INFO.companyName} Todos os direitos reservados.</p>
                        <span className="site-footer-powered">powered by Haurio Vieira</span>
                    </div>
                </div>
            </footer>

            <MapModal />
        </>
    );
}
