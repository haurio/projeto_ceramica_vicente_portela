import { apiFetch } from './apiClient';

export function fetchPedidos(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            query.set(key, String(value));
        }
    });
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return apiFetch(`/api/pedidos${suffix}`);
}
export function fetchPedido(id) {
    return apiFetch(`/api/pedidos/${id}`);
}

export function createPedido(payload) {
    return apiFetch('/api/pedidos', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export function updatePedido(id, payload) {
    return apiFetch(`/api/pedidos/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
}

export function deletePedido(id) {
    return apiFetch(`/api/pedidos/${id}`, {
        method: 'DELETE',
    });
}

export function patchPedidoStatus(id, status, motivoCancelamento = null) {
    return apiFetch(`/api/pedidos/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, motivo_cancelamento: motivoCancelamento }),
    });
}

export function patchPedidoPagamentosStatus(id, status) {
    return apiFetch(`/api/pedidos/${id}/pagamentos/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
    });
}
