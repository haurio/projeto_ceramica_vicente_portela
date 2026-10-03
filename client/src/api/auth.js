const jsonHeaders = { 'Content-Type': 'application/json' };

async function parseJson(response) {
    try {
        return await response.json();
    } catch {
        return {};
    }
}

export async function checkSession() {
    try {
        const response = await fetch('/check-session', { credentials: 'include' });
        const data = await parseJson(response);

        if (!response.ok) {
            return { authenticated: false, user: null };
        }

        return {
            authenticated: Boolean(data.authenticated),
            user: data.user ?? null
        };
    } catch {
        return { authenticated: false, user: null };
    }
}

export async function login(username, password) {
    const response = await fetch('/login', {
        method: 'POST',
        headers: jsonHeaders,
        credentials: 'include',
        body: JSON.stringify({ username, password })
    });

    const data = await parseJson(response);

    if (!response.ok) {
        throw new Error(data.message || 'Usuário ou senha inválidos.');
    }

    return {
        ...data,
        user: data.user ?? null
    };
}

export async function loginMobile(email, password) {
    const response = await fetch('/mobile/login', {
        method: 'POST',
        headers: jsonHeaders,
        credentials: 'include',
        body: JSON.stringify({ email, password })
    });

    const data = await parseJson(response);

    if (!response.ok) {
        throw new Error(data.message || 'E-mail ou senha inválidos.');
    }

    return {
        ...data,
        user: data.user ?? null
    };
}

export async function logout() {
    const response = await fetch('/logout', {
        method: 'POST',
        credentials: 'include'
    });

    const data = await parseJson(response);

    if (!response.ok) {
        throw new Error(data.message || 'Erro ao sair do sistema.');
    }

    return data;
}

export async function registerUser(payload) {
    const response = await fetch('/register', {
        method: 'POST',
        headers: jsonHeaders,
        credentials: 'include',
        body: JSON.stringify(payload)
    });

    const data = await parseJson(response);

    if (!response.ok) {
        throw new Error(data.message || 'Não foi possível criar o usuário.');
    }

    return data;
}
