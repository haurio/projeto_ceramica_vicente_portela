import { apiFetch } from './apiClient';

export function fetchEmployeeOptions() {
    return apiFetch('/api/options');
}

export function fetchEmployees() {
    return apiFetch('/api/employees');
}

export function fetchEmployee(id) {
    return apiFetch(`/api/employees/${id}`);
}

export function createEmployee(payload) {
    return apiFetch('/api/employees', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
}

export function updateEmployee(id, payload) {
    return apiFetch(`/api/employees/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
    });
}

export function deleteEmployee(id) {
    return apiFetch(`/api/employees/${id}`, {
        method: 'DELETE'
    });
}
