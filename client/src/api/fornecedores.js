import { apiFetch } from './apiClient';

export function fetchFornecedores() {
    return apiFetch('/api/fornecedores');
}

export function fetchFornecedor(id) {
    return apiFetch(`/api/fornecedores/${id}`);
}

export function createFornecedor(payload) {
    return apiFetch('/api/fornecedores', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
}

export function updateFornecedor(id, payload) {
    return apiFetch(`/api/fornecedores/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
    });
}

export function deleteFornecedor(id) {
    return apiFetch(`/api/fornecedores/${id}`, {
        method: 'DELETE'
    });
}
