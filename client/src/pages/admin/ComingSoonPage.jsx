import { Link } from 'react-router-dom';

export default function ComingSoonPage({ title, description }) {
    return (
        <section className="admin-panel-card admin-coming-soon">
            <div className="admin-coming-soon-icon" aria-hidden="true">
                <i className="fas fa-tools" />
            </div>
            <h2>{title}</h2>
            <p>{description}</p>
            <Link to="/dashboard" className="admin-inline-link">
                <i className="fas fa-arrow-left" aria-hidden="true" />
                Voltar ao dashboard
            </Link>
        </section>
    );
}
