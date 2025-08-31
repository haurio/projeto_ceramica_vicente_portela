if (typeof toastr !== 'undefined') {
    toastr.options = {
        positionClass: 'toast-top-right',
        timeOut: 5000,
        closeButton: true
    };
    console.log('toastr inicializado com sucesso em register.js');
    logToServer('info', 'toastr inicializado com sucesso');
} else {
    console.warn('toastr não está definido em register.js. Usando alert.');
    logToServer('warn', 'toastr não está definido');
}

// Função para enviar logs ao servidor
async function logToServer(level, message, metadata = {}) {
    try {
        await fetch('/log-client', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, level, module: 'register', stack: metadata.stack || '' })
        });
    } catch (error) {
        console.error('Erro ao enviar log para o servidor:', error);
    }
}

document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm_password').value;
    const full_name = document.getElementById('full_name').value.trim();
    const status = document.getElementById('status').value;

    console.log('Enviando dados para /register:', { username, email, full_name, status });
    logToServer('info', 'Enviando dados para /register', { username, email, full_name, status });

    // Validação básica no frontend
    if (!username || !email || !password || !confirmPassword || !full_name || !status) {
        const message = 'Todos os campos são obrigatórios.';
        if (typeof toastr !== 'undefined') {
            toastr.warning(message, 'Aviso');
        } else {
            alert(message);
        }
        logToServer('warn', message);
        return;
    }

    if (password !== confirmPassword) {
        const message = 'As senhas não coincidem.';
        if (typeof toastr !== 'undefined') {
            toastr.warning(message, 'Aviso');
        } else {
            alert(message);
        }
        logToServer('warn', message);
        return;
    }

    // Enviar dados para o backend
    try {
        const response = await fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password, full_name, status })
        });

        const result = await response.json();
        console.log('Resposta do servidor:', result);
        logToServer('info', 'Resposta do servidor para registro', { result });

        if (response.ok) {
            if (typeof toastr !== 'undefined') {
                toastr.success('Usuário registrado com sucesso!', 'Sucesso');
            } else {
                alert('Usuário registrado com sucesso!');
            }
            logToServer('success', 'Usuário registrado com sucesso', { username });
            setTimeout(() => {
                window.location.href = '/login';
            }, 2000);
        } else {
            const message = result.message || 'Erro ao registrar usuário.';
            if (typeof toastr !== 'undefined') {
                toastr.error(message, 'Erro');
            } else {
                alert(message);
            }
            logToServer('error', message);
        }

        // Limpar os campos após o processamento
        document.getElementById('username').value = '';
        document.getElementById('email').value = '';
        document.getElementById('password').value = '';
        document.getElementById('confirm_password').value = '';
        document.getElementById('full_name').value = '';
        document.getElementById('status').value = '';
    } catch (error) {
        console.error('Erro ao enviar requisição:', error);
        const message = 'Erro no servidor. Tente novamente mais tarde.';
        if (typeof toastr !== 'undefined') {
            toastr.error(message, 'Erro');
        } else {
            alert(message);
        }
        logToServer('error', message, { stack: error.stack });
        // Limpar os campos em caso de erro
        document.getElementById('username').value = '';
        document.getElementById('email').value = '';
        document.getElementById('password').value = '';
        document.getElementById('confirm_password').value = '';
        document.getElementById('full_name').value = '';
        document.getElementById('status').value = '';
    }
});

// Função para alternar visibilidade da senha
function togglePassword(fieldId) {
    const passwordInput = document.getElementById(fieldId);
    const toggleIcon = passwordInput.nextElementSibling.querySelector('i');
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.className = 'fas fa-eye-slash';
        logToServer('info', `Visibilidade da senha alterada para visível (${fieldId})`);
    } else {
        passwordInput.type = 'password';
        toggleIcon.className = 'fas fa-eye';
        logToServer('info', `Visibilidade da senha alterada para oculta (${fieldId})`);
    }
}