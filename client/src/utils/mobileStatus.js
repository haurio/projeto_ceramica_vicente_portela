export function statusClass(status) {
    const raw = String(status || '').trim().toLowerCase();
    if (!raw) return '';
    const normalized = raw
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-');

    if (normalized.includes('prevenda') || normalized.includes('pre-venda')) return 'is-prevenda';
    if (normalized.includes('em-analise') || normalized.includes('analise')) return 'is-analise';
    if (normalized.includes('pendente')) return 'is-pendente';
    if (normalized.includes('rascunho')) return 'is-rascunho';
    if (normalized.includes('aguardando')) return 'is-aguardando';
    if (normalized === 'pago' || normalized.includes('pago')) return 'is-pago';
    if (normalized.includes('confirmado') || normalized.includes('aprovado')) return 'is-confirmado';
    if (normalized.includes('entregue')) return 'is-entregue';
    if (normalized.includes('ativo')) return 'is-ativo';
    if (normalized.includes('inativo')) return 'is-inativo';
    if (normalized.includes('cancelado') || normalized.includes('anulado') || normalized.includes('reprovado') || normalized.includes('bloqueado')) return 'is-cancelado';
    if (normalized.includes('producao')) return 'is-producao';
    if (normalized.includes('carregamento')) return 'is-carregamento';
    if (normalized.includes('faturado')) return 'is-faturado';
    return '';
}

export function formatStatusLabel(status) {
    if (!status) return '—';
    const raw = String(status).trim();
    const lower = raw.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    if (lower === 'prevenda' || lower === 'pre-venda' || lower === 'pre venda') {
        return 'Pré-venda';
    }
    if (lower === 'em analise' || lower === 'em-analise' || lower === 'em análise') {
        return 'Em análise';
    }
    if (lower === 'aprovado') return 'Aprovado';
    if (lower === 'reprovado') return 'Reprovado';
    if (lower === 'bloqueado') return 'Bloqueado';
    if (lower === 'pendente') return 'Pendente';
    return raw;
}


export function isCreditBlocked(status) {
    const raw = String(status || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    return raw === 'bloqueado';
}
