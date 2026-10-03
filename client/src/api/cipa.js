import { apiFetch } from './apiClient';

export function fetchCipaAlertas(dias = 30) {
    return apiFetch(`/api/cipa/alertas?dias=${dias}`);
}

export function fetchEpis() {
    return apiFetch('/api/cipa/epis');
}

export function createEpi(payload) {
    return apiFetch('/api/cipa/epis', { method: 'POST', body: JSON.stringify(payload) });
}

export function updateEpi(id, payload) {
    return apiFetch(`/api/cipa/epis/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export function deleteEpi(id) {
    return apiFetch(`/api/cipa/epis/${id}`, { method: 'DELETE' });
}

export function fetchEntregas() {
    return apiFetch('/api/cipa/entregas');
}

export function createEntrega(payload) {
    return apiFetch('/api/cipa/entregas', { method: 'POST', body: JSON.stringify(payload) });
}

export function updateEntrega(id, payload) {
    return apiFetch(`/api/cipa/entregas/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export function deleteEntrega(id) {
    return apiFetch(`/api/cipa/entregas/${id}`, { method: 'DELETE' });
}

export function fetchEquipamentos() {
    return apiFetch('/api/cipa/equipamentos');
}

export function createEquipamento(payload) {
    return apiFetch('/api/cipa/equipamentos', { method: 'POST', body: JSON.stringify(payload) });
}

export function updateEquipamento(id, payload) {
    return apiFetch(`/api/cipa/equipamentos/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export function deleteEquipamento(id) {
    return apiFetch(`/api/cipa/equipamentos/${id}`, { method: 'DELETE' });
}

export function fetchManutencoes() {
    return apiFetch('/api/cipa/manutencoes');
}

export function createManutencao(payload) {
    return apiFetch('/api/cipa/manutencoes', { method: 'POST', body: JSON.stringify(payload) });
}

export function updateManutencao(id, payload) {
    return apiFetch(`/api/cipa/manutencoes/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export function deleteManutencao(id) {
    return apiFetch(`/api/cipa/manutencoes/${id}`, { method: 'DELETE' });
}

export function fetchAcidentes() {
    return apiFetch('/api/cipa/acidentes');
}

export function createAcidente(payload) {
    return apiFetch('/api/cipa/acidentes', { method: 'POST', body: JSON.stringify(payload) });
}

export function updateAcidente(id, payload) {
    return apiFetch(`/api/cipa/acidentes/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export function deleteAcidente(id) {
    return apiFetch(`/api/cipa/acidentes/${id}`, { method: 'DELETE' });
}

export async function uploadAcidenteFoto(file) {
    const formData = new FormData();
    formData.append('imagem', file);

    const response = await fetch('/api/cipa/acidentes/upload-foto', {
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
