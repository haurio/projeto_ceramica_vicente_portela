const HIGHLIGHTS = [
    { icon: 'fa-industry', label: 'Fabricação própria' },
    { icon: 'fa-truck', label: 'Entrega à granel' },
    { icon: 'fa-route', label: 'Minas Gerais e região' }
];

const PILLARS = [
    {
        icon: 'fa-bullseye',
        title: 'Missão',
        text: 'Produzir e comercializar material com excelência de qualidade e preço justo para a construção dos sonhos dos nossos clientes.'
    },
    {
        icon: 'fa-eye',
        title: 'Visão',
        text: 'Ser referência na indústria cerâmica, com relação duradoura com clientes e parceiros, foco em crescimento e responsabilidade.'
    },
    {
        icon: 'fa-handshake',
        title: 'Valores',
        text: 'Propósito, excelência, trabalho em equipe, inovação, ética e melhoria contínua em cada etapa do processo.'
    }
];

export default function CompanySection() {
    return (
        <section className="company-section company-modern" id="empresa">
            <div className="container">
                <div className="section-head section-head-light scroll-reveal">
                    <span className="section-eyebrow section-eyebrow-light">Quem somos</span>
                    <h2 className="section-title section-title-light">A Cerâmica Vicente Portela</h2>
                </div>

                <div className="company-modern-intro">
                    <div className="company-modern-copy scroll-reveal scroll-reveal-left">
                        <p>
                            Fabricamos em Engenheiro Caldas, no vale do Rio Doce, e atendemos construtoras,
                            fábricas de lajes, revendas e consumidor final em Minas Gerais e região.
                        </p>
                        <p>
                            Da extração da argila à entrega, cada etapa é acompanhada de perto: seleção da
                            matéria-prima, conformação, secagem, queima em forno túnel e estocagem para
                            distribuição à granel com agilidade e pontualidade.
                        </p>
                        <ul className="company-modern-highlights">
                            {HIGHLIGHTS.map((item) => (
                                <li key={item.label}>
                                    <i className={`fas ${item.icon}`} aria-hidden="true" />
                                    {item.label}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="company-modern-visual scroll-reveal scroll-reveal-right">
                        <img
                            src="/image/Historia/Anjo-e-Dino-Portella.png"
                            alt="Anjo e Dino Portella — tradição familiar da Cerâmica Vicente Portela"
                            className="company-modern-photo"
                        />
                        <div className="company-modern-badge">
                            <strong>80+</strong>
                            <span>anos de tradição familiar</span>
                        </div>
                    </div>
                </div>

                <div className="company-modern-trust scroll-reveal">
                    <img
                        src="/image/Logotipos/Certificados.webp"
                        alt="Certificações INMETRO, PSQ Cerâmica Vermelha e ABNT NBR-15270 / NBR-15575"
                        className="company-modern-certs"
                    />
                </div>

                <div className="company-modern-pillars">
                    {PILLARS.map((pillar, index) => (
                        <article
                            key={pillar.title}
                            className="company-pillar-card scroll-reveal"
                            style={{ transitionDelay: `${index * 100}ms` }}
                        >
                            <div className="company-pillar-icon">
                                <i className={`fas ${pillar.icon}`} aria-hidden="true" />
                            </div>
                            <h3>{pillar.title}</h3>
                            <p>{pillar.text}</p>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
