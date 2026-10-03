import { useEffect, useRef, useState } from 'react';
import Swiper from 'swiper';
import { Autoplay, EffectFade } from 'swiper/modules';
import { SLIDES } from '../data/landingData';
import { getScrollOffset } from '../utils/landingUtils';

function getSlideObjectPosition(slide, isMobileViewport) {
    if (isMobileViewport) {
        return slide.mobilePosition ?? slide.position ?? 'center center';
    }

    return slide.position ?? 'center center';
}

export default function HeroSlider() {
    const swiperElRef = useRef(null);
    const swiperInstanceRef = useRef(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const media = window.matchMedia('(max-width: 768px)');
        const updateViewport = () => setIsMobile(media.matches);

        updateViewport();
        media.addEventListener('change', updateViewport);
        return () => media.removeEventListener('change', updateViewport);
    }, []);

    useEffect(() => {
        const swiperEl = swiperElRef.current;

        if (!swiperEl || swiperInstanceRef.current) {
            return undefined;
        }

        const swiper = new Swiper(swiperEl, {
            modules: [Autoplay, EffectFade],
            effect: 'fade',
            fadeEffect: { crossFade: true },
            grabCursor: true,
            slidesPerView: 1,
            loop: true,
            speed: 1000,
            autoplay: {
                delay: 6000,
                disableOnInteraction: false
            },
            on: {
                init(instance) {
                    setActiveIndex(instance.realIndex);
                },
                slideChange(instance) {
                    setActiveIndex(instance.realIndex);
                }
            }
        });

        swiperInstanceRef.current = swiper;

        return () => {
            swiper.destroy(true, true);
            swiperInstanceRef.current = null;
        };
    }, []);

    const scrollToSection = (href) => {
        const target = document.querySelector(href);
        if (!target) return;

        const offset = Math.max(getScrollOffset(href, target), 0);
        window.scrollTo({ top: offset, behavior: 'smooth' });
    };

    const slide = SLIDES[activeIndex] ?? SLIDES[0];

    return (
        <section className="hero-showcase" id="home">
            <div className="swiper hero-showcase-swiper" ref={swiperElRef}>
                <div className="swiper-wrapper">
                    {SLIDES.map((item) => (
                        <div key={item.image} className="swiper-slide">
                            <img
                                src={item.image}
                                alt={item.tagline}
                                className="hero-showcase-bg"
                                style={{ objectPosition: getSlideObjectPosition(item, isMobile) }}
                                loading="eager"
                            />
                        </div>
                    ))}
                </div>
            </div>

            <div className="hero-showcase-vignette" />

            <div className="hero-showcase-copy" key={activeIndex}>
                <div className="hero-showcase-copy-inner">
                    <h1 className="hero-showcase-headline">{slide.tagline}</h1>
                    <p className="hero-showcase-lead">{slide.subtitle}</p>
                    <div className="hero-showcase-cta">
                        <button
                            type="button"
                            className="hero-showcase-btn primary"
                            onClick={() => scrollToSection('#atendimento')}
                        >
                            Solicitar orçamento
                        </button>
                    </div>
                </div>
            </div>

            <button
                type="button"
                className="hero-showcase-scroll"
                onClick={() => scrollToSection('#produtos')}
                aria-label="Rolar para baixo"
            >
                <span>Rolar para baixo</span>
                <i className="fas fa-chevron-down" aria-hidden="true" />
            </button>
        </section>
    );
}
