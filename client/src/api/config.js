import { apiFetch } from './apiClient';

export function fetchFormasPagamento(options = {}) {
    const params = new URLSearchParams();
    if (options.ativo) params.set('ativo', '1');
    const query = params.toString();
    return apiFetch(`/api/config/formas-pagamento${query ? `?${query}` : ''}`);
}

export function fetchFormaPagamento(id) {
    return apiFetch(`/api/config/formas-pagamento/${id}`);
}

export function createFormaPagamento(payload) {
    return apiFetch('/api/config/formas-pagamento', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export function updateFormaPagamento(id, payload) {
    return apiFetch(`/api/config/formas-pagamento/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
}

export function deleteFormaPagamento(id) {
    return apiFetch(`/api/config/formas-pagamento/${id}`, {
        method: 'DELETE',
    });
}

export function fetchAuditoria(options = {}) {
    const params = new URLSearchParams();
    if (options.modulo) params.set('modulo', options.modulo);
    if (options.q) params.set('q', options.q);
    if (options.inicio) params.set('inicio', options.inicio);
    if (options.fim) params.set('fim', options.fim);
    if (options.limit) params.set('limit', String(options.limit));
    const query = params.toString();
    return apiFetch(`/api/config/auditoria${query ? `?${query}` : ''}`);
}

export function fetchUsuariosMeta() {
    return apiFetch('/api/config/usuarios/meta');
}

export function fetchUsuarios() {
    return apiFetch('/api/config/usuarios');
}

export function fetchUsuario(id) {
    return apiFetch(`/api/config/usuarios/${id}`);
}

export function createUsuario(payload) {
    return apiFetch('/api/config/usuarios', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export function updateUsuario(id, payload) {
    return apiFetch(`/api/config/usuarios/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
}

export function deleteUsuario(id) {
    return apiFetch(`/api/config/usuarios/${id}`, {
        method: 'DELETE',
    });
}

export function changeOwnPassword(payload) {
    return apiFetch('/api/config/usuarios/me/senha', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export function fetchNfeNaturezas() {
    return apiFetch('/api/config/nfe-naturezas');
}

export function createNfeNatureza(payload) {
    return apiFetch('/api/config/nfe-naturezas', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export function updateNfeNatureza(id, payload) {
    return apiFetch(`/api/config/nfe-naturezas/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
}

export function deleteNfeNatureza(id) {
    return apiFetch(`/api/config/nfe-naturezas/${id}`, {
        method: 'DELETE',
    });
}

export function fetchFreteCidades() {
    return apiFetch('/api/config/frete-cidades');
}

export function createFreteCidade(payload) {
    return apiFetch('/api/config/frete-cidades', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export function updateFreteCidade(id, payload) {
    return apiFetch(`/api/config/frete-cidades/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
}

export function deleteFreteCidade(id) {
    return apiFetch(`/api/config/frete-cidades/${id}`, {
        method: 'DELETE',
    });
}

export function fetchDepartamentos() {
    return apiFetch('/api/config/departamentos');
}

export function fetchCargosConfig() {
    return apiFetch('/api/config/cargos');
}

export function createCargo(payload) {
    return apiFetch('/api/config/cargos', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export function updateCargo(id, payload) {
    return apiFetch(`/api/config/cargos/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
}

export function deleteCargo(id) {
    return apiFetch(`/api/config/cargos/${id}`, {
        method: 'DELETE',
    });
}

export function fetchBancosConfig() {
    return apiFetch('/api/config/bancos');
}

export function createBanco(payload) {
    return apiFetch('/api/config/bancos', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export function updateBanco(id, payload) {
    return apiFetch(`/api/config/bancos/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
}

export function deleteBanco(id) {
    return apiFetch(`/api/config/bancos/${id}`, {
        method: 'DELETE',
    });
}

export function fetchRotasEntrega() {
    return apiFetch('/api/config/rotas-entrega');
}

export function fetchFreteCidadeRota(id) {
    return apiFetch(`/api/config/frete-cidades/${id}/rota`);
}

export function fetchRotaCidade({ cidade, uf }) {
    const params = new URLSearchParams({
        cidade: String(cidade || '').trim(),
        uf: String(uf || '').trim().toUpperCase(),
    });
    return apiFetch(`/api/config/rota-cidade?${params.toString()}`);
}
