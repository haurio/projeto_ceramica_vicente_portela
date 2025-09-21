$(document).ready(function() {
    toastr.options = {
        closeButton: true,
        progressBar: true,
        positionClass: 'toast-top-right',
        timeOut: 5000,
        extendedTimeOut: 1000,
        preventDuplicates: true
    };

    $('#anoAtual').text(new Date().getFullYear());

    function formatDateForDisplay(dateString) {
        if (!dateString) return 'Nenhum';
        const date = new Date(dateString);
        return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    }

    $.ajax({
        url: '/check-session',
        method: 'GET',
        xhrFields: { withCredentials: true },
        success: function(data) {
            if (!data.authenticated) {
                window.location.href = '/login.html';
                return;
            }

            $('#toggle-sidebar').click(function() {
                $('.sidebar').toggleClass('collapsed');
                const $icon = $(this).find('i');
                const $logo = $('.sidebar-logo .logo');
                if ($('.sidebar').hasClass('collapsed')) {
                    $icon.removeClass('fa-chevron-left').addClass('fa-chevron-right');
                    $logo.attr('src', 'image/ico.png');
                } else {
                    $icon.removeClass('fa-chevron-right').addClass('fa-chevron-left');
                    $logo.attr('src', 'image/logo.png');
                }
            });

            function loadEmployees() {
                $.ajax({
                    url: '/api/funcionarios',
                    method: 'GET',
                    xhrFields: { withCredentials: true },
                    success: function(employees) {
                        const select = $('#funcionario_ausencias');
                        select.empty().append('<option value="">Selecione um funcionário</option>');
                        employees.forEach(employee => {
                            select.append(`<option value="${employee.id}">${employee.nome}</option>`);
                        });
                    },
                    error: function(jqXHR) {
                        if (jqXHR.status === 401) window.location.href = '/login.html';
                        else toastr.error('Erro ao carregar funcionários');
                    }
                });
            }

            function calculateAusencias(funcionario_id) {
                if (!funcionario_id) {
                    $('#dias_ausentes').text('0');
                    return;
                }
                $.ajax({
                    url: '/api/ausencias',
                    method: 'GET',
                    xhrFields: { withCredentials: true },
                    success: function(ausencias) {
                        const employeeAusencias = ausencias.filter(a => a.funcionario_id == funcionario_id);
                        const diasAusentes = employeeAusencias.reduce((total, a) => {
                            const diffTime = Math.ceil((new Date(a.data_fim || a.data_inicio) - new Date(a.data_inicio)) / (1000 * 60 * 60 * 24)) + 1;
                            return total + diffTime;
                        }, 0);
                        $('#dias_ausentes').text(diasAusentes);
                    },
                    error: function(jqXHR) {
                        toastr.error('Erro ao carregar ausências');
                    }
                });
            }

            function populateTable() {
                $.ajax({
                    url: '/api/ausencias',
                    method: 'GET',
                    xhrFields: { withCredentials: true },
                    success: function(ausencias) {
                        const tbody = $('#ausencias-table tbody');
                        tbody.empty();
                        ausencias.forEach(ausencia => {
                            tbody.append(`
                                <tr data-id="${ausencia.id}">
                                    <td>${ausencia.funcionario_nome}</td>
                                    <td>${ausencia.tipo}</td>
                                    <td>${formatDateForDisplay(ausencia.data_inicio)}</td>
                                    <td>${formatDateForDisplay(ausencia.data_fim)}</td>
                                    <td>${ausencia.justificativa || '-'}</td>
                                    <td>${ausencia.status}</td>
                                    <td>
                                        <button class="btn btn-sm btn-primary edit-ausencia-btn" data-id="${ausencia.id}"><i class="fas fa-edit"></i></button>
                                        <button class="btn btn-sm btn-danger delete-ausencia-btn" data-id="${ausencia.id}"><i class="fas fa-trash"></i></button>
                                    </td>
                                </tr>
                            `);
                        });
                    },
                    error: function(jqXHR) {
                        toastr.error('Erro ao carregar ausências');
                    }
                });
            }

            function initCalendar() {
                const feriados = {
                    2025: [
                        { date: '2025-01-01', title: 'Confraternização Universal (Nacional)' },
                        { date: '2025-04-18', title: 'Sexta-feira Santa (Nacional)' },
                        { date: '2025-04-21', title: 'Tiradentes (Nacional)' },
                        { date: '2025-05-01', title: 'Dia do Trabalho (Nacional)' },
                        { date: '2025-09-07', title: 'Independência do Brasil (Nacional)' },
                        { date: '2025-10-12', title: 'Nossa Senhora Aparecida (Nacional)' },
                        { date: '2025-11-02', title: 'Finados (Nacional)' },
                        { date: '2025-11-15', title: 'Proclamação da República (Nacional)' },
                        { date: '2025-12-25', title: 'Natal (Nacional)' },
                        { date: '2025-04-21', title: 'Aniversário de BH (Estadual MG)' },
                        { date: '2025-07-15', title: 'Aniversário de Engenheiro Caldas (Municipal)' }
                    ]
                };
                $('#calendar-container').flatpickr({
                    inline: true,
                    minDate: '2025-01-01',
                    maxDate: '2025-12-31',
                    disable: feriados[2025].map(f => f.date),
                    onChange: function(selectedDates, dateStr, instance) {
                        console.log('Data selecionada:', dateStr);
                    }
                });
            }

            $('#funcionario_ausencias').change(function() {
                const funcionario_id = $(this).val();
                calculateAusencias(funcionario_id);
            });

            $('#add-ausencia-btn').click(function() {
                $('#modal-title-ausencia').html('<i class="fas fa-calendar-times me-2"></i><strong>Pedir Ausência</strong>');
                $('#ausencia-form')[0].reset();
                $('#ausencia-id').val('');
                $('#meio-dia-btn').removeClass('active');
                $('#dias-btn').removeClass('active');
                $('#intervalo-datas').show();
                $('#ausencia-modal').modal('show');
            });

            $('#meio-dia-btn').click(function() {
                $(this).toggleClass('active');
                $('#dias-btn').removeClass('active');
                $('#data_fim_ausencia').val($('#data_inicio_ausencia').val());
            });

            $('#dias-btn').click(function() {
                $(this).toggleClass('active');
                $('#meio-dia-btn').removeClass('active');
                $('#data_fim_ausencia').val('');
            });

            $('#ausencia-form').submit(function(e) {
                e.preventDefault();
                const requiredFields = [
                    { id: 'tipo_ausencia', label: 'Tipo de Ausência' },
                    { id: 'data_inicio_ausencia', label: 'Data de Início' }
                ];
                let isValid = true;
                requiredFields.forEach(field => {
                    const value = $(`#${field.id}`).val();
                    if (!value || value.trim() === '') {
                        toastr.error(`O campo ${field.label} é obrigatório.`);
                        isValid = false;
                    }
                });

                if (!isValid) return;

                const ausenciaId = $('#ausencia-id').val();
                const formData = {
                    funcionario_id: $('#funcionario_ausencias').val(),
                    tipo: $('#tipo_ausencia').val(),
                    data_inicio: $('#data_inicio_ausencia').val(),
                    data_fim: $('#data_fim_ausencia').val() || $('#data_inicio_ausencia').val(),
                    justificativa: $('#justificativa').val(),
                    status: 'Registrada'
                };

                const method = ausenciaId ? 'PUT' : 'POST';
                const url = ausenciaId ? `/api/ausencias/${ausenciaId}` : '/api/ausencias';

                $.ajax({
                    url: url,
                    method: method,
                    contentType: 'application/json',
                    data: JSON.stringify(formData),
                    xhrFields: { withCredentials: true },
                    success: function() {
                        toastr.success(ausenciaId ? 'Ausência atualizada com sucesso!' : 'Ausência registrada com sucesso!');
                        populateTable();
                        calculateAusencias($('#funcionario_ausencias').val());
                        $('#ausencia-modal').modal('hide');
                        $('#ausencia-form')[0].reset();
                    },
                    error: function(jqXHR) {
                        toastr.error(`Erro ao ${ausenciaId ? 'atualizar' : 'registrar'} ausência`);
                    }
                });
            });

            $('#ausencias-table').on('click', '.edit-ausencia-btn', function() {
                const id = $(this).data('id');
                $('#modal-title-ausencia').html('<i class="fas fa-calendar-times me-2"></i><strong>Editar Ausência</strong>');
                $('#ausencia-form')[0].reset();
                $.ajax({
                    url: `/api/ausencias/${id}`,
                    method: 'GET',
                    xhrFields: { withCredentials: true },
                    success: function(ausencia) {
                        $('#ausencia-id').val(ausencia.id);
                        $('#funcionario_ausencias').val(ausencia.funcionario_id);
                        $('#tipo_ausencia').val(ausencia.tipo);
                        $('#data_inicio_ausencia').val(ausencia.data_inicio);
                        $('#data_fim_ausencia').val(ausencia.data_fim);
                        $('#justificativa').val(ausencia.justificativa);
                        $('#ausencia-modal').modal('show');
                    },
                    error: function(jqXHR) {
                        toastr.error('Erro ao carregar dados da ausência');
                    }
                });
            });

            $('#ausencias-table').on('click', '.delete-ausencia-btn', function() {
                const id = $(this).data('id');
                if (confirm('Deseja realmente cancelar esta ausência?')) {
                    $.ajax({
                        url: `/api/ausencias/${id}`,
                        method: 'DELETE',
                        xhrFields: { withCredentials: true },
                        success: function() {
                            toastr.success('Ausência cancelada com sucesso!');
                            populateTable();
                            calculateAusencias($('#funcionario_ausencias').val());
                        },
                        error: function(jqXHR) {
                            toastr.error('Erro ao cancelar ausência');
                        }
                    });
                }
            });

            loadEmployees();
            populateTable();
            initCalendar();
        },
        error: function(jqXHR) {
            window.location.href = '/login.html';
        }
    });
});