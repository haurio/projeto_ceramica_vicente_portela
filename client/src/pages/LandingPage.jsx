import { useCallback, useState } from 'react';
import Header from '../components/Header';
import HeroSlider from '../components/HeroSlider';
import ProductsSection from '../components/ProductsSection';
import ProductModal from '../components/ProductModal';
import CompanySection from '../components/CompanySection';
import HistorySection from '../components/HistorySection';
import GallerySection from '../components/GallerySection';
import FaqSection from '../components/FaqSection';
import ContactForm from '../components/ContactForm';
import Footer from '../components/Footer';
import ConsentNotice from '../components/ConsentNotice';
import LegalModal from '../components/LegalModal';
import { COOKIE_POLICY, PRIVACY_POLICY } from '../data/legalContent';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { getScrollOffset, logClientError } from '../utils/landingUtils';

export default function LandingPage() {
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showProductModal, setShowProductModal] = useState(false);
    const [legalView, setLegalView] = useState(null);

    useScrollReveal();

    const handleNavigate = useCallback((event, href) => {
        event.preventDefault();

        try {
            const target = document.querySelector(href);
            if (!target) {
                throw new Error(`Elemento com seletor ${href} não encontrado`);
            }

            const offset = Math.max(getScrollOffset(href, target), 0);
            window.scrollTo({ top: offset, behavior: 'smooth' });

            const navbar = document.getElementById('mainNavbar');
            if (navbar?.classList.contains('show')) {
                navbar.classList.remove('show');
            }
        } catch (error) {
            logClientError(`Erro ao processar rolagem suave para ${href}`, error);
        }
    }, []);

    const handleProductClick = (product) => {
        setSelectedProduct(product);
        setShowProductModal(true);
    };

    return (
        <div className="landing-shell">
            <Header onNavigate={handleNavigate} />
            <main>
                <HeroSlider />
                <ProductsSection onProductClick={handleProductClick} />
                <ProductModal
                    product={selectedProduct}
                    show={showProductModal}
                    onHide={() => setShowProductModal(false)}
                />
                <CompanySection />
                <HistorySection />
                <GallerySection />
                <FaqSection />
                <ContactForm />
            </main>
            <Footer onOpenLegal={setLegalView} />
            <ConsentNotice onOpenPrivacyInfo={() => setLegalView('cookies')} />
            <LegalModal
                show={legalView === 'privacy'}
                title={PRIVACY_POLICY.title}
                sections={PRIVACY_POLICY.sections}
                updatedAt={PRIVACY_POLICY.updatedAt}
                onClose={() => setLegalView(null)}
            />
            <LegalModal
                show={legalView === 'cookies'}
                title={COOKIE_POLICY.title}
                sections={COOKIE_POLICY.sections}
                updatedAt={COOKIE_POLICY.updatedAt}
                onClose={() => setLegalView(null)}
            />
        </div>
    );
}
