import { useState } from 'react';
import { BRAZILIAN_STATES, SUBJECT_OPTIONS } from '../data/landingData';
import { logClientError } from '../utils/landingUtils';
import { showToast } from '../utils/toast';

const INITIAL_FORM = {
    nome: '',
    endereco: '',
    cidade: '',
    estado: '',
    telefone: '',
    email: '',
    assunto: '',
    mensagem: ''
};

export default function ContactForm() {
    const [form, setForm] = useState(INITIAL_FORM);
    const [files, setFiles] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((current) => ({ ...current, [name]: value }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSubmitting(true);

        const formData = new FormData();
        Object.entries(form).forEach(([key, value]) => formData.append(key, value));
        files.forEach((file) => formData.append('anexo', file));

        try {
            const response = await fetch('/send-email', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Erro na requisição: ${response.statusText}`);
            }

            setForm(INITIAL_FORM);
            setFiles([]);
            showToast('success', 'Mensagem enviada com sucesso!');
        } catch (error) {
            logClientError('Erro no envio do formulário', error);
            showToast('error', `Erro ao enviar a mensagem: ${error.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <section className="atendimento-section contact-modern" id="atendimento">
            <div className="container">
                <div className="section-head section-head-light scroll-reveal">
                    <span className="section-eyebrow section-eyebrow-light">Fale conosco</span>
                    <h2 className="section-title section-title-light">Envie uma mensagem</h2>
                    <p className="section-lead section-lead-light">
                        Preencha o formulário abaixo. Nossa equipe retorna por telefone ou e-mail.
                    </p>
                </div>

                <form className="contact-modern-form scroll-reveal" onSubmit={handleSubmit}>
                    <div className="contact-form-row contact-form-row--2">
                        <input type="text" id="nome" name="nome" placeholder="Nome completo *" required value={form.nome} onChange={handleChange} />
                        <input type="tel" id="telefone" name="telefone" placeholder="Telefone *" required value={form.telefone} onChange={handleChange} />
                    </div>

                    <div className="contact-form-row contact-form-row--2">
                        <input type="email" id="email" name="email" placeholder="E-mail *" required value={form.email} onChange={handleChange} />
                        <select id="assunto" name="assunto" required value={form.assunto} onChange={handleChange}>
                            <option value="" disabled>Assunto *</option>
                            {SUBJECT_OPTIONS.map((option) => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>
                    </div>

                    <div className="contact-form-row contact-form-row--3">
                        <input type="text" id="endereco" name="endereco" placeholder="Endereço *" required value={form.endereco} onChange={handleChange} />
                        <input type="text" id="cidade" name="cidade" placeholder="Cidade *" required value={form.cidade} onChange={handleChange} />
                        <select id="estado" name="estado" required value={form.estado} onChange={handleChange}>
                            <option value="" disabled>UF *</option>
                            {BRAZILIAN_STATES.map(([value, label]) => (
                                <option key={value} value={value}>{value}</option>
                            ))}
                        </select>
                    </div>

                    <textarea id="mensagem" name="mensagem" rows="4" placeholder="Sua mensagem *" required value={form.mensagem} onChange={handleChange} />

                    <div className="contact-form-footer">
                        <div className="contact-file-upload">
                            <input
                                type="file"
                                id="anexo"
                                name="anexo"
                                className="contact-file-input"
                                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                multiple
                                onChange={(event) => setFiles(Array.from(event.target.files || []))}
                            />
                            <label htmlFor="anexo" className="contact-file-label">
                                <span className="contact-file-icon" aria-hidden="true">
                                    <i className="fas fa-paperclip" />
                                </span>
                                <span className="contact-file-text">
                                    <strong>
                                        {files.length > 0
                                            ? `${files.length} arquivo${files.length > 1 ? 's' : ''} selecionado${files.length > 1 ? 's' : ''}`
                                            : 'Anexar documentos'}
                                    </strong>
                                    <span>
                                        {files.length > 0
                                            ? files.map((file) => file.name).join(', ')
                                            : 'PDF, JPG, PNG ou DOC — até 10 MB cada'}
                                    </span>
                                </span>
                                <span className="contact-file-browse">Escolher</span>
                            </label>
                        </div>
                        <button type="submit" className="contact-submit-btn" disabled={submitting}>
                            {submitting ? 'Enviando...' : 'Enviar mensagem'}
                        </button>
                    </div>
                </form>
            </div>
        </section>
    );
}
