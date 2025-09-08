$(document).ready(function () {
    // Verificar se jQuery está carregado
    if (typeof $ === 'undefined') {
        console.error('jQuery não está carregado');
        alert('Erro: jQuery não está carregado. Verifique o carregamento do script.');
        return;
    }

    // Verificar se Toastr está carregado
    if (typeof toastr === 'undefined') {
        console.error('Toastr não está carregado');
        alert('Erro: Toastr não está carregado. Verifique o carregamento do script.');
        return;
    }

    // Verificar se Moment.js está carregado
    if (typeof moment === 'undefined') {
        console.error('Moment.js não está carregado');
        alert('Erro: Moment.js não está carregado. Verifique o carregamento do script.');
        return;
    }

    // Aplicar novalidate ao formulário
    $('#employee-form').attr('novalidate', 'novalidate');

    // Mapeamento de nomes de campos para mensagens amigáveis
    const fieldNames = {
        name: 'Nome',
        cpf: 'CPF',
        birth_date: 'Data de Nascimento',
        birth_city: 'Cidade de Nascimento',
        birth_state: 'Estado de Nascimento',
        nationality: 'Nacionalidade',
        education_level: 'Nível de Escolaridade',
        phone: 'Telefone',
        marital_status: 'Estado Civil',
        email: 'E-mail',
        identity_number: 'Número da Identidade',
        identity_issue_date: 'Data de Emissão da Identidade',
        identity_issuer: 'Emissor da Identidade',
        identity_state: 'Estado da Identidade',
        father_name: 'Nome do Pai',
        mother_name: 'Nome da Mãe',
        has_children: 'Possui Filhos',
        cep: 'CEP',
        city: 'Cidade',
        state: 'Estado',
        street: 'Rua',
        number: 'Número',
        neighborhood: 'Bairro',
        ctps: 'CTPS',
        ctps_state: 'Estado da CTPS',
        ctps_issue_date: 'Data de Emissão da CTPS',
        pis: 'PIS',
        admission_date: 'Data de Admissão',
        salary: 'Salário',
        cargo_id: 'Cargo',
        departamento_id: 'Departamento',
        monthly_hours: 'Horas Mensais',
        weekly_hours: 'Horas Semanais',
        trial_period: 'Período de Experiência',
        status: 'Status',
        payment_method: 'Forma de Pagamento',
        weekday_start: 'Início da Jornada (Dias Úteis)',
        weekday_end: 'Fim da Jornada (Dias Úteis)',
        pix_key: 'Chave PIX',
        bank: 'Banco',
        agency: 'Agência',
        account: 'Conta',
        account_type: 'Tipo de Conta',
        leave_reason: 'Motivo de Afastamento',
        dismissal_date: 'Data de Demissão'
    };

    // Função para enviar logs ao servidor
    async function logToServer(level, msg, metadata = {}) {
        try {
            await $.ajax({
                url: '/log-client',
                method: 'POST',
                contentType: 'application/json',
                xhrFields: { withCredentials: true },
                data: JSON.stringify({
                    msg,
                    level,
                    module: 'funcionarios',
                    stack: metadata.stack || '',
                    metadata: {
                        ...metadata,
                        timestamp: moment().tz('Europe/Lisbon').format('YYYY-MM-DD HH:mm:ss'),
                        userAgent: navigator.userAgent
                    }
                })
            });
            console.log('Log enviado ao servidor:', msg);
        } catch (error) {
            console.error('Erro ao enviar log para o servidor:', error);
        }
    }

    // Verificar sessão ao carregar a página
    function checkSession() {
        console.log('Verificando sessão');
        $.ajax({
            url: '/check-session',
            method: 'GET',
            xhrFields: { withCredentials: true },
            success: function (response) {
                if (!response.authenticated) {
                    logToServer('warn', 'Sessão inválida ou expirada, redirecionando para login', { module: 'funcionarios' });
                    window.location.href = '/login.html';
                }
            },
            error: function (xhr) {
                console.error('Erro ao verificar sessão:', xhr);
                logToServer('error', 'Erro ao verificar sessão', { status: xhr.status });
                window.location.href = '/login.html';
            }
        });
    }

    // Chamar verificação de sessão
    checkSession();

    // Configurar logout no botão "Sair"
    $('a[href="/logout"]').on('click', function (e) {
        e.preventDefault();
        console.log('Botão Sair clicado');
        $.ajax({
            url: '/logout',
            method: 'POST',
            xhrFields: { withCredentials: true },
            success: function () {
                logToServer('success', 'Logout realizado com sucesso', { module: 'funcionarios' });
                window.location.href = '/login.html';
            },
            error: function (xhr) {
                console.error('Erro ao realizar logout:', xhr);
                logToServer('error', 'Erro ao realizar logout', { status: xhr.status });
                toastr.error('Erro ao realizar logout.');
            }
        });
    });

    // Configurar Toastr
    toastr.options = {
        closeButton: true,
        progressBar: true,
        positionClass: 'toast-top-right',
        timeOut: 5000,
        preventDuplicates: true
    };

    // Máscaras de entrada
    console.log('Aplicando máscaras de entrada');
    try {
        $('#cpf').mask('000.000.000-00');
        $('#phone').mask('(00) 00000-0000');
        $('#cep').mask('00000-000');
        $('#pis').mask('000.00000.00-0');
        $('#ctps').mask('0000000/0000');
    } catch (error) {
        console.error('Erro ao aplicar máscaras:', error);
        toastr.error('Erro ao aplicar máscaras de entrada. Verifique o plugin jQuery Mask.');
        logToServer('error', 'Erro ao aplicar máscaras', { error: error.message });
    }

    // Função para formatar datas ISO para YYYY-MM-DD
    function formatDateForInput(isoDate) {
        if (!isoDate) return '';
        return moment(isoDate).format('YYYY-MM-DD');
    }

    // Função para carregar opções de departamento, cargo e bancos
    function loadSelectOptions() {
        return new Promise((resolve, reject) => {
            console.log('Carregando opções de departamento, cargo e bancos');
            $.ajax({
                url: '/api/options',
                method: 'GET',
                xhrFields: { withCredentials: true },
                success: function (data) {
                    console.log('Resposta de /api/options:', data);
                    const $departmentSelect = $('#department');
                    const $positionSelect = $('#position');
                    const $pixBankSelect = $('#pix_bank');
                    const $transferBankSelect = $('#transfer_bank');

                    $departmentSelect.empty().append('<option value="">Selecione um departamento</option>');
                    $positionSelect.empty().append('<option value="">Selecione um cargo</option>');
                    $pixBankSelect.empty().append('<option value="">Selecione um banco</option>');
                    $transferBankSelect.empty().append('<option value="">Selecione um banco</option>');

                    if (data.departments && Array.isArray(data.departments)) {
                        data.departments.forEach(dep => {
                            $departmentSelect.append(`<option value="${dep.value}">${dep.text}</option>`);
                        });
                    } else {
                        console.warn('Nenhum departamento retornado pela API /api/options');
                        toastr.warning('Nenhum departamento disponível.');
                    }

                    if (data.positions && Array.isArray(data.positions)) {
                        data.positions.forEach(pos => {
                            $positionSelect.append(`<option value="${pos.value}" data-department-id="${pos.department_id}">${pos.text}</option>`);
                        });
                    } else {
                        console.warn('Nenhum cargo retornado pela API /api/options');
                        toastr.warning('Nenhum cargo disponível.');
                    }

                    if (data.banks && Array.isArray(data.banks)) {
                        data.banks.forEach(bank => {
                            $pixBankSelect.append(`<option value="${bank.value}">${bank.text}</option>`);
                            $transferBankSelect.append(`<option value="${bank.value}">${bank.text}</option>`);
                        });
                    } else {
                        console.warn('Nenhum banco retornado pela API /api/options');
                        toastr.warning('Nenhum banco disponível.');
                    }

                    const pixBankOptions = $pixBankSelect.find('option').map(function() { return $(this).val(); }).get();
                    const transferBankOptions = $transferBankSelect.find('option').map(function() { return $(this).val(); }).get();
                    console.log('Opções disponíveis em #pix_bank:', pixBankOptions);
                    console.log('Opções disponíveis em #transfer_bank:', transferBankOptions);
                    logToServer('info', 'Opções de departamento, cargo e bancos carregadas', {
                        departmentCount: data.departments ? data.departments.length : 0,
                        positionCount: data.positions ? data.positions.length : 0,
                        bankCount: data.banks ? data.banks.length : 0,
                        pixBankOptions,
                        transferBankOptions
                    });

                    resolve(data.banks || []);
                },
                error: function (xhr) {
                    console.error('Erro ao carregar opções:', xhr);
                    const msg = xhr.responseJSON?.message || 'Erro ao carregar opções de departamento, cargo e bancos.';
                    if (xhr.status === 401) {
                        logToServer('warn', 'Usuário não autenticado, redirecionando para login', { status: xhr.status });
                        window.location.href = '/login.html';
                        return;
                    }
                    toastr.error(msg);
                    logToServer('error', msg, { status: xhr.status });
                    reject(new Error(msg));
                }
            });
        });
    }

    // Função para carregar os funcionários na tabela
    function loadEmployees() {
        console.log('Carregando lista de funcionários');
        $.ajax({
            url: '/api/employees',
            method: 'GET',
            xhrFields: { withCredentials: true },
            success: function (employees) {
                console.log('Funcionários recebidos:', employees);
                const tbody = $('#employees-table tbody');
                tbody.empty();
                employees.forEach(employee => {
                    const row = `
                        <tr class="employee-row" data-id="${employee.id}" style="cursor: pointer;">
                            <td>${employee.name || ''}</td>
                            <td>${employee.cpf || ''}</td>
                            <td>${employee.position || ''}</td>
                            <td>${employee.email || ''}</td>
                            <td>${employee.department || ''}</td>
                            <td>${employee.status || ''}</td>
                        </tr>
                    `;
                    tbody.append(row);
                });
                console.log('Funcionários carregados:', employees.length);
                logToServer('info', 'Lista de funcionários carregada com sucesso', { count: employees.length });
            },
            error: function (xhr) {
                console.error('Erro ao carregar funcionários:', xhr);
                const msg = xhr.responseJSON?.message || 'Erro ao carregar funcionários.';
                if (xhr.status === 401) {
                    logToServer('warn', 'Usuário não autenticado, redirecionando para login', { status: xhr.status });
                    window.location.href = '/login.html';
                    return;
                }
                toastr.error(msg);
                logToServer('error', msg, { status: xhr.status });
            }
        });
    }

    // Função para limpar o formulário
    function clearForm() {
        console.log('Limpando formulário');
        $('#employee-form')[0].reset();
        $('#employee-id').val('');
        $('#leave-reason-group, #dismissal-date-group').addClass('d-none');
        $('#dependents-list').empty();
        $('#pix-group, #transfer-group').addClass('d-none');
        $('.days-off-container input[type="checkbox"]').prop('checked', false);
        $('.form-control, .form-select').removeClass('is-invalid');
        $('.days-off-container').removeClass('is-invalid');
        $('.dependent-item').removeClass('is-invalid');
        logToServer('info', 'Formulário limpo');
    }

    // Função para validar CPF
    function validateCPF(cpf) {
        cpf = cpf.replace(/[^\d]+/g, '');
        if (cpf.length !== 11) {
            console.log('CPF inválido: tamanho incorreto', cpf);
            return false;
        }
        let sum = 0;
        for (let i = 0; i < 9; i++) sum += parseInt(cpf.charAt(i)) * (10 - i);
        let digit = 11 - (sum % 11);
        if (digit >= 10) digit = 0;
        if (digit !== parseInt(cpf.charAt(9))) {
            console.log('CPF inválido: primeiro dígito verificador', cpf);
            return false;
        }
        sum = 0;
        for (let i = 0; i < 10; i++) sum += parseInt(cpf.charAt(i)) * (11 - i);
        digit = 11 - (sum % 11);
        if (digit >= 10) digit = 0;
        if (digit !== parseInt(cpf.charAt(10))) {
            console.log('CPF inválido: segundo dígito verificador', cpf);
            return false;
        }
        return true;
    }

    // Função para validar e-mail
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    // Função para encontrar a aba de um campo
    function findTabForField(fieldName) {
        let $field = $(`[name="${fieldName}"]`);
        if ($field.length) {
            return $field.closest('.tab-pane').attr('id') || 'personal';
        }
        return 'personal'; // Aba padrão
    }

    // Função para validar o formulário
    function validateForm(data) {
        console.log('Validando formulário:', data);
        let isValid = true;
        const requiredFields = [
            'name', 'cpf', 'birth_date', 'birth_city', 'birth_state', 'nationality',
            'education_level', 'phone', 'marital_status', 'email', 'identity_number',
            'identity_issue_date', 'identity_issuer', 'identity_state', 'father_name',
            'mother_name', 'has_children', 'cep', 'city', 'state', 'street', 'number',
            'neighborhood', 'ctps', 'ctps_state', 'ctps_issue_date', 'pis', 'admission_date',
            'salary', 'cargo_id', 'departamento_id', 'monthly_hours', 'weekly_hours',
            'trial_period', 'status', 'payment_method', 'weekday_start', 'weekday_end'
        ];

        let firstInvalidTab = null;

        // Validar campos obrigatórios
        for (let field of requiredFields) {
            if (!data[field] || data[field] === '') {
                console.log(`Campo obrigatório ausente: ${field}`);
                toastr.error(`O campo ${fieldNames[field] || field.replace('_', ' ')} é obrigatório.`);
                $(`[name="${field}"]`).addClass('is-invalid');
                if (!firstInvalidTab) {
                    firstInvalidTab = findTabForField(field);
                }
                isValid = false;
            }
        }

        // Validar CPF
        if (data.cpf && !validateCPF(data.cpf)) {
            console.log('CPF inválido:', data.cpf);
            toastr.error('CPF inválido.');
            $('#cpf').addClass('is-invalid');
            if (!firstInvalidTab) {
                firstInvalidTab = findTabForField('cpf');
            }
            isValid = false;
        }

        // Validar e-mail
        if (data.email && !validateEmail(data.email)) {
            console.log('E-mail inválido:', data.email);
            toastr.error('E-mail inválido.');
            $('#email').addClass('is-invalid');
            if (!firstInvalidTab) {
                firstInvalidTab = findTabForField('email');
            }
            isValid = false;
        }

        // Validar campos bancários para PIX
        if (data.payment_method === 'PIX') {
            if (!data.pix_key) {
                console.log('Chave PIX ausente');
                toastr.error('O campo Chave PIX é obrigatório.');
                $('#pix_key').addClass('is-invalid');
                if (!firstInvalidTab) {
                    firstInvalidTab = findTabForField('pix_key');
                }
                isValid = false;
            }
            if (!data.bank) {
                console.log('Banco ausente para PIX');
                toastr.error('O campo Banco é obrigatório para PIX.');
                $('#pix_bank').addClass('is-invalid');
                if (!firstInvalidTab) {
                    firstInvalidTab = findTabForField('bank');
                }
                isValid = false;
            }
        }

        // Validar campos bancários para Transferência
        if (data.payment_method === 'Transferência') {
            if (!data.bank) {
                console.log('Banco ausente para Transferência');
                toastr.error('O campo Banco é obrigatório para Transferência.');
                $('#transfer_bank').addClass('is-invalid');
                if (!firstInvalidTab) {
                    firstInvalidTab = findTabForField('bank');
                }
                isValid = false;
            }
            if (!data.agency) {
                console.log('Agência ausente');
                toastr.error('O campo Agência é obrigatório.');
                $('#agency').addClass('is-invalid');
                if (!firstInvalidTab) {
                    firstInvalidTab = findTabForField('agency');
                }
                isValid = false;
            }
            if (!data.account) {
                console.log('Conta ausente');
                toastr.error('O campo Conta é obrigatório.');
                $('#account').addClass('is-invalid');
                if (!firstInvalidTab) {
                    firstInvalidTab = findTabForField('account');
                }
                isValid = false;
            }
            if (!data.account_type) {
                console.log('Tipo de conta ausente');
                toastr.error('O campo Tipo de Conta é obrigatório.');
                $('#account_type').addClass('is-invalid');
                if (!firstInvalidTab) {
                    firstInvalidTab = findTabForField('account_type');
                }
                isValid = false;
            }
        }

        // Validar motivo de afastamento
        if (data.status === 'Afastado' && !data.leave_reason) {
            console.log('Motivo de afastamento ausente');
            toastr.error('O campo Motivo de Afastamento é obrigatório para o status Afastado.');
            $('#leave_reason').addClass('is-invalid');
            if (!firstInvalidTab) {
                firstInvalidTab = findTabForField('leave_reason');
            }
            isValid = false;
        }

        // Validar data de demissão
        if (data.status === 'Demitido' && !data.dismissal_date) {
            console.log('Data de demissão ausente');
            toastr.error('O campo Data de Demissão é obrigatório para o status Demitido.');
            $('#dismissal_date').addClass('is-invalid');
            if (!firstInvalidTab) {
                firstInvalidTab = findTabForField('dismissal_date');
            }
            isValid = false;
        }

        // Validar dias de folga
        if (!Array.isArray(data.days_off) || data.days_off.length === 0) {
            console.log('Nenhum dia de folga selecionado');
            toastr.error('Pelo menos um dia de folga deve ser selecionado.');
            $('.days-off-container').addClass('is-invalid');
            if (!firstInvalidTab) {
                firstInvalidTab = 'work';
            }
            isValid = false;
        }

        // Ativar a aba com o primeiro campo inválido
        if (!isValid && firstInvalidTab) {
            console.log('Ativando aba com erro:', firstInvalidTab);
            $('[href="#' + firstInvalidTab + '"]').tab('show');
            logToServer('warn', 'Validação do formulário falhou, aba ativada', { tab: firstInvalidTab });
        }

        if (isValid) {
            console.log('Validação bem-sucedida');
            logToServer('info', 'Validação do formulário bem-sucedida', { data });
        } else {
            logToServer('warn', 'Validação do formulário falhou', { invalidFields: requiredFields.filter(f => !data[f] || data[f] === '') });
        }

        return isValid;
    }

    // Carregar opções e funcionários ao iniciar
    console.log('Iniciando carregamento de opções e funcionários');
    loadSelectOptions().then(() => {
        loadEmployees();
    }).catch(error => {
        console.error('Erro ao inicializar:', error);
        toastr.error('Erro ao inicializar o sistema.');
        logToServer('error', 'Erro ao inicializar o sistema', { error: error.message });
    });

    // Evento para abrir o modal de adição
    $('#add-employee-btn').click(function () {
        console.log('Botão Adicionar Funcionário clicado');
        $('#modal-title').html('<i class="fas fa-user-plus me-2"></i><strong>Adicionar Funcionário</strong>');
        clearForm();
        $('#employee-modal').modal('show');
        logToServer('info', 'Modal de adição de funcionário aberto');
    });

    // Evento para carregar dados do funcionário ao clicar na linha da tabela
    $('#employees-table').on('click', '.employee-row', function () {
        const id = $(this).data('id');
        console.log('Carregando dados do funcionário com ID:', id);
        loadSelectOptions().then((banks) => {
            $.ajax({
                url: `/api/employees/${id}`,
                method: 'GET',
                xhrFields: { withCredentials: true },
                success: function (employee) {
                    console.log('Dados do funcionário carregados:', employee);
                    $('#modal-title').html('<i class="fas fa-user-edit me-2"></i><strong>Editar Funcionário</strong>');
                    clearForm();

                    $('#employee-id').val(employee.id);
                    $('#name').val(employee.name);
                    $('#cpf').val(employee.cpf);
                    $('#birth_date').val(formatDateForInput(employee.birth_date));
                    $('#birth_city').val(employee.birth_city);
                    $('#birth_state').val(employee.birth_state);
                    $('#nationality').val(employee.nationality);
                    $('#education_level').val(employee.education_level);
                    $('#phone').val(employee.phone);
                    $('#marital_status').val(employee.marital_status);
                    $('#email').val(employee.email);
                    $('#voter_id').val(employee.voter_id || '');
                    $('#voter_zone').val(employee.voter_zone || '');
                    $('#voter_section').val(employee.voter_section || '');
                    $('#military_id').val(employee.military_id || '');
                    $('#military_category').val(employee.military_category || '');
                    $('#identity_number').val(employee.identity_number);
                    $('#identity_issue_date').val(formatDateForInput(employee.identity_issue_date));
                    $('#identity_issuer').val(employee.identity_issuer);
                    $('#identity_state').val(employee.identity_state);
                    $('#father_name').val(employee.father_name);
                    $('#mother_name').val(employee.mother_name);
                    $('#spouse').val(employee.spouse || '');
                    $('#has_children').val(employee.has_children);
                    $('#cep').val(employee.cep);
                    $('#city').val(employee.city);
                    $('#state').val(employee.state);
                    $('#street').val(employee.street);
                    $('#number').val(employee.number);
                    $('#neighborhood').val(employee.neighborhood);
                    $('#complement').val(employee.complement || '');
                    $('#ctps').val(employee.ctps);
                    $('#ctps_state').val(employee.ctps_state);
                    $('#ctps_issue_date').val(formatDateForInput(employee.ctps_issue_date));
                    $('#pis').val(employee.pis);
                    $('#admission_date').val(formatDateForInput(employee.admission_date));
                    $('#salary').val(employee.salary);
                    $('#position').val(employee.cargo_id);
                    $('#department').val(employee.departamento_id);
                    $('#monthly_hours').val(employee.monthly_hours);
                    $('#weekly_hours').val(employee.weekly_hours);
                    $('#trial_period').val(employee.trial_period);
                    $('#night_shift_percentage').val(employee.night_shift_percentage || '');
                    $('#first_job').val(employee.first_job || '');
                    $('#status').val(employee.status).trigger('change');
                    $('#leave_reason').val(employee.leave_reason || '');
                    $('#dismissal_date').val(formatDateForInput(employee.dismissal_date));
                    $('#weekday_start').val(employee.weekday_start || '');
                    $('#weekday_end').val(employee.weekday_end || '');
                    $('#saturday_start').val(employee.saturday_start || '');
                    $('#saturday_end').val(employee.saturday_end || '');
                    $('#sunday_start').val(employee.sunday_start || '');
                    $('#sunday_end').val(employee.sunday_end || '');

                    const paymentMethod = employee.payment_method || '';
                    console.log('Forma de pagamento do funcionário:', paymentMethod);
                    $('#payment_method').val(paymentMethod).trigger('change');

                    if (paymentMethod === 'PIX') {
                        $('#pix-group').removeClass('d-none');
                        if (employee.bank) {
                            console.log('Definindo banco para PIX:', employee.bank);
                            $('#pix_bank').val(employee.bank);
                            const pixBankOptions = $('#pix_bank').find('option').map(function() { return $(this).val(); }).get();
                            if ($('#pix_bank').val() !== employee.bank) {
                                console.warn('Valor do banco inválido para PIX:', employee.bank, 'Opções disponíveis:', pixBankOptions);
                                logToServer('warn', 'Valor do banco inválido para PIX', { employeeId: id, bank: employee.bank, availableBanks: pixBankOptions });
                            }
                        } else {
                            $('#pix_bank').val('');
                        }
                        $('#pix_key').val(employee.pix_key || '');
                    } else if (paymentMethod === 'Transferência') {
                        $('#transfer-group').removeClass('d-none');
                        if (employee.bank) {
                            console.log('Definindo banco para Transferência:', employee.bank);
                            $('#transfer_bank').val(employee.bank);
                            const transferBankOptions = $('#transfer_bank').find('option').map(function() { return $(this).val(); }).get();
                            if ($('#transfer_bank').val() !== employee.bank) {
                                console.warn('Valor do banco inválido para Transferência:', employee.bank, 'Opções disponíveis:', transferBankOptions);
                                logToServer('warn', 'Valor do banco inválido para Transferência', { employeeId: id, bank: employee.bank, availableBanks: transferBankOptions });
                            }
                        } else {
                            $('#transfer_bank').val('');
                        }
                        $('#agency').val(employee.agency || '');
                        $('#account').val(employee.account || '');
                        $('#account_type').val(employee.account_type || '');
                    } else {
                        $('#pix-group, #transfer-group').addClass('d-none');
                    }

                    $('.days-off-container input[type="checkbox"]').prop('checked', false);
                    if (employee.days_off && Array.isArray(employee.days_off)) {
                        employee.days_off.forEach(day => {
                            $(`input[name="days_off[]"][value="${day}"]`).prop('checked', true);
                        });
                    }

                    $('#dependents-list').empty();
                    if (employee.dependents && Array.isArray(employee.dependents)) {
                        employee.dependents.forEach(dep => {
                            const $dependent = $('#dependent-template .dependent-item').clone();
                            $dependent.attr('data-dependent-id', dep.id || '');
                            $dependent.find('[name="dependents[].name"]').val(dep.name || '');
                            $dependent.find('[name="dependents[].birth_date"]').val(formatDateForInput(dep.birth_date));
                            $dependent.find('[name="dependents[].parentesco"]').val(dep.parentesco || '');
                            $('#dependents-list').append($dependent);
                        });
                    }

                    $('#employee-modal').modal('show');
                    logToServer('info', 'Dados do funcionário carregados para edição', { employeeId: id, bank: employee.bank, paymentMethod });
                },
                error: function (xhr) {
                    console.error('Erro ao carregar funcionário:', xhr);
                    const msg = xhr.responseJSON?.message || 'Erro ao carregar dados do funcionário.';
                    if (xhr.status === 401) {
                        logToServer('warn', 'Usuário não autenticado, redirecionando para login', { status: xhr.status });
                        window.location.href = '/login.html';
                        return;
                    }
                    toastr.error(msg);
                    logToServer('error', msg, { status: xhr.status });
                }
            });
        }).catch(error => {
            console.error('Erro ao carregar opções antes de preencher o formulário:', error);
            toastr.error('Erro ao carregar opções para o formulário.');
            logToServer('error', 'Erro ao carregar opções para o formulário', { error: error.message });
        });
    });

    // Evento para adicionar dependente
    $('.add-dependent-btn').click(function () {
        console.log('Botão Adicionar Dependente clicado');
        const $dependent = $('#dependent-template .dependent-item').clone();
        $dependent.attr('data-dependent-id', '');
        $('#dependents-list').append($dependent);
        logToServer('info', 'Dependente adicionado ao formulário');
    });

    // Evento para remover dependente
    $('#dependents-list').on('click', '.remove-dependent-btn', function () {
        console.log('Botão Remover Dependente clicado');
        $(this).closest('.dependent-item').remove();
        logToServer('info', 'Dependente removido do formulário');
    });

    // Evento para mostrar/esconder campos de afastamento e demissão
    $('#status').change(function () {
        console.log('Status alterado:', $(this).val());
        $('#leave-reason-group, #dismissal-date-group').addClass('d-none');
        if ($(this).val() === 'Afastado') {
            $('#leave-reason-group').removeClass('d-none');
        } else if ($(this).val() === 'Demitido') {
            $('#dismissal-date-group').removeClass('d-none');
        }
        logToServer('info', 'Campos condicionais de status atualizados', { status: $(this).val() });
    });

    // Evento para mostrar/esconder campos bancários
    $('#payment_method').change(function () {
        const paymentMethod = $(this).val();
        console.log('Forma de pagamento alterada:', paymentMethod);
        $('#pix-group, #transfer-group').addClass('d-none');
        if (paymentMethod === 'PIX') {
            $('#pix-group').removeClass('d-none');
        } else if (paymentMethod === 'Transferência') {
            $('#transfer-group').removeClass('d-none');
        }
        console.log('Estado dos grupos bancários após change:', {
            pixGroupVisible: !$('#pix-group').hasClass('d-none'),
            transferGroupVisible: !$('#transfer-group').hasClass('d-none')
        });
        logToServer('info', 'Campos bancários atualizados', {
            paymentMethod,
            pixGroupVisible: !$('#pix-group').hasClass('d-none'),
            transferGroupVisible: !$('#transfer-group').hasClass('d-none')
        });
    });

    // Evento para consultar CEP
    $('#cep').blur(function () {
        const cep = $(this).val().replace(/\D/g, '');
        if (cep.length === 8) {
            console.log('Consultando CEP:', cep);
            $.ajax({
                url: `https://viacep.com.br/ws/${cep}/json/`,
                method: 'GET',
                success: function (data) {
                    if (!data.erro) {
                        $('#city').val(data.localidade);
                        $('#state').val(data.uf);
                        $('#street').val(data.logradouro);
                        $('#neighborhood').val(data.bairro);
                        console.log('CEP consultado com sucesso:', data);
                        logToServer('info', 'CEP consultado com sucesso', { cep });
                    } else {
                        console.log('CEP inválido:', cep);
                        toastr.error('CEP inválido.');
                        logToServer('warn', 'CEP inválido', { cep });
                    }
                },
                error: function (xhr) {
                    console.error('Erro ao consultar CEP:', xhr);
                    toastr.error('Erro ao consultar CEP.');
                    logToServer('error', 'Erro ao consultar CEP', { cep, status: xhr.status });
                }
            });
        }
    });

    // Evento de submissão do formulário
    $('#employee-form').on('submit', function (e) {
        e.preventDefault();
        console.log('Formulário submetido');
        logToServer('info', 'Formulário submetido', { module: 'funcionarios' });

        $('.form-control, .form-select').removeClass('is-invalid');
        $('.days-off-container').removeClass('is-invalid');
        $('.dependent-item').removeClass('is-invalid');
        $('#employee-form button[type="submit"]').prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> Salvando...');

        const payment_method = $('#payment_method').val();
        let bank = null;
        let agency = null;
        let account = null;
        let account_type = null;
        let pix_key = null;

        if (payment_method === 'PIX') {
            bank = $('#pix_bank').val();
            pix_key = $('#pix_key').val();
        } else if (payment_method === 'Transferência') {
            bank = $('#transfer_bank').val();
            agency = $('#agency').val();
            account = $('#account').val();
            account_type = $('#account_type').val();
        }

        const data = {
            employee_id: $('#employee-id').val() || null,
            name: $('#name').val(),
            cpf: $('#cpf').val(),
            birth_date: $('#birth_date').val(),
            birth_city: $('#birth_city').val(),
            birth_state: $('#birth_state').val(),
            nationality: $('#nationality').val(),
            education_level: $('#education_level').val(),
            phone: $('#phone').val(),
            marital_status: $('#marital_status').val(),
            email: $('#email').val(),
            voter_id: $('#voter_id').val() || null,
            voter_zone: $('#voter_zone').val() || null,
            voter_section: $('#voter_section').val() || null,
            military_id: $('#military_id').val() || null,
            military_category: $('#military_category').val() || null,
            identity_number: $('#identity_number').val(),
            identity_issue_date: $('#identity_issue_date').val(),
            identity_issuer: $('#identity_issuer').val(),
            identity_state: $('#identity_state').val(),
            father_name: $('#father_name').val(),
            mother_name: $('#mother_name').val(),
            spouse: $('#spouse').val() || null,
            has_children: $('#has_children').val(),
            cep: $('#cep').val(),
            city: $('#city').val(),
            state: $('#state').val(),
            street: $('#street').val(),
            number: $('#number').val(),
            neighborhood: $('#neighborhood').val(),
            complement: $('#complement').val() || null,
            ctps: $('#ctps').val(),
            ctps_state: $('#ctps_state').val(),
            ctps_issue_date: $('#ctps_issue_date').val(),
            pis: $('#pis').val(),
            admission_date: $('#admission_date').val(),
            salary: $('#salary').val(),
            cargo_id: $('#position').val(),
            departamento_id: $('#department').val(),
            monthly_hours: $('#monthly_hours').val(),
            weekly_hours: $('#weekly_hours').val(),
            trial_period: $('#trial_period').val(),
            night_shift_percentage: $('#night_shift_percentage').val() || null,
            first_job: $('#first_job').val() || null,
            status: $('#status').val(),
            payment_method: payment_method,
            pix_key: pix_key || null,
            bank: bank || null,
            agency: agency || null,
            account: account || null,
            account_type: account_type || null,
            leave_reason: $('#leave_reason').val() || null,
            dismissal_date: $('#dismissal_date').val() || null,
            weekday_start: $('#weekday_start').val() || null,
            weekday_end: $('#weekday_end').val() || null,
            saturday_start: $('#saturday_start').val() || null,
            saturday_end: $('#saturday_end').val() || null,
            sunday_start: $('#sunday_start').val() || null,
            sunday_end: $('#sunday_end').val() || null,
            days_off: $('.days-off-container input[type="checkbox"]:checked').map(function () {
                return this.value;
            }).get(),
            dependents: $('.dependent-item').map(function () {
                return {
                    id: $(this).attr('data-dependent-id') || null,
                    name: $(this).find('[name="dependents[].name"]').val() || null,
                    birth_date: $(this).find('[name="dependents[].birth_date"]').val() || null,
                    parentesco: $(this).find('[name="dependents[].parentesco"]').val() || null
                };
            }).get()
        };

        console.log('Dados do formulário:', data);
        logToServer('info', 'Dados coletados do formulário', { data });

        if (!validateForm(data)) {
            console.log('Validação falhou');
            $('#employee-form button[type="submit"]').prop('disabled', false).html('Salvar');
            return;
        }

        const isEditing = !!data.employee_id;
        const method = isEditing ? 'PUT' : 'POST';
        const url = isEditing ? `/api/employees/${data.employee_id}` : '/api/employees';

        console.log(`Enviando requisição ${method} para ${url}`);
        logToServer('info', `Iniciando requisição ${method} para ${url}`, { method, url });

        $.ajax({
            url: url,
            method: method,
            contentType: 'application/json',
            xhrFields: { withCredentials: true },
            data: JSON.stringify(data),
            success: function (response) {
                console.log('Sucesso:', response);
                toastr.success(isEditing ? 'Funcionário atualizado com sucesso!' : 'Funcionário adicionado com sucesso!');
                loadEmployees();
                $('#employee-modal').modal('hide');
                clearForm();
                $('#employee-form button[type="submit"]').prop('disabled', false).html('Salvar');
                logToServer('info', isEditing ? `Funcionário ${data.employee_id} atualizado com sucesso` : 'Funcionário adicionado com sucesso', { id: data.employee_id });
            },
            error: function (xhr) {
                console.error('Erro na requisição:', xhr);
                const msg = xhr.responseJSON?.message || 'Erro ao salvar funcionário.';
                if (xhr.status === 401) {
                    logToServer('warn', 'Usuário não autenticado, redirecionando para login', { status: xhr.status });
                    window.location.href = '/login.html';
                    return;
                }
                toastr.error(msg);
                $('#employee-form button[type="submit"]').prop('disabled', false).html('Salvar');
                logToServer('error', msg, { status: xhr.status, response: xhr.responseJSON });
            }
        });
    });

    // Atualiza o ano no footer
    $('#anoAtual').text(new Date().getFullYear());

    // Toggle da sidebar
    const toggleBtn = $('#toggle-sidebar');
    const sidebar = $('.sidebar');
    const logo = $('.sidebar-logo .logo');
    toggleBtn.on('click', function () {
        console.log('Botão de toggle da sidebar clicado');
        sidebar.toggleClass('collapsed');
        if (sidebar.hasClass('collapsed')) {
            logo.attr('src', 'image/ico.png');
            toggleBtn.html('<i class="fas fa-chevron-right"></i>');
            logToServer('info', 'Sidebar colapsada', { module: 'funcionarios' });
        } else {
            logo.attr('src', 'image/logo.png');
            toggleBtn.html('<i class="fas fa-chevron-left"></i>');
            logToServer('info', 'Sidebar expandida', { module: 'funcionarios' });
        }
    });

    // Verificar se o evento de submissão está registrado
    console.log('Evento de submissão registrado no formulário #employee-form');
});