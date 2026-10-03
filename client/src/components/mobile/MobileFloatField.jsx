export default function MobileFloatField({
    id,
    label,
    name,
    value,
    onChange,
    onBlur,
    type = 'text',
    as = 'input',
    required = false,
    disabled = false,
    readOnly = false,
    inputMode,
    rows = 3,
    children,
}) {
    const fieldId = id || name;
    const safeValue = value ?? '';
    const isActive = Boolean(String(safeValue).trim()) || as === 'select';

    return (
        <div className={`mobile-float-field${isActive ? ' is-active' : ''}${disabled || readOnly ? ' is-locked' : ''}${as === 'textarea' ? ' is-textarea' : ''}`}>
            <div className="mobile-float-wrap">
                {as === 'select' ? (
                    <select
                        id={fieldId}
                        name={name}
                        value={safeValue}
                        onChange={onChange}
                        onBlur={onBlur}
                        required={required}
                        disabled={disabled}
                    >
                        {children}
                    </select>
                ) : as === 'textarea' ? (
                    <textarea
                        id={fieldId}
                        name={name}
                        value={safeValue}
                        onChange={onChange}
                        onBlur={onBlur}
                        required={required}
                        disabled={disabled}
                        readOnly={readOnly}
                        rows={rows}
                        placeholder=" "
                    />
                ) : (
                    <input
                        id={fieldId}
                        name={name}
                        type={type}
                        value={safeValue}
                        onChange={onChange}
                        onBlur={onBlur}
                        required={required}
                        disabled={disabled}
                        readOnly={readOnly}
                        inputMode={inputMode}
                        placeholder=" "
                    />
                )}
                <label htmlFor={fieldId}>{label}</label>
            </div>
        </div>
    );
}
