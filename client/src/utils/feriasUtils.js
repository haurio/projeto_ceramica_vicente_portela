const DAY_MS = 24 * 60 * 60 * 1000;

export function toDateOnly(value) {
    if (!value) return null;

    if (value instanceof Date) {
        if (Number.isNaN(value.getTime())) return null;
        return new Date(value.getFullYear(), value.getMonth(), value.getDate());
    }

    const raw = String(value).trim();
    if (!raw || raw.startsWith('0000-00-00')) return null;

    const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
        return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    }

    const brMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (brMatch) {
        return new Date(Number(brMatch[3]), Number(brMatch[2]) - 1, Number(brMatch[1]));
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return null;
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

export function formatDateBr(value) {
    const date = toDateOnly(value);
    if (!date) return '—';

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${date.getFullYear()}`;
}

export function formatPeriodo(inicio, fim) {
    return `${formatDateBr(inicio)} — ${formatDateBr(fim)}`;
}

export function toIsoDate(value) {
    const date = toDateOnly(value);
    if (!date) return '';
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
}

export function daysBetweenInclusive(start, end) {
    const startDate = toDateOnly(start);
    const endDate = toDateOnly(end);
    if (!startDate || !endDate || endDate < startDate) return 0;
    return Math.floor((endDate - startDate) / DAY_MS) + 1;
}

export function getYearFromFerias(item) {
    const date = toDateOnly(item?.data_inicio) || toDateOnly(item?.periodo_aquisitivo_inicio);
    return date ? date.getFullYear() : null;
}

export function isVencida(item, today = new Date()) {
    if (!item || item.status === 'Cancelada' || item.status === 'Concluída') return false;
    if (item.status === 'Atrasada') return true;

    const fim = toDateOnly(item.periodo_aquisitivo_fim);
    if (!fim) return false;

    const todayDate = toDateOnly(today);
    return fim < todayDate;
}

export function isProxima(item, today = new Date(), windowDays = 30) {
    if (!item || item.status !== 'Planejada') return false;
    if (isVencida(item, today)) return false;

    const inicio = toDateOnly(item.data_inicio);
    if (!inicio) return false;

    const todayDate = toDateOnly(today);
    const limit = new Date(todayDate);
    limit.setDate(limit.getDate() + windowDays);

    return inicio >= todayDate && inicio <= limit;
}

export function getDiasAtrasados(item, today = new Date()) {
    if (Number(item?.dias_atrasados) > 0) return Number(item.dias_atrasados);
    if (!isVencida(item, today)) return 0;

    const fim = toDateOnly(item.periodo_aquisitivo_fim);
    const todayDate = toDateOnly(today);
    if (!fim || !todayDate) return 0;
    return Math.max(0, Math.floor((todayDate - fim) / DAY_MS));
}

export function getDiasRestantesInicio(item, today = new Date()) {
    if (item?.dias_restantes !== undefined && item?.dias_restantes !== null) {
        const value = Number(item.dias_restantes);
        if (Number.isFinite(value) && value > 0) return value;
    }

    const inicio = toDateOnly(item?.data_inicio);
    const todayDate = toDateOnly(today);
    if (!inicio || !todayDate || inicio < todayDate) return 0;
    return Math.floor((inicio - todayDate) / DAY_MS);
}

export function classifyFerias(list = [], year, today = new Date()) {
    const filtered = list.filter((item) => {
        if (!year) return true;
        return getYearFromFerias(item) === Number(year);
    });

    const vencidas = [];
    const proximas = [];
    const demais = [];

    filtered.forEach((item) => {
        if (isVencida(item, today)) {
            vencidas.push(item);
            return;
        }

        if (isProxima(item, today)) {
            proximas.push(item);
            return;
        }

        demais.push(item);
    });

    vencidas.sort((a, b) => getDiasAtrasados(b, today) - getDiasAtrasados(a, today));
    proximas.sort((a, b) => getDiasRestantesInicio(a, today) - getDiasRestantesInicio(b, today));
    demais.sort((a, b) => {
        const aDate = toDateOnly(a.data_inicio) || toDateOnly(a.periodo_aquisitivo_inicio) || new Date(0);
        const bDate = toDateOnly(b.data_inicio) || toDateOnly(b.periodo_aquisitivo_inicio) || new Date(0);
        return bDate - aDate;
    });

    const emAndamento = filtered.filter((item) => item.status === 'Em Andamento').length;
    const ativas = filtered.filter((item) => item.status !== 'Cancelada').length;

    return {
        filtered,
        vencidas,
        proximas,
        demais,
        summary: {
            vencidas: vencidas.length,
            proximas: proximas.length,
            emAndamento,
            ativas,
        },
    };
}

export function extractYears(list = []) {
    const currentYear = new Date().getFullYear();
    const years = new Set([currentYear]);

    list.forEach((item) => {
        const year = getYearFromFerias(item);
        if (year) years.add(year);
    });

    return [...years].sort((a, b) => b - a);
}

export function formatPeriodoOption(periodo) {
    if (!periodo) return '';
    const status = periodo.status && periodo.status !== 'Disponível'
        ? ` · ${periodo.status}`
        : '';
    return `${formatDateBr(periodo.periodo_aquisitivo_inicio)} a ${formatDateBr(periodo.periodo_aquisitivo_fim)} · ${periodo.dias_restantes || 30} dias${status}`;
}
