import { apiFetch } from './apiClient';

export function fetchEmpresas() {
    return apiFetch('/api/empresas');
}

export function fetchEmpresa(id) {
    return apiFetch(`/api/empresas/${id}`);
}

export function createEmpresa(payload) {
    return apiFetch('/api/empresas', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
}

export function updateEmpresa(id, payload) {
    return apiFetch(`/api/empresas/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
    });
}

export function fetchCnae(codigo) {
    const digits = String(codigo || '').replace(/\D/g, '');
    const formatted = digits.length === 7
        ? digits.replace(/(\d{4})(\d{1})(\d{2})/, '$1-$2/$3')
        : codigo;
    return apiFetch(`/api/cnae/${encodeURIComponent(formatted)}`);
}
