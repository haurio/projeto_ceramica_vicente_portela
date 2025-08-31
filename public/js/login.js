document.addEventListener('DOMContentLoaded', function () {
    console.log('login.js carregado em:', new Date().toISOString());

    // Função para enviar logs ao servidor
    async function logToServer(level, msg, metadata = {}) {
        try {
            await fetch('/log-client', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ msg, level, module: 'login', stack: metadata.stack || '' })
            });
        } catch (error) {
            console.error('Erro ao enviar log para o servidor:', error);
        }
    }

    // Função para limpar os campos do formulário
    function clearFormFields() {
        const loginForm = document.getElementById('loginForm');
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');

        if (loginForm && usernameInput && passwordInput) {
            console.log('Formulário e campos encontrados. Limpando campos...');
            loginForm.reset();
            usernameInput.value = '';
            passwordInput.value = '';
            usernameInput.setAttribute('autocomplete', 'off');
            passwordInput.setAttribute('autocomplete', 'off');
            console.log('Campos limpos:', usernameInput.value, passwordInput.value);
            logToServer('info', 'Campos de login limpos ao carregar a página');
        } else {
            console.error('Erro: Formulário ou campos não encontrados.', {
                loginForm: !!loginForm,
                usernameInput: !!usernameInput,
                passwordInput: !!passwordInput
            });
            logToServer('error', 'Formulário ou campos de login não encontrados');
        }
    }

    // Limpar os campos ao carregar a página
    clearFormFields();

    // Limpar os campos ao restaurar a página do cache (ex.: botão "Voltar")
    window.onpageshow = function(event) {
        if (event.persisted || (window.performance && window.performance.navigation.type === 2)) {
            console.log('Página restaurada do cache. Limpando campos...');
            clearFormFields();
        }
    };

    // Atualiza o ano no footer
    const anoAtual = document.getElementById('anoAtual');
    if (anoAtual) {
        anoAtual.textContent = new Date().getFullYear();
        logToServer('info', 'Ano atualizado no footer');
    } else {
        console.error('Elemento anoAtual não encontrado');
        logToServer('error', 'Elemento anoAtual não encontrado');
    }

    // Configuração inicial do toastr com depuração
    if (typeof toastr !== 'undefined') {
        toastr.options = {
            positionClass: 'toast-top-right',
            timeOut: 1000,
            closeButton: true
        };
        console.log('toastr inicializado com sucesso em login.js');
        logToServer('info', 'toastr inicializado com sucesso');
    } else {
        console.warn('toastr não está definido em login.js. Notificações serão exibidas como alert.');
        logToServer('warn', 'toastr não está definido');
    }

    // Lógica de envio do formulário de login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value.trim();

            // Validação básica no frontend
            if (!username || !password) {
                const msg = 'Usuário e senha são obrigatórios.';
                if (typeof toastr !== 'undefined') {
                    toastr.warning(msg, 'Aviso');
                } else {
                    alert(msg);
                }
                logToServer('warn', msg);
                return;
            }

            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, password })
                });

                const result = await response.json();
                console.log('Resposta do servidor:', result);
                logToServer('info', 'Resposta do servidor para login', { result });

                if (response.ok) {
                    logToServer('success', 'Login bem-sucedido', { username });
                    // Limpar os campos após autenticação bem-sucedida
                    document.getElementById('username').value = '';
                    document.getElementById('password').value = '';
                    // Redirecionar imediatamente para Home.html
                    window.location.href = '/Home.html?success=login';
                } else {
                    const msg = result.message || 'Usuário ou senha inválidos.';
                    if (typeof toastr !== 'undefined') {
                        toastr.error(msg, 'Erro');
                    } else {
                        alert(msg);
                    }
                    logToServer('error', msg);
                }
            } catch (error) {
                console.error('Erro na requisição:', error);
                const msg = 'Erro no servidor. Tente novamente mais tarde.';
                if (typeof toastr !== 'undefined') {
                    toastr.error(msg, 'Erro');
                } else {
                    alert(msg);
                }
                logToServer('error', msg, { stack: error.stack });
            }
        });
    }

    // Lógica do modal
    const modal = document.getElementById('supportModal');
    const openModalBtn = document.getElementById('openModal');
    const closeBtn = document.querySelector('.close-btn');
    const modalCloseBtn = document.querySelector('.modal-close-btn');

    if (openModalBtn && modal && closeBtn && modalCloseBtn) {
        openModalBtn.addEventListener('click', function (e) {
            e.preventDefault();
            modal.style.display = 'flex';
            logToServer('info', 'Modal de suporte aberto');
        });

        closeBtn.addEventListener('click', function () {
            modal.style.display = 'none';
            logToServer('info', 'Modal de suporte fechado');
        });

        modalCloseBtn.addEventListener('click', function () {
            modal.style.display = 'none';
            logToServer('info', 'Modal de suporte fechado pelo botão de fechar');
        });

        document.addEventListener('click', function (e) {
            if (!e.target.closest('.modal-content') && !e.target.closest('#openModal')) {
                modal.style.display = 'none';
                logToServer('info', 'Modal de suporte fechado por clique fora');
            }
        });
    }

    // Função para alternar visibilidade da senha
    window.togglePassword = function(fieldId) {
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
    };

    // Redirecionamento para register.html ao clicar no botão devRedirect com Ctrl
    const devRedirect = document.getElementById('devRedirect');
    if (devRedirect) {
        devRedirect.addEventListener('click', function(e) {
            if (e.ctrlKey) { // Só redireciona se Ctrl estiver pressionado
                window.location.href = '/register';
                logToServer('info', 'Redirecionamento para página de registro com Ctrl+click');
            }
        });
    }
});