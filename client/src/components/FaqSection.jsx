import { useState } from 'react';
import { FAQ_ITEMS, WHATSAPP_URL } from '../data/landingData';

const FAQ_ICONS = ['fa-comments', 'fa-user-check', 'fa-credit-card'];

function FaqAnswer({ item }) {
    if (item.id === 'One') {
        return (
            <>
                <p><strong>É muito fácil falar conosco!</strong></p>
                <p>Você pode solicitar um orçamento de várias maneiras:</p>
                <ul>
                    <li>Visitando nossa empresa na Rodovia Margem BR-116, Km 455,5, Zona Rural, Eng. Caldas — MG;</li>
                    <li>
                        WhatsApp ou telefone:{' '}
                        <a href={WHATSAPP_URL} target="_blank" rel="noreferrer">(33) 99807-6100</a>
                    </li>
                    <li>
                        E-mail:{' '}
                        <a href="mailto:noreplay@ceramicavicenteportela.com.br">noreplay@ceramicavicenteportela.com.br</a>
                    </li>
                    <li>Formulário de Atendimento nesta página, selecionando o assunto.</li>
                </ul>
            </>
        );
    }

    if (item.id === 'Three') {
        return (
            <>
                <p>Você pode optar por:</p>
                <ul>
                    <li>À vista</li>
                    <li>PIX</li>
                    <li>Depósito em conta</li>
                    <li>Boleto bancário</li>
                    <li>Cartão de débito</li>
                    <li>Cartão de crédito</li>
                </ul>
            </>
        );
    }

    return <p>{item.paragraphs[0]}</p>;
}

export default function FaqSection() {
    const [openId, setOpenId] = useState(null);

    return (
        <section className="faq-section faq-modern" id="duvidas">
            <div className="container">
                <div className="section-head scroll-reveal">
                    <span className="section-eyebrow">Tire suas dúvidas</span>
                    <h2 className="section-title">Perguntas Frequentes</h2>
                    <p className="section-lead">
                        Respostas rápidas sobre orçamentos, vendas e formas de pagamento.
                    </p>
                </div>

                <div className="faq-modern-list">
                    {FAQ_ITEMS.map((item, index) => {
                        const isOpen = openId === item.id;

                        return (
                            <article
                                key={item.id}
                                className={`faq-modern-item scroll-reveal${isOpen ? ' is-open' : ''}`}
                                style={{ transitionDelay: `${index * 80}ms` }}
                            >
                                <button
                                    type="button"
                                    className="faq-modern-trigger"
                                    aria-expanded={isOpen}
                                    onClick={() => setOpenId(isOpen ? null : item.id)}
                                >
                                    <span className="faq-modern-icon">
                                        <i className={`fas ${FAQ_ICONS[index] || 'fa-question'}`} aria-hidden="true" />
                                    </span>
                                    <span className="faq-modern-question">{item.title}</span>
                                    <i className={`fas fa-chevron-down faq-modern-chevron${isOpen ? ' is-open' : ''}`} aria-hidden="true" />
                                </button>
                                <div className={`faq-modern-panel${isOpen ? ' is-open' : ''}`}>
                                    <div className="faq-modern-body">
                                        <FaqAnswer item={item} />
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
