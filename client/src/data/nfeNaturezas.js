/** Naturezas / CFOPs comuns para emissão de NF-e (modelo 55). */
export const NFE_NATUREZAS = [
    {
        id: '5101',
        cfop: '5101',
        natureza: 'Venda de produção do estabelecimento',
        label: '5101 - Venda de produção',
        ambito: 'interno',
    },
    {
        id: '5102',
        cfop: '5102',
        natureza: 'Venda de mercadoria adquirida ou recebida de terceiros',
        label: '5102 - Venda de mercadoria',
        ambito: 'interno',
    },
    {
        id: '5118',
        cfop: '5118',
        natureza: 'Venda de produção entregue por conta e ordem',
        label: '5118 - Venda por conta e ordem',
        ambito: 'interno',
    },
    {
        id: '5405',
        cfop: '5405',
        natureza: 'Venda de mercadoria sujeita a ST (já retido)',
        label: '5405 - Venda com ST retido',
        ambito: 'interno',
    },
    {
        id: '5910',
        cfop: '5910',
        natureza: 'Remessa em bonificação, doação ou brinde',
        label: '5910 - Bonificação / doação',
        ambito: 'interno',
    },
    {
        id: '5915',
        cfop: '5915',
        natureza: 'Remessa de mercadoria para exposição ou feira',
        label: '5915 - Remessa exposição / feira',
        ambito: 'interno',
    },
    {
        id: '5922',
        cfop: '5922',
        natureza: 'Simples faturamento (entrega futura)',
        label: '5922 - Simples faturamento',
        ambito: 'interno',
    },
    {
        id: '5929',
        cfop: '5929',
        natureza: 'Lançamento complementar / ajuste',
        label: '5929 - Complementar / ajuste',
        ambito: 'interno',
    },
    {
        id: '6101',
        cfop: '6101',
        natureza: 'Venda de produção do estabelecimento',
        label: '6101 - Venda de produção (outra UF)',
        ambito: 'interestadual',
    },
    {
        id: '6102',
        cfop: '6102',
        natureza: 'Venda de mercadoria adquirida ou recebida de terceiros',
        label: '6102 - Venda de mercadoria (outra UF)',
        ambito: 'interestadual',
    },
    {
        id: '6404',
        cfop: '6404',
        natureza: 'Venda de mercadoria sujeita a ST (já retido)',
        label: '6404 - Venda com ST retido (outra UF)',
        ambito: 'interestadual',
    },
    {
        id: '6910',
        cfop: '6910',
        natureza: 'Remessa em bonificação, doação ou brinde',
        label: '6910 - Bonificação (outra UF)',
        ambito: 'interestadual',
    },
    {
        id: '1202',
        cfop: '1202',
        natureza: 'Devolução de venda de mercadoria',
        label: '1202 - Devolução de venda',
        ambito: 'entrada',
    },
    {
        id: '2202',
        cfop: '2202',
        natureza: 'Devolução de venda de mercadoria',
        label: '2202 - Devolução (outra UF)',
        ambito: 'entrada',
    },
];

export const NFE_FINALIDADES = [
    { value: '1', label: '1 - Normal' },
    { value: '2', label: '2 - Complementar' },
    { value: '3', label: '3 - Ajuste' },
    { value: '4', label: '4 - Devolução' },
];

export const NFE_TIPOS_OPERACAO = [
    { value: '1', label: '1 - Saída' },
    { value: '0', label: '0 - Entrada' },
];

export const NFE_CONSUMIDOR_FINAL = [
    { value: '0', label: '0 - Normal' },
    { value: '1', label: '1 - Consumidor final' },
];

export const NFE_PRESENCA = [
    { value: '0', label: '0 - Não se aplica' },
    { value: '1', label: '1 - Presencial' },
    { value: '2', label: '2 - Internet' },
    { value: '3', label: '3 - Teleatendimento' },
    { value: '4', label: '4 - Entrega a domicílio' },
    { value: '9', label: '9 - Outros' },
];

export const NFE_MOD_FRETE = [
    { value: '0', label: '0 - Emitente (CIF)' },
    { value: '1', label: '1 - Destinatário (FOB)' },
    { value: '2', label: '2 - Terceiros' },
    { value: '3', label: '3 - Próprio emitente' },
    { value: '4', label: '4 - Próprio destinatário' },
    { value: '9', label: '9 - Sem frete' },
];

export const NFE_CST_CSOSN = [
    { value: '00', label: '00 - Tributada' },
    { value: '10', label: '10 - Tributada + ST' },
    { value: '20', label: '20 - Redução BC' },
    { value: '40', label: '40 - Isenta' },
    { value: '41', label: '41 - Não tributada' },
    { value: '60', label: '60 - ST anterior' },
    { value: '102', label: '102 - SN sem crédito' },
    { value: '103', label: '103 - SN isenção' },
    { value: '300', label: '300 - SN imune' },
    { value: '400', label: '400 - SN não tributada' },
    { value: '500', label: '500 - SN ST anterior' },
];

export function naturezaPorCfop(cfop) {
    return NFE_NATUREZAS.find((item) => item.cfop === String(cfop)) || null;
}

export function cfopPadraoPorUf(ufDestino, ufOrigem = 'MG') {
    const dest = String(ufDestino || '').toUpperCase();
    const origem = String(ufOrigem || 'MG').toUpperCase();
    if (!dest || dest === origem) return '5102';
    return '6102';
}
