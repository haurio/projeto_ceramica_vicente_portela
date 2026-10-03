import { Button } from 'react-bootstrap';

export default function AdminPageHeader({
    title,
    icon,
    actionLabel,
    actionIcon = 'fa-plus',
    onAction,
    actionDisabled = false,
    actions = null,
}) {
    const hasActions = Boolean(actions) || Boolean(actionLabel && onAction);

    return (
        <div className="admin-module-header d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
            <h2 className="mb-0 fw-bold">
                {icon && <i className={`fas ${icon}`} aria-hidden="true" />}
                {title}
            </h2>
            {hasActions ? (
                <div className="admin-module-header-actions">
                    {actions}
                    {actionLabel && onAction ? (
                        <Button variant="primary" onClick={onAction} disabled={actionDisabled}>
                            {actionIcon && <i className={`fas ${actionIcon} me-2`} aria-hidden="true" />}
                            {actionLabel}
                        </Button>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
