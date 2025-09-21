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

    // Definir o ano atual como padrão
    let selectedYear = new Date().getFullYear().toString();

    function formatDateForDisplay(dateString) {
        if (!dateString || dateString === '0000-00-00' || isNaN(new Date(dateString))) {
            console.warn('Data inválida detectada:', dateString);
            return 'Nenhuma';
        }
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            console.warn('Data inválida detectada:', dateString);
            return 'Nenhuma';
        }
        return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    }

    // Função para carregar anos disponíveis no filtro
    function loadYearsFilter() {
        console.log('Carregando anos para o filtro...');
        $.ajax({
            url: '/api/ferias',
            method: 'GET',
            xhrFields: { withCredentials: true },
            success: function(ferias) {
                console.log('Férias recebidas para o filtro:', ferias);
                const years = [...new Set(ferias.map(feria => new Date(feria.data_inicio || feria.periodo_aquisitivo_inicio).getFullYear()))]
                    .sort((a, b) => b - a);
                const select = $('#ano-filtro');
                select.empty();
                years.forEach(year => {
                    select.append(`<option value="${year}">${year}</option>`);
                });
                select.val(selectedYear);
                if (!years.includes(parseInt(selectedYear))) {
                    select.append(`<option value="${selectedYear}">${selectedYear}</option>`);
                    select.val(selectedYear);
                }
            },
            error: function(jqXHR) {
                const errorMsg = jqXHR.responseJSON?.message || jqXHR.responseText || 'Erro ao carregar anos para o filtro';
                toastr.error(errorMsg);
                console.error('Erro ao carregar anos:', jqXHR);
                $('#ano-filtro').empty().append(`<option value="${selectedYear}">${selectedYear}</option>`);
            }
        });
    }

    function populateVencidasCards() {
        console.log('Populando cards de férias vencidas...');
        $.ajax({
            url: '/api/ferias',
            method: 'GET',
            xhrFields: { withCredentials: true },
            success: function(ferias) {
                console.log('Férias recebidas para vencidas:', ferias);
                const container = $('#vencidas-cards');
                container.empty();
                const today = new Date();
                ferias.filter(feria => 
                    (feria.status === 'Atrasada' || (new Date(feria.periodo_aquisitivo_fim) < today && !['Concluída', 'Cancelada'].includes(feria.status))) &&
                    new Date(feria.data_inicio || feria.periodo_aquisitivo_inicio).getFullYear().toString() === selectedYear
                ).forEach(feria => {
                    container.append(`
                        <div class="card vencida-red">
                            <h5>${feria.funcionario_nome || 'Nome não disponível'}</h5>
                            <p>Últimas Férias: ${formatDateForDisplay(feria.periodo_aquisitivo_inicio)} - ${formatDateForDisplay(feria.periodo_aquisitivo_fim)}</p>
                            <p>Férias Marcadas: ${formatDateForDisplay(feria.data_inicio)} - ${formatDateForDisplay(feria.data_fim)}</p>
                            <p>Dias Atrasados: ${feria.dias_atrasados || 0}</p>
                            <div>
                                <button class="action-icon edit-ferias-btn" data-id="${feria.ferias_id}"><i class="fas fa-edit"></i></button>
                                <button class="action-icon delete-ferias-btn" data-id="${feria.ferias_id}"><i class="fas fa-trash"></i></button>
                            </div>
                        </div>
                    `);
                });
                if (container.children().length === 0) {
                    container.append(`<p>Nenhum registro de férias vencidas para o ano ${selectedYear}.</p>`);
                }
            },
            error: function(jqXHR) {
                const errorMsg = jqXHR.responseJSON?.message || jqXHR.responseText || 'Erro ao carregar férias vencidas';
                toastr.error(errorMsg);
                console.error('Erro ao carregar férias vencidas:', jqXHR);
            }
        });
    }

    function populateProximasCards() {
        console.log('Populando cards de férias próximas...');
        $.ajax({
            url: '/api/ferias',
            method: 'GET',
            xhrFields: { withCredentials: true },
            success: function(ferias) {
                console.log('Férias recebidas para próximas:', ferias);
                const container = $('#proximas-cards');
                container.empty();
                const today = new Date();
                const next30Days = new Date(today);
                next30Days.setDate(today.getDate() + 30);
                ferias.filter(feria => 
                    feria.status === 'Planejada' && 
                    new Date(feria.data_inicio) <= next30Days && 
                    new Date(feria.data_inicio) >= today &&
                    new Date(feria.data_inicio).getFullYear().toString() === selectedYear
                ).forEach(feria => {
                    container.append(`
                        <div class="card proxima-orange">
                            <h5>${feria.funcionario_nome || 'Nome não disponível'}</h5>
                            <p>Últimas Férias: ${formatDateForDisplay(feria.periodo_aquisitivo_inicio)} - ${formatDateForDisplay(feria.periodo_aquisitivo_fim)}</p>
                            <p>Férias Marcadas: ${formatDateForDisplay(feria.data_inicio)} - ${formatDateForDisplay(feria.data_fim)}</p>
                            <p>Dias Restantes: ${feria.dias_restantes || 0}</p>
                            <div>
                                <button class="action-icon edit-ferias-btn" data-id="${feria.ferias_id}"><i class="fas fa-edit"></i></button>
                                <button class="action-icon delete-ferias-btn" data-id="${feria.ferias_id}"><i class="fas fa-trash"></i></button>
                            </div>
                        </div>
                    `);
                });
                if (container.children().length === 0) {
                    container.append(`<p>Nenhum registro de férias próximas para o ano ${selectedYear}.</p>`);
                }
            },
            error: function(jqXHR) {
                const errorMsg = jqXHR.responseJSON?.message || jqXHR.responseText || 'Erro ao carregar férias próximas';
                toastr.error(errorMsg);
                console.error('Erro ao carregar férias próximas:', jqXHR);
            }
        });
    }

    function populateAdicionadasCards() {
        console.log('Populando cards de férias adicionadas...');
        $.ajax({
            url: '/api/ferias',
            method: 'GET',
            xhrFields: { withCredentials: true },
            success: function(ferias) {
                console.log('Férias recebidas para adicionadas:', ferias);
                const container = $('#adicionadas-cards');
                container.empty();
                ferias.filter(feria => 
                    ['Planejada', 'Em Andamento', 'Concluída'].includes(feria.status) &&
                    new Date(feria.data_inicio || feria.periodo_aquisitivo_inicio).getFullYear().toString() === selectedYear
                ).forEach(feria => {
                    const statusClass = getStatusClass(feria.status);
                    container.append(`
                        <div class="card ${statusClass}">
                            <h5>${feria.funcionario_nome || 'Nome não disponível'}</h5>
                            <p>Últimas Férias: ${formatDateForDisplay(feria.periodo_aquisitivo_inicio)} - ${formatDateForDisplay(feria.periodo_aquisitivo_fim)}</p>
                            <p>Férias Marcadas: ${formatDateForDisplay(feria.data_inicio)} - ${formatDateForDisplay(feria.data_fim)}</p>
                            <p>Status: ${feria.status}</p>
                            <div>
                                <button class="action-icon edit-ferias-btn" data-id="${feria.ferias_id}"><i class="fas fa-edit"></i></button>
                                <button class="action-icon delete-ferias-btn" data-id="${feria.ferias_id}"><i class="fas fa-trash"></i></button>
                            </div>
                        </div>
                    `);
                });
                if (container.children().length === 0) {
                    container.append(`<p>Nenhum registro de férias adicionadas para o ano ${selectedYear}.</p>`);
                }
            },
            error: function(jqXHR) {
                const errorMsg = jqXHR.responseJSON?.message || jqXHR.responseText || 'Erro ao carregar férias adicionadas';
                toastr.error(errorMsg);
                console.error('Erro ao carregar férias adicionadas:', jqXHR);
            }
        });
    }

    function getStatusClass(status) {
        switch (status) {
            case 'Planejada': return 'planejada';
            case 'Em Andamento': return 'em-andamento';
            case 'Concluída': return 'concluida';
            default: return 'adicionada';
        }
    }

    $('#ano-filtro').change(function() {
        selectedYear = $(this).val();
        console.log('Ano selecionado:', selectedYear);
        populateVencidasCards();
        populateProximasCards();
        populateAdicionadasCards();
    });

    $.ajax({
        url: '/check-session',
        method: 'GET',
        xhrFields: { withCredentials: true },
        success: function(data) {
            if (!data.authenticated) {
                console.log('Sessão não autenticada, redirecionando para login...');
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
                console.log('Carregando funcionários...');
                $.ajax({
                    url: '/api/employees',
                    method: 'GET',
                    xhrFields: { withCredentials: true },
                    success: function(employees) {
                        console.log('Funcionários recebidos:', employees);
                        const select = $('#funcionario_id_ferias');
                        select.empty().append('<option value="">Selecione um funcionário</option>');
                        employees.filter(emp => emp.status === 'Ativo').forEach(employee => {
                            select.append(`<option value="${employee.id}">${employee.name}</option>`);
                        });
                    },
                    error: function(jqXHR) {
                        const errorMsg = jqXHR.responseJSON?.message || jqXHR.responseText || 'Erro ao carregar funcionários';
                        toastr.error(errorMsg);
                        console.error('Erro ao carregar funcionários:', jqXHR);
                        if (jqXHR.status === 401) window.location.href = '/login.html';
                    }
                });
            }

            $('#add-ferias-btn').click(function() {
                console.log('Abrindo modal para adicionar férias...');
                $('#modal-title-ferias').html('<i class="fas fa-umbrella-beach me-2"></i><strong>Adicionar Férias</strong>');
                $('#ferias-form')[0].reset();
                $('#ferias-id').val('');
                $('#funcionario_id_ferias').val('').show();
                $('#funcionario_nome_ferias').val('').hide();
                $('#periodo_aquisitivo_ferias').empty().append('<option value="">Carregando...</option>');
                $('#periodo_aquisitivo_fim').val('');
                $('#dias_concedidos_ferias').val(30);
                $('input[name="status_ferias"][value="Planejada"]').prop('checked', true);
                $('#ferias-modal').modal('show');
                loadEmployees();
                $('.form-control, .form-select').removeClass('is-invalid');
            });

            $('#funcionario_id_ferias').change(function() {
                console.log('Funcionário selecionado:', $(this).val());
                updatePeriodoAquisitivo();
            });

            function updatePeriodoAquisitivo() {
                const funcionarioId = $('#funcionario_id_ferias').val();
                if (funcionarioId) {
                    console.log('Carregando períodos aquisitivos para funcionário:', funcionarioId);
                    $.ajax({
                        url: `/api/ferias/saldo?funcionario_id=${funcionarioId}`,
                        method: 'GET',
                        xhrFields: { withCredentials: true },
                        success: function(saldo) {
                            console.log('Períodos aquisitivos recebidos:', saldo);
                            const select = $('#periodo_aquisitivo_ferias');
                            select.empty().append('<option value="">Selecione um período</option>');
                            if (saldo.length && saldo[0].periodos_disponiveis.length) {
                                saldo[0].periodos_disponiveis.forEach(p => {
                                    select.append(`<option value="${p.periodo_aquisitivo_inicio}">${formatDateForDisplay(p.periodo_aquisitivo_inicio)} - ${formatDateForDisplay(p.periodo_aquisitivo_fim)} (${p.status}, ${p.dias_restantes} dias)</option>`);
                                });
                                if (saldo[0].periodos_disponiveis.length > 0) {
                                    select.val(saldo[0].periodos_disponiveis[0].periodo_aquisitivo_inicio);
                                    const inicio = new Date(saldo[0].periodos_disponiveis[0].periodo_aquisitivo_inicio);
                                    const fim = new Date(inicio);
                                    fim.setFullYear(inicio.getFullYear() + 1);
                                    fim.setDate(fim.getDate() - 1);
                                    $('#periodo_aquisitivo_fim').val(fim.toISOString().split('T')[0]);
                                }
                            } else {
                                select.append('<option value="">Nenhum período disponível</option>');
                                $('#periodo_aquisitivo_fim').val('');
                            }
                        },
                        error: function(jqXHR) {
                            const errorMsg = jqXHR.responseJSON?.message || jqXHR.responseText || 'Erro ao carregar períodos aquisitivos';
                            toastr.error(errorMsg);
                            console.error('Erro ao carregar períodos aquisitivos:', jqXHR);
                            $('#periodo_aquisitivo_ferias').empty().append('<option value="">Erro ao carregar</option>');
                            $('#periodo_aquisitivo_fim').val('');
                        }
                    });
                }
            }

            $(document).on('click', '.edit-ferias-btn', function() {
                const id = $(this).data('id');
                console.log('Abrindo modal para editar férias ID:', id);
                $('#modal-title-ferias').html('<i class="fas fa-umbrella-beach me-2"></i><strong>Editar Férias</strong>');
                $('#ferias-form')[0].reset();
                $.ajax({
                    url: `/api/ferias/${id}`,
                    method: 'GET',
                    xhrFields: { withCredentials: true },
                    success: function(feria) {
                        console.log('Dados recebidos para edição:', JSON.stringify(feria, null, 2));
                        if (!feria.funcionario_id) {
                            console.error('Erro: funcionario_id não retornado pela API');
                            toastr.error('Erro ao carregar dados: ID do funcionário não encontrado');
                            return;
                        }
                        $('#ferias-id').val(feria.ferias_id || feria.id || '');
                        $('#funcionario_id_ferias').val(feria.funcionario_id).hide();
                        $('#funcionario_nome_ferias').val(feria.funcionario_nome || 'Nome não disponível').show();
                        $('#periodo_aquisitivo_ferias').empty().append(
                            `<option value="${feria.periodo_aquisitivo_inicio || ''}">${formatDateForDisplay(feria.periodo_aquisitivo_inicio)} - ${formatDateForDisplay(feria.periodo_aquisitivo_fim)}</option>`
                        );
                        $('#periodo_aquisitivo_fim').val(feria.periodo_aquisitivo_fim || '');
                        $('#data_inicio_ferias').val(feria.data_inicio ? feria.data_inicio.split('T')[0] : '');
                        $('#data_fim_ferias').val(feria.data_fim ? feria.data_fim.split('T')[0] : '');
                        $('#dias_concedidos_ferias').val(feria.dias_concedidos || '');
                        $(`input[name="status_ferias"][value="${feria.status || 'Planejada'}"]`).prop('checked', true);
                        $('#motivo_ferias').val(feria.motivo || '');
                        $('#ferias-modal').modal('show');
                        $('.form-control, .form-select').removeClass('is-invalid');
                    },
                    error: function(jqXHR) {
                        const errorMsg = jqXHR.responseJSON?.message || jqXHR.responseText || 'Erro ao carregar dados das férias';
                        toastr.error(errorMsg);
                        console.error('Erro ao carregar dados para edição:', jqXHR);
                    }
                });
            });

            $(document).on('click', '.delete-ferias-btn', function() {
                const id = $(this).data('id');
                console.log('Abrindo modal para cancelar férias ID:', id);
                $('#confirm-delete-modal').data('ferias-id', id).modal('show');
                $('#motivo_exclusao').val('');
            });

            $('#confirm-delete-btn').click(function() {
                const id = $('#confirm-delete-modal').data('ferias-id');
                const motivoExclusao = $('#motivo_exclusao').val();
                console.log('Confirmando cancelamento de férias ID:', id, 'Motivo:', motivoExclusao);
                if (!motivoExclusao) {
                    toastr.error('O motivo do cancelamento é obrigatório.');
                    $('#motivo_exclusao').addClass('is-invalid');
                    return;
                }
                $.ajax({
                    url: `/api/ferias/${id}`,
                    method: 'PUT',
                    contentType: 'application/json',
                    data: JSON.stringify({ status: 'Cancelada', motivo: motivoExclusao }),
                    xhrFields: { withCredentials: true },
                    success: function() {
                        toastr.success('Férias canceladas com sucesso!');
                        $('#confirm-delete-modal').modal('hide');
                        populateAdicionadasCards();
                        populateVencidasCards();
                        populateProximasCards();
                        loadYearsFilter();
                    },
                    error: function(jqXHR) {
                        const errorMsg = jqXHR.responseJSON?.message || jqXHR.responseText || 'Erro ao cancelar férias';
                        toastr.error(errorMsg);
                        console.error('Erro ao cancelar férias:', jqXHR);
                    }
                });
            });

            $('#cancel-delete-btn').click(function() {
                $('#motivo_exclusao').val('');
                $('#confirm-delete-modal').modal('hide');
            });

            $('#ferias-form .form-control, #ferias-form .form-select').on('change', function() {
                if ($(this).val().trim() !== '') {
                    $(this).removeClass('is-invalid');
                }
            });

            $('#periodo_aquisitivo_ferias').change(function() {
                const inicio = $(this).val();
                if (inicio) {
                    const inicioDate = new Date(inicio);
                    const fim = new Date(inicioDate);
                    fim.setFullYear(inicioDate.getFullYear() + 1);
                    fim.setDate(fim.getDate() - 1);
                    $('#periodo_aquisitivo_fim').val(fim.toISOString().split('T')[0]);
                } else {
                    $('#periodo_aquisitivo_fim').val('');
                }
            });

            $('#ferias-form').submit(function(e) {
                e.preventDefault();
                console.log('Formulário submetido...');
                const feriasId = $('#ferias-id').val();
                const isEditMode = !!feriasId;
                const requiredFields = [
                    { id: 'periodo_aquisitivo_ferias', label: 'Período Aquisitivo' },
                    { id: 'data_inicio_ferias', label: 'Início das Férias' },
                    { id: 'data_fim_ferias', label: 'Fim das Férias' },
                    { id: 'dias_concedidos_ferias', label: 'Dias Concedidos' }
                ];
                let isValid = true;

                // Validação de funcionario_id apenas no modo de adição
                if (!isEditMode) {
                    const funcionarioId = $('#funcionario_id_ferias').val();
                    if (!funcionarioId) {
                        toastr.error('O campo Funcionário é obrigatório.');
                        $('#funcionario_id_ferias').addClass('is-invalid');
                        isValid = false;
                    } else {
                        $('#funcionario_id_ferias').removeClass('is-invalid');
                    }
                }

                // Validação dos outros campos obrigatórios
                requiredFields.forEach(field => {
                    const element = $(`#${field.id}`);
                    const value = element.val();
                    if (!value || value.trim() === '') {
                        toastr.error(`O campo ${field.label} é obrigatório.`);
                        element.addClass('is-invalid');
                        isValid = false;
                    } else {
                        element.removeClass('is-invalid');
                    }
                });

                // Validação adicional para status Cancelada
                const status = $('input[name="status_ferias"]:checked').val();
                if (status === 'Cancelada' && !$('#motivo_ferias').val().trim()) {
                    toastr.error('O campo Motivo é obrigatório para o status Cancelada.');
                    $('#motivo_ferias').addClass('is-invalid');
                    isValid = false;
                } else {
                    $('#motivo_ferias').removeClass('is-invalid');
                }

                if (!isValid) {
                    console.log('Validação falhou, interrompendo envio do formulário.');
                    return;
                }

                const formData = {
                    funcionario_id: $('#funcionario_id_ferias').val(),
                    periodo_aquisitivo_inicio: $('#periodo_aquisitivo_ferias').val(),
                    periodo_aquisitivo_fim: $('#periodo_aquisitivo_fim').val(),
                    data_inicio: $('#data_inicio_ferias').val() || null,
                    data_fim: $('#data_fim_ferias').val() || null,
                    dias_concedidos: parseInt($('#dias_concedidos_ferias').val()) || 30,
                    status: status || 'Planejada',
                    motivo: $('#motivo_ferias').val() || null
                };

                console.log('URL:', isEditMode ? `/api/ferias/${feriasId}` : '/api/ferias');
                console.log('Método:', isEditMode ? 'PUT' : 'POST');
                console.log('Dados enviados:', JSON.stringify(formData, null, 2));

                const method = isEditMode ? 'PUT' : 'POST';
                const url = isEditMode ? `/api/ferias/${feriasId}` : '/api/ferias';

                $.ajax({
                    url: url,
                    method: method,
                    contentType: 'application/json',
                    data: JSON.stringify(formData),
                    xhrFields: { withCredentials: true },
                    success: function(response) {
                        console.log('Resposta do servidor:', response);
                        toastr.success(isEditMode ? 'Férias atualizadas com sucesso!' : 'Férias adicionadas com sucesso!');
                        $('#ferias-modal').modal('hide');
                        $('#ferias-form')[0].reset();
                        populateAdicionadasCards();
                        populateVencidasCards();
                        populateProximasCards();
                        loadYearsFilter();
                    },
                    error: function(jqXHR) {
                        const errorMsg = jqXHR.responseJSON?.message || jqXHR.responseText || `Erro ao ${isEditMode ? 'atualizar' : 'adicionar'} férias`;
                        toastr.error(errorMsg);
                        console.error('Erro na requisição AJAX:', jqXHR);
                    }
                });
            });

            loadYearsFilter();
            populateVencidasCards();
            populateProximasCards();
            populateAdicionadasCards();
        },
        error: function(jqXHR) {
            const errorMsg = jqXHR.responseJSON?.message || jqXHR.responseText || 'Erro ao verificar sessão';
            toastr.error(errorMsg);
            console.error('Erro ao verificar sessão:', jqXHR);
            window.location.href = '/login.html';
        }
    });
});