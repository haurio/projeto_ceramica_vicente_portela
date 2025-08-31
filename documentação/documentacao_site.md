📑 Documentação do Site - Cerâmica Vicente Portela
🌐 Visão Geral
Este documento descreve o desenvolvimento do site da Cerâmica Vicente Portela, uma empresa especializada na fabricação de produtos cerâmicos para construção civil. O site foi projetado para apresentar os produtos, a história da empresa, informações de contato e um sistema de atendimento ao cliente.
🛠️ Estrutura do Projeto
1. 📄 HTML

Estrutura Principal: O site utiliza uma estrutura baseada em HTML5 com seções como <header>, <main> e <footer>.
Navegação: Inclui um menu de navegação fixo com links para seções como Home, Produtos, Empresa, História, Dúvidas, Atendimento e Contato.
Seções:
🏠 Home: Contém um carrossel (Swiper) com imagens e títulos animados, destacando valores como Tradição, Dedicação e Excelência.
🛒 Produtos: Exibe uma grade de produtos (Lajota e Vedação) com modal interativo para detalhes e calculadora de materiais.
🏢 Empresa: Apresenta a missão, visão, valores e informações sobre o processo de fabricação.
⏳ História: Mostra a linha do tempo da família e da empresa com imagens e descrições.
❓ Dúvidas: Inclui um acordeão com perguntas frequentes.
📩 Atendimento: Oferece um formulário de contato com upload de anexos.
📞 Contato: Fornece informações de endereço, telefone, e-mail e links para redes sociais.


🪟 Modal: Utiliza Bootstrap para modais, como o de produtos e mapa.

2. 🎨 CSS

Estilização: Usa Bootstrap 5.3.3 como base, com fontes personalizadas (Playfair Display e Lato) e ícones do  Font Awesome.
Layout:
Grid para a seção de produtos com 4 colunas (responsivo para 2 e 1 em telas menores).
Flexbox no modal para alinhar imagem, detalhes e calculadora.


Animações: Inclui efeitos hover nos produtos, transição no carrossel e barra de progresso animada.
📱 Responsividade: Media queries ajustam o layout para telas menores (991px e 767px), reorganizando seções e reduzindo tamanhos de fonte e imagens.

3. 💻 JavaScript

Bibliotecas:
 Swiper para o carrossel com autoplay, navegação e animação de fade.
 Bootstrap para modais e componentes interativos.
 jQuery e Toastr para notificações.


Funcionalidades:
⬇️ Rolagem Suave: Links do menu rolam suavemente para as seções com offset para a barra de navegação.
🎠 Carrossel: Configurado com transição de fade, paginação e botões de navegação.
📊 Barra de Progresso: Sincroniza com o autoplay do carrossel.
🖼️ Modal de Produtos: Carrega imagens e especificações dinamicamente ao clicar em um produto.
🧮 Calculadora: Calcula o número de peças necessárias com base em altura e comprimento, usando dados do mapa de especificações.
📤 Formulário: Envia dados via fetch para um endpoint Node.js, com fallback para alertas caso Toastr falhe.


🎯 Eventos: Inclui listeners para cliques, redimensionamento da janela e inicialização do DOM.

4. 🖥️ Backend (Node.js)

Servidor: Utiliza Express.js rodando na porta 3000.
Funcionalidades:
📥 Upload de Arquivos: Usa Multer para processar anexos do formulário.
📧 Envio de E-mail: Integra Nodemailer para enviar mensagens com anexos para o e-mail configurado via variáveis de ambiente (.env).


Rotas:
/: Serve o arquivo index.html.
/send-email: Processa o formulário e envia e-mail com os dados recebidos.



✨ Funcionalidades Principais

🎬 Carrossel Dinâmico: Apresenta slides com imagens e textos animados.
🛠️ Calculadora de Materiais: Permite calcular a quantidade de peças necessárias para uma obra com base em dimensões.
📧 Formulário de Contato: Envia mensagens com anexos para a equipe da empresa via e-mail.
🪟 Modal Interativo: Exibe detalhes dos produtos e mapa de localização.
📱 Responsividade: Adaptação automática para diferentes tamanhos de tela.

📦 Dependências

Frontend:  Bootstrap,  Swiper,  Font Awesome,  Toastr,  jQuery.
Backend:  Express,  Nodemailer,  Multer,  body-parser,  dotenv.

⚙️ Configuração

Instale as dependências do backend com  npm install express nodemailer multer body-parser dotenv.
Configure as variáveis de ambiente no arquivo .env com:
SMTP_HOST (smtp.gmail.com)
SMTP_PORT (587)
SMTP_SECURE (false)
SMTP_USER (noreplay.system33@gmail.com)
SMTP_PASS (knpj cwpm mtrt rifm)
EMAIL_TO (a definir)


Execute o servidor com  node app.js (ajuste o nome do arquivo se necessário).

ℹ️ Notas

O site assume que os arquivos CSS e imagens estão em pastas locais (css/, image/, js/).
A lógica de envio de e-mail depende de um servidor SMTP configurado corretamente.
A documentação foi criada em  14:39 WEST, 16 de agosto de 2025.

🚀 Próximos Passos

Adicionar  validação mais robusta ao formulário.
Implementar  vídeo institucional na seção Empresa.
Otimizar  imagens para melhorar o desempenho.
Alteração de historia e algumas informações.
