import { apiFetch } from './apiClient';

export function fetchClientes() {
    return apiFetch('/api/clientes');
}

export function fetchCliente(id) {
    return apiFetch(`/api/clientes/${id}`);
}

export function createCliente(payload) {
    return apiFetch('/api/clientes', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
}

export function updateCliente(id, payload) {
    return apiFetch(`/api/clientes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
    });
}

export function deleteCliente(id) {
    return apiFetch(`/api/clientes/${id}`, {
        method: 'DELETE'
    });
}
