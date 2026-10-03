async function parseJson(response) {
    try {
        return await response.json();
    } catch {
        return {};
    }
}

export async function apiFetch(url, options = {}) {
    const response = await fetch(url, {
        credentials: 'include',
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        }
    });

    const data = await parseJson(response);

    if (response.status === 401) {
        const onMobile = window.location.pathname.startsWith('/mobile');
        window.location.href = onMobile ? '/mobile/login' : '/login';
        throw new Error('Sessão expirada. Faça login novamente.');
    }

    if (!response.ok) {
        const fallbackMessage = typeof data.message === 'string'
            ? data.message
            : `Erro na requisição (${response.status}).`;
        throw new Error(fallbackMessage);
    }

    return data;
}
