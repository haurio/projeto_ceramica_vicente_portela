import { useEffect } from 'react';

export default function LegalModal({ show, title, sections, updatedAt, onClose }) {
    useEffect(() => {
        if (!show) return undefined;

        const onKeyDown = (event) => {
            if (event.key === 'Escape') onClose();
        };

        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', onKeyDown);

        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [show, onClose]);

    if (!show) return null;

    return (
        <div className="legal-modal-overlay" onClick={onClose} role="presentation">
            <div
                className="legal-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="legal-modal-title"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="legal-modal-header">
                    <div>
                        <h2 id="legal-modal-title">{title}</h2>
                        <p className="legal-modal-updated">Última atualização: {updatedAt}</p>
                    </div>
                    <button type="button" className="legal-modal-close" onClick={onClose} aria-label="Fechar">
                        <i className="fas fa-times" aria-hidden="true" />
                    </button>
                </div>
                <div className="legal-modal-body">
                    {sections.map((section) => (
                        <section key={section.heading} className="legal-modal-section">
                            <h3>{section.heading}</h3>
                            {section.paragraphs.map((paragraph) => (
                                <p key={paragraph}>{paragraph}</p>
                            ))}
                        </section>
                    ))}
                </div>
            </div>
        </div>
    );
}
