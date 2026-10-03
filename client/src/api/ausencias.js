import { apiFetch } from './apiClient';

export function fetchAusencias() {
    return apiFetch('/api/ausencias');
}

export function fetchAusenciaMeta() {
    return apiFetch('/api/ausencias/meta');
}

export function fetchAusenciaById(id) {
    return apiFetch(`/api/ausencias/${id}`);
}

export function createAusencia(payload) {
    return apiFetch('/api/ausencias', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export function updateAusencia(id, payload) {
    return apiFetch(`/api/ausencias/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
}

export function deleteAusencia(id) {
    return apiFetch(`/api/ausencias/${id}`, {
        method: 'DELETE',
    });
}

export async function uploadAusenciaComprovacao(file) {
    const formData = new FormData();
    formData.append('arquivo', file);

    const response = await fetch('/api/ausencias/upload-comprovacao', {
        method: 'POST',
        credentials: 'include',
        body: formData,
    });

    let data = {};
    try {
        data = await response.json();
    } catch {
        data = {};
    }

    if (response.status === 401) {
        window.location.href = '/login';
        throw new Error('Sessão expirada. Faça login novamente.');
    }

    if (!response.ok) {
        throw new Error(data.message || `Erro no upload (${response.status}).`);
    }

    return data;
}
