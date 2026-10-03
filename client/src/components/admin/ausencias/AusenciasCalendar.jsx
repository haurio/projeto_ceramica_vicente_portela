import { useMemo } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { PickerDay } from '@mui/x-date-pickers/PickerDay';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import { toDateOnly, toIsoDate } from '../../../utils/feriasUtils';
import { toneForAusenciaStatus } from '../../../utils/ausenciasUtils';

dayjs.locale('pt-br');

const calendarTheme = createTheme({
    palette: {
        primary: { main: '#9b1c1c' },
    },
    typography: { fontFamily: 'inherit' },
    shape: { borderRadius: 8 },
});

export function buildAusenciasDayMap(items = []) {
    const map = new Map();

    items.forEach((item) => {
        if (item.status === 'Cancelada') return;

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

function AusenciaDay(props) {
    const { day, outsideCurrentMonth, dayMap, selectedKey, ...other } = props;
    const key = day.format('YYYY-MM-DD');
    const events = dayMap.get(key) || [];
    const hasEvents = events.length > 0 && !outsideCurrentMonth;
    const tone = hasEvents ? toneForAusenciaStatus(events[0].status) : '';
    const isSelected = selectedKey === key;

    return (
        <PickerDay
            {...other}
            day={day}
            outsideCurrentMonth={outsideCurrentMonth}
            className={[
                'admin-ausencias-cal-day',
                hasEvents ? `has-ausencia is-${tone}` : '',
                isSelected ? 'is-selected' : '',
            ].filter(Boolean).join(' ')}
        />
    );
}

export default function AusenciasCalendar({
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
                <div className="admin-ausencias-calendar">
                    <DateCalendar
                        value={selected}
                        onChange={(next) => onChange?.(next ? next.format('YYYY-MM-DD') : null)}
                        minDate={minDate}
                        maxDate={maxDate}
                        slots={{ day: AusenciaDay }}
                        slotProps={{
                            day: { dayMap, selectedKey },
                        }}
                    />
                    <div className="admin-ausencias-cal-legend">
                        <span className="is-info">Registrada</span>
                        <span className="is-success">Justificada</span>
                        <span className="is-warning">Não justificada</span>
                    </div>
                </div>
            </LocalizationProvider>
        </ThemeProvider>
    );
}
