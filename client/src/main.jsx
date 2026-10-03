import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import 'swiper/css';
import 'swiper/css/effect-fade';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

import '../../public/css/index.css';
import '../../public/css/index_produtos.css';
import '../../public/css/index_empresa.css';
import '../../public/css/index_historia.css';
import '../../public/css/index_atendimento.css';
import '../../public/css/index_duvidas.css';
import '../../public/css/index_contato.css';
import './styles/brand.css';
import './styles/landing-layout.css';
import './styles/hero-modern.css';
import './styles/footer.css';
import './styles/sections-modern.css';
import './styles/product-modal.css';
import './styles/map-modal.css';
import './styles/gallery.css';
import './styles/faq-modern.css';
import './styles/timeline-rail.css';
import './styles/contact-modern.css';
import './styles/scroll-reveal.css';
import './styles/auth.css';
import './styles/mobile.css';
import './styles/admin.css';
import './styles/admin-modules.css';
import 'react-toastify/dist/ReactToastify.css';
import './styles/toast-modern.css';

createRoot(document.getElementById('root')).render(
    <ErrorBoundary>
        <App />
    </ErrorBoundary>
);