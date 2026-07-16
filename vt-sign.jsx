/* ============================================================
   VetTooth Pro — Assinatura Digital ICP-Brasil A1
   Gera PDF via html2canvas + jsPDF e assina RSA-SHA256
   usando o certificado A1 carregado em window.vtIcpA1Session.
   ============================================================ */

/* Verifica se há sessão A1 válida */
window.vtIcpHasSession = function () {
  return !!(window.vtIcpA1Session && window.vtIcpA1Session.privateKey && window.vtIcpA1Session.isValid);
};

/* Gera PDF assinado a partir do elemento HTML #doc-printable */
window.vtIcpSignDoc = async function (elementId, docName) {
  const session = window.vtIcpA1Session;
  if (!session || !session.privateKey) {
    window.vtToast('Nenhum certificado A1 carregado. Acesse Configurações → Conta & backup.', 'err');
    return;
  }
  if (!session.isValid) {
    window.vtToast('⚠️ Certificado vencido. Não é possível assinar.', 'err');
    return;
  }
  const forge = window.forge;
  if (!forge) { window.vtToast('Biblioteca de certificados não disponível.', 'err'); return; }
  if (!window.html2canvas) { window.vtToast('html2canvas não carregado.', 'err'); return; }
  if (!window.jspdf) { window.vtToast('jsPDF não carregado.', 'err'); return; }

  const el = document.getElementById(elementId);
  if (!el) { window.vtToast('Elemento do documento não encontrado.', 'err'); return; }

  window.vtToast('Gerando PDF assinado…', 'ok');

  try {
    /* 1 ─ Captura o elemento como canvas (scale=2 para qualidade) */
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    /* 2 ─ Cria PDF A4 com jsPDF, distribuindo em páginas se necessário */
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const PW = pdf.internal.pageSize.getWidth();   // 210 mm
    const PH = pdf.internal.pageSize.getHeight();  // 297 mm
    const imgData = canvas.toDataURL('image/jpeg', 0.93);
    const totalH = (canvas.height * PW) / canvas.width; // altura total em mm

    let yLeft = totalH;
    let srcY = 0;
    while (yLeft > 0) {
      const pageH = Math.min(yLeft, PH);
      // Clipar a fatia correta da imagem via canvas auxiliar
      const slice = document.createElement('canvas');
      slice.width = canvas.width;
      slice.height = Math.round((pageH / totalH) * canvas.height);
      const ctx = slice.getContext('2d');
      ctx.drawImage(canvas, 0, srcY, canvas.width, slice.height, 0, 0, canvas.width, slice.height);
      pdf.addImage(slice.toDataURL('image/jpeg', 0.93), 'JPEG', 0, 0, PW, pageH);
      srcY += slice.height;
      yLeft -= pageH;
      if (yLeft > 0) pdf.addPage();
    }

    /* 3 ─ Exporta bytes do PDF sem stamp (é o conteúdo a assinar) */
    const pdfAB = pdf.output('arraybuffer');

    /* 4 ─ SHA-256 do PDF via Web Crypto */
    const hashBuf = await crypto.subtle.digest('SHA-256', pdfAB);
    const hashHex = Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, '0')).join('');

    /* 5 ─ Assina com forge RSA-PKCS1v1.5 + SHA-256 */
    const md = forge.md.sha256.create();
    const pdfBin = forge.util.binary.raw.encode(new Uint8Array(pdfAB));
    md.update(pdfBin);
    const sigBytes = session.privateKey.sign(md);
    const sigB64 = btoa(sigBytes);

    /* 6 ─ Adiciona página de stamp de assinatura ao PDF */
    pdf.addPage();
    const ts = new Date().toLocaleString('pt-BR', { timeZoneName: 'short' });

    // Borda superior
    pdf.setDrawColor(20, 168, 160);
    pdf.setLineWidth(1.2);
    pdf.line(14, 22, PW - 14, 22);

    pdf.setFontSize(13);
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(20, 168, 160);
    pdf.text('DOCUMENTO ASSINADO DIGITALMENTE — ICP-Brasil', PW / 2, 18, { align: 'center' });

    pdf.setTextColor(30, 30, 30);
    pdf.setFontSize(10);
    pdf.setFont(undefined, 'normal');

    const line = (label, value, y) => {
      pdf.setFont(undefined, 'bold'); pdf.text(label, 14, y);
      pdf.setFont(undefined, 'normal'); pdf.text(value || '—', 60, y);
    };

    line('Titular:', session.cn, 34);
    line('CPF:', session.cpf || '—', 42);
    line('Autoridade Certificadora:', session.issuerCN, 50);
    line('Válido até:', session.validTo.toLocaleDateString('pt-BR'), 58);
    line('Assinado em:', ts, 66);
    line('Algoritmo:', 'RSA-SHA256 / ICP-Brasil', 74);

    pdf.setFont(undefined, 'bold'); pdf.text('SHA-256 do documento:', 14, 86);
    pdf.setFont(undefined, 'normal'); pdf.setFontSize(8);
    pdf.text(hashHex.slice(0, 64), 14, 92);
    pdf.text(hashHex.slice(64), 14, 97);

    pdf.setFont(undefined, 'bold'); pdf.setFontSize(9.5);
    pdf.text('Assinatura RSA-SHA256 (extrato):', 14, 109);
    pdf.setFont(undefined, 'normal'); pdf.setFontSize(7.5);
    pdf.text(sigB64.slice(0, 88), 14, 115);
    pdf.text(sigB64.slice(88, 176), 14, 120);

    // Rodapé orientação
    pdf.setDrawColor(20, 168, 160);
    pdf.line(14, PH - 24, PW - 14, PH - 24);
    pdf.setFontSize(8); pdf.setTextColor(100, 100, 100);
    pdf.text('Para verificação independente: hash SHA-256 + assinatura base64 disponíveis no arquivo .sig.json.', 14, PH - 18);
    pdf.text('Padrão: RSA-PKCS1v1.5 / SHA-256 — ICP-Brasil (ABNT NBR ISO/IEC 9796-2)', 14, PH - 13);

    /* 7 ─ Baixa o PDF */
    const safe = (docName || 'documento').replace(/[^a-z0-9_\-]/gi, '_');
    pdf.save(`${safe}_assinado.pdf`);

    /* 8 ─ Baixa .sig.json para verificação independente */
    const sigJson = JSON.stringify({
      algoritmo: 'RSA-PKCS1v1.5-SHA256',
      icp_brasil: true,
      titular: session.cn,
      cpf: session.cpf || '',
      autoridade_certificadora: session.issuerCN,
      serie_certificado: session.serial || '',
      validade_certificado: session.validTo.toISOString(),
      data_assinatura: new Date().toISOString(),
      documento_sha256: hashHex,
      assinatura_base64: sigB64,
      certificado_pem: session.certPem,
    }, null, 2);

    const sigBlob = new Blob([sigJson], { type: 'application/json' });
    const sigUrl = URL.createObjectURL(sigBlob);
    const a = document.createElement('a');
    a.href = sigUrl; a.download = `${safe}.sig.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(sigUrl), 3000);

    window.vtToast('✅ PDF assinado + .sig.json baixados. Guarde ambos os arquivos!', 'ok');

  } catch (err) {
    console.error('[vtIcpSign]', err);
    window.vtToast('Erro ao assinar: ' + (err.message || String(err)), 'err');
  }
};
