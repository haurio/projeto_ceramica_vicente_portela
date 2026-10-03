import { apiFetch } from './apiClient';

export function fetchProdutos() {
    return apiFetch('/api/produtos');
}

export function fetchProduto(id) {
    return apiFetch(`/api/produtos/${id}`);
}

export function createProduto(payload) {
    return apiFetch('/api/produtos', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
}

export function updateProduto(id, payload) {
    return apiFetch(`/api/produtos/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
    });
}

export function deleteProduto(id) {
    return apiFetch(`/api/produtos/${id}`, {
        method: 'DELETE'
    });
}

export async function uploadProdutoImagem(file) {
    const formData = new FormData();
    formData.append('imagem', file);

    const response = await fetch('/api/produtos/upload-imagem', {
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
