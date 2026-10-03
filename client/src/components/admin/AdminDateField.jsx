import { useId, useRef, useState } from 'react';
import { Popover } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { PickerDay } from '@mui/x-date-pickers/PickerDay';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import isBetweenPlugin from 'dayjs/plugin/isBetween';

dayjs.extend(isBetweenPlugin);
dayjs.locale('pt-br');

const adminDateTheme = createTheme({
    palette: {
        primary: {
            main: '#9b1c1c',
        },
    },
    typography: {
        fontFamily: 'inherit',
    },
    shape: {
        borderRadius: 8,
    },
});

function parseDate(value) {
    if (!value) {
        return null;
    }

    const parsed = dayjs(value);
    return parsed.isValid() ? parsed : null;
}

function RangeDay(props) {
    const {
        day,
        rangeStart,
        rangeEnd,
        selectingEnd,
        outsideCurrentMonth,
        ...other
    } = props;

    const start = rangeStart;
    const end = rangeEnd;
    const isSelectedStart = Boolean(start && day.isSame(start, 'day'));
    const isSelectedEnd = Boolean(end && day.isSame(end, 'day'));
    const inRange = Boolean(
        start
        && end
        && day.isBetween(start, end, 'day', '[]')
    );
    const isEdge = isSelectedStart || isSelectedEnd;

    return (
        <PickerDay
            {...other}
            day={day}
            outsideCurrentMonth={outsideCurrentMonth}
            selected={isEdge}
            sx={{
                ...(inRange && !isEdge ? {
                    backgroundColor: 'rgba(155, 28, 28, 0.12) !important',
                    borderRadius: 0,
                } : null),
                ...(isSelectedStart && end ? {
                    borderTopRightRadius: 0,
                    borderBottomRightRadius: 0,
                } : null),
                ...(isSelectedEnd && start ? {
                    borderTopLeftRadius: 0,
                    borderBottomLeftRadius: 0,
                } : null),
                ...(selectingEnd && isSelectedStart && !end ? {
                    outline: '2px solid rgba(155, 28, 28, 0.35)',
                } : null),
            }}
        />
    );
}

export default function AdminDateField({
    label,
    name,
    value,
    onChange,
    required = false,
    isInvalid = false,
    disabled = false,
    className = '',
    labelAbove = false,
    invalidFeedback = 'Campo obrigatório.',
}) {
    const [open, setOpen] = useState(false);
    const anchorRef = useRef(null);
    const fieldId = useId();
    const parsed = parseDate(value);
    const displayValue = parsed ? parsed.format('DD/MM/YYYY') : '';

    const handleOpen = () => {
        if (!disabled) {
            setOpen(true);
        }
    };

    return (
        <>
            <div className={`admin-field is-date${labelAbove ? ' is-label-above' : ''}${isInvalid ? ' is-invalid' : ''}${className ? ` ${className}` : ''}`}>
                {labelAbove && label ? (
                    <label htmlFor={fieldId} className="admin-field-above-label">
                        {label}
                        {required ? <span className="admin-required-mark"> *</span> : null}
                    </label>
                ) : null}
                <div
                    className="admin-field-control"
                    ref={anchorRef}
                    onClick={handleOpen}
                    onKeyDown={(event) => {
                        if ((event.key === 'Enter' || event.key === ' ') && !disabled) {
                            event.preventDefault();
                            setOpen(true);
                        }
                    }}
                    role="presentation"
                >
                    <input
                        id={fieldId}
                        name={name}
                        type="text"
                        readOnly
                        disabled={disabled}
                        className="admin-field-input form-control"
                        value={displayValue}
                        placeholder={labelAbove ? 'DD/MM/AAAA' : ''}
                        aria-haspopup="dialog"
                        aria-expanded={open}
                        aria-label={label || name}
                    />
                    {!labelAbove && label ? (
                        <label htmlFor={fieldId} className="admin-field-label">
                            {label}
                            {required && <span className="admin-required-mark"> *</span>}
                        </label>
                    ) : null}
                </div>
                {isInvalid && (
                    <p className="admin-field-error mb-0">{invalidFeedback}</p>
                )}
            </div>

            <Popover
                open={open}
                anchorEl={anchorRef.current}
                onClose={() => setOpen(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                slotProps={{
                    paper: {
                        sx: {
                            mt: 0.5,
                            borderRadius: 2,
                            boxShadow: '0 12px 40px rgba(26, 18, 16, 0.15)',
                            zIndex: 2000,
                        },
                    },
                }}
                sx={{ zIndex: 2000 }}
            >
                <DateCalendar
                    value={parsed}
                    onChange={(newValue) => {
                        onChange({
                            target: {
                                name,
                                value: newValue && newValue.isValid() ? newValue.format('YYYY-MM-DD') : '',
                            },
                        });

                        if (newValue && newValue.isValid()) {
                            setOpen(false);
                        }
                    }}
                />
            </Popover>
        </>
    );
}

export function AdminDateRangeField({
    label = 'Período',
    name = 'periodo',
    inicio = '',
    fim = '',
    onChange,
    disabled = false,
    className = '',
}) {
    const [open, setOpen] = useState(false);
    const [draftStart, setDraftStart] = useState(null);
    const [draftEnd, setDraftEnd] = useState(null);
    const [pickingEnd, setPickingEnd] = useState(false);
    const anchorRef = useRef(null);
    const fieldId = useId();

    const start = parseDate(inicio);
    const end = parseDate(fim);
    const activeStart = draftStart || start;
    const activeEnd = pickingEnd ? draftEnd : (draftEnd || end);

    const displayValue = start && end
        ? `${start.format('DD/MM/YY')} – ${end.format('DD/MM/YY')}`
        : start
            ? `${start.format('DD/MM/YY')} – …`
            : '';

    const handleOpen = () => {
        if (disabled) return;
        setDraftStart(start);
        setDraftEnd(end);
        setPickingEnd(false);
        setOpen(true);
    };

    const commitRange = (from, to) => {
        const a = from.isBefore(to) ? from : to;
        const b = from.isBefore(to) ? to : from;
        onChange?.({ inicio: a.format('YYYY-MM-DD'), fim: b.format('YYYY-MM-DD') });
        setDraftStart(a);
        setDraftEnd(b);
        setPickingEnd(false);
        setOpen(false);
    };

    return (
        <>
            <div className={`admin-field is-date is-date-range${className ? ` ${className}` : ''}`}>
                <div
                    className="admin-field-control"
                    ref={anchorRef}
                    onClick={handleOpen}
                    onKeyDown={(event) => {
                        if ((event.key === 'Enter' || event.key === ' ') && !disabled) {
                            event.preventDefault();
                            handleOpen();
                        }
                    }}
                    role="presentation"
                >
                    <input
                        id={fieldId}
                        name={name}
                        type="text"
                        readOnly
                        disabled={disabled}
                        className="admin-field-input form-control"
                        value={displayValue}
                        placeholder="Selecione o período"
                        aria-haspopup="dialog"
                        aria-expanded={open}
                        aria-label={label}
                    />
                    <label htmlFor={fieldId} className="admin-field-label">
                        {label}
                    </label>
                </div>
            </div>

            <Popover
                open={open}
                anchorEl={anchorRef.current}
                onClose={() => {
                    setOpen(false);
                    setPickingEnd(false);
                    setDraftStart(start);
                    setDraftEnd(end);
                }}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{
                    paper: {
                        sx: {
                            mt: 0.5,
                            borderRadius: 2,
                            boxShadow: '0 12px 40px rgba(26, 18, 16, 0.15)',
                            p: 1,
                            zIndex: 2000,
                        },
                    },
                }}
                sx={{ zIndex: 2000 }}
            >
                <p className="admin-date-range-hint">
                    {pickingEnd ? 'Selecione a data final' : 'Selecione a data inicial'}
                </p>
                <DateCalendar
                    value={pickingEnd ? (activeEnd || activeStart) : activeStart}
                    slots={{ day: RangeDay }}
                    slotProps={{
                        day: {
                            rangeStart: activeStart,
                            rangeEnd: activeEnd,
                            selectingEnd: pickingEnd,
                        },
                    }}
                    onChange={(newValue) => {
                        if (!newValue || !newValue.isValid()) return;
                        if (!pickingEnd || !draftStart) {
                            setDraftStart(newValue);
                            setDraftEnd(null);
                            setPickingEnd(true);
                            return;
                        }
                        commitRange(draftStart, newValue);
                    }}
                />
            </Popover>
        </>
    );
}

export function AdminDateFieldProvider({ children }) {
    return (
        <ThemeProvider theme={adminDateTheme}>
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
                {children}
            </LocalizationProvider>
        </ThemeProvider>
    );
}
