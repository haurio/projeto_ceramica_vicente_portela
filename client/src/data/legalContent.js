const COMPANY = {
    name: 'Cerâmica Vicente Portela Ltda.',
    cnpj: '09.207.910/0001-14',
    addressLine1: 'Rodovia Margem BR-116, Km 455,5, S/N',
    addressLine2: 'Córrego das Pedras, Zona Rural',
    city: 'Engenheiro Caldas, MG',
    zip: '35130-000',
    phone: '(33) 99807-6100',
    email: 'noreplay@ceramicavicenteportela.com.br'
};

export const PRIVACY_POLICY = {
    title: 'Política de Privacidade',
    updatedAt: 'Julho de 2026',
    sections: [
        {
            heading: '1. Quem somos',
            paragraphs: [
                `Esta Política de Privacidade descreve como a ${COMPANY.name}, inscrita no CNPJ ${COMPANY.cnpj}, com sede em ${COMPANY.addressLine1}, ${COMPANY.addressLine2}, ${COMPANY.city}, CEP ${COMPANY.zip}, trata os dados pessoais coletados por meio deste site.`
            ]
        },
        {
            heading: '2. Dados que coletamos',
            paragraphs: [
                'Podemos coletar os seguintes dados quando você utiliza nosso site ou entra em contato conosco:',
                'Nome, e-mail, telefone, cidade, estado e mensagem enviada pelo formulário de contato;',
                'Dados técnicos de navegação, como endereço IP, tipo de navegador, páginas visitadas e preferências de cookies;',
                'Informações fornecidas voluntariamente em solicitações de orçamento ou atendimento.'
            ]
        },
        {
            heading: '3. Finalidade do tratamento',
            paragraphs: [
                'Utilizamos seus dados para responder solicitações de contato e orçamento, prestar atendimento, melhorar a experiência no site, cumprir obrigações legais e garantir a segurança da plataforma.'
            ]
        },
        {
            heading: '4. Base legal',
            paragraphs: [
                'O tratamento de dados pessoais é realizado com fundamento na Lei Geral de Proteção de Dados (Lei nº 13.709/2018), especialmente com base no consentimento, na execução de procedimentos preliminares a contrato, no legítimo interesse e no cumprimento de obrigação legal.'
            ]
        },
        {
            heading: '5. Compartilhamento de dados',
            paragraphs: [
                'Não vendemos seus dados pessoais. O compartilhamento pode ocorrer apenas com prestadores de serviços essenciais à operação do site, como hospedagem e envio de e-mails, sempre observando medidas de segurança e confidencialidade.'
            ]
        },
        {
            heading: '6. Retenção e segurança',
            paragraphs: [
                'Os dados são mantidos pelo tempo necessário para cumprir as finalidades descritas nesta política ou conforme exigido por lei. Adotamos medidas técnicas e organizacionais para proteger as informações contra acessos não autorizados, perda ou alteração indevida.'
            ]
        },
        {
            heading: '7. Seus direitos',
            paragraphs: [
                'Você pode solicitar confirmação de tratamento, acesso, correção, anonimização, portabilidade, eliminação, informação sobre compartilhamento e revogação do consentimento, conforme a LGPD.'
            ]
        },
        {
            heading: '8. Contato do encarregado',
            paragraphs: [
                `Para exercer seus direitos ou esclarecer dúvidas sobre privacidade, entre em contato pelo e-mail ${COMPANY.email} ou pelo telefone ${COMPANY.phone}.`
            ]
        }
    ]
};

export const COOKIE_POLICY = {
    title: 'Política de Cookies',
    updatedAt: 'Julho de 2026',
    sections: [
        {
            heading: '1. O que são cookies',
            paragraphs: [
                'Cookies são pequenos arquivos armazenados no seu navegador quando você visita um site. Eles ajudam a lembrar preferências, melhorar a navegação e, em alguns casos, analisar o uso da página.'
            ]
        },
        {
            heading: '2. Como usamos cookies',
            paragraphs: [
                'Este site utiliza cookies necessários para o funcionamento básico da página, como registrar sua escolha sobre o uso de cookies.',
                'Também podemos utilizar cookies de desempenho e funcionalidade para melhorar a experiência de navegação, sempre respeitando o consentimento informado.'
            ]
        },
        {
            heading: '3. Tipos de cookies utilizados',
            paragraphs: [
                'Cookies necessários: essenciais para o funcionamento do site e para salvar sua preferência de consentimento;',
                'Cookies de preferência: permitem lembrar escolhas feitas durante a navegação;',
                'Cookies analíticos: podem ser utilizados para entender como os visitantes interagem com o site, quando autorizados.'
            ]
        },
        {
            heading: '4. Gerenciamento de cookies',
            paragraphs: [
                'Ao acessar o site pela primeira vez, você poderá aceitar ou recusar cookies não essenciais por meio do banner exibido.',
                'Você também pode alterar as configurações do seu navegador para bloquear ou excluir cookies a qualquer momento. A desativação de cookies necessários pode afetar o funcionamento de algumas funcionalidades.'
            ]
        },
        {
            heading: '5. Atualizações',
            paragraphs: [
                'Esta política pode ser atualizada periodicamente para refletir mudanças legais ou operacionais. Recomendamos a leitura regular deste documento.'
            ]
        },
        {
            heading: '6. Contato',
            paragraphs: [
                `Em caso de dúvidas sobre cookies ou privacidade, fale conosco pelo e-mail ${COMPANY.email} ou telefone ${COMPANY.phone}.`
            ]
        }
    ]
};
