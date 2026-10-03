import { useState } from 'react';

export default function AuthFloatField({
    id,
    label,
    icon,
    type = 'text',
    value,
    onChange,
    name,
    autoComplete,
    required = false,
    minLength,
    showToggle = false,
    showPassword = false,
    onTogglePassword,
    as = 'input',
    options = []
}) {
    const [focused, setFocused] = useState(false);
    const isActive = focused || Boolean(value);

    const commonProps = {
        id,
        name,
        value,
        onChange,
        onFocus: () => setFocused(true),
        onBlur: () => setFocused(false),
        required: false
    };

    return (
        <div className={`auth-float-field${isActive ? ' is-active' : ''}${showToggle ? ' has-toggle' : ''}${as === 'select' ? ' is-select' : ''}`}>
            <div className="auth-input-wrap">
                <span className="auth-field-icon" aria-hidden="true">
                    <i className={`fas ${icon}`} />
                </span>

                {as === 'select' ? (
                    <select {...commonProps}>
                        <option value="" disabled hidden>
                            {' '}
                        </option>
                        {options.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                ) : (
                    <input
                        {...commonProps}
                        type={showToggle ? (showPassword ? 'text' : 'password') : type}
                        placeholder=" "
                        autoComplete={autoComplete}
                        minLength={minLength}
                    />
                )}

                <label htmlFor={id} className="auth-float-label">
                    {label}
                </label>

                {showToggle && (
                    <button
                        type="button"
                        className="auth-toggle-password"
                        onClick={onTogglePassword}
                        aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                        tabIndex={-1}
                    >
                        <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
                    </button>
                )}
            </div>
        </div>
    );
}
