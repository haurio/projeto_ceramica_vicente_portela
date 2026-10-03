import { apiFetch } from './apiClient';

export function fetchFerias() {
    return apiFetch('/api/ferias');
}

export function fetchFeriasPanorama(ano) {
    const query = ano ? `?ano=${encodeURIComponent(ano)}` : '';
    return apiFetch(`/api/ferias/panorama${query}`);
}

export function fetchFeriasById(id) {
    return apiFetch(`/api/ferias/${id}`);
}

export function fetchSaldoFerias(funcionarioId) {
    return apiFetch(`/api/ferias/saldo?funcionario_id=${encodeURIComponent(funcionarioId)}`);
}

export function createFerias(payload) {
    return apiFetch('/api/ferias', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export function updateFerias(id, payload) {
    return apiFetch(`/api/ferias/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
}
