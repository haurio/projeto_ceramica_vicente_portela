import { useMemo } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { PickerDay } from '@mui/x-date-pickers/PickerDay';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import { toDateOnly, toIsoDate } from '../../../utils/feriasUtils';

dayjs.locale('pt-br');

const calendarTheme = createTheme({
    palette: {
        primary: { main: '#9b1c1c' },
    },
    typography: { fontFamily: 'inherit' },
    shape: { borderRadius: 8 },
});

function toneForStatus(status) {
    const value = String(status || '').toLowerCase();
    if (value === 'concluída' || value === 'concluida') return 'success';
    if (value === 'em andamento') return 'info';
    if (value === 'vencida' || value === 'atrasada') return 'danger';
    if (value === 'pendente') return 'warning';
    return 'planned';
}

export function buildFeriasDayMap(items = []) {
    const map = new Map();

    items.forEach((item) => {
        const start = toDateOnly(item.data_inicio);
        const end = toDateOnly(item.data_fim) || start;
        if (!start || !end) return;

        const cursor = new Date(start);
        while (cursor <= end) {
            const key = toIsoDate(cursor);
            const list = map.get(key) || [];
            list.push(item);
            map.set(key, list);
            cursor.setDate(cursor.getDate() + 1);
        }
    });

    return map;
}

function FeriasDay(props) {
    const { day, outsideCurrentMonth, dayMap, selectedKey, ...other } = props;
    const key = day.format('YYYY-MM-DD');
    const events = dayMap.get(key) || [];
    const hasEvents = events.length > 0 && !outsideCurrentMonth;
    const tone = hasEvents ? toneForStatus(events[0].status) : '';
    const isSelected = selectedKey === key;

    return (
        <PickerDay
            {...other}
            day={day}
            outsideCurrentMonth={outsideCurrentMonth}
            className={[
                'admin-ferias-cal-day',
                hasEvents ? `has-ferias is-${tone}` : '',
                isSelected ? 'is-selected' : '',
            ].filter(Boolean).join(' ')}
        />
    );
}

export default function FeriasCalendar({
    value,
    onChange,
    dayMap,
    year,
}) {
    const selected = value ? dayjs(value) : dayjs();
    const selectedKey = selected.format('YYYY-MM-DD');
    const minDate = useMemo(() => dayjs(`${year}-01-01`), [year]);
    const maxDate = useMemo(() => dayjs(`${year}-12-31`), [year]);

    return (
        <ThemeProvider theme={calendarTheme}>
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
                <div className="admin-ferias-calendar">
                    <DateCalendar
                        value={selected}
                        onChange={(next) => onChange?.(next ? next.format('YYYY-MM-DD') : null)}
                        minDate={minDate}
                        maxDate={maxDate}
                        slots={{ day: FeriasDay }}
                        slotProps={{
                            day: { dayMap, selectedKey },
                        }}
                    />
                    <div className="admin-ferias-cal-legend">
                        <span className="is-planned">Planejada</span>
                        <span className="is-info">Em andamento</span>
                        <span className="is-success">Concluída</span>
                    </div>
                </div>
            </LocalizationProvider>
        </ThemeProvider>
    );
}
