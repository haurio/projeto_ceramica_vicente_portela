import { useMemo } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { PickerDay } from '@mui/x-date-pickers/PickerDay';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

dayjs.locale('pt-br');

const calendarTheme = createTheme({
    palette: {
        primary: { main: '#9b1c1c' },
    },
    typography: { fontFamily: 'inherit' },
    shape: { borderRadius: 8 },
});

function AgendaDay(props) {
    const { day, outsideCurrentMonth, dayCounts, selectedKey, ...other } = props;
    const key = day.format('YYYY-MM-DD');
    const count = Number(dayCounts?.[key] || 0);
    const hasEvents = count > 0 && !outsideCurrentMonth;
    const isSelected = selectedKey === key;

    return (
        <PickerDay
            {...other}
            day={day}
            outsideCurrentMonth={outsideCurrentMonth}
            className={[
                'admin-agenda-cal-day',
                hasEvents ? 'has-agenda' : '',
                isSelected ? 'is-selected' : '',
            ].filter(Boolean).join(' ')}
            title={hasEvents ? `${count} entrega(s)` : undefined}
        />
    );
}

export default function AgendamentosCalendar({
    value,
    onChange,
    dayCounts = {},
    onMonthChange,
}) {
    const selected = value ? dayjs(value) : dayjs();
    const selectedKey = selected.format('YYYY-MM-DD');
    const referenceDate = useMemo(() => selected, [selectedKey]);

    return (
        <ThemeProvider theme={calendarTheme}>
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
                <div className="admin-agenda-calendar">
                    <DateCalendar
                        value={selected}
                        referenceDate={referenceDate}
                        onChange={(next) => onChange?.(next ? next.format('YYYY-MM-DD') : null)}
                        onMonthChange={(month) => {
                            if (month && onMonthChange) {
                                onMonthChange(month.format('YYYY-MM'));
                            }
                        }}
                        slots={{ day: AgendaDay }}
                        slotProps={{
                            day: { dayCounts, selectedKey },
                        }}
                    />
                    <div className="admin-agenda-cal-legend">
                        <span className="is-agenda">Dia com entregas</span>
                        <span className="is-selected">Dia selecionado</span>
                    </div>
                </div>
            </LocalizationProvider>
        </ThemeProvider>
    );
}
