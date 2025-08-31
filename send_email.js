const nodemailer = require('nodemailer');
require('dotenv').config();
const logger = require('./utils/logger'); // Importar o logger

// Configuração do transporter (serviço SMTP)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Teste de conexão SMTP
transporter.verify((error, success) => {
  if (error) {
    logger.error('Erro na conexão SMTP', { stack: error.stack });
  } else {
    logger.info('Conexão SMTP OK');
  }
});

// Função para enviar e-mail
const sendEmail = async (req, res) => {
  const { nome, endereco, cidade, estado, telefone, email, mensagem, assunto } = req.body;
  const attachments = req.files || [];

  if (!nome || !email || !mensagem) {
    logger.warn('Campos obrigatórios ausentes', { nome, email, mensagem });
    return res.status(400).send('Campos obrigatórios (nome, email, mensagem) não preenchidos.');
  }

  const mailOptions = {
    from: email || process.env.SMTP_USER,
    to: process.env.EMAIL_TO,
    subject: `Formulário de Contato - Cerâmica Vicente Portela - ${assunto || 'Sem Assunto'}`,
    html: `
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; background-color: #f9f9f9; }
          h2 { color: #cc0000; text-align: center; }
          p { margin: 10px 0; }
          strong { color: #000; }
          .footer { font-size: 0.9em; color: #666; text-align: center; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Nova Mensagem Recebida</h2>
          <p><strong>Assunto:</strong> ${assunto || 'Sem Assunto'}</p>
          <p><strong>Nome:</strong> ${nome || 'Não informado'}</p>
          <p><strong>Endereço:</strong> ${endereco || 'Não informado'}</p>
          <p><strong>Cidade:</strong> ${cidade || 'Não informado'}</p>
          <p><strong>Estado:</strong> ${estado || 'Não informado'}</p>
          <p><strong>Telefone:</strong> ${telefone || 'Não informado'}</p>
          <p><strong>E-mail:</strong> <a href="mailto:${email || 'Não informado'}">${email || 'Não informado'}</a></p>
          <p><strong>Mensagem:</strong><br>${mensagem || 'Nenhuma mensagem'}</p>
          ${attachments.length > 0 ? '<p><strong>Anexos:</strong> ' + attachments.map(file => file.originalname).join(', ') + '</p>' : ''}
          <div class="noreply">⚠ Este e-mail foi gerado automaticamente. Por favor, não responda.</div>
          <div class="footer">Enviado em: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</div>
        </div>
      </body>
      </html>
    `,
    text: `Assunto: ${assunto || 'Sem Assunto'}\nNome: ${nome || 'Não informado'}\nEndereço: ${endereco || 'Não informado'}\nCidade: ${cidade || 'Não informado'}\nEstado: ${estado || 'Não informado'}\nTelefone: ${telefone || 'Não informado'}\nE-mail: ${email || 'Não informado'}\nMensagem: ${mensagem || 'Nenhuma mensagem'}${attachments.length > 0 ? '\nAnexos: ' + attachments.map(file => file.originalname).join(', ') : ''}\nEnviado em: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
    attachments: attachments.map(file => ({
      filename: file.originalname,
      content: file.buffer
    }))
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info('E-mail enviado com sucesso', { email, response: info.response });
    res.send('Mensagem enviada com sucesso!');
  } catch (error) {
    logger.error('Erro ao enviar e-mail', { stack: error.stack });
    res.status(500).send('Erro ao enviar a mensagem: ' + error.message);
  }
};

module.exports = { sendEmail };