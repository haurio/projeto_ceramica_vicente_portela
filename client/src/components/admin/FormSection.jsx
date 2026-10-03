export default function FormSection({ title, children }) {
    return (
        <section className="admin-form-section">
            {title && <h6 className="admin-form-section-title">{title}</h6>}
            {children}
        </section>
    );
}
