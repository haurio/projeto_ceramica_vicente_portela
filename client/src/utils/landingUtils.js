const SCROLL_GAP = 56;

export function getHeaderOffset() {
    const header = document.querySelector('.main-header')
        || document.querySelector('.main-header .main-nav')
        || document.querySelector('.main-nav')
        || document.querySelector('.navbar');

    return (header?.getBoundingClientRect().height ?? 96) + SCROLL_GAP;
}

export function getSectionScrollAnchor(target) {
    if (!target) return null;

    return target.querySelector('.section-head')
        || target.querySelector('.section-title')
        || target.querySelector('.company-modern-title')
        || target.querySelector('h2')
        || target.querySelector('h3')
        || target;
}

export function getScrollTopForElement(element) {
    if (!element) return 0;

    const top = element.getBoundingClientRect().top + window.scrollY;
    return Math.max(0, top - getHeaderOffset());
}

export function logClientError(message, error) {
    console.error(message, error);
    fetch('/log-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            msg: message,
            level: 'error',
            module: 'landing',
            stack: error?.stack || 'Sem stack trace'
        })
    }).catch((fetchError) => {
        console.error('Erro ao enviar log para o servidor:', fetchError);
    });
}

export function getActiveSectionHref(scrollY = window.scrollY) {
    const sections = ['home', 'produtos', 'empresa', 'historia', 'galeria', 'duvidas', 'atendimento'];
    const probeY = scrollY + getHeaderOffset() + 8;

    for (let index = sections.length - 1; index >= 0; index -= 1) {
        const id = sections[index];
        const el = document.getElementById(id);
        if (!el) continue;

        const sectionTop = el.getBoundingClientRect().top + scrollY;
        if (probeY >= sectionTop) {
            return `#${id}`;
        }
    }

    return '#home';
}

export function getScrollOffset(href, target) {
    if (href === '#home') {
        return 0;
    }

    return getScrollTopForElement(target);
}

export function getProductSpecs(productName, specsMap) {
    return specsMap[productName.toLowerCase()] || { altura: 9, largura: 29, peso: '5kg / peça' };
}

export function calculatePieces(altura, comprimento, specs) {
    const areaParede = altura * comprimento;
    const areaTijolo = (specs.altura / 100) * (specs.largura / 100);
    const pecasPorMetroQuadrado = Math.ceil(1 / areaTijolo);
    return Math.ceil(areaParede * pecasPorMetroQuadrado);
}
