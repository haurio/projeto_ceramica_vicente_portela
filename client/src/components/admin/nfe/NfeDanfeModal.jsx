import { useEffect, useRef, useState } from 'react';
import { Button, Modal, Spinner } from 'react-bootstrap';
import JsBarcode from 'jsbarcode';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { downloadNfeXml, fetchNfeEmissao } from '../../../api/nfe';
import { showToast } from '../../../utils/toast';
import AdminModalClose from '../AdminModalClose';

function formatCurrency(value) {
    return (Number(value) || 0).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function formatDateBr(value) {
    if (!value) return '';
    const raw = String(value).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        try {
            return new Date(value).toLocaleDateString('pt-BR');
        } catch (_e) {
            return String(value);
        }
    }
    const [y, m, d] = raw.split('-');
    return `${d}/${m}/${y}`;
}

function formatDateTimeBr(value) {
    if (!value) return '';
    try {
        return new Date(value).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    } catch (_e) {
        return formatDateBr(value);
    }
}

function formatTimeBr(value) {
    if (!value) return '';
    try {
        return new Date(value).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    } catch (_e) {
        return '';
    }
}

function formatDoc(value) {
    const digits = String(value || '').replace(/\D/g, '');
    if (digits.length === 11) {
        return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    if (digits.length === 14) {
        return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return value || '';
}

function formatCep(value) {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 8);
    if (digits.length !== 8) return value || '';
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function formatChave(value) {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 44);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

function joinParts(parts) {
    return parts.filter(Boolean).join(', ');
}

function buildLocalEntregaFromNota(nota) {
    const endereco = nota?.endereco_entrega
        || joinParts([
            nota?.cliente_endereco,
            nota?.cliente_numero ? `nº ${nota.cliente_numero}` : '',
            nota?.cliente_bairro,
        ]);
    const parts = [
        endereco,
        nota?.cidade_entrega || nota?.cliente_cidade || '',
        nota?.uf_entrega || nota?.cliente_uf || '',
        formatCep(nota?.cep_entrega || nota?.cliente_cep) || '',
    ].filter(Boolean);
    return parts.length ? parts.join(' - ') : 'Conforme cadastro do destinatário';
}

function resolveInfoComplementares(nota) {
    let text = String(nota?.observacoes || nota?.pedido_observacoes || '').trim();
    const local = buildLocalEntregaFromNota(nota);
    if (
        local !== 'Conforme cadastro do destinatário'
        && /Conforme cadastro do destinatário/i.test(text)
    ) {
        text = text.replace(
            /Local de Entrega\/Descarga:\s*Conforme cadastro do destinatário\.?/gi,
            `Local de Entrega/Descarga: ${local}.`
        );
    }
    if (!text) {
        return [
            'DOCUMENTO EMITIDO POR ME OU EPP OPTANTE PELO SIMPLES NACIONAL. '
            + 'NÃO GERA DIREITO A CRÉDITO FISCAL DE IPI. '
            + 'PERMITE O APROVEITAMENTO DO CRÉDITO DE ICMS CORRESPONDENTE À ALÍQUOTA APLICÁVEL ÀS AQUISIÇÕES, '
            + 'NOS TERMOS DO ART. 23 DA LC 123/2006, QUANDO CABÍVEL.',
            `Ref. Pedido: ${nota?.pedido_numero || '—'}.`,
            'Frete: Sem ocorrência de transporte (Retirada no local).',
            `Local de Entrega/Descarga: ${local}.`,
            'Valor aprox. dos tributos: R$ 0,00 (0,00%) Fonte: IBPT.',
        ].join('\n');
    }
    return text;
}

function formatEmpresaNome(value) {
    return String(value || '')
        .replace(/\bCeramica\b/gi, 'Cerâmica')
        .replace(/\bLimitada\b/gi, 'LTDA')
        .replace(/\bLtda\.?\b/gi, 'LTDA')
        .trim();
}

function Cell({ label, value, className = '', children }) {
    return (
        <div className={`danfe-field ${className}`.trim()}>
            <span className="danfe-label">{label}</span>
            <span className="danfe-value">{children || value || '\u00a0'}</span>
        </div>
    );
}

export default function NfeDanfeModal({ emissaoId, onClose }) {
    const printRef = useRef(null);
    const barcodeRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [pdfLoading, setPdfLoading] = useState(false);
    const [nota, setNota] = useState(null);

    useEffect(() => {
        let active = true;
        (async () => {
            setLoading(true);
            try {
                const data = await fetchNfeEmissao(emissaoId);
                if (active) setNota(data);
            } catch (error) {
                if (active) {
                    showToast('error', error.message || 'Erro ao abrir a nota.');
                    onClose?.();
                }
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => { active = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [emissaoId]);

    useEffect(() => {
        const chave = String(nota?.chave || '').replace(/\D/g, '');
        if (!barcodeRef.current || chave.length < 44) return;
        try {
            JsBarcode(barcodeRef.current, chave, {
                format: 'CODE128C',
                displayValue: false,
                margin: 0,
                height: 42,
                width: 1.15,
                background: '#ffffff',
                lineColor: '#000000',
            });
        } catch (_error) {
            try {
                JsBarcode(barcodeRef.current, chave, {
                    format: 'CODE128',
                    displayValue: false,
                    margin: 0,
                    height: 42,
                    width: 1.1,
                    background: '#ffffff',
                    lineColor: '#000000',
                });
            } catch (_fallback) {
                // ignore barcode render errors
            }
        }
    }, [nota?.chave]);

    const buildDanfeExportHtml = (danfeHtml, { forPdf = false } = {}) => {
        const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
            .map((el) => el.outerHTML)
            .join('\n');
        return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/><meta http-equiv="Content-Type" content="text/html; charset=utf-8"/><title>DANFE NF-e ${nota?.numero || ''}</title>${styles}
<style>
@page{size:A4 portrait;margin:0}
html,body{width:210mm;height:297mm;background:#fff!important;margin:0;padding:0;color:#000;font-family:Arial,Helvetica,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact;overflow:hidden}
.admin-nfe-danfe-dialog,.modal-content,.modal-body{all:unset}
.admin-nfe-danfe-shell{width:210mm;height:297mm;max-width:210mm;margin:0;padding:5mm;box-sizing:border-box;background:#fff;border:none!important;box-shadow:none!important;border-radius:0!important;overflow:hidden!important}
.admin-nfe-danfe-header,.admin-nfe-danfe-footer,.btn-close{display:none!important}
.danfe-a4,.danfe-a4.is-export{display:flex!important;flex-direction:column!important;width:200mm!important;max-width:200mm!important;height:287mm!important;min-height:287mm!important;margin:0 auto;box-sizing:border-box;overflow:hidden!important}
.danfe-produtos-block{flex:1 1 auto!important;min-height:160px!important;display:flex!important;flex-direction:column!important}
.danfe-rodape{flex:0 0 auto!important;margin-top:auto!important}
.danfe-emitente-text,.danfe-emitente-text strong,.danfe-emitente-text span{color:#000!important;font-family:Arial,Helvetica,sans-serif!important}
${forPdf ? '' : ''}
</style></head><body>${danfeHtml}</body></html>`;
    };

    const waitForImages = (doc) => new Promise((resolve) => {
        const images = Array.from(doc.images || []);
        if (!images.length) {
            resolve();
            return;
        }
        let pending = images.length;
        const done = () => {
            pending -= 1;
            if (pending <= 0) resolve();
        };
        images.forEach((img) => {
            if (img.complete) done();
            else {
                img.addEventListener('load', done, { once: true });
                img.addEventListener('error', done, { once: true });
            }
        });
        setTimeout(resolve, 4000);
    });

    const openDanfeFrame = async (html, { title = 'DANFE', widthPx = 794, heightPx = 1123 } = {}) => {
        const iframe = document.createElement('iframe');
        iframe.setAttribute('title', title);
        iframe.style.cssText = `position:fixed;left:-10000px;top:0;width:${widthPx}px;height:${heightPx}px;border:0;opacity:0;pointer-events:none;z-index:-1;`;
        document.body.appendChild(iframe);

        const frameDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!frameDoc) {
            iframe.remove();
            throw new Error('Não foi possível preparar a folha A4.');
        }

        frameDoc.open();
        frameDoc.write(html);
        frameDoc.close();
        await waitForImages(frameDoc);
        await new Promise((r) => setTimeout(r, 120));
        return { iframe, frameDoc };
    };

    const buildDanfePdf = async () => {
        const shell = printRef.current;
        const source = shell?.querySelector('.danfe-a4');
        if (!source || !nota) {
            throw new Error('DANFE não disponível.');
        }

        const wrap = document.createElement('div');
        wrap.className = 'admin-nfe-danfe-shell';
        const clone = source.cloneNode(true);
        clone.classList.add('is-export');
        wrap.appendChild(clone);

        const { iframe, frameDoc } = await openDanfeFrame(
            buildDanfeExportHtml(wrap.outerHTML, { forPdf: true }),
            { title: 'DANFE A4' }
        );

        try {
            const target = frameDoc.body;
            const canvas = await html2canvas(target, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                logging: false,
                scrollX: 0,
                scrollY: 0,
                windowWidth: 794,
                windowHeight: 1123,
                width: 794,
                height: 1123,
                onclone: (clonedDoc) => {
                    const el = clonedDoc.querySelector('.danfe-a4');
                    if (el) el.classList.add('is-export');
                    const htmlEl = clonedDoc.documentElement;
                    const bodyEl = clonedDoc.body;
                    if (htmlEl) {
                        htmlEl.style.width = '210mm';
                        htmlEl.style.height = '297mm';
                    }
                    if (bodyEl) {
                        bodyEl.style.width = '210mm';
                        bodyEl.style.height = '297mm';
                        bodyEl.style.margin = '0';
                        bodyEl.style.padding = '0';
                        bodyEl.style.overflow = 'hidden';
                    }
                },
            });

            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
                compress: true,
            });
            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 297, undefined, 'FAST');
            return pdf;
        } finally {
            iframe.remove();
        }
    };

    const handlePrint = async () => {
        if (!nota) return;
        setPdfLoading(true);
        let printFrame = null;
        let blobUrl = '';
        try {
            // Impressão usa o mesmo PDF (grades iguais ao download)
            const pdf = await buildDanfePdf();
            blobUrl = pdf.output('bloburl');
            printFrame = document.createElement('iframe');
            printFrame.setAttribute('title', 'Impressão DANFE');
            printFrame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;';
            document.body.appendChild(printFrame);

            await new Promise((resolve, reject) => {
                const timer = setTimeout(() => reject(new Error('Tempo esgotado ao preparar impressão.')), 12000);
                printFrame.onload = () => {
                    clearTimeout(timer);
                    try {
                        printFrame.contentWindow?.focus();
                        printFrame.contentWindow?.print();
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                };
                printFrame.onerror = () => {
                    clearTimeout(timer);
                    reject(new Error('Não foi possível abrir a impressão.'));
                };
                printFrame.src = blobUrl;
            });
        } catch (error) {
            showToast('error', error.message || 'Não foi possível iniciar a impressão.');
        } finally {
            setPdfLoading(false);
            setTimeout(() => {
                if (printFrame) printFrame.remove();
                if (blobUrl) URL.revokeObjectURL(blobUrl);
            }, 2000);
        }
    };

    const handleDownloadPdf = async () => {
        if (!nota) return;
        setPdfLoading(true);
        try {
            const pdf = await buildDanfePdf();
            const numero = String(nota.numero || emissaoId).padStart(9, '0');
            pdf.save(`DANFE-NFe-${numero}.pdf`);
            showToast('success', 'PDF da DANFE gerado.');
        } catch (error) {
            showToast('error', error.message || 'Erro ao gerar PDF da DANFE.');
        } finally {
            setPdfLoading(false);
        }
    };

    const emitente = nota?.emitente || {};
    const emitenteNome = formatEmpresaNome(
        emitente.razao_social || emitente.nome_fantasia || 'Cerâmica Vicente Portela LTDA'
    );
    const itens = Array.isArray(nota?.itens) ? nota.itens : [];
    const totais = nota?.totais || {};
    const logoUrl = nota?.config?.logo_data_url || nota?.config?.logo_url || '';
    const isHomolog = nota?.ambiente !== 'producao';
    const isCancelada = /cancel/i.test(String(nota?.status || ''));
    const infoComplementares = resolveInfoComplementares(nota);
    const destEndereco = nota?.endereco_entrega
        || joinParts([
            nota?.cliente_endereco,
            nota?.cliente_numero ? `nº ${nota.cliente_numero}` : '',
            nota?.cliente_bairro,
        ]);

    return (
        <Modal
            show
            onHide={onClose}
            size="xl"
            centered
            scrollable
            dialogClassName="admin-nfe-danfe-dialog"
            contentClassName="admin-nfe-danfe-content"
            className="admin-nfe-danfe-modal"
        >
            <Modal.Header className="admin-nfe-danfe-header">
                <AdminModalClose onClick={onClose} />
            </Modal.Header>
            <Modal.Body className="admin-nfe-danfe-body">
                {loading ? (
                    <div className="admin-nfe-danfe-loading">
                        <Spinner animation="border" size="sm" />
                        <span>Carregando DANFE...</span>
                    </div>
                ) : null}

                {!loading && nota ? (
                    <div className="admin-nfe-danfe-shell" ref={printRef}>
                        <div className={`danfe-a4${isHomolog ? ' is-homolog' : ''}${isCancelada ? ' is-cancelada' : ''}`}>
                            {isCancelada ? (
                                <div className="danfe-watermark danfe-watermark-cancel" aria-hidden="true">
                                    CANCELADA
                                </div>
                            ) : null}
                            {isHomolog && !isCancelada ? (
                                <div className="danfe-watermark" aria-hidden="true">
                                    SEM VALOR FISCAL
                                    <br />
                                    HOMOLOGAÇÃO
                                </div>
                            ) : null}
                            {isHomolog && isCancelada ? (
                                <div className="danfe-watermark danfe-watermark-homolog-soft" aria-hidden="true">
                                    HOMOLOGAÇÃO
                                </div>
                            ) : null}

                            {/* Canhoto */}
                            <div className="danfe-canhoto">
                                <div className="danfe-canhoto-main">
                                    <Cell
                                        label="RECEBEMOS DE"
                                        value={`${emitenteNome} OS PRODUTOS E/OU SERVIÇOS CONSTANTES DA NOTA FISCAL ELETRÔNICA INDICADA AO LADO`}
                                    />
                                    <div className="danfe-canhoto-line">
                                        <Cell label="DATA DE RECEBIMENTO" value="" />
                                        <Cell label="IDENTIFICAÇÃO E ASSINATURA DO RECEBEDOR" value="" className="grow" />
                                    </div>
                                </div>
                                <div className="danfe-canhoto-side">
                                    <strong>NF-e</strong>
                                    <span>
                                        Nº
                                        {' '}
                                        {String(nota.numero || '').padStart(9, '0')}
                                    </span>
                                    <span>
                                        Série
                                        {' '}
                                        {String(nota.serie || 1).padStart(3, '0')}
                                    </span>
                                </div>
                            </div>

                            <div className="danfe-cut" aria-hidden="true">
                                - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
                            </div>

                            {/* Cabeçalho oficial */}
                            <div className="danfe-header">
                                <div className="danfe-emitente">
                                    <div className="danfe-emitente-inner">
                                        {logoUrl ? (
                                            <div className="danfe-logo-box">
                                                <img src={logoUrl} alt="Logo do emitente" />
                                            </div>
                                        ) : null}
                                        <div className="danfe-emitente-text">
                                            <div className="danfe-label">IDENTIFICAÇÃO DO EMITENTE</div>
                                            <strong>{emitenteNome}</strong>
                                            {emitente.nome_fantasia
                                                && formatEmpresaNome(emitente.nome_fantasia) !== emitenteNome ? (
                                                <span>{formatEmpresaNome(emitente.nome_fantasia)}</span>
                                            ) : null}
                                            <span>
                                                {joinParts([
                                                    emitente.rua,
                                                    emitente.numero,
                                                    emitente.complemento,
                                                    emitente.bairro,
                                                ])}
                                            </span>
                                            <span>
                                                {emitente.cidade || '—'}
                                                {' - '}
                                                {emitente.estado || 'MG'}
                                                {' · '}
                                                {formatCep(emitente.cep)}
                                            </span>
                                            <span>
                                                Fone:
                                                {' '}
                                                {emitente.telefone || '—'}
                                            </span>
                                            <span>
                                                CNPJ:
                                                {' '}
                                                {formatDoc(emitente.cnpj)}
                                                {' · IE: '}
                                                {emitente.inscricao_estadual || 'ISENTO'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="danfe-ident">
                                    <div className="danfe-ident-title">DANFE</div>
                                    <div className="danfe-ident-sub">
                                        Documento Auxiliar da
                                        <br />
                                        Nota Fiscal Eletrônica
                                    </div>
                                    <div className="danfe-ident-tipo">
                                        <span>0 - ENTRADA</span>
                                        <span className="is-active">1 - SAÍDA</span>
                                    </div>
                                    <div className="danfe-ident-num">
                                        <div>
                                            <span className="danfe-label">Nº</span>
                                            <strong>{String(nota.numero || '').padStart(9, '0')}</strong>
                                        </div>
                                        <div>
                                            <span className="danfe-label">SÉRIE</span>
                                            <strong>{String(nota.serie || 1).padStart(3, '0')}</strong>
                                        </div>
                                    </div>
                                    <div className="danfe-ident-folha">FOLHA 01/01</div>
                                </div>

                                <div className="danfe-acesso">
                                    <div className="danfe-label">CHAVE DE ACESSO</div>
                                    <svg ref={barcodeRef} className="danfe-barcode-svg" role="img" aria-label="Código de barras da chave de acesso" />
                                    <strong className="danfe-chave">{formatChave(nota.chave)}</strong>
                                    <p className="danfe-consulta">
                                        Consulta de autenticidade no portal nacional da NF-e
                                        <br />
                                        www.nfe.fazenda.gov.br/portal
                                        <br />
                                        ou no site da Sefaz Autorizadora
                                    </p>
                                </div>
                            </div>

                            <div className="danfe-row danfe-row-natureza">
                                <Cell
                                    label="NATUREZA DA OPERAÇÃO"
                                    value={nota.fiscal?.natureza || nota.natureza || 'Venda de mercadoria'}
                                />
                                <Cell
                                    label="PROTOCOLO DE AUTORIZAÇÃO DE USO"
                                    value={[
                                        nota.protocolo || '—',
                                        formatDateTimeBr(nota.criado_em),
                                    ].filter(Boolean).join(' · ')}
                                />
                            </div>

                            <div className="danfe-row danfe-row-ie">
                                <Cell label="INSCRIÇÃO ESTADUAL" value={emitente.inscricao_estadual || 'ISENTO'} />
                                <Cell label="INSCRIÇÃO ESTADUAL DO SUBST. TRIB." value={'\u00a0'} />
                                <Cell label="CNPJ" value={formatDoc(emitente.cnpj)} />
                            </div>

                            {/* Destinatário */}
                            <div className="danfe-block-title">DESTINATÁRIO / REMETENTE</div>
                            <div className="danfe-row danfe-row-dest-top">
                                <Cell label="NOME / RAZÃO SOCIAL" value={nota.cliente_nome} />
                                <Cell label="CNPJ / CPF" value={formatDoc(nota.cliente_documento)} />
                                <Cell label="DATA DA EMISSÃO" value={formatDateBr(nota.criado_em || nota.data_emissao)} />
                            </div>
                            <div className="danfe-row danfe-row-dest-mid">
                                <Cell label="ENDEREÇO" value={destEndereco} />
                                <Cell label="BAIRRO / DISTRITO" value={nota.cliente_bairro || '\u00a0'} />
                                <Cell label="CEP" value={formatCep(nota.cep_entrega || nota.cliente_cep) || '\u00a0'} />
                                <Cell label="DATA DA SAÍDA/ENTRADA" value={formatDateBr(nota.data_entrega || nota.criado_em)} />
                            </div>
                            <div className="danfe-row danfe-row-dest-bot">
                                <Cell label="MUNICÍPIO" value={nota.cidade_entrega || nota.cliente_cidade || '\u00a0'} />
                                <Cell label="UF" value={nota.uf_entrega || nota.cliente_uf || '\u00a0'} />
                                <Cell label="FONE / FAX" value={nota.telefone_entrega || nota.cliente_telefone || '\u00a0'} />
                                <Cell label="INSCRIÇÃO ESTADUAL" value={nota.cliente_ie || 'ISENTO'} />
                                <Cell label="HORA DA SAÍDA" value={formatTimeBr(nota.criado_em) || '\u00a0'} />
                            </div>

                            {/* Cálculo do imposto */}
                            <div className="danfe-block-title">CÁLCULO DO IMPOSTO</div>
                            <div className="danfe-row danfe-row-imposto-1">
                                <Cell label="BASE DE CÁLCULO DO ICMS" value={formatCurrency(totais.base_icms)} />
                                <Cell label="VALOR DO ICMS" value={formatCurrency(totais.valor_icms)} />
                                <Cell label="BASE DE CÁLCULO DO ICMS ST" value={formatCurrency(0)} />
                                <Cell label="VALOR DO ICMS ST" value={formatCurrency(0)} />
                                <Cell label="VALOR TOTAL DOS PRODUTOS" value={formatCurrency(totais.subtotal)} />
                            </div>
                            <div className="danfe-row danfe-row-imposto-2">
                                <Cell label="VALOR DO FRETE" value={formatCurrency(totais.frete)} />
                                <Cell label="VALOR DO SEGURO" value={formatCurrency(totais.seguro)} />
                                <Cell label="DESCONTO" value={formatCurrency(totais.desconto)} />
                                <Cell label="OUTRAS DESPESAS ACESSÓRIAS" value={formatCurrency(totais.outras)} />
                                <Cell label="VALOR DO IPI" value={formatCurrency(totais.valor_ipi)} />
                                <Cell label="VALOR TOTAL DA NOTA" value={formatCurrency(totais.total)} className="is-total" />
                            </div>

                            {/* Transportador */}
                            <div className="danfe-block-title">TRANSPORTADOR / VOLUMES TRANSPORTADOS</div>
                            <div className="danfe-row danfe-row-transp-1">
                                <Cell label="NOME / RAZÃO SOCIAL" value={'\u00a0'} />
                                <Cell
                                    label="FRETE POR CONTA"
                                    value={
                                        String(nota.fiscal?.mod_frete || '9') === '0'
                                            ? '0 - Emitente'
                                            : String(nota.fiscal?.mod_frete || '9') === '1'
                                                ? '1 - Destinatário'
                                                : '9 - Sem Frete'
                                    }
                                />
                                <Cell label="CÓDIGO ANTT" value={'\u00a0'} />
                                <Cell label="PLACA DO VEÍCULO" value={'\u00a0'} />
                                <Cell label="UF" value={'\u00a0'} />
                                <Cell label="CNPJ / CPF" value={'\u00a0'} />
                            </div>
                            <div className="danfe-row danfe-row-transp-2">
                                <Cell label="ENDEREÇO" value={'\u00a0'} />
                                <Cell label="MUNICÍPIO" value={'\u00a0'} />
                                <Cell label="UF" value={'\u00a0'} />
                                <Cell label="INSCRIÇÃO ESTADUAL" value={'\u00a0'} />
                            </div>
                            <div className="danfe-row danfe-row-transp-3">
                                <Cell label="QUANTIDADE" value={String(itens.length || '')} />
                                <Cell label="ESPÉCIE" value={'\u00a0'} />
                                <Cell label="MARCA" value={'\u00a0'} />
                                <Cell label="NUMERAÇÃO" value={'\u00a0'} />
                                <Cell label="PESO BRUTO" value={'\u00a0'} />
                                <Cell label="PESO LÍQUIDO" value={'\u00a0'} />
                            </div>

                            {/* Produtos — bloco expansível para preencher a folha A4 */}
                            <div className="danfe-produtos-block">
                                <div className="danfe-block-title">DADOS DOS PRODUTOS / SERVIÇOS</div>
                                <table className="danfe-produtos">
                                    <thead>
                                        <tr>
                                            <th>CÓDIGO PRODUTO</th>
                                            <th>DESCRIÇÃO DO PRODUTO / SERVIÇO</th>
                                            <th>NCM/SH</th>
                                            <th>O/CST</th>
                                            <th>CFOP</th>
                                            <th>UN</th>
                                            <th>QUANT.</th>
                                            <th>VALOR UNIT.</th>
                                            <th>VALOR TOTAL</th>
                                            <th>B.CÁLC ICMS</th>
                                            <th>VALOR ICMS</th>
                                            <th>VALOR IPI</th>
                                            <th>ALIQ. ICMS</th>
                                            <th>ALIQ. IPI</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {itens.map((item) => {
                                            const totalLinha = Number(item.subtotal)
                                                || (Number(item.quantidade) * Number(item.preco_unitario))
                                                || 0;
                                            const aliqIcms = Number(item.aliq_icms) || 0;
                                            const aliqIpi = Number(item.aliq_ipi) || 0;
                                            const baseIcms = Number(item.base_icms)
                                                || (aliqIcms > 0 ? totalLinha : 0);
                                            const valorIcms = Number(item.valor_icms)
                                                || Number(((totalLinha * aliqIcms) / 100).toFixed(2));
                                            const valorIpi = Number(item.valor_ipi)
                                                || Number(((totalLinha * aliqIpi) / 100).toFixed(2));
                                            return (
                                                <tr key={item.id || `${item.produto_id}-${item.produto_nome}`}>
                                                    <td>{item.produto_codigo || item.produto_id || ''}</td>
                                                    <td className="left">{item.produto_nome || ''}</td>
                                                    <td>{item.ncm || ''}</td>
                                                    <td>{item.cst_csosn || '102'}</td>
                                                    <td>{item.cfop || '5102'}</td>
                                                    <td>{String(item.unidade || 'UN').toUpperCase()}</td>
                                                    <td>{formatCurrency(item.quantidade).replace('R$', '').trim()}</td>
                                                    <td>{formatCurrency(item.preco_unitario)}</td>
                                                    <td>{formatCurrency(totalLinha)}</td>
                                                    <td>{formatCurrency(baseIcms)}</td>
                                                    <td>{formatCurrency(valorIcms)}</td>
                                                    <td>{formatCurrency(valorIpi)}</td>
                                                    <td>{formatCurrency(aliqIcms)}</td>
                                                    <td>{formatCurrency(aliqIpi)}</td>
                                                </tr>
                                            );
                                        })}
                                        {Array.from({ length: Math.max(0, 12 - itens.length) }).map((_, index) => (
                                            <tr key={`empty-${index}`} className="is-empty">
                                                {Array.from({ length: 14 }).map((__, col) => (
                                                    <td key={col}>&nbsp;</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Dados adicionais — fixos no rodapé da folha */}
                            <div className="danfe-rodape">
                                <div className="danfe-block-title">DADOS ADICIONAIS</div>
                                <div className="danfe-adicionais">
                                    <div className="danfe-field grow">
                                        <span className="danfe-label">INFORMAÇÕES COMPLEMENTARES</span>
                                        <span className="danfe-value danfe-info">
                                            {infoComplementares}
                                        </span>
                                    </div>
                                    <div className="danfe-field danfe-fisco">
                                        <span className="danfe-label">RESERVADO AO FISCO</span>
                                        <span className="danfe-value">&nbsp;</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}
            </Modal.Body>
            <Modal.Footer className="admin-nfe-danfe-footer">
                <Button type="button" className="admin-config-btn is-muted" onClick={onClose}>
                    Fechar
                </Button>
                <Button
                    type="button"
                    className="admin-config-btn is-muted"
                    onClick={async () => {
                        try {
                            await downloadNfeXml(emissaoId);
                            showToast('success', 'Download do XML iniciado.');
                        } catch (error) {
                            showToast('error', error.message || 'Erro ao baixar XML.');
                        }
                    }}
                    disabled={loading || !nota?.has_xml}
                >
                    <i className="fas fa-file-code me-2" aria-hidden="true" />
                    Baixar XML
                </Button>
                <Button
                    type="button"
                    className="admin-config-btn is-muted"
                    onClick={handleDownloadPdf}
                    disabled={loading || pdfLoading || !nota}
                >
                    {pdfLoading ? (
                        <Spinner animation="border" size="sm" className="me-2" />
                    ) : (
                        <i className="fas fa-file-pdf me-2" aria-hidden="true" />
                    )}
                    Baixar PDF
                </Button>
                <Button
                    type="button"
                    className="admin-config-btn is-primary"
                    onClick={handlePrint}
                    disabled={loading || pdfLoading || !nota}
                >
                    {pdfLoading ? (
                        <Spinner animation="border" size="sm" className="me-2" />
                    ) : (
                        <i className="fas fa-print me-2" aria-hidden="true" />
                    )}
                    Imprimir
                </Button>
            </Modal.Footer>
        </Modal>
    );
}
