const fs = require('fs');
const path = require('path');

const nfeRoot = path.join(__dirname, '..', 'storage', 'nfe');

function escapeXml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function onlyDigits(value) {
    return String(value || '').replace(/\D/g, '');
}

function toMoney(value) {
    return (Number(value) || 0).toFixed(2);
}

function toAliq(value) {
    return (Number(value) || 0).toFixed(2);
}

function ensureMonthDirs(date = new Date()) {
    const year = String(date.getFullYear());
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const base = path.join(nfeRoot, year, month);
    const notasDir = path.join(base, 'notas');
    const xmlDir = path.join(base, 'xml');
    fs.mkdirSync(notasDir, { recursive: true });
    fs.mkdirSync(xmlDir, { recursive: true });
    return { year, month, base, notasDir, xmlDir };
}

function buildNfeXml(data = {}) {
    const chave = onlyDigits(data.chave).slice(0, 44);
    const numero = Number(data.numero) || 1;
    const serie = Number(data.serie) || 1;
    const ambiente = data.ambiente === 'producao' ? '1' : '2';
    const emitente = data.emitente || {};
    const dest = data.destinatario || {};
    const totais = data.totais || {};
    const fiscal = data.fiscal || {};
    const itens = Array.isArray(data.itens) ? data.itens : [];
    const dhEmi = data.dh_emi || new Date().toISOString();

    const detXml = itens.map((item, index) => {
        const qtd = Number(item.quantidade) || 0;
        const vUn = Number(item.preco_unitario) || 0;
        const vProd = Number(item.subtotal) || Number((qtd * vUn).toFixed(2));
        const aliqIcms = Number(item.aliq_icms) || 0;
        const aliqIpi = Number(item.aliq_ipi) || 0;
        const vIcms = Number(item.valor_icms) || Number(((vProd * aliqIcms) / 100).toFixed(2));
        const vIpi = Number(item.valor_ipi) || Number(((vProd * aliqIpi) / 100).toFixed(2));
        const ncm = onlyDigits(item.ncm).padStart(8, '0').slice(0, 8) || '00000000';
        const cfop = onlyDigits(item.cfop || fiscal.cfop || '5102').slice(0, 4);
        const cst = String(item.cst_csosn || '102').replace(/\D/g, '').slice(0, 4);

        return `
      <det nItem="${index + 1}">
        <prod>
          <cProd>${escapeXml(item.produto_codigo || item.produto_id || index + 1)}</cProd>
          <cEAN>SEM GTIN</cEAN>
          <xProd>${escapeXml(item.produto_nome || 'PRODUTO')}</xProd>
          <NCM>${ncm}</NCM>
          <CFOP>${cfop}</CFOP>
          <uCom>${escapeXml(String(item.unidade || 'UN').toUpperCase())}</uCom>
          <qCom>${toMoney(qtd)}</qCom>
          <vUnCom>${toMoney(vUn)}</vUnCom>
          <vProd>${toMoney(vProd)}</vProd>
          <cEANTrib>SEM GTIN</cEANTrib>
          <uTrib>${escapeXml(String(item.unidade || 'UN').toUpperCase())}</uTrib>
          <qTrib>${toMoney(qtd)}</qTrib>
          <vUnTrib>${toMoney(vUn)}</vUnTrib>
          <indTot>1</indTot>
        </prod>
        <imposto>
          <ICMS>
            <ICMSSN102>
              <orig>0</orig>
              <CSOSN>${cst || '102'}</CSOSN>
            </ICMSSN102>
          </ICMS>
          <IPI>
            <cEnq>999</cEnq>
            <IPINT>
              <CST>53</CST>
            </IPINT>
          </IPI>
          <PIS>
            <PISNT>
              <CST>07</CST>
            </PISNT>
          </PIS>
          <COFINS>
            <COFINSNT>
              <CST>07</CST>
            </COFINSNT>
          </COFINS>
          <vTotTrib>${toMoney(vIcms + vIpi)}</vTotTrib>
        </imposto>
      </det>`;
    }).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe>
    <infNFe Id="NFe${chave}" versao="4.00">
      <ide>
        <cUF>31</cUF>
        <cNF>${chave.slice(35, 43)}</cNF>
        <natOp>${escapeXml(fiscal.natureza || 'Venda')}</natOp>
        <mod>55</mod>
        <serie>${serie}</serie>
        <nNF>${numero}</nNF>
        <dhEmi>${escapeXml(dhEmi)}</dhEmi>
        <tpNF>${escapeXml(fiscal.tipo_operacao || '1')}</tpNF>
        <idDest>1</idDest>
        <cMunFG>${escapeXml(onlyDigits(emitente.codigo_ibge || '3106200'))}</cMunFG>
        <tpImp>1</tpImp>
        <tpEmis>1</tpEmis>
        <cDV>${chave.slice(-1)}</cDV>
        <tpAmb>${ambiente}</tpAmb>
        <finNFe>${escapeXml(fiscal.finalidade || '1')}</finNFe>
        <indFinal>${escapeXml(fiscal.consumidor_final || '1')}</indFinal>
        <indPres>${escapeXml(fiscal.presenca || '1')}</indPres>
        <procEmi>0</procEmi>
        <verProc>CVP-ERP-1.0</verProc>
      </ide>
      <emit>
        <CNPJ>${onlyDigits(emitente.cnpj).padStart(14, '0').slice(0, 14)}</CNPJ>
        <xNome>${escapeXml(emitente.razao_social || '')}</xNome>
        <xFant>${escapeXml(emitente.nome_fantasia || emitente.razao_social || '')}</xFant>
        <enderEmit>
          <xLgr>${escapeXml(emitente.rua || '')}</xLgr>
          <nro>${escapeXml(emitente.numero || 'S/N')}</nro>
          <xBairro>${escapeXml(emitente.bairro || '')}</xBairro>
          <xMun>${escapeXml(emitente.cidade || '')}</xMun>
          <UF>${escapeXml(emitente.estado || 'MG')}</UF>
          <CEP>${onlyDigits(emitente.cep).padStart(8, '0').slice(0, 8)}</CEP>
          <cPais>1058</cPais>
          <xPais>Brasil</xPais>
          <fone>${onlyDigits(emitente.telefone)}</fone>
        </enderEmit>
        <IE>${escapeXml(emitente.inscricao_estadual || 'ISENTO')}</IE>
        <CRT>1</CRT>
      </emit>
      <dest>
        <${onlyDigits(dest.documento).length === 11 ? 'CPF' : 'CNPJ'}>${onlyDigits(dest.documento)}</${onlyDigits(dest.documento).length === 11 ? 'CPF' : 'CNPJ'}>
        <xNome>${escapeXml(dest.nome || '')}</xNome>
        <enderDest>
          <xLgr>${escapeXml(dest.endereco || '')}</xLgr>
          <nro>S/N</nro>
          <xBairro>${escapeXml(dest.bairro || '')}</xBairro>
          <xMun>${escapeXml(dest.cidade || '')}</xMun>
          <UF>${escapeXml(dest.uf || '')}</UF>
          <CEP>${onlyDigits(dest.cep).padStart(8, '0').slice(0, 8)}</CEP>
          <cPais>1058</cPais>
          <xPais>Brasil</xPais>
        </enderDest>
        <indIEDest>9</indIEDest>
      </dest>${detXml}
      <total>
        <ICMSTot>
          <vBC>${toMoney(totais.base_icms)}</vBC>
          <vICMS>${toMoney(totais.valor_icms)}</vICMS>
          <vICMSDeson>0.00</vICMSDeson>
          <vFCP>0.00</vFCP>
          <vBCST>0.00</vBCST>
          <vST>0.00</vST>
          <vFCPST>0.00</vFCPST>
          <vFCPSTRet>0.00</vFCPSTRet>
          <vProd>${toMoney(totais.subtotal)}</vProd>
          <vFrete>${toMoney(totais.frete)}</vFrete>
          <vSeg>${toMoney(totais.seguro)}</vSeg>
          <vDesc>${toMoney(totais.desconto)}</vDesc>
          <vII>0.00</vII>
          <vIPI>${toMoney(totais.valor_ipi)}</vIPI>
          <vIPIDevol>0.00</vIPIDevol>
          <vPIS>${toMoney(totais.valor_pis)}</vPIS>
          <vCOFINS>${toMoney(totais.valor_cofins)}</vCOFINS>
          <vOutro>${toMoney(totais.outras)}</vOutro>
          <vNF>${toMoney(totais.total)}</vNF>
          <vTotTrib>${toMoney(totais.total_impostos)}</vTotTrib>
        </ICMSTot>
      </total>
      <transp>
        <modFrete>${escapeXml(fiscal.mod_frete || '9')}</modFrete>
      </transp>
      <infAdic>
        <infCpl>${escapeXml(data.observacoes || '')}</infCpl>
      </infAdic>
    </infNFe>
  </NFe>
  <protNFe versao="4.00">
    <infProt>
      <tpAmb>${ambiente}</tpAmb>
      <verAplic>CVP-SIM</verAplic>
      <chNFe>${chave}</chNFe>
      <dhRecbto>${escapeXml(dhEmi)}</dhRecbto>
      <nProt>${escapeXml(data.protocolo || '')}</nProt>
      <digVal></digVal>
      <cStat>100</cStat>
      <xMotivo>Autorizado o uso da NF-e (simulacao local)</xMotivo>
    </infProt>
  </protNFe>
</nfeProc>
`;
}

function buildNotaResumoHtml(data = {}) {
    const chave = onlyDigits(data.chave).slice(0, 44);
    const itens = Array.isArray(data.itens) ? data.itens : [];
    const totais = data.totais || {};
    const rows = itens.map((item) => {
        const qtd = Number(item.quantidade) || 0;
        const vUn = Number(item.preco_unitario) || 0;
        const vProd = Number(item.subtotal) || Number((qtd * vUn).toFixed(2));
        return `<tr>
          <td>${escapeXml(item.produto_codigo || '')}</td>
          <td>${escapeXml(item.produto_nome || '')}</td>
          <td>${escapeXml(item.ncm || '')}</td>
          <td>${escapeXml(item.cst_csosn || '')}</td>
          <td>${escapeXml(item.cfop || '')}</td>
          <td>${qtd}</td>
          <td>${toMoney(vUn)}</td>
          <td>${toMoney(vProd)}</td>
          <td>${toAliq(item.aliq_icms)}</td>
          <td>${toMoney(item.valor_icms)}</td>
        </tr>`;
    }).join('');

    return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"/>
<title>DANFE NF-e ${escapeXml(data.numero)}/${escapeXml(data.serie)}</title>
<style>
body{font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#000;margin:16px}
h1{font-size:16px;margin:0 0 8px}
table{border-collapse:collapse;width:100%;margin-top:12px}
th,td{border:1px solid #000;padding:4px 6px;text-align:left}
.meta{margin:2px 0}
</style>
</head>
<body>
<h1>DANFE - NF-e Modelo 55</h1>
<p class="meta"><strong>Número:</strong> ${escapeXml(data.numero)} / <strong>Série:</strong> ${escapeXml(data.serie)}</p>
<p class="meta"><strong>Chave:</strong> ${chave}</p>
<p class="meta"><strong>Protocolo:</strong> ${escapeXml(data.protocolo || '')}</p>
<p class="meta"><strong>Emitente:</strong> ${escapeXml(data.emitente?.razao_social || '')}</p>
<p class="meta"><strong>Destinatário:</strong> ${escapeXml(data.destinatario?.nome || '')}</p>
<p class="meta"><strong>Total:</strong> R$ ${toMoney(totais.total)} | <strong>ICMS:</strong> R$ ${toMoney(totais.valor_icms)} | <strong>IPI:</strong> R$ ${toMoney(totais.valor_ipi)}</p>
<table>
<thead>
<tr>
<th>Código</th><th>Produto</th><th>NCM</th><th>CST</th><th>CFOP</th>
<th>Qtd</th><th>V. Unit</th><th>Total</th><th>Alíq ICMS</th><th>V. ICMS</th>
</tr>
</thead>
<tbody>${rows}</tbody>
</table>
</body>
</html>`;
}

function saveEmissaoArquivos(data = {}, date = new Date()) {
    const { notasDir, xmlDir, year, month } = ensureMonthDirs(date);
    const chave = onlyDigits(data.chave).slice(0, 44) || `nfe-${Date.now()}`;
    const xmlName = `${chave}-nfe.xml`;
    const notaName = `${chave}-danfe.html`;
    const xmlPath = path.join(xmlDir, xmlName);
    const notaPath = path.join(notasDir, notaName);

    fs.writeFileSync(xmlPath, buildNfeXml(data), 'utf8');
    fs.writeFileSync(notaPath, buildNotaResumoHtml(data), 'utf8');

    return {
        xml_path: xmlPath,
        nota_path: notaPath,
        relative: {
            xml: path.join(year, month, 'xml', xmlName).replace(/\\/g, '/'),
            nota: path.join(year, month, 'notas', notaName).replace(/\\/g, '/'),
        },
    };
}

function resolveNfeStoredPath(storedPath) {
    if (!storedPath) return '';
    const raw = String(storedPath).trim();
    if (!raw) return '';

    const normalized = raw.replace(/\\/g, '/');
    const candidates = [
        path.resolve(raw),
        path.isAbsolute(raw) ? raw : path.join(nfeRoot, raw),
        path.join(nfeRoot, normalized),
        path.join(nfeRoot, normalized.replace(/^storage\/nfe\//i, '')),
    ];

    for (const candidate of candidates) {
        try {
            if (candidate && fs.existsSync(candidate)) {
                return path.resolve(candidate);
            }
        } catch (_error) {
            // ignore invalid paths
        }
    }
    return '';
}

module.exports = {
    nfeRoot,
    ensureMonthDirs,
    buildNfeXml,
    buildNotaResumoHtml,
    saveEmissaoArquivos,
    resolveNfeStoredPath,
};
