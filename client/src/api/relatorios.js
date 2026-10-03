import { apiFetch } from './apiClient';

export function fetchRelatoriosCatalogo() {
    return apiFetch('/api/relatorios/catalogo');
}

export function fetchRelatorio(id, params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            query.set(key, value);
        }
    });
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return apiFetch(`/api/relatorios/${id}${suffix}`);
}
