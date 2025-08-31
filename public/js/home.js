document.addEventListener('DOMContentLoaded', function () {
    // Função para enviar logs ao servidor
    function logToServer(level, message, module) {
        fetch('/log-client', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ msg: message, level, module, stack: '' })
        }).catch(err => {
            alert('Erro ao registrar log no servidor: ' + err.message);
        });
    }

    // Verificar sessão ao carregar a página
    function checkSession() {
        fetch('/check-session', {
            method: 'GET',
            credentials: 'include' // Enviar cookies de sessão
        })
        .then(response => {
            if (!response.ok) {
                logToServer('warn', 'Sessão inválida ou expirada, redirecionando para login', 'home');
                window.location.href = '/login.html';
            }
        })
        .catch(err => {
            logToServer('error', 'Erro ao verificar sessão: ' + err.message, 'home');
            window.location.href = '/login.html';
        });
    }

    // Chamar verificação de sessão ao carregar a página
    checkSession();

    // Configurar logout no botão "Sair"
    document.querySelector('a[href="/logout"]').addEventListener('click', function (e) {
        e.preventDefault();
        fetch('/logout', {
            method: 'POST',
            credentials: 'include'
        })
        .then(response => {
            if (response.ok) {
                logToServer('success', 'Logout realizado com sucesso', 'home');
                window.location.href = '/login.html';
            } else {
                logToServer('error', 'Erro ao realizar logout', 'home');
                alert('Erro ao realizar logout');
            }
        })
        .catch(err => {
            logToServer('error', 'Erro ao realizar logout: ' + err.message, 'home');
            alert('Erro ao realizar logout: ' + err.message);
        });
    });

    // Atualiza o ano no footer
    document.getElementById("anoAtual").textContent = new Date().getFullYear();

    // Configuração inicial do toastr
    if (typeof toastr !== 'undefined') {
        toastr.options = {
            positionClass: 'toast-top-right',
            timeOut: 1000,
            closeButton: true
        };
        logToServer('success', 'toastr inicializado com sucesso em Home.html', 'home');

        // Verificar parâmetro de URL para exibir toastr de sucesso
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('success') === 'login') {
            toastr.success('Login realizado com sucesso!', 'Sucesso');
            logToServer('success', 'Login realizado com sucesso', 'home');
            window.history.replaceState({}, document.title, '/Home.html');
        }
    } else {
        logToServer('warn', 'toastr não está definido em Home.html. Notificações serão exibidas como alert.', 'home');
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('success') === 'login') {
            alert('Login realizado com sucesso!');
            logToServer('success', 'Login realizado com sucesso', 'home');
            window.history.replaceState({}, document.title, '/Home.html');
        }
    }

    // Inicializar FullCalendar
    var calendarEl = document.getElementById('calendar');
    var calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        initialDate: '2025-08-18',
        locale: 'pt-br',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        events: [
            {
                title: 'Entrega Pedido #123 - Cliente A',
                start: '2025-08-18T10:00:00',
                end: '2025-08-18T12:00:00'
            },
            {
                title: 'Entrega Pedido #456 - Cliente B',
                start: '2025-08-18T14:00:00',
                end: '2025-08-18T16:00:00'
            }
        ]
    });
    calendar.render();

    // Popular pedidos do dia (mock)
    const ordersList = document.getElementById('orders-list');
    const mockOrders = ['Pedido #123 - R$500 - Cliente A', 'Pedido #456 - R$300 - Cliente B'];
    mockOrders.forEach(order => {
        const li = document.createElement('li');
        li.textContent = order;
        ordersList.appendChild(li);
    });

    // Popular pagamentos pendentes (mock)
    const paymentsList = document.getElementById('payments-list');
    const mockPayments = ['Pagamento #789 - R$200 - Vencido hoje', 'Pagamento #101 - R$150 - Vencido hoje'];
    mockPayments.forEach(payment => {
        const li = document.createElement('li');
        li.textContent = payment;
        paymentsList.appendChild(li);
    });

    // Popular férias atrasadas (mock)
    const vacationsList = document.getElementById('vacations-list');
    const mockEmployees = [
        { name: 'Funcionário X', dueDate: '2024-06-01' },
        { name: 'Funcionário Y', dueDate: '2025-07-01' }
    ];
    mockEmployees.forEach(emp => {
        const today = new Date('2025-08-18');
        const due = new Date(emp.dueDate);
        const monthsOverdue = (today - due) / (1000 * 60 * 60 * 24 * 30);
        if (monthsOverdue > 12) {
            const li = document.createElement('li');
            li.textContent = `${emp.name} - Atrasada em ${Math.floor(monthsOverdue - 12)} meses`;
            vacationsList.appendChild(li);
        }
    });

    // Inicializar gráfico de vendas por mês (gráfico de linha)
    const salesChart = document.getElementById('sales-chart').getContext('2d');
    new Chart(salesChart, {
        type: 'line',
        data: {
            labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago'],
            datasets: [{
                label: 'Vendas (R$)',
                data: [5000, 7000, 6000, 8000, 9000, 10000, 9500, 11000],
                backgroundColor: 'rgba(192, 57, 43, 0.2)',
                borderColor: 'rgba(192, 57, 43, 1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            scales: {
                y: { beginAtZero: true }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });

    // Toggle da sidebar
    const toggleBtn = document.getElementById('toggle-sidebar');
    const sidebar = document.querySelector('.sidebar');
    const logo = document.querySelector('.sidebar-logo .logo');
    toggleBtn.addEventListener('click', function () {
        sidebar.classList.toggle('collapsed');
        if (sidebar.classList.contains('collapsed')) {
            logo.src = 'image/ico.png';
            toggleBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
        } else {
            logo.src = 'image/logo.png';
            toggleBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
        }
    });
});