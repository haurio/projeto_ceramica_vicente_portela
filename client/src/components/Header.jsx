import { useCallback, useEffect, useRef, useState } from 'react';
import { Collapse } from 'bootstrap';
import { NAV_ITEMS, WHATSAPP_URL } from '../data/landingData';
import { getActiveSectionHref } from '../utils/landingUtils';

export default function Header({ onNavigate }) {
    const [scrolled, setScrolled] = useState(false);
    const [activeHref, setActiveHref] = useState('#home');
    const [hoverHref, setHoverHref] = useState(null);
    const [indicator, setIndicator] = useState({ left: 0, width: 0, opacity: 0 });
    const [menuOpen, setMenuOpen] = useState(false);
    const navListRef = useRef(null);
    const linkRefs = useRef({});
    const navRef = useRef(null);
    const pendingNavHrefRef = useRef(null);
    const scrollUnlockTimerRef = useRef(null);

    const finishPendingNav = useCallback(() => {
        if (!pendingNavHrefRef.current) return;

        pendingNavHrefRef.current = null;
        setActiveHref(getActiveSectionHref());
    }, []);

    const closeMobileMenu = useCallback(() => {
        const navbar = document.getElementById('mainNavbar');
        if (!navbar?.classList.contains('show')) return;

        const instance = Collapse.getOrCreateInstance(navbar, { toggle: false });
        instance.hide();
    }, []);

    const moveIndicator = useCallback((href) => {
        const link = linkRefs.current[href];
        const list = navListRef.current;

        if (!link || !list) return;

        const item = link.closest('.nav-item');
        if (!item) return;

        setIndicator({
            left: item.offsetLeft,
            width: item.offsetWidth,
            opacity: 1
        });
    }, []);

    const indicatorHref = hoverHref ?? activeHref;

    useEffect(() => {
        const syncNav = () => {
            setScrolled(window.scrollY > 30);

            if (pendingNavHrefRef.current) {
                window.clearTimeout(scrollUnlockTimerRef.current);
                scrollUnlockTimerRef.current = window.setTimeout(finishPendingNav, 150);
                return;
            }

            setActiveHref(getActiveSectionHref());
        };

        const onScrollEnd = () => {
            if (pendingNavHrefRef.current) {
                window.clearTimeout(scrollUnlockTimerRef.current);
                finishPendingNav();
            }
        };

        syncNav();
        window.addEventListener('scroll', syncNav, { passive: true });
        window.addEventListener('scrollend', onScrollEnd);
        window.addEventListener('resize', syncNav);

        return () => {
            window.removeEventListener('scroll', syncNav);
            window.removeEventListener('scrollend', onScrollEnd);
            window.removeEventListener('resize', syncNav);
            window.clearTimeout(scrollUnlockTimerRef.current);
        };
    }, [finishPendingNav]);

    useEffect(() => {
        moveIndicator(indicatorHref);
    }, [indicatorHref, moveIndicator, menuOpen]);

    useEffect(() => {
        const navbar = document.getElementById('mainNavbar');
        if (!navbar) return undefined;

        const onShown = () => setMenuOpen(true);
        const onHidden = () => setMenuOpen(false);

        navbar.addEventListener('shown.bs.collapse', onShown);
        navbar.addEventListener('hidden.bs.collapse', onHidden);

        return () => {
            navbar.removeEventListener('shown.bs.collapse', onShown);
            navbar.removeEventListener('hidden.bs.collapse', onHidden);
        };
    }, []);

    useEffect(() => {
        if (!menuOpen) return undefined;

        const onDocumentClick = (event) => {
            const nav = navRef.current;
            if (nav && !nav.contains(event.target)) {
                closeMobileMenu();
            }
        };

        document.addEventListener('click', onDocumentClick);
        return () => document.removeEventListener('click', onDocumentClick);
    }, [menuOpen, closeMobileMenu]);

    const handleNav = (event, href) => {
        onNavigate(event, href);
        pendingNavHrefRef.current = href;
        setActiveHref(href);
        setHoverHref(null);
        closeMobileMenu();
    };

    return (
        <header className={`main-header${scrolled ? ' main-header-scrolled' : ''}`}>
            <nav className="main-nav navbar navbar-expand-lg navbar-dark" ref={navRef}>
                <div className="container-fluid main-nav-container">
                    <a className="navbar-brand main-nav-logo" href="/">
                        <img src="/image/Logotipos/Logo.png" alt="Cerâmica Vicente Portela" />
                    </a>

                    <button
                        className="navbar-toggler"
                        type="button"
                        data-bs-toggle="collapse"
                        data-bs-target="#mainNavbar"
                        aria-controls="mainNavbar"
                        aria-expanded="false"
                        aria-label="Abrir menu"
                    >
                        <span className="navbar-toggler-icon" />
                    </button>

                    <div className="collapse navbar-collapse" id="mainNavbar">
                        <ul
                            className="navbar-nav main-nav-list"
                            ref={navListRef}
                            onMouseLeave={() => setHoverHref(null)}
                        >
                            <span
                                className="main-nav-indicator"
                                style={{
                                    transform: `translateX(${indicator.left}px)`,
                                    width: `${indicator.width}px`,
                                    opacity: indicator.opacity
                                }}
                            />
                            {NAV_ITEMS.map((item) => (
                                <li className="nav-item" key={item.href}>
                                    <a
                                        ref={(el) => { linkRefs.current[item.href] = el; }}
                                        className={`nav-link main-nav-link${activeHref === item.href ? ' is-active' : ''}`}
                                        href={item.href}
                                        onMouseEnter={() => setHoverHref(item.href)}
                                        onClick={(event) => handleNav(event, item.href)}
                                    >
                                        {item.label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                        <a
                            href={WHATSAPP_URL}
                            className="main-nav-whatsapp"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <i className="fab fa-whatsapp" aria-hidden="true" />
                            Orçamento
                        </a>
                    </div>
                </div>
            </nav>
        </header>
    );
}
