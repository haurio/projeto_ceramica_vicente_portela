import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const LOGO_URL = '/image/Logotipos/Logo.png';

const TIPO_LABEL = {
    entrada: 'Entrada',
    saida: 'Saída',
    ajuste: 'Ajuste',
};

const MOTIVO_LABEL = {
    producao: 'Produção',
    ajuste_manual: 'Ajuste manual',
    perda: 'Perda',
    outro: 'Outro',
    pedido: 'Pedido',
    compra: 'Compra',
};

function formatNfePdf(item) {
    if (item.tipo === 'entrada') return 'Sem NF';
    if (item.nfe_numero) return `NF-e ${item.nfe_numero}`;
    if (item.pedido_numero || item.motivo === 'pedido') return 'Sem NF-e';
    return 'Sem NF';
}

function formatDateBr(value) {
    if (!value) return '-';
    const raw = String(value).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return String(value);
    const [y, m, d] = raw.split('-');
    return `${d}/${m}/${y}`;
}

function formatQty(value, unidade = 'un') {
    const amount = Number(value) || 0;
    return `${amount.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ${unidade || 'un'}`;
}

function signedQty(item) {
    const qty = formatQty(item.quantidade, item.unidade);
    if (item.tipo === 'saida') return `-${qty}`;
    if (item.tipo === 'entrada') return `+${qty}`;
    return qty;
}

function fileStamp() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
}

function loadImageAsDataUrl(url) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = image.naturalWidth || image.width;
                canvas.height = image.naturalHeight || image.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(image, 0, 0);
                resolve({
                    dataUrl: canvas.toDataURL('image/png'),
                    width: canvas.width,
                    height: canvas.height,
                });
            } catch (error) {
                reject(error);
            }
        };
        image.onerror = () => reject(new Error('Não foi possível carregar a logo.'));
        image.src = url;
    });
}

export async function exportEstoqueHistoricoPdf(movimentos = [], filters = {}) {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const title = 'Histórico de movimentações - Estoque';
    const generatedAt = new Date().toLocaleString('pt-BR');

    const headerHeight = 28;
    const headerPadX = 12;
    const headerPadY = 5;

    // Fundo escuro do cabeçalho
    doc.setFillColor(42, 18, 16);
    doc.rect(0, 0, pageWidth, headerHeight, 'F');

    // Barra vermelha fina sob o header
    doc.setFillColor(155, 28, 28);
    doc.rect(0, headerHeight, pageWidth, 1.6, 'F');

    let logoWidth = 0;
    let logoHeight = 0;
    try {
        const logo = await loadImageAsDataUrl(LOGO_URL);
        const maxLogoWidth = 36;
        const maxLogoHeight = 16;
        const ratio = Math.min(maxLogoWidth / logo.width, maxLogoHeight / logo.height);
        logoWidth = logo.width * ratio;
        logoHeight = logo.height * ratio;
        const logoY = (headerHeight - logoHeight) / 2;
        doc.addImage(logo.dataUrl, 'PNG', headerPadX, logoY, logoWidth, logoHeight);
    } catch {
        // Continua sem logo se não carregar
    }

    // Título na mesma linha, centralizado
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(255, 255, 255);
    doc.text(title, pageWidth / 2, headerHeight / 2 + 1.5, { align: 'center', baseline: 'middle' });

    // Meta / filtros abaixo do header
    const metaY = headerHeight + headerPadY + 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);

    const filterBits = [];
    if (filters.produtoLabel) filterBits.push(`Produto: ${filters.produtoLabel}`);
    if (filters.tipo) filterBits.push(`Tipo: ${TIPO_LABEL[filters.tipo] || filters.tipo}`);
    if (filters.de) filterBits.push(`De: ${formatDateBr(filters.de)}`);
    if (filters.ate) filterBits.push(`Até: ${formatDateBr(filters.ate)}`);
    if (!filterBits.length) filterBits.push('Filtros: todos');

    doc.text(filterBits.join('  |  '), 14, metaY);
    doc.text(
        `Cerâmica Vicente Portela  |  Gerado em ${generatedAt}  |  ${movimentos.length} registro(s)`,
        14,
        metaY + 5
    );

    autoTable(doc, {
        startY: metaY + 9,
        head: [['Data', 'Produto', 'Tipo', 'Motivo', 'NF-e', 'Pedido', 'Quantidade', 'Saldo após', 'Observação']],
        body: movimentos.map((item) => [
            formatDateBr(item.data_movimento),
            `${item.produto_codigo ? `${item.produto_codigo} - ` : ''}${item.produto_nome || '-'}`,
            TIPO_LABEL[item.tipo] || item.tipo || '-',
            MOTIVO_LABEL[item.motivo] || item.motivo || '-',
            formatNfePdf(item),
            item.pedido_numero || '-',
            signedQty(item),
            formatQty(item.saldo_apos, item.unidade),
            item.observacao || '-',
        ]),
        styles: {
            fontSize: 8,
            cellPadding: 2.2,
            textColor: [40, 30, 28],
        },
        headStyles: {
            fillColor: [155, 28, 28],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
        },
        alternateRowStyles: {
            fillColor: [250, 246, 244],
        },
        columnStyles: {
            0: { cellWidth: 22 },
            2: { cellWidth: 18 },
            3: { cellWidth: 22 },
            4: { cellWidth: 24 },
            5: { cellWidth: 22 },
            6: { cellWidth: 26 },
            7: { cellWidth: 26 },
        },
        didParseCell: (data) => {
            if (data.section !== 'body' || data.column.index !== 2) return;
            const tipo = String(data.cell.raw || '').toLowerCase();
            if (tipo === 'entrada') data.cell.styles.textColor = [26, 122, 63];
            if (tipo === 'saída' || tipo === 'saida') data.cell.styles.textColor = [155, 28, 28];
            if (tipo === 'ajuste') data.cell.styles.textColor = [59, 90, 140];
        },
    });

    doc.save(`historico-estoque_${fileStamp()}.pdf`);
}
