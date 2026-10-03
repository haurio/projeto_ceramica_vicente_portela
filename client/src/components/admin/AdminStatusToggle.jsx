import { useId } from 'react';

export default function AdminStatusToggle({
    label = 'Status',
    name,
    checked = false,
    onChange,
    onLabel = 'Ativo',
    offLabel = 'Inativo',
    disabled = false,
    required = false,
    isInvalid = false,
}) {
    const fieldId = useId();

    const handleToggle = () => {
        if (disabled) return;
        onChange?.({
            target: {
                name,
                type: 'checkbox',
                checked: !checked,
                value: !checked,
            },
        });
    };

    return (
        <div className={`admin-field admin-status-toggle${isInvalid ? ' is-invalid' : ''}${disabled ? ' is-locked' : ''}`}>
            <div className="admin-field-control admin-status-toggle-control">
                <div className="admin-status-toggle-content">
                    <span className={`admin-status-toggle-text${checked ? ' is-on' : ' is-off'}`}>
                        {checked ? onLabel : offLabel}
                    </span>

                    <button
                        id={fieldId}
                        type="button"
                        role="switch"
                        aria-checked={checked}
                        aria-label={label}
                        className={`admin-status-switch${checked ? ' is-on' : ''}`}
                        onClick={handleToggle}
                        disabled={disabled}
                    >
                        <span className="admin-status-switch-knob" />
                    </button>
                </div>

                <label htmlFor={fieldId} className="admin-field-label">
                    {label}
                    {required && <span className="admin-required-mark"> *</span>}
                </label>
            </div>
        </div>
    );
}
