import { useEffect, useId, useMemo, useRef, useState } from 'react';

const DEFAULT_PAYMENT_OPTIONS = [
    'Boleto',
    'Cartão Crédito',
    'Cartão Débito',
    'PIX',
    'Dinheiro',
    'Cheque',
];

function parseSelected(value) {
    return String(value || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}

export default function AdminMultiCheckDropdown({
    id,
    label,
    name,
    value = '',
    onChange,
    options = DEFAULT_PAYMENT_OPTIONS,
    required = false,
    disabled = false,
}) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef(null);
    const fieldId = useId();
    const controlId = id || name || fieldId;
    const selected = useMemo(() => parseSelected(value), [value]);

    useEffect(() => {
        if (!open) return undefined;

        const handlePointerDown = (event) => {
            if (!rootRef.current?.contains(event.target)) {
                setOpen(false);
            }
        };

        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [open]);

    const emitChange = (nextSelected) => {
        const ordered = options.filter((option) => nextSelected.includes(option));
        onChange?.({
            target: {
                name,
                value: ordered.join(','),
            },
        });
    };

    const toggleOption = (option) => {
        if (disabled) return;

        let nextSelected;
        if (option === 'Todos') {
            nextSelected = selected.includes('Todos') ? [] : ['Todos'];
        } else {
            nextSelected = selected.includes(option)
                ? selected.filter((item) => item !== option)
                : [...selected.filter((item) => item !== 'Todos'), option];
        }

        emitChange(nextSelected);
    };

    const summary = selected.length === 0
        ? ''
        : selected.length <= 2
            ? selected.join(', ')
            : `${selected.length} formas selecionadas`;

    return (
        <div
            ref={rootRef}
            className={`admin-field is-select admin-multi-check${open ? ' is-open' : ''}${disabled ? ' is-locked' : ''}`}
        >
            <div
                className="admin-field-control"
                id={controlId}
                role="combobox"
                tabIndex={disabled ? -1 : 0}
                aria-expanded={open}
                aria-haspopup="listbox"
                aria-required={required || undefined}
                onClick={() => {
                    if (!disabled) setOpen((current) => !current);
                }}
                onKeyDown={(event) => {
                    if (disabled) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setOpen((current) => !current);
                    }
                }}
            >
                <span className={`admin-field-input admin-multi-check-summary${summary ? '' : ' is-empty'}`}>
                    {summary || '\u00A0'}
                </span>
                <label htmlFor={controlId} className="admin-field-label">
                    {label}
                    {required && <span className="admin-required-mark"> *</span>}
                </label>
                <i className={`fas fa-chevron-${open ? 'up' : 'down'} admin-multi-check-caret`} aria-hidden="true" />
            </div>

            {open && (
                <div className="admin-multi-check-menu" role="listbox" aria-multiselectable="true">
                    {options.map((option) => {
                        const checked = selected.includes(option);
                        const optionId = `${controlId}-${option}`;

                        return (
                            <label
                                key={option}
                                htmlFor={optionId}
                                className={`admin-multi-check-item${checked ? ' is-checked' : ''}`}
                                role="option"
                                aria-selected={checked}
                            >
                                <input
                                    id={optionId}
                                    type="checkbox"
                                    checked={checked}
                                    disabled={disabled}
                                    onChange={() => toggleOption(option)}
                                />
                                <span>{option}</span>
                            </label>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export { DEFAULT_PAYMENT_OPTIONS };
