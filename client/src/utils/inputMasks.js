export function onlyDigits(value) {
    return String(value || '').replace(/\D/g, '');
}

export function formatCep(value) {
    const digits = onlyDigits(value).slice(0, 8);

    if (digits.length <= 5) {
        return digits;
    }

    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function formatCnpj(value) {
    const digits = onlyDigits(value).slice(0, 14);

    if (digits.length <= 2) {
        return digits;
    }

    if (digits.length <= 5) {
        return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    }

    if (digits.length <= 8) {
        return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
    }

    if (digits.length <= 12) {
        return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
    }

    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

export function formatInscricaoEstadual(value) {
    const raw = String(value || '').trim().toUpperCase();

    if (!raw) {
        return '';
    }

    if (raw.startsWith('I') || raw.includes('ISENT')) {
        const letters = raw.replace(/[^A-Z]/g, '').slice(0, 6);
        if ('ISENTO'.startsWith(letters) || letters.startsWith('ISENT')) {
            return 'ISENTO'.slice(0, Math.max(letters.length, 1));
        }
    }

    const digits = onlyDigits(raw).slice(0, 14);

    if (digits.length <= 3) {
        return digits;
    }

    if (digits.length <= 6) {
        return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    }

    if (digits.length <= 9) {
        return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    }

    if (digits.length <= 12) {
        return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}.${digits.slice(9)}`;
    }

    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}.${digits.slice(9, 12)}-${digits.slice(12)}`;
}

export function formatInscricaoMunicipal(value) {
    return onlyDigits(value).slice(0, 15);
}

export function formatCnae(value) {
    const digits = onlyDigits(value).slice(0, 7);

    if (digits.length <= 4) {
        return digits;
    }

    if (digits.length <= 5) {
        return `${digits.slice(0, 4)}-${digits.slice(4)}`;
    }

    return `${digits.slice(0, 4)}-${digits.slice(4, 5)}/${digits.slice(5)}`;
}

export function formatRg(value) {
    const chars = String(value || '').toUpperCase().replace(/[^0-9X]/g, '');
    let digits = '';
    let verifier = '';

    for (const char of chars) {
        if (char >= '0' && char <= '9') {
            if (digits.length < 8) {
                digits += char;
            } else if (!verifier) {
                verifier = char;
            }
        } else if (char === 'X' && digits.length > 0 && !verifier) {
            verifier = 'X';
        }
    }

    let formatted = digits;

    if (digits.length > 2) {
        formatted = `${digits.slice(0, 2)}.${digits.slice(2)}`;
    }

    if (digits.length > 5) {
        formatted = `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
    }

    if (verifier) {
        formatted = `${formatted}-${verifier}`;
    }

    return formatted;
}

export function formatCpf(value) {
    const digits = onlyDigits(value).slice(0, 11);

    if (digits.length <= 3) {
        return digits;
    }

    if (digits.length <= 6) {
        return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    }

    if (digits.length <= 9) {
        return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    }

    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function formatPhone(value) {
    const digits = onlyDigits(value).slice(0, 11);

    if (digits.length === 0) {
        return '';
    }

    if (digits.length <= 2) {
        return `(${digits}`;
    }

    if (digits.length <= 6) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    }

    if (digits.length <= 10) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }

    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function formatPlaca(value) {
    const raw = String(value || '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 7);

    if (raw.length <= 3) {
        return raw;
    }

    return `${raw.slice(0, 3)}-${raw.slice(3)}`;
}

export function formatPis(value) {
    const digits = onlyDigits(value).slice(0, 11);

    if (digits.length <= 3) {
        return digits;
    }

    if (digits.length <= 8) {
        return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    }

    if (digits.length <= 10) {
        return `${digits.slice(0, 3)}.${digits.slice(3, 8)}.${digits.slice(8)}`;
    }

    return `${digits.slice(0, 3)}.${digits.slice(3, 8)}.${digits.slice(8, 10)}-${digits.slice(10)}`;
}

export function formatMoneyBr(value) {
    const digits = onlyDigits(value);

    if (!digits) {
        return '';
    }

    const amount = Number(digits) / 100;

    if (!Number.isFinite(amount)) {
        return '';
    }

    return amount.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

export function formatMoneyBrFromNumber(value) {
    const amount = Number(value);

    if (!Number.isFinite(amount)) {
        return formatMoneyBr('0');
    }

    return amount.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

export function parseMoneyBr(value) {
    if (value === null || value === undefined || value === '') {
        return 0;
    }

    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : 0;
    }

    let cleaned = String(value)
        .replace(/R\$\s?/gi, '')
        .replace(/\s/g, '')
        .trim();

    if (!cleaned) {
        return 0;
    }

    if (cleaned.includes(',') && cleaned.includes('.')) {
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (cleaned.includes(',')) {
        cleaned = cleaned.replace(',', '.');
    }

    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
}

export function formatDecimalBr(value, maxDecimals = 2) {
    const raw = String(value ?? '');
    const digitsOnly = raw.replace(/[^\d,]/g, '');

    if (!digitsOnly) {
        return '';
    }

    const parts = digitsOnly.split(',');
    const integerPart = parts[0].replace(/^0+(?=\d)/, '') || '0';
    const decimalPart = (parts[1] || '').slice(0, maxDecimals);

    if (parts.length > 1) {
        return `${integerPart},${decimalPart}`;
    }

    return integerPart;
}

export function parseDecimalBr(value, fallback = 0) {
    if (value === null || value === undefined || value === '') {
        return fallback;
    }

    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : fallback;
    }

    const cleaned = String(value).trim().replace(/\./g, '').replace(',', '.');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : fallback;
}

export function formatCnh(value) {
    return onlyDigits(value).slice(0, 11);
}

export const MASKED_FIELD_FORMATTERS = {
    cep: formatCep,
    cnpj: formatCnpj,
    cnae: formatCnae,
    cpf: formatCpf,
    rg: formatRg,
    phone: formatPhone,
    telefone_contato: formatPhone,
    motorista_telefone: formatPhone,
    motorista_cnh: formatCnh,
    inscricao_estadual: formatInscricaoEstadual,
    inscricao_municipal: formatInscricaoMunicipal,
    pis: formatPis,
    placa: formatPlaca,
    preco_unitario: formatMoneyBr,
    preco_milheiro: formatMoneyBr,
    preco_m2: formatMoneyBr,
    desconto_percentual: (value) => formatDecimalBr(value, 2),
    desconto_acima_de: (value) => formatDecimalBr(value, 2),
};

export function applyFieldMask(name, value) {
    const formatter = MASKED_FIELD_FORMATTERS[name];
    return formatter ? formatter(value) : value;
}

export function formatMaskedFields(form) {
    return {
        ...form,
        cep: formatCep(form.cep),
        cpf: formatCpf(form.cpf),
        phone: formatPhone(form.phone),
        pis: formatPis(form.pis),
    };
}
