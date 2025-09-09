// empresa.js
$(document).ready(function() {
    // Configurar toastr para notificações
    toastr.options = {
        closeButton: true,
        progressBar: true,
        positionClass: 'toast-top-right',
        timeOut: 5000,
        extendedTimeOut: 1000,
        preventDuplicates: true
    };

    // Definir ano atual no rodapé
    $('#anoAtual').text(new Date().getFullYear());

    // Função de debounce para evitar múltiplas requisições
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Verificar sessão antes de carregar a página
    $.ajax({
        url: '/check-session',
        method: 'GET',
        xhrFields: { withCredentials: true },
        success: function(data) {
            if (!data.authenticated) {
                window.location.href = '/login.html'; // Redireciona imediatamente sem mensagem
                return;
            }

            // Inicializar máscaras de entrada
            $('#cnpj').mask('00.000.000/0000-00');
            $('#cep').mask('00000-000');
            $('#telefone').mask('(00) 00000-0000');
            $('#cnae').mask('0000-0/00');
            $('#natureza_juridica').mask('000-0 - SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS', {
                translation: {
                    'S': { pattern: /[A-Za-zÀ-ÿ0-9 ]/, recursive: true } // Suporta letras acentuadas
                }
            });

            // Alternar visibilidade da barra lateral
            $('#toggle-sidebar').click(function() {
                $('.sidebar').toggleClass('collapsed');
                $(this).find('i').toggleClass('fa-chevron-left fa-chevron-right');
            });

            // Função para popular a tabela de empresas
            function populateTable() {
                $.ajax({
                    url: '/api/empresas',
                    method: 'GET',
                    xhrFields: { withCredentials: true },
                    success: function(companies) {
                        const tbody = $('#company-table tbody');
                        tbody.empty();
                        companies.forEach(company => {
                            tbody.append(`
                                <tr data-id="${company.id}">
                                    <td>${company.razao_social}</td>
                                    <td>${company.cnpj}</td>
                                    <td>${company.inscricao_municipal}</td>
                                    <td>${company.email}</td>
                                    <td>${company.telefone}</td>
                                    <td>${company.cidade}</td>
                                    <td>${company.estado}</td>
                                </tr>
                            `);
                        });
                    },
                    error: function(jqXHR) {
                        if (jqXHR.status === 401) {
                            window.location.href = '/login.html'; // Redireciona sem mensagem
                        } else {
                            toastr.error('Erro ao carregar empresas: ' + (jqXHR.responseJSON?.message || 'Erro desconhecido'));
                            console.error('Erro /api/empresas:', jqXHR.responseJSON || jqXHR.statusText);
                        }
                    }
                });
            }

            // Função para adicionar campo de atividade secundária
            function addSecondaryActivity(cnae = '', id_cnae = '', descricao_cnae = '') {
                const index = $('.secondary-activity-row').length;
                const row = `
                    <div class="secondary-activity-row d-flex align-items-center gap-2 mb-2">
                        <input type="text" class="form-control cnae-secundario" name="atividades_secundarias[${index}][cnae]" placeholder="0000-0/00" maxlength="10" value="${cnae}">
                        <input type="hidden" class="id-cnae-secundario" name="atividades_secundarias[${index}][id_cnae]" value="${id_cnae}">
                        <input type="text" class="form-control descricao-cnae" name="atividades_secundarias[${index}][descricao_cnae]" placeholder="Descrição da atividade" maxlength="255" value="${descricao_cnae}" readonly>
                        <button type="button" class="btn btn-danger btn-remove"><i class="fas fa-trash"></i></button>
                    </div>
                `;
                $('#secondary-activities-container').append(row);
                $(`input[name="atividades_secundarias[${index}][cnae]"]`).mask('0000-0/00');
            }

            // Remover campo de atividade secundária
            $('#secondary-activities-container').on('click', '.btn-remove', function() {
                $(this).closest('.secondary-activity-row').remove();
            });

            // Adicionar nova atividade secundária
            $('#add-secondary-activity').click(function() {
                addSecondaryActivity();
            });

            // Abrir modal para edição de empresa
            $('#edit-company-btn').click(function() {
                $('#modal-title').html('<i class="fas fa-building me-2"></i><strong>Editar Empresa</strong>');
                $('#company-form')[0].reset();
                $('#empresa-id').val('');
                $('#id_cnae').val('');
                $('#secondary-activities-container').empty();
                $.ajax({
                    url: '/api/empresas/1',
                    method: 'GET',
                    xhrFields: { withCredentials: true },
                    success: function(company) {
                        if (company) {
                            $('#empresa-id').val(company.id);
                            $('#razao_social').val(company.razao_social || '');
                            $('#cnpj').val(company.cnpj || '');
                            $('#nome_fantasia').val(company.nome_fantasia || '');
                            $('#inscricao_estadual').val(company.inscricao_estadual || '');
                            $('#inscricao_municipal').val(company.inscricao_municipal || '');
                            $('#id_cnae').val(company.id_cnae || '');
                            $('#cnae').val(company.cnae || '');
                            $('#descricao_cnae').val(company.descricao_cnae || '');
                            $('#regime_tributario').val(company.regime_tributario || '');
                            $('#data_fundacao').val(company.data_fundacao || '');
                            $('#cep').val(company.cep || '');
                            $('#cidade').val(company.cidade || '');
                            $('#estado').val(company.estado || '');
                            $('#rua').val(company.rua || '');
                            $('#numero').val(company.numero || '');
                            $('#bairro').val(company.bairro || '');
                            $('#complemento').val(company.complemento || '');
                            $('#email').val(company.email || '');
                            $('#telefone').val(company.telefone || '');
                            $('#site').val(company.site || '');
                            $('#pessoa_contato').val(company.pessoa_contato || '');
                            $('#natureza_juridica').val(company.natureza_juridica || '');
                            $('#porte').val(company.porte || '');
                            $(`input[name="situacao_cadastral"][value="${company.situacao_cadastral || 'Ativa'}"]`).prop('checked', true);
                            $('#secondary-activities-container').empty();
                            if (company.atividades_secundarias && company.atividades_secundarias.length > 0) {
                                company.atividades_secundarias.forEach(activity => addSecondaryActivity(activity.cnae, activity.id_cnae || '', activity.descricao_cnae));
                            }
                        }
                        $('#company-modal').modal('show');
                    },
                    error: function(jqXHR) {
                        if (jqXHR.status === 401) {
                            window.location.href = '/login.html'; // Redireciona sem mensagem
                        } else {
                            toastr.error('Erro ao carregar dados da empresa: ' + (jqXHR.responseJSON?.message || 'Erro desconhecido'));
                            console.error('Erro /api/empresas/1:', jqXHR.responseJSON || jqXHR.statusText);
                            $('#company-modal').modal('show');
                        }
                    }
                });
            });

            // Função para consultar CNAE na tabela do banco de dados
            function consultarCNAE(cnaeInput, idCnaeInput, descricaoInput) {
                const cnae = cnaeInput.val().replace(/\D/g, '');
                if (cnae.length === 7) {
                    const formattedCnae = cnae.replace(/(\d{4})(\d{1})(\d{2})/, '$1-$2/$3');
                    $.ajax({
                        url: `/api/cnae/${encodeURIComponent(formattedCnae)}`,
                        method: 'GET',
                        xhrFields: { withCredentials: true },
                        success: function(data) {
                            if (data && data.id && data.descricao) {
                                idCnaeInput.val(data.id);
                                descricaoInput.val(data.descricao);
                                // Removido toastr.success para consulta bem-sucedida
                            } else {
                                idCnaeInput.val('');
                                descricaoInput.val('');
                                toastr.warning(`CNAE ${formattedCnae} não encontrado na base de dados.`);
                            }
                        },
                        error: function(jqXHR) {
                            if (jqXHR.status === 401) {
                                window.location.href = '/login.html'; // Redireciona sem mensagem
                            } else {
                                idCnaeInput.val('');
                                descricaoInput.val('');
                                toastr.error('Erro ao consultar CNAE: ' + (jqXHR.responseJSON?.message || 'Erro desconhecido'));
                                console.error('Erro ao consultar CNAE:', {
                                    url: `/api/cnae/${formattedCnae}`,
                                    status: jqXHR.status,
                                    response: jqXHR.responseJSON,
                                    statusText: jqXHR.statusText
                                });
                            }
                        }
                    });
                } else {
                    idCnaeInput.val('');
                    descricaoInput.val('');
                    if (cnae.length > 0) {
                        toastr.warning('Por favor, insira um CNAE válido (formato: 0000-0/00).');
                    }
                }
            }

            // Consulta CNAE principal com debounce
            const debouncedConsultarCNAEPrincipal = debounce(function() {
                consultarCNAE($('#cnae'), $('#id_cnae'), $('#descricao_cnae'));
            }, 300);
            $('#cnae').on('input', debouncedConsultarCNAEPrincipal);

            // Consulta CNAE secundário com debounce
            $('#secondary-activities-container').on('input', '.cnae-secundario', function() {
                const cnaeInput = $(this);
                const idCnaeInput = cnaeInput.siblings('.id-cnae-secundario');
                const descricaoInput = cnaeInput.siblings('.descricao-cnae');
                const debouncedConsultarCNAESecundario = debounce(function() {
                    consultarCNAE(cnaeInput, idCnaeInput, descricaoInput);
                }, 300);
                debouncedConsultarCNAESecundario();
            });

            // Consulta CEP via ViaCEP
            $('#cep').on('blur', function() {
                const cep = $(this).val().replace(/\D/g, '');
                if (cep.length === 8) {
                    $.ajax({
                        url: `https://viacep.com.br/ws/${cep}/json/`,
                        method: 'GET',
                        success: function(data) {
                            if (data && !data.erro) {
                                $('#cidade').val(data.localidade || '');
                                $('#estado').val(data.uf || '');
                                $('#rua').val(data.logradouro || '');
                                $('#bairro').val(data.bairro || '');
                            } else {
                                toastr.warning('CEP não encontrado.');
                                $('#cidade').val('');
                                $('#estado').val('');
                                $('#rua').val('');
                                $('#bairro').val('');
                            }
                        },
                        error: function(jqXHR) {
                            toastr.error('Erro ao consultar a API de CEP: ' + (jqXHR.responseJSON?.message || 'Erro desconhecido'));
                            console.error('Erro ao consultar CEP:', jqXHR.responseJSON || jqXHR.statusText);
                        }
                    });
                } else {
                    toastr.warning('Por favor, insira um CEP válido (formato: 00000-000).');
                }
            });

            // Envio do formulário com validação
            $('#company-form').submit(function(e) {
                e.preventDefault();

                // Lista de campos obrigatórios
                const requiredFields = [
                    { id: 'razao_social', label: 'Razão Social' },
                    { id: 'cnpj', label: 'CNPJ' },
                    { id: 'inscricao_municipal', label: 'Inscrição Municipal' },
                    { id: 'id_cnae', label: 'CNAE' },
                    { id: 'regime_tributario', label: 'Regime Tributário' },
                    { id: 'data_fundacao', label: 'Data de Fundação' },
                    { id: 'cep', label: 'CEP' },
                    { id: 'cidade', label: 'Cidade' },
                    { id: 'estado', label: 'Estado' },
                    { id: 'rua', label: 'Rua' },
                    { id: 'numero', label: 'Número' },
                    { id: 'bairro', label: 'Bairro' },
                    { id: 'email', label: 'E-mail' },
                    { id: 'telefone', label: 'Telefone' }
                ];

                // Validar campos obrigatórios
                let isValid = true;
                requiredFields.forEach(field => {
                    const value = $(`#${field.id}`).val();
                    if (!value || value.trim() === '') {
                        toastr.error(`O campo ${field.label} é obrigatório.`);
                        isValid = false;
                    }
                });

                // Validar situação cadastral
                if (!$('input[name="situacao_cadastral"]:checked').val()) {
                    toastr.error('O campo Situação Cadastral é obrigatório.');
                    isValid = false;
                }

                // Validar formato do e-mail
                const email = $('#email').val();
                if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                    toastr.error('Por favor, insira um e-mail válido.');
                    isValid = false;
                }

                // Validar formato do CNPJ
                const cnpj = $('#cnpj').val().replace(/\D/g, '');
                if (cnpj && cnpj.length !== 14) {
                    toastr.error('Por favor, insira um CNPJ válido (formato: 00.000.000/0000-00).');
                    isValid = false;
                }

                // Validar formato do CNAE principal
                const cnae = $('#cnae').val().replace(/\D/g, '');
                if (cnae && cnae.length !== 7) {
                    toastr.error('Por favor, insira um CNAE válido (formato: 0000-0/00).');
                    isValid = false;
                } else {
                    const idCnae = $('#id_cnae').val();
                    if (!idCnae) {
                        toastr.error('O CNAE principal informado não existe na base de dados.');
                        isValid = false;
                    }
                }

                // Validar formato do CEP
                const cep = $('#cep').val().replace(/\D/g, '');
                if (cep && cep.length !== 8) {
                    toastr.error('Por favor, insira um CEP válido (formato: 00000-000).');
                    isValid = false;
                }

                // Validar formato do telefone
                const telefone = $('#telefone').val().replace(/\D/g, '');
                if (telefone && telefone.length < 10) {
                    toastr.error('Por favor, insira um telefone válido (formato: (00) 00000-0000).');
                    isValid = false;
                }

                // Validar atividades secundárias
                $('.cnae-secundario').each(function() {
                    const cnaeSecundario = $(this).val().replace(/\D/g, '');
                    const idCnaeSecundario = $(this).siblings('.id-cnae-secundario').val();
                    if (cnaeSecundario && cnaeSecundario.length !== 7) {
                        toastr.error('Por favor, insira um CNAE secundário válido (formato: 0000-0/00).');
                        isValid = false;
                    } else if (cnaeSecundario && !idCnaeSecundario) {
                        toastr.error('Um CNAE secundário informado não existe na base de dados.');
                        isValid = false;
                    }
                });

                if (!isValid) {
                    return; // Impede o envio do formulário se houver erros
                }

                // Coletar dados do formulário
                const empresaId = $('#empresa-id').val();
                const formData = $(this).serializeArray();
                const empresaData = {};
                const atividadesSecundarias = [];

                formData.forEach(field => {
                    if (field.name.startsWith('atividades_secundarias')) {
                        const match = field.name.match(/atividades_secundarias\[(\d+)\]\[(id_cnae|cnae|descricao_cnae)\]/);
                        if (match) {
                            const index = parseInt(match[1]);
                            const type = match[2];
                            if (!atividadesSecundarias[index]) {
                                atividadesSecundarias[index] = {};
                            }
                            atividadesSecundarias[index][type] = field.value;
                        }
                    } else {
                        empresaData[field.name] = field.value;
                    }
                });

                empresaData.atividades_secundarias = atividadesSecundarias.filter(activity => activity.id_cnae);

                // Enviar dados para a API
                const method = empresaId ? 'PUT' : 'POST';
                const url = empresaId ? `/api/empresas/${empresaId}` : '/api/empresas';

                $.ajax({
                    url: url,
                    method: method,
                    contentType: 'application/json; charset=utf-8',
                    data: JSON.stringify(empresaData),
                    xhrFields: { withCredentials: true },
                    success: function(response) {
                        toastr.success(empresaId ? 'Empresa atualizada com sucesso!' : 'Empresa adicionada com sucesso!');
                        populateTable();
                        $('#company-modal').modal('hide');
                        $('#company-form')[0].reset();
                    },
                    error: function(jqXHR) {
                        if (jqXHR.status === 401) {
                            window.location.href = '/login.html'; // Redireciona sem mensagem
                        } else {
                            toastr.error(`Erro ao ${empresaId ? 'atualizar' : 'adicionar'} empresa: ${jqXHR.responseJSON?.message || 'Erro desconhecido'}`);
                            console.error(`Erro ${method} /api/empresas/${empresaId || ''}:`, jqXHR.responseJSON || jqXHR.statusText);
                        }
                    }
                });
            });

            // Inicializar tabela
            populateTable();
        },
        error: function() {
            window.location.href = '/login.html'; // Redireciona sem mensagem
        }
    });
});