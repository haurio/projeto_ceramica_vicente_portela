import { apiFetch } from './apiClient';

export function fetchDashboardStats() {
    return apiFetch('/api/dashboard/stats');
}

export function fetchDashboardOverview(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            query.set(key, value);
        }
    });
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return apiFetch(`/api/dashboard/overview${suffix}`);
}
