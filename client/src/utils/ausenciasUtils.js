export const AUSENCIA_TIPOS = [
    'Férias',
    'Acidente De Trabalho',
    'Aleitamento',
    'Baixa médica',
    'Casamento',
    'Outro Assuntos Pessoais- Dia',
    'Ausências justificadas- Dias',
    'Dia aniversário',
    'Falecimento Familiar',
    'Falta Injustificada- Dias',
    'Falta injustificada - Horas',
    'Gravidez De Risco',
    'Ausência Justificada- Horas',
    'Outros Assuntos Pessoais- Horas',
    'Ida ao médico',
    'Isolamento Profilático',
    'Licença parental',
    'Maternidade',
    'Paternidade',
    'Tolerância de Ponto',
];

export const AUSENCIA_STATUS = ['Registrada', 'Justificada', 'Não Justificada', 'Cancelada'];

export const TIPOS_COM_COMPROVACAO = [
    'Acidente De Trabalho',
    'Aleitamento',
    'Baixa médica',
    'Casamento',
    'Ausências justificadas- Dias',
    'Falecimento Familiar',
    'Gravidez De Risco',
    'Ausência Justificada- Horas',
    'Ida ao médico',
    'Isolamento Profilático',
    'Licença parental',
    'Maternidade',
    'Paternidade',
];

export function exigeComprovacao(tipo) {
    return TIPOS_COM_COMPROVACAO.includes(String(tipo || ''));
}

export function toneForAusenciaStatus(status) {
    const value = String(status || '').toLowerCase();
    if (value === 'justificada') return 'success';
    if (value === 'registrada') return 'info';
    if (value === 'não justificada' || value === 'nao justificada') return 'warning';
    if (value === 'cancelada') return 'danger';
    return 'planned';
}

export function extractAusenciaYears(list = []) {
    const currentYear = new Date().getFullYear();
    const years = new Set([currentYear]);

    list.forEach((item) => {
        const raw = String(item?.data_inicio || '');
        const match = raw.match(/^(\d{4})/);
        if (match) years.add(Number(match[1]));
    });

    return [...years].sort((a, b) => b - a);
}

export function filterAusencias(list = [], { year, status } = {}) {
    return list.filter((item) => {
        if (status && status !== 'todos') {
            if (String(item.status || '') !== status) return false;
        }

        if (year) {
            const raw = String(item?.data_inicio || '');
            const match = raw.match(/^(\d{4})/);
            if (!match || Number(match[1]) !== Number(year)) return false;
        }

        return true;
    });
}

export function summarizeAusencias(list = []) {
    return {
        total: list.length,
        registradas: list.filter((item) => item.status === 'Registrada').length,
        justificadas: list.filter((item) => item.status === 'Justificada').length,
        naoJustificadas: list.filter((item) => item.status === 'Não Justificada').length,
        canceladas: list.filter((item) => item.status === 'Cancelada').length,
    };
}
