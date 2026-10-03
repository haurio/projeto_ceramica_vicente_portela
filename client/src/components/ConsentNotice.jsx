import { useEffect, useState } from 'react';
import { CONSENT_STORAGE_KEY } from '../data/landingData';

function readConsent() {
    try {
        return localStorage.getItem(CONSENT_STORAGE_KEY);
    } catch {
        return 'essential';
    }
}

function writeConsent(value) {
    try {
        localStorage.setItem(CONSENT_STORAGE_KEY, value);
        localStorage.setItem(`${CONSENT_STORAGE_KEY}_date`, new Date().toISOString());
    } catch {
        // localStorage indisponível (modo privado, bloqueio do navegador, etc.)
    }
}

export default function ConsentNotice({ onOpenPrivacyInfo }) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!readConsent()) {
            setVisible(true);
        }
    }, []);

    const saveConsent = (value) => {
        writeConsent(value);
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div className="consent-notice" role="dialog" aria-labelledby="consent-notice-title" aria-live="polite">
            <div className="consent-notice-inner">
                <div className="consent-notice-text">
                    <h3 id="consent-notice-title">Preferências do site</h3>
                    <p>
                        Usamos recursos necessários para o funcionamento do site e, com seu consentimento,
                        dados para melhorar sua experiência. Consulte nossa{' '}
                        <button type="button" className="consent-notice-link" onClick={onOpenPrivacyInfo}>
                            Política de Cookies
                        </button>.
                    </p>
                </div>
                <div className="consent-notice-actions">
                    <button type="button" className="consent-btn consent-btn-accept" onClick={() => saveConsent('accepted')}>
                        Aceitar todos
                    </button>
                    <button type="button" className="consent-btn consent-btn-essential" onClick={() => saveConsent('essential')}>
                        Apenas necessários
                    </button>
                </div>
            </div>
        </div>
    );
}
