import { useEffect, useMemo, useState } from 'react';
import galleryImages from 'virtual:gallery-images';
import { GALLERY_CAPTIONS } from '../data/landingData';
import { observeScrollReveal } from '../hooks/useScrollReveal';

const DEFAULT_CAPTION = {
    title: 'Memória da fábrica',
    text: 'Edite este texto em landingData.js → GALLERY_CAPTIONS.',
};

async function fetchGalleryFromApi() {
    try {
        const response = await fetch('/api/galeria', { cache: 'no-store' });
        if (!response.ok) return null;
        const data = await response.json();
        return Array.isArray(data) && data.length ? data : null;
    } catch {
        return null;
    }
}

function galleryKey(src) {
    return decodeURIComponent(String(src).split('/').pop().split('?')[0])
        .replace(/\.[^.]+$/, '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

function captionFor(src) {
    return GALLERY_CAPTIONS[galleryKey(src)] || DEFAULT_CAPTION;
}

function buildGalleryItems(sources) {
    return sources.map((src, index) => {
        const caption = captionFor(src);
        return {
            src,
            number: String(index + 1).padStart(2, '0'),
            title: caption.title,
            text: caption.text,
            alt: caption.title,
        };
    });
}

export default function GallerySection() {
    const bundledImages = useMemo(() => (Array.isArray(galleryImages) ? galleryImages : []), []);
    const [images, setImages] = useState(bundledImages);
    const [lightbox, setLightbox] = useState(null);

    const items = useMemo(() => buildGalleryItems(images), [images]);

    useEffect(() => {
        if (bundledImages.length) {
            setImages(bundledImages);
        }

        fetchGalleryFromApi().then((apiImages) => {
            if (apiImages?.length) setImages(apiImages);
        });

        const onFocus = () => {
            fetchGalleryFromApi().then((apiImages) => {
                if (apiImages?.length) setImages(apiImages);
            });
        };

        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, [bundledImages]);

    useEffect(() => {
        if (!items.length) return undefined;
        const timer = window.setTimeout(() => observeScrollReveal(), 100);
        return () => window.clearTimeout(timer);
    }, [items]);

    useEffect(() => {
        if (!lightbox) return undefined;

        const onKeyDown = (event) => {
            if (event.key === 'Escape') setLightbox(null);
            if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                const current = items.findIndex((item) => item.src === lightbox.src);
                if (current < 0) return;
                const next = event.key === 'ArrowRight'
                    ? (current + 1) % items.length
                    : (current - 1 + items.length) % items.length;
                setLightbox(items[next]);
            }
        };

        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', onKeyDown);
        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [lightbox, items]);

    return (
        <>
            <section className="gallery-section gallery-showcase-section" id="galeria">
                <div className="container">
                    <div className="section-head scroll-reveal">
                        <span className="section-eyebrow">Memória viva</span>
                        <h2 className="section-title gallery-showcase-title">
                            Um convite para <em>contemplar</em>
                        </h2>
                        <p className="section-lead">
                            Fotos da fábrica, da família e da produção. Passe o mouse para ler cada história.
                        </p>
                    </div>

                    {items.length > 0 ? (
                        <div className="gallery-showcase">
                            {items.map((item, index) => (
                                <button
                                    key={item.src}
                                    type="button"
                                    className={`gallery-showcase-item scroll-reveal scroll-reveal-scale size-${(index % 6) + 1}`}
                                    style={{ transitionDelay: `${Math.min(index * 80, 480)}ms` }}
                                    onClick={() => setLightbox(item)}
                                >
                                    <img src={item.src} alt={item.alt} loading="lazy" />
                                    <span className="gallery-showcase-veil" aria-hidden="true" />
                                    <span className="gallery-showcase-number">{item.number}</span>
                                    <span className="gallery-showcase-copy">
                                        <strong>{item.title}</strong>
                                        <em>{item.text}</em>
                                    </span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <p className="gallery-empty">Nenhuma foto disponível no momento.</p>
                    )}
                </div>
            </section>

            {lightbox && (
                <div className="gallery-lightbox" onClick={() => setLightbox(null)} role="presentation">
                    <button type="button" className="gallery-lightbox-close" aria-label="Fechar" onClick={() => setLightbox(null)}>
                        <i className="fas fa-times" aria-hidden="true" />
                    </button>
                    <figure className="gallery-lightbox-figure" onClick={(e) => e.stopPropagation()}>
                        <img src={lightbox.src} alt={lightbox.alt} />
                        <figcaption>
                            <strong>{lightbox.title}</strong>
                            <span>{lightbox.text}</span>
                        </figcaption>
                    </figure>
                </div>
            )}
        </>
    );
}
