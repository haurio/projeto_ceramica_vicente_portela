const SUCCESS_STATUSES = new Set([
    'ativo', 'ativa', 'sim', 'aprovado', 'concluída', 'concluida', 'entregue', 'pago',
    'autorizada', 'autorizada_homologacao', 'encerrado', 'devolvido', 'recebido',
]);
const WARNING_STATUSES = new Set([
    'pendente', 'afastado', 'planejada', 'em andamento', 'rascunho', 'aguardando pagamento',
    'em análise', 'em analise', 'extraviado', 'parcial',
]);
const INFO_STATUSES = new Set([
    'confirmado', 'separação', 'separacao', 'em separação', 'aguardando entrega',
    'aguardando carregamento', 'em uso', 'trocado',
    'pré-venda', 'pre-venda', 'prevenda', 'pré venda', 'pre venda',
]);
const DANGER_STATUSES = new Set([
    'nao', 'não', 'inativo', 'inativa', 'reprovado', 'demitido', 'atrasada', 'vencida',
    'cancelada', 'cancelado', 'pagamento em atraso', 'anulado', 'aberto', 'expirado', 'vencido',
    'bloqueado',
]);
const PULSE_STATUSES = new Set(['expirado', 'atrasada', 'vencida', 'vencido']);

function normalizeStatus(status) {
    return String(status || '').trim().toLowerCase();
}

function resolveTone(status) {
    const normalized = normalizeStatus(status);

    if (SUCCESS_STATUSES.has(normalized)) return 'success';
    if (INFO_STATUSES.has(normalized)) return 'info';
    if (WARNING_STATUSES.has(normalized)) return 'warning';
    if (DANGER_STATUSES.has(normalized)) return 'danger';

    return 'danger';
}

export default function StatusBadge({ status }) {
    const label = String(status || '').trim();

    if (!label) {
        return <span className="text-muted">—</span>;
    }

    const tone = resolveTone(label);
    const known = [
        'ativo', 'afastado', 'demitido', 'inativo', 'pendente', 'aprovado', 'reprovado',
        'sim', 'nao', 'não', 'planejada', 'em andamento', 'concluída', 'concluida',
        'atrasada', 'cancelada', 'cancelado', 'vencida', 'rascunho', 'confirmado', 'entregue',
        'aguardando pagamento', 'aguardando entrega', 'aguardando carregamento', 'pagamento em atraso', 'anulado',
        'autorizada', 'autorizada_homologacao',
        'aberto', 'em análise', 'em analise', 'encerrado',
        'bloqueado',
        'em uso', 'devolvido', 'expirado', 'extraviado', 'trocado',
        'recebido', 'parcial', 'pago', 'vencido',
    ];
    const lower = label.toLowerCase();
    const displayMap = {
        nao: 'Não',
        não: 'Não',
        sim: 'Sim',
        'em andamento': 'Em Andamento',
        concluida: 'Concluída',
        concluída: 'Concluída',
        vencida: 'Vencida',
        atrasada: 'Atrasada',
        planejada: 'Planejada',
        pendente: 'Pendente',
        cancelada: 'Cancelada',
        cancelado: 'Cancelado',
        rascunho: 'Rascunho',
        confirmado: 'Confirmado',
        entregue: 'Entregue',
        'aguardando pagamento': 'Aguardando pagamento',
        'aguardando entrega': 'Aguardando entrega',
        'aguardando carregamento': 'Aguardando carregamento',
        'pagamento em atraso': 'Pagamento em atraso',
        anulado: 'Anulado',
        autorizada: 'Autorizada',
        autorizada_homologacao: 'Homologação',
        aberto: 'Aberto',
        'em análise': 'Em análise',
        'em analise': 'Em análise',
        bloqueado: 'Bloqueado',
        'pré-venda': 'Pré-venda',
        'pre-venda': 'Pré-venda',
        prevenda: 'Pré-venda',
        'pré venda': 'Pré-venda',
        'pre venda': 'Pré-venda',
        encerrado: 'Encerrado',
        'em uso': 'Em uso',
        devolvido: 'Devolvido',
        expirado: 'Expirado',
        extraviado: 'Extraviado',
        trocado: 'Trocado',
        recebido: 'Recebido',
        parcial: 'Parcial',
        pago: 'Pago',
        vencido: 'Vencido',
    };
    const displayLabel = displayMap[lower]
        || (known.includes(lower)
            ? label.charAt(0).toUpperCase() + label.slice(1).toLowerCase()
            : label);
    const pulse = PULSE_STATUSES.has(lower);

    return (
        <span className={`admin-status-pill is-${tone}${pulse ? ' is-pulse' : ''}`}>
            {displayLabel}
        </span>
    );
}
