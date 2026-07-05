/* ============================================================
   VetTooth Pro — Documentos (Fase 4)
   Renderização HTML rica por tipo de documento.
   Design aplicado via vtClinic() (cor, tema, logo, contatos).
   ============================================================ */
const { useState: dUse } = React;

function docCtx(patient, at) {
  const vet = window.vtVetSignature(at.vet);
  return { clinic: window.vtClinic(), vet, patient, tutor: patient.owner, date: window.PR.todayBR() };
}

window.DOC_TEMPLATES = {
  'Atestado de saúde': (c) => `ATESTADO DE SAÚDE\n\nAtesto, para os devidos fins, que o animal ${c.patient.name} (espécie ${c.patient.species}, raça ${c.patient.breed}, sexo ${c.patient.sex}), de propriedade de ${c.tutor}, foi submetido a exame clínico nesta data e encontra-se em bom estado geral de saúde, apto para as atividades a que se destina.\n\nObservações: ___________________________________________\n\n${c.clinic.address || ''}\nData: ${c.date}`,
  'Atestado de sanidade': (c) => `ATESTADO DE SANIDADE\n\nAtesto que o animal ${c.patient.name} (${c.patient.species} · ${c.patient.breed}), de propriedade de ${c.tutor}, encontra-se clinicamente sadio, sem sinais de doença infectocontagiosa no momento do exame.\n\nData: ${c.date}`,
  'Atestado de repouso': (c) => `ATESTADO DE REPOUSO\n\nAtesto que o animal ${c.patient.name} (${c.patient.species} · ${c.patient.breed}), de propriedade de ${c.tutor}, necessita de repouso pelo período de ___ dias, a contar de ${c.date}, devendo ser afastado de atividades físicas, exercícios e esforços durante este período.\n\nMotivo: ___________________________________________\nObservações: ___________________________________________\n\nData: ${c.date}`,
  'Atestado de óbito': (c) => `ATESTADO DE ÓBITO\n\nAtesto o óbito do animal ${c.patient.name} (${c.patient.species} · ${c.patient.breed}), de propriedade de ${c.tutor}, ocorrido em ___/___/______.\n\nCausa provável: ___________________________________________\n\nData: ${c.date}`,
  'Termo de consentimento': (c) => `TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO\n\nEu, ${c.tutor}, responsável pelo animal ${c.patient.name} (${c.patient.species}), declaro que fui devidamente informado(a) pelo(a) médico(a) veterinário(a) sobre o procedimento indicado, seus riscos, benefícios e alternativas, e AUTORIZO sua realização.\n\nDeclaro estar ciente de que a medicina veterinária não é ciência exata e não há garantia de resultados.\n\nData: ${c.date}`,
  'Termo de consentimento anestésico': (c) => `TERMO DE CONSENTIMENTO ANESTÉSICO\n\nEu, ${c.tutor}, autorizo a sedação/anestesia do animal ${c.patient.name} (${c.patient.species}), estando ciente dos riscos anestésicos inerentes ao procedimento, classificação ASA e da necessidade de exames pré-operatórios.\n\nData: ${c.date}`,
  'Termo de internação': (c) => `TERMO DE INTERNAÇÃO\n\nEu, ${c.tutor}, autorizo a internação do animal ${c.patient.name} (${c.patient.species}) para tratamento, estando ciente das condutas, custos e da rotina hospitalar.\n\nMotivo da internação: ___________________________________\nData de entrada: ${c.date}`,
  'Termo de responsabilidade': (c) => `TERMO DE RESPONSABILIDADE\n\nEu, ${c.tutor}, assumo total responsabilidade pelos cuidados, administração de medicações e seguimento das orientações referentes ao animal ${c.patient.name} (${c.patient.species}).\n\nData: ${c.date}`,
  'Termo de eutanásia': (c) => `TERMO DE CONSENTIMENTO PARA EUTANÁSIA\n\nEu, ${c.tutor}, responsável pelo animal ${c.patient.name} (${c.patient.species}), após esclarecimento do(a) médico(a) veterinário(a) quanto ao quadro clínico e prognóstico, AUTORIZO o procedimento de eutanásia, conforme Resolução CFMV.\n\nData: ${c.date}`,
};

function docBody(tipo, ctx) {
  const fn = window.DOC_TEMPLATES[tipo];
  return fn ? fn(ctx) : `${(tipo || 'DOCUMENTO').toUpperCase()}\n\nPaciente: ${ctx.patient.name}\nTutor: ${ctx.tutor}\n\nData: ${ctx.date}`;
}

/* ---- cabeçalho da clínica (reutilizado no DocEditor e na impressão) ---- */
function DocClinicHeader({ c, accent, layout }) {
  const showContact = c.docShowContact !== false;
  const showSocial  = c.docShowSocial  !== false;
  const ad = c.addr || {};
  const addrLine = [ad.street, ad.num, ad.district, ad.city, ad.state].filter(Boolean).join(', ') || c.address || '';
  return (
    <React.Fragment>
      <div className={`docs-hd theme-${layout || 'classico'}`} style={{ paddingBottom: 14 }}>
        {c.logo
          ? <img className="docs-hd-logo" src={c.logo} alt="logo" />
          : <div className="docs-hd-logo ph" style={{ borderColor: accent, color: accent }}>{(c.name || 'V')[0]}</div>}
        <div className="docs-hd-id">
          <b style={{ color: accent }}>{c.name || 'Clínica'}</b>
          {c.crmv ? <span style={{ color: accent }}>CRMV {c.crmv}/{c.crmvUF || 'SP'}</span> : null}
          {c.mapa ? <span style={{ color: accent }}>Registro no MAPA {c.mapa}</span> : null}
        </div>
        <div className="docs-hd-contact">
          {showContact && addrLine ? <span>{addrLine}</span> : null}
          {showContact && c.phone  ? <span>Tel: {c.phone}</span> : null}
          {showContact && c.email  ? <span>{c.email}</span> : null}
          {showSocial  && c.site   ? <span>{c.site}</span> : null}
          {showSocial  && c.instagram ? <span>{c.instagram}</span> : null}
        </div>
      </div>
      <div className="docs-rule" style={{ background: accent, margin: '0 0 18px' }} />
    </React.Fragment>
  );
}

/* ---- bloco de identificação do paciente ---- */
function DocPatientInfo({ patient, at, accent }) {
  const idade = patient.idade || (window.ageFrom ? window.ageFrom(patient.birth) : '') || '—';
  const fields = [
    ['Paciente', patient.name], ['Espécie', patient.species], ['Raça', patient.breed || '—'],
    ['Sexo', patient.sex || '—'], ['Peso', at.weight || patient.weight || '—'], ['Idade', idade],
    ['Tutor(a)', patient.owner], patient.chip ? ['Microchip', patient.chip] : null,
  ].filter(Boolean);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 18px', fontSize: 12.5, marginBottom: 18, padding: '10px 14px', background: accent + '10', borderRadius: 6, borderLeft: '3px solid ' + accent }}>
      {fields.map(([k, v]) => <span key={k}><b>{k}:</b> {v}</span>)}
    </div>
  );
}

/* ---- bloco de assinaturas ---- */
function DocSignatures({ vet, tutor, signed, onToggleSigned, showTutor }) {
  return (
    <div className="doc-signs" style={{ marginTop: 40 }}>
      <div className="doc-sign">
        {vet.sign ? <img src={vet.sign} alt="assinatura" className="doc-sign-img" /> : <div className="doc-sign-line" />}
        <b>{vet.name ? 'M.V. ' + vet.name : 'Médico(a) Veterinário(a)'}</b>
        <span>{[vet.crmv, vet.especialidade].filter(Boolean).join(' · ') || 'CRMV'}</span>
      </div>
      {showTutor && (
        <div className="doc-sign">
          <div className="doc-sign-line" style={signed ? { borderColor: 'var(--teal)' } : null} />
          <b>{tutor}</b>
          {onToggleSigned
            ? <span style={{ cursor: 'pointer', color: 'var(--teal-d)', fontWeight: 700 }} onClick={onToggleSigned}>{signed ? '✓ Assinado digitalmente' : 'Tutor (clique p/ simular)'}</span>
            : <span style={{ color: 'var(--muted)', fontSize: 11 }}>Tutor / Responsável</span>}
        </div>
      )}
    </div>
  );
}

/* ---- renderizador de receituário estruturado ---- */
function DocRxBody({ at, patient, accent }) {
  const tipo = at.prescricaoTipo || 'comum';
  const tipoInfo = (window.PR_RX_TYPES || []).find((x) => x.id === tipo) || { label: 'Comum' };
  const itens = at.prescricoes || [];
  const kg = window.rxKg ? window.rxKg(patient) : 0;
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 20, paddingBottom: 14, borderBottom: '2px solid ' + accent + '30' }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>Prescrição Veterinária</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: accent }}>RECEITUÁRIO {tipoInfo.label.toUpperCase()}</div>
        {tipo === 'controlada' && <div style={{ marginTop: 6, display: 'inline-block', fontSize: 10.5, background: '#fef3c7', color: '#92400e', padding: '2px 10px', borderRadius: 4, fontWeight: 700, letterSpacing: 0.5 }}>CONTROLE ESPECIAL — PORTARIA 344/98 — 2 VIAS</div>}
      </div>

      {itens.length === 0
        ? <p style={{ color: 'var(--faint)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Nenhum medicamento prescrito ainda.</p>
        : itens.map((r, i) => {
            const calc = kg ? (window.rxDoseCalc ? window.rxDoseCalc(r.dose, kg) : null) : null;
            const pos = r.posologia || (window.rxPosologiaAuto ? window.rxPosologiaAuto(r.pos) : '') || [r.freq, r.tempo].filter(Boolean).join(' · ');
            const controlled = window.rxIsControlled ? window.rxIsControlled(r.nome) : false;
            return (
              <div key={i} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                  <span style={{ fontWeight: 800, fontSize: 15, color: accent, minWidth: 22 }}>Rp.</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--ink)' }}>
                      {r.nome}{r.conc ? ' ' + r.conc : ''}{r.apresentacao ? ' — ' + r.apresentacao : ''}
                    </div>
                    {calc && <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>Dose para {kg} kg: {calc.total} {calc.unit}</div>}
                    {pos && <div style={{ fontSize: 12.5, marginTop: 4, color: 'var(--ink)' }}>{pos}</div>}
                    {r.qtdProd && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Qtd: {r.qtdProd} unidade(s)</div>}
                    {controlled && <div style={{ fontSize: 10.5, background: '#fef3c7', color: '#92400e', padding: '1px 7px', borderRadius: 4, display: 'inline-block', marginTop: 4, fontWeight: 700 }}>⚠ Controle especial</div>}
                    {r.obs && <div style={{ fontSize: 11.5, fontStyle: 'italic', color: 'var(--muted)', marginTop: 3 }}>Obs: {r.obs}</div>}
                  </div>
                </div>
              </div>
            );
          })}

      {at.rxObs && (
        <div style={{ marginTop: 12, padding: '10px 14px', background: accent + '10', borderRadius: 6, fontSize: 12.5, borderLeft: '3px solid ' + accent }}>
          <b style={{ display: 'block', marginBottom: 4 }}>Orientações ao tutor:</b>
          {at.rxObs}
        </div>
      )}
      <div style={{ marginTop: 16, fontSize: 12, color: 'var(--muted)' }}>Data: {window.PR ? window.PR.todayBR() : ''}</div>
    </div>
  );
}

/* ---- renderizador de pedido de exames estruturado ---- */
function DocExamesBody({ at, patient, accent }) {
  const exames = at.exames || [];
  const suspicao = at.exameSuspeita || (at.diag && at.diag.principal) || '';
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 20, paddingBottom: 14, borderBottom: '2px solid ' + accent + '30' }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>Medicina Veterinária</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: accent }}>SOLICITAÇÃO DE EXAMES</div>
      </div>

      {suspicao && (
        <div style={{ marginBottom: 18, padding: '10px 14px', background: accent + '10', borderRadius: 6, fontSize: 13, borderLeft: '3px solid ' + accent }}>
          <b>Hipótese diagnóstica / suspeita clínica:</b><br />{suspicao}
        </div>
      )}

      <div style={{ marginBottom: 8, fontWeight: 700, fontSize: 13, color: accent }}>Exames solicitados:</div>
      {exames.length === 0
        ? <p style={{ color: 'var(--faint)', fontSize: 13 }}>Nenhum exame selecionado.</p>
        : exames.map((e, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, padding: '7px 10px', background: i % 2 === 0 ? '#fafafa' : '#fff', borderRadius: 5 }}>
            <span style={{ width: 18, height: 18, border: '1.5px solid ' + accent, borderRadius: 3, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none', fontSize: 10, color: accent }}>□</span>
            <span style={{ fontSize: 13 }}>{i + 1}. {e}</span>
          </div>
        ))}
      <div style={{ marginTop: 16, fontSize: 12, color: 'var(--muted)' }}>Data: {window.PR ? window.PR.todayBR() : ''}</div>
    </div>
  );
}

/* ---- renderizador de corpo de documento (atestado / termo) ---- */
function DocTextBody({ body, tipo, accent }) {
  const title = (tipo || '').replace(/^receituário\s*/i, '').toUpperCase();
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 20, paddingBottom: 14, borderBottom: '2px solid ' + accent + '30' }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: accent, letterSpacing: 0.5 }}>{title}</div>
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>{body}</div>
    </div>
  );
}

/* ---- página de documento completa (usada no preview e na impressão) ---- */
function DocPage({ tipo, patient, at, body, accent, layout, c, vet, signed, onToggleSigned }) {
  const isRx       = /receitu/i.test(tipo || '');
  const isExame    = /solicita|exame/i.test(tipo || '');
  const isAtestado = /^Atestado/i.test(tipo || '');
  // Termos precisam de vet + tutor. Atestados, receituários e exames: só vet.
  const showTutor  = !isRx && !isExame && !isAtestado;
  const showLogo = isRx ? c.logoRx !== false : isExame ? c.logoEx !== false : c.logoDoc !== false;
  const showObs  = isRx ? c.obsRx  !== false : isExame ? c.obsEx  !== false : c.obsDoc  !== false;
  return (
    <div className="doc-page" id="doc-printable">
      {showLogo && <DocClinicHeader c={c} accent={accent} layout={layout} />}
      <DocPatientInfo patient={patient} at={at} accent={accent} />
      {isRx    && <DocRxBody    at={at} patient={patient} accent={accent} />}
      {isExame && <DocExamesBody at={at} patient={patient} accent={accent} />}
      {!isRx && !isExame && <DocTextBody body={body} tipo={tipo} accent={accent} />}
      <DocSignatures vet={vet} tutor={patient.owner} signed={signed} onToggleSigned={showTutor ? onToggleSigned : null} showTutor={showTutor} />
      {showObs && c.docObs ? <div className="doc-obs-foot" style={{ borderColor: accent, marginTop: 20 }}>{c.docObs}</div> : null}
    </div>
  );
}

/* ---- Editor / preview de documento ---- */
function DocEditor({ tipo, patient, at, initialBody, onClose, onSave }) {
  const ctx = docCtx(patient, at);
  const isRx    = /receitu/i.test(tipo || '');
  const isExame = /solicita|exame/i.test(tipo || '');
  const isStructured = isRx || isExame;
  const [body, setBody] = dUse(initialBody != null ? initialBody : docBody(tipo, ctx));
  const [signed, setSigned] = dUse(false);
  const c = ctx.clinic; const vet = ctx.vet;
  const accent = c.docColor || '#14a8a0';
  const layout = c.docLayout || 'classico';

  const doPrint = () => {
    const docEl = document.getElementById('doc-printable');
    if (!docEl) { window.print(); return; }
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"],style')).map((el) => el.outerHTML).join('\n');
    const w = window.open('', '_blank', 'width=860,height=1080');
    w.document.write(
      '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + (tipo || 'Documento') + '</title>' + styles +
      '<style>' +
      'body{background:#f5f5f5;margin:0;padding:32px;font-family:inherit;}' +
      '.doc-page{background:#fff;max-width:740px;margin:0 auto;padding:40px 52px 60px;box-shadow:0 2px 16px #0001;border-radius:8px;}' +
      '@media print{body{padding:0;background:#fff;}.doc-page{box-shadow:none;border-radius:0;max-width:100%;padding:28px 36px 44px;}}' +
      '</style></head><body>' + docEl.outerHTML + '</body></html>'
    );
    w.document.close(); w.focus();
    setTimeout(() => { w.print(); }, 700);
  };

  return (
    <div className="fin-modal-bg" onClick={onClose}>
      <div className="fin-modal doc-modal" style={isStructured ? { gridTemplateColumns: '1fr' } : null} onClick={(e) => e.stopPropagation()}>
        <div className="doc-toolbar">
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{tipo}</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="vt-btn-ghost" onClick={() => window.vtToast('Documento enviado ao tutor para assinatura digital via WhatsApp.', 'ok')}>💬 Enviar p/ assinatura</button>
            <button className="vt-btn-ghost" onClick={doPrint}><VtIcon name="print" size={15} /> Imprimir / PDF</button>
            {!isStructured && <button className="vt-btn-primary" onClick={() => { onSave(body); window.vtToast('Documento salvo.', 'ok'); }}>Salvar</button>}
          </div>
        </div>
        <div className={`doc-split${isStructured ? ' doc-split-full' : ''}`}>
          {!isStructured && (
            <div className="doc-edit">
              <span className="vtf-label">Conteúdo (editável)</span>
              <textarea className="doc-textarea" value={body} onChange={(e) => setBody(e.target.value)} />
              <p className="vt-muted" style={{ fontSize: 12, marginTop: 8 }}>Os dados do MV, paciente, tutor e clínica são inseridos automaticamente no documento ao lado.</p>
            </div>
          )}
          <div className={`doc-preview-wrap${isStructured ? ' doc-preview-full' : ''}`}>
            <DocPage
              tipo={tipo} patient={patient} at={at} body={body}
              accent={accent} layout={layout} c={c} vet={vet}
              signed={signed} onToggleSigned={() => setSigned(!signed)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { DocEditor, DocPage, docCtx, docBody });
