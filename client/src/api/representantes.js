import { apiFetch } from './apiClient';

export function fetchRepresentantes() {
    return apiFetch('/api/representantes');
}

export function fetchRepresentantesComissoes(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            query.set(key, String(value));
        }
    });
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return apiFetch(`/api/representantes/comissoes${suffix}`);
}

export function fetchRepresentante(id) {
    return apiFetch(`/api/representantes/${id}`);
}

export function createRepresentante(payload) {
    return apiFetch('/api/representantes', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export function updateRepresentante(id, payload) {
    return apiFetch(`/api/representantes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
}

export function deleteRepresentante(id) {
    return apiFetch(`/api/representantes/${id}`, {
        method: 'DELETE',
    });
}
