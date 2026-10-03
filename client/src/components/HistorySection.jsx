import { useEffect, useRef, useState } from 'react';
import { TIMELINE } from '../data/landingData';

function yearOf(item) {
    if (item.year) return item.year;
    const match = String(item.title).match(/^(\d{4})/);
    return match ? match[1] : null;
}

function labelOf(title) {
    return String(title).replace(/^\d{4}\s*-\s*/, '').replace(/^Partida\s*-\s*/, '');
}

export default function HistorySection() {
    const [lightbox, setLightbox] = useState(null);
    const sectionRef = useRef(null);

    useEffect(() => {
        const root = sectionRef.current;
        if (!root) return undefined;

        const nodes = [...root.querySelectorAll('.ht-item, .ht-start, .ht-end')];

        const update = () => {
            const vh = window.innerHeight || document.documentElement.clientHeight;
            const topLine = vh * 0.16;
            const bottomLine = vh * 0.88;

            nodes.forEach((node) => {
                const rect = node.getBoundingClientRect();
                const mid = (rect.top + rect.bottom) / 2;
                const visible = mid > topLine && mid < bottomLine;
                node.classList.toggle('is-inview', visible);
            });
        };

        let ticking = false;
        const onScroll = () => {
            if (ticking) return;
            ticking = true;
            window.requestAnimationFrame(() => {
                ticking = false;
                update();
            });
        };

        update();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
        };
    }, []);

    useEffect(() => {
        if (!lightbox) return undefined;
        const onKey = (event) => {
            if (event.key === 'Escape') setLightbox(null);
        };
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', onKey);
        };
    }, [lightbox]);

    const open = (item) => {
        if (!item.image || item.image === '#') return;
        setLightbox({
            image: item.image,
            alt: item.alt,
            year: yearOf(item),
            label: labelOf(item.title),
            text: item.text,
        });
    };

    return (
        <>
            <section ref={sectionRef} className="history-section ht-section" id="historia">
                <div className="container">
                    <div className="section-head">
                        <span className="section-eyebrow">Nossa trajetória</span>
                        <h2 className="section-title">História da Família e da Cerâmica</h2>
                        <p className="section-lead">
                            Uma viagem de Pontevedra até Engenheiro Caldas. Role para ver cada capítulo.
                        </p>
                    </div>

                    <div className="ht-start">
                        <img src="https://flagcdn.com/w40/es.png" alt="" width="22" height="15" />
                        <span>Pontevedra, Galícia, Espanha <b>(1920)</b></span>
                    </div>

                    <div className="ht-track">
                        {TIMELINE.map((item, index) => {
                            const side = index % 2 === 0 ? 'right' : 'left';
                            const hasImage = item.image && item.image !== '#';
                            return (
                                <article
                                    key={item.title}
                                    className={`ht-item is-${side}`}
                                    style={{ '--ht-delay': `${(index % 5) * 40}ms` }}
                                >
                                    <button
                                        type="button"
                                        className="ht-card"
                                        onClick={() => open(item)}
                                        disabled={!hasImage}
                                    >
                                        {hasImage ? (
                                            <img src={item.image} alt={item.alt} loading="lazy" decoding="async" />
                                        ) : null}
                                        {index === 0 ? (
                                            <img className="ht-flag" src="https://flagcdn.com/w40/es.png" alt="" />
                                        ) : null}
                                        <div className="ht-copy">
                                            <h3>{labelOf(item.title)}</h3>
                                            <p>{item.text}</p>
                                        </div>
                                    </button>
                                    <div className="ht-axis">
                                        <span className="ht-dot" aria-hidden="true" />
                                        {yearOf(item) ? <b className="ht-year">{yearOf(item)}</b> : null}
                                    </div>
                                </article>
                            );
                        })}
                    </div>

                    <div className="ht-end">
                        <img src="https://flagcdn.com/w40/br.png" alt="" width="22" height="15" />
                        <span>Engenheiro Caldas, MG, Brasil <b>(Hoje)</b></span>
                    </div>
                </div>
            </section>

            {lightbox ? (
                <div className="timeline-lightbox" onClick={() => setLightbox(null)} role="presentation">
                    <button type="button" className="gallery-lightbox-close" aria-label="Fechar" onClick={() => setLightbox(null)}>
                        <i className="fas fa-times" aria-hidden="true" />
                    </button>
                    <figure className="timeline-lightbox-figure" onClick={(event) => event.stopPropagation()}>
                        <img src={lightbox.image} alt={lightbox.alt} />
                        <figcaption>
                            {lightbox.year ? <span>{lightbox.year}</span> : null}
                            <strong>{lightbox.label}</strong>
                            <p>{lightbox.text}</p>
                        </figcaption>
                    </figure>
                </div>
            ) : null}
        </>
    );
}
