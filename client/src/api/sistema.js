import { apiFetch } from './apiClient';

export function fetchSistemaStatus() {
    return apiFetch('/api/sistema/status');
}
