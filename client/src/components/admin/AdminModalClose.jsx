export default function AdminModalClose({ onClick, disabled = false }) {
    return (
        <button
            type="button"
            className="admin-modal-close"
            onClick={onClick}
            disabled={disabled}
            aria-label="Fechar"
        >
            <i className="fas fa-times" aria-hidden="true" />
        </button>
    );
}
