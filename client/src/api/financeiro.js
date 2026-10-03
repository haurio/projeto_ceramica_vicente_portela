import { apiFetch } from './apiClient';

export function fetchFinanceiroResumo() {
    return apiFetch('/api/financeiro/resumo');
}

export function fetchContasReceber() {
    return apiFetch('/api/financeiro/receber');
}

export function createContaReceber(payload) {
    return apiFetch('/api/financeiro/receber', { method: 'POST', body: JSON.stringify(payload) });
}

export function updateContaReceber(id, payload) {
    return apiFetch(`/api/financeiro/receber/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export function deleteContaReceber(id) {
    return apiFetch(`/api/financeiro/receber/${id}`, { method: 'DELETE' });
}

export function fetchContasPagar() {
    return apiFetch('/api/financeiro/pagar');
}

export function createContaPagar(payload) {
    return apiFetch('/api/financeiro/pagar', { method: 'POST', body: JSON.stringify(payload) });
}

export function updateContaPagar(id, payload) {
    return apiFetch(`/api/financeiro/pagar/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export function deleteContaPagar(id) {
    return apiFetch(`/api/financeiro/pagar/${id}`, { method: 'DELETE' });
}

export function parseFinanceiroXml(xml) {
    return apiFetch('/api/financeiro/parse-xml', {
        method: 'POST',
        body: JSON.stringify({ xml }),
    });
}

export function importarFinanceiroXml(payload) {
    return apiFetch('/api/financeiro/importar-xml', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}
