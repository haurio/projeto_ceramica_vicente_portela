import { apiFetch } from './apiClient';

export function fetchNfeConfig() {
    return apiFetch('/api/nfe/config');
}

export function updateNfeConfig(payload) {
    return apiFetch('/api/nfe/config', {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
}

export async function uploadNfeCertificado(formData) {
    const response = await fetch('/api/nfe/config/certificado', {
        method: 'POST',
        body: formData,
        credentials: 'include',
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.message || 'Erro ao enviar certificado.');
    }
    return data;
}

export async function uploadNfeLogo(formData) {
    const response = await fetch('/api/nfe/config/logo', {
        method: 'POST',
        body: formData,
        credentials: 'include',
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.message || 'Erro ao enviar logo.');
    }
    return data;
}

export function checkNfeSefazStatus() {
    return apiFetch('/api/nfe/config/sefaz-status', { method: 'POST' });
}

export function fetchNfePedidos(options = {}) {
    const params = new URLSearchParams();
    if (options.pendentes) params.set('pendentes', '1');
    if (options.cliente_id) params.set('cliente_id', String(options.cliente_id));
    const query = params.toString();
    return apiFetch(`/api/nfe/pedidos${query ? `?${query}` : ''}`);
}

export function fetchNfeEmissoes() {
    return apiFetch('/api/nfe/emissoes');
}

export function fetchNfeEmissao(id) {
    return apiFetch(`/api/nfe/emissoes/${id}`);
}

export function emitirNfePedido(pedidoId, payload = {}) {
    return apiFetch(`/api/nfe/emitir/${pedidoId}`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export async function downloadNfeXml(emissaoId) {
    const response = await fetch(`/api/nfe/emissoes/${emissaoId}/xml`, {
        method: 'GET',
        credentials: 'include',
    });
    if (response.status === 401) {
        window.location.href = '/login';
        throw new Error('Sessão expirada. Faça login novamente.');
    }
    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Erro ao baixar XML da NF-e.');
    }
    const blob = await response.blob();
    const disposition = response.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename="?([^"]+)"?/i);
    const fileName = match?.[1] || `nfe-${emissaoId}.xml`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

export function cancelarNfeEmissao(emissaoId, motivo) {
    return apiFetch(`/api/nfe/emissoes/${emissaoId}/cancelar`, {
        method: 'POST',
        body: JSON.stringify({ motivo }),
    });
}
