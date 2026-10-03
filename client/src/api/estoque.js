import { apiFetch } from './apiClient';

export function fetchEstoque() {
    return apiFetch('/api/estoque');
}

export function fetchEstoqueMovimentos(params = {}) {
    const query = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            query.set(key, value);
        }
    });

    const suffix = query.toString() ? `?${query.toString()}` : '';
    return apiFetch(`/api/estoque/movimentos${suffix}`);
}

export function registrarEntradaEstoque(payload) {
    return apiFetch('/api/estoque/entrada', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export function registrarSaidaEstoque(payload) {
    return apiFetch('/api/estoque/saida', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export function registrarAjusteEstoque(payload) {
    return apiFetch('/api/estoque/ajuste', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}
