import { Form } from 'react-bootstrap';

export default function AdminFloatField({
    id,
    label,
    name,
    value,
    onChange,
    onBlur,
    type = 'text',
    as,
    required = false,
    isInvalid = false,
    invalidFeedback = 'Campo obrigatório.',
    readOnly = false,
    disabled = false,
    maxLength,
    min,
    max,
    step,
    rows = 3,
    placeholder = '',
    className = '',
    inputMode,
    autoComplete,
    showPasswordToggle = false,
    showPassword = false,
    onTogglePassword,
    children,
}) {
    const fieldId = id || name;
    const isSelect = as === 'select';
    const isTextarea = as === 'textarea';
    const resolvedType = showPasswordToggle
        ? (showPassword ? 'text' : 'password')
        : type;

    const commonProps = {
        id: fieldId,
        name,
        value: value ?? '',
        onChange,
        onBlur,
        required,
        isInvalid,
        readOnly,
        disabled,
        maxLength,
        min,
        max,
        step,
        placeholder,
        className: `admin-field-input${className ? ` ${className}` : ''}`,
        inputMode,
        autoComplete,
    };

    return (
        <div
            className={[
                'admin-field',
                isInvalid ? 'is-invalid' : '',
                isSelect ? 'is-select' : '',
                isTextarea ? 'is-textarea' : '',
                showPasswordToggle ? 'has-password-toggle' : '',
                readOnly || disabled ? 'is-locked' : '',
            ].filter(Boolean).join(' ')}
        >
            <div className="admin-field-control">
                {isSelect ? (
                    <Form.Select {...commonProps}>
                        {children}
                    </Form.Select>
                ) : (
                    <Form.Control
                        {...commonProps}
                        type={isTextarea ? undefined : resolvedType}
                        as={isTextarea ? 'textarea' : undefined}
                        rows={isTextarea ? rows : undefined}
                    />
                )}
                <label htmlFor={fieldId} className="admin-field-label">
                    {label}
                    {required && <span className="admin-required-mark"> *</span>}
                </label>
                {showPasswordToggle ? (
                    <button
                        type="button"
                        className="admin-field-password-toggle"
                        onClick={onTogglePassword}
                        disabled={disabled}
                        aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                        tabIndex={-1}
                    >
                        <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true" />
                    </button>
                ) : null}
            </div>
            {isInvalid && (
                <p className="admin-field-error mb-0">{invalidFeedback}</p>
            )}
        </div>
    );
}
