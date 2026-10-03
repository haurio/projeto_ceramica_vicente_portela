import { useEffect } from 'react';

let sharedObserver = null;
let scrollScheduled = false;

function getSharedObserver() {
    if (sharedObserver) return sharedObserver;

    sharedObserver = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    sharedObserver.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.05, rootMargin: '0px 0px -8% 0px' }
    );

    return sharedObserver;
}

function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    const viewHeight = window.innerHeight || document.documentElement.clientHeight;
    return rect.top < viewHeight * 0.88 && rect.bottom > 24;
}

export function observeScrollReveal(root = document) {
    const elements = root.querySelectorAll('.scroll-reveal:not(.is-visible)');
    if (!elements.length) return;

    const observer = getSharedObserver();

    elements.forEach((el) => {
        if (isInViewport(el)) {
            el.classList.add('is-visible');
            return;
        }
        observer.observe(el);
    });
}

function scheduleObserve() {
    if (scrollScheduled) return;
    scrollScheduled = true;
    window.requestAnimationFrame(() => {
        scrollScheduled = false;
        observeScrollReveal();
    });
}

export function useScrollReveal() {
    useEffect(() => {
        observeScrollReveal();

        const onScroll = () => scheduleObserve();
        const onResize = () => scheduleObserve();

        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onResize, { passive: true });

        const timers = [50, 200, 500, 1000, 2000].map((ms) => window.setTimeout(observeScrollReveal, ms));

        const mutationObserver = new MutationObserver(() => scheduleObserve());
        mutationObserver.observe(document.body, { childList: true, subtree: true });

        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onResize);
            timers.forEach((id) => window.clearTimeout(id));
            mutationObserver.disconnect();
        };
    }, []);
}
