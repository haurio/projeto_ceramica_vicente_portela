import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Form } from 'react-bootstrap';

export default function AdminSearchSelect({
    id,
    label,
    name,
    value = '',
    onChange,
    options = [],
    required = false,
    isInvalid = false,
    invalidFeedback = 'Campo obrigatório.',
    disabled = false,
    placeholder = 'Digite para buscar...',
    emptyLabel = 'Nenhum resultado',
    getOptionValue = (item) => String(item.value ?? item.id ?? ''),
    getOptionLabel = (item) => String(item.label ?? item.name ?? item.nome ?? ''),
}) {
    const fieldId = useId();
    const controlId = id || name || fieldId;
    const rootRef = useRef(null);
    const inputRef = useRef(null);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');

    const selected = useMemo(
        () => options.find((item) => getOptionValue(item) === String(value)) || null,
        [options, value, getOptionValue]
    );

    useEffect(() => {
        if (!open) {
            setQuery(selected ? getOptionLabel(selected) : '');
        }
    }, [open, selected, getOptionLabel]);

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
                inputRef.current?.blur();
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [open]);

    const filtered = useMemo(() => {
        const term = query.trim().toLowerCase();
        if (!term) return options;
        if (selected && getOptionLabel(selected).toLowerCase() === term) return options;
        return options.filter((item) => {
            const label = getOptionLabel(item).toLowerCase();
            const extra = String(item.search || '').toLowerCase();
            return label.includes(term) || extra.includes(term);
        });
    }, [options, query, selected, getOptionLabel]);

    const emit = (nextValue) => {
        onChange?.({
            target: {
                name,
                value: nextValue,
            },
        });
    };

    const handleSelect = (item) => {
        emit(getOptionValue(item));
        setQuery(getOptionLabel(item));
        setOpen(false);
    };

    const handleClear = (event) => {
        event.preventDefault();
        event.stopPropagation();
        emit('');
        setQuery('');
        setOpen(true);
        requestAnimationFrame(() => inputRef.current?.focus());
    };

    return (
        <div
            className={[
                'admin-field admin-search-select',
                disabled ? 'is-locked' : '',
                open ? 'is-open' : '',
                isInvalid ? 'is-invalid' : '',
            ].filter(Boolean).join(' ')}
            ref={rootRef}
        >
            <div className="admin-field-control">
                <Form.Control
                    ref={inputRef}
                    id={controlId}
                    name={name}
                    type="text"
                    className="admin-field-input"
                    value={query}
                    disabled={disabled}
                    required={required && !value}
                    isInvalid={isInvalid}
                    placeholder={open || query ? placeholder : ' '}
                    autoComplete="off"
                    role="combobox"
                    aria-expanded={open}
                    aria-controls={`${controlId}-list`}
                    onFocus={() => {
                        if (disabled) return;
                        setOpen(true);
                        if (selected) setQuery('');
                    }}
                    onClick={() => {
                        if (disabled) return;
                        setOpen(true);
                    }}
                    onChange={(event) => {
                        const next = event.target.value;
                        setQuery(next);
                        setOpen(true);
                        if (value) emit('');
                    }}
                />
                <label htmlFor={controlId} className="admin-field-label">
                    {label}
                    {required && <span className="admin-required-mark"> *</span>}
                </label>
                {value && !disabled ? (
                    <button
                        type="button"
                        className="admin-search-select-clear"
                        aria-label="Limpar seleção"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={handleClear}
                    >
                        <i className="fas fa-times" aria-hidden="true" />
                    </button>
                ) : (
                    <button
                        type="button"
                        className="admin-search-select-caret"
                        aria-label="Abrir lista"
                        tabIndex={-1}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                            if (disabled) return;
                            setOpen(true);
                            inputRef.current?.focus();
                        }}
                    >
                        <i className="fas fa-chevron-down" aria-hidden="true" />
                    </button>
                )}
            </div>

            {open && !disabled && (
                <ul id={`${controlId}-list`} className="admin-search-select-list" role="listbox">
                    {filtered.length === 0 && (
                        <li className="is-empty">{emptyLabel}</li>
                    )}
                    {filtered.map((item) => {
                        const optionValue = getOptionValue(item);
                        const active = optionValue === String(value);
                        return (
                            <li key={optionValue}>
                                <button
                                    type="button"
                                    role="option"
                                    aria-selected={active}
                                    className={active ? 'is-active' : ''}
                                    onMouseDown={(event) => event.preventDefault()}
                                    onClick={() => handleSelect(item)}
                                >
                                    {getOptionLabel(item)}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
            {isInvalid ? (
                <p className="admin-field-error mb-0">{invalidFeedback}</p>
            ) : null}
        </div>
    );
}
