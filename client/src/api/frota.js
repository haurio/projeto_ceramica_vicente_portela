import { apiFetch } from './apiClient';

export function fetchFrota() {
    return apiFetch('/api/frota');
}

export function fetchVeiculo(id) {
    return apiFetch(`/api/frota/${id}`);
}

export function createVeiculo(payload) {
    return apiFetch('/api/frota', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
}

export function updateVeiculo(id, payload) {
    return apiFetch(`/api/frota/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
    });
}

export function deleteVeiculo(id) {
    return apiFetch(`/api/frota/${id}`, {
        method: 'DELETE'
    });
}

export async function uploadFrotaImagem(file) {
    const formData = new FormData();
    formData.append('imagem', file);

    const response = await fetch('/api/frota/upload-imagem', {
        method: 'POST',
        credentials: 'include',
        body: formData
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
