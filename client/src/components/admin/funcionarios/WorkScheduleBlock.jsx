const WEEK_DAYS = [
    {
        value: 'domingo',
        label: 'Domingo',
        shortLabel: 'Dom',
        startKey: 'sunday_start',
        endKey: 'sunday_end',
        requiresTime: false,
    },
    {
        value: 'segunda',
        label: 'Segunda',
        shortLabel: 'Seg',
        startKey: 'weekday_start',
        endKey: 'weekday_end',
        requiresTime: true,
    },
    {
        value: 'terca',
        label: 'Terça',
        shortLabel: 'Ter',
        startKey: 'weekday_start',
        endKey: 'weekday_end',
        requiresTime: true,
    },
    {
        value: 'quarta',
        label: 'Quarta',
        shortLabel: 'Qua',
        startKey: 'weekday_start',
        endKey: 'weekday_end',
        requiresTime: true,
    },
    {
        value: 'quinta',
        label: 'Quinta',
        shortLabel: 'Qui',
        startKey: 'weekday_start',
        endKey: 'weekday_end',
        requiresTime: true,
    },
    {
        value: 'sexta',
        label: 'Sexta',
        shortLabel: 'Sex',
        startKey: 'weekday_start',
        endKey: 'weekday_end',
        requiresTime: true,
    },
    {
        value: 'sabado',
        label: 'Sábado',
        shortLabel: 'Sáb',
        startKey: 'saturday_start',
        endKey: 'saturday_end',
        requiresTime: false,
    },
];

function ScheduleTimeInput({ name, value, onChange, required, isInvalid, disabled, ariaLabel }) {
    return (
        <input
            type="time"
            name={name}
            value={value ?? ''}
            onChange={onChange}
            required={required}
            disabled={disabled}
            aria-label={ariaLabel}
            className={`admin-schedule-time-input${isInvalid ? ' is-invalid' : ''}`}
        />
    );
}

export default function WorkScheduleBlock({ form, invalidFields, onToggleDayOff, onChange }) {
    const hasWeekdayWork = WEEK_DAYS.some(
        (day) => day.requiresTime && !form.days_off.includes(day.value)
    );

    return (
        <div className="admin-week-calendar-panel">
            <div className="admin-week-calendar-intro">
                <span className="admin-jornada-card-icon" aria-hidden="true">
                    <i className="fas fa-calendar-week" />
                </span>
                <div>
                    <h6 className="admin-jornada-card-title">
                        Calendário semanal
                        <span className="admin-required-mark"> *</span>
                    </h6>
                    <p className="admin-jornada-card-desc">
                        Marque os dias de folga e defina entrada e saída em cada dia útil.
                        Segunda a sexta compartilham o mesmo horário.
                    </p>
                </div>
            </div>

            <div className={`admin-week-calendar-scroll${invalidFields.days_off ? ' is-invalid' : ''}`}>
                <div className="admin-week-calendar" role="group" aria-label="Calendário semanal de folga e horários">
                    {WEEK_DAYS.map((day) => {
                        const isOff = form.days_off.includes(day.value);
                        const startValue = form[day.startKey];
                        const endValue = form[day.endKey];
                        const startInvalid = !isOff && Boolean(invalidFields[day.startKey]);
                        const endInvalid = !isOff && Boolean(invalidFields[day.endKey]);
                        const timeRequired = !isOff && day.requiresTime && hasWeekdayWork;

                        return (
                            <article
                                key={day.value}
                                className={`admin-week-calendar-day${isOff ? ' is-off' : ' is-work'}`}
                            >
                                <header className="admin-week-calendar-day-header">
                                    <span className="admin-week-calendar-day-name">{day.shortLabel}</span>
                                    <span className="admin-week-calendar-day-full">{day.label}</span>
                                </header>

                                <div className="admin-week-calendar-day-body">
                                    <button
                                        type="button"
                                        className={`admin-week-calendar-toggle${isOff ? ' is-off' : ' is-work'}`}
                                        onClick={() => onToggleDayOff(day.value)}
                                        aria-pressed={isOff}
                                    >
                                        <i className={`fas ${isOff ? 'fa-mug-hot' : 'fa-briefcase'}`} aria-hidden="true" />
                                        {isOff ? 'Folga' : 'Trabalho'}
                                    </button>

                                    {!isOff && (
                                        <div className="admin-week-calendar-times">
                                            <label className="admin-week-calendar-time-field">
                                                <span>Entrada</span>
                                                <ScheduleTimeInput
                                                    name={day.startKey}
                                                    value={startValue}
                                                    onChange={onChange}
                                                    required={timeRequired}
                                                    isInvalid={startInvalid}
                                                    ariaLabel={`Entrada — ${day.label}`}
                                                />
                                            </label>
                                            <label className="admin-week-calendar-time-field">
                                                <span>Saída</span>
                                                <ScheduleTimeInput
                                                    name={day.endKey}
                                                    value={endValue}
                                                    onChange={onChange}
                                                    required={timeRequired}
                                                    isInvalid={endInvalid}
                                                    ariaLabel={`Saída — ${day.label}`}
                                                />
                                            </label>
                                        </div>
                                    )}

                                    {isOff && (
                                        <p className="admin-week-calendar-off-note">Sem expediente</p>
                                    )}
                                </div>
                            </article>
                        );
                    })}
                </div>
            </div>

            {invalidFields.days_off && (
                <p className="admin-field-error mb-0">Selecione ao menos um dia de folga.</p>
            )}
        </div>
    );
}
