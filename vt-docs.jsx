/* ============================================================
   VetTooth Pro — Documentos (Fase 4)
   Modelos editáveis · preview · dados automáticos (MV/paciente/
   tutor/clínica) · assinatura do MV · assinatura digital do
   tutor · envio por WhatsApp.
   ============================================================ */
const { useState: dUse } = React;

/* contexto de substituição automática */
function docCtx(patient, at) {
  const vet = window.vtVetSignature(at.vet);
  return {
    clinic: window.vtClinic(), vet, patient,
    tutor: patient.owner, date: window.PR.todayBR(),
  };
}

/* modelos legais pré-prontos e editáveis */
window.DOC_TEMPLATES = {
  'Atestado de saúde': (c) => `ATESTADO DE SAÚDE\n\nAtesto, para os devidos fins, que o animal ${c.patient.name} (espécie ${c.patient.species}, raça ${c.patient.breed}, sexo ${c.patient.sex}), de propriedade de ${c.tutor}, foi submetido a exame clínico nesta data e encontra-se em bom estado geral de saúde, apto para as atividades a que se destina.\n\nObservações: ___________________________________________\n\n${c.clinic.address || ''}\nData: ${c.date}`,
  'Atestado de sanidade': (c) => `ATESTADO DE SANIDADE\n\nAtesto que o animal ${c.patient.name} (${c.patient.species} · ${c.patient.breed}), de propriedade de ${c.tutor}, encontra-se clinicamente sadio, sem sinais de doença infectocontagiosa no momento do exame.\n\nData: ${c.date}`,
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

/* ---------- Editor / preview de documento ---------- */
function DocEditor({ tipo, patient, at, initialBody, onClose, onSave }) {
  const ctx = docCtx(patient, at);
  const hasOwnHeader = /receitu|solicita|exame/i.test(tipo || '');
  const [body, setBody] = dUse(initialBody != null ? initialBody : docBody(tipo, ctx));
  const [signed, setSigned] = dUse(false);
  const c = ctx.clinic; const vet = ctx.vet;
  const accent = c.docColor || '#14a8a0';
  const layout = c.docLayout || 'classico';
  const showSocial = c.docShowSocial !== false;
  const showContact = c.docShowContact !== false;
  const ad = c.addr || {};
  const addrLine = [ad.street, ad.num, ad.district, ad.city, ad.state].filter(Boolean).join(', ') || c.address || '';
  const contactLine = [showContact && addrLine, showContact && (c.phone || c.whats) && ('Tel: ' + (c.phone || c.whats)), showContact && c.email].filter(Boolean).join(' · ');
  const socialLine = [showSocial && c.site, showSocial && c.instagram, c.crmv && ('CRMV ' + c.crmv + '/' + (c.crmvUF || 'SP')), c.mapa && ('MAPA ' + c.mapa)].filter(Boolean).join(' · ');
  return (
    <div className="fin-modal-bg" onClick={onClose}>
      <div className="fin-modal doc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="doc-toolbar">
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{tipo}</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="vt-btn-ghost" onClick={() => window.vtToast('Documento enviado ao tutor para assinatura digital via WhatsApp.', 'ok')}>💬 Enviar p/ assinatura</button>
            <button className="vt-btn-ghost" onClick={() => {
              const docEl = document.querySelector('.doc-page');
              if (!docEl) { window.print(); return; }
              const w = window.open('', '_blank', 'width=820,height=1000');
              const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"],style')).map((el) => el.outerHTML).join('\n');
              w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Documento</title>' + styles + '<style>body{background:#f5f5f5;margin:0;padding:32px;} .doc-page{background:#fff;max-width:740px;margin:0 auto;padding:40px 48px 60px;box-shadow:0 2px 16px #0001;border-radius:8px;font-family:inherit;} @media print{body{padding:0;background:#fff;} .doc-page{box-shadow:none;border-radius:0;margin:0;padding:32px 40px 48px;}}</style></head><body>' + docEl.outerHTML + '</body></html>');
              w.document.close();
              w.focus();
              setTimeout(() => { w.print(); }, 600);
            }}><VtIcon name="print" size={15} /> Imprimir / PDF</button>
            <button className="vt-btn-primary" onClick={() => { onSave(body); window.vtToast('Documento salvo.', 'ok'); }}>Salvar</button>
          </div>
        </div>
        <div className="doc-split">
          <div className="doc-edit">
            <span className="vtf-label">Conteúdo (editável)</span>
            <textarea className="doc-textarea" value={body} onChange={(e) => setBody(e.target.value)} />
            <p className="vt-muted" style={{ fontSize: 12, marginTop: 8 }}>Os dados do MV, paciente, tutor e clínica são inseridos automaticamente no documento ao lado.</p>
          </div>
          <div className="doc-preview-wrap">
            <div className="doc-page">
              <div className={`docs-hd theme-${layout}`} style={{ paddingBottom: 14, borderBottom: 'none' }}>
                {c.logo ? <img className="docs-hd-logo" src={c.logo} alt="logo" /> : <div className="docs-hd-logo ph" style={{ borderColor: accent, color: accent }}>{(c.name || 'V')[0]}</div>}
                <div className="docs-hd-id">
                  <b style={{ color: accent }}>{c.name || 'Clínica'}</b>
                  {c.crmv ? <span style={{ color: accent }}>CRMV {c.crmv}/{c.crmvUF || 'SP'}</span> : null}
                  {c.mapa ? <span style={{ color: accent }}>Registro no MAPA {c.mapa}</span> : null}
                </div>
                <div className="docs-hd-contact">
                  {showContact && addrLine ? <span>{addrLine}</span> : null}
                  {showContact && c.phone ? <span>Telefone: {c.phone}</span> : null}
                  {showContact && c.email ? <span>E-mail: {c.email}</span> : null}
                  {showSocial && c.site ? <span>Site: {c.site}</span> : null}
                  {showSocial && c.instagram ? <span>{c.instagram}</span> : null}
                </div>
              </div>
              <div className="docs-rule" style={{ background: accent, margin: '0 0 16px' }} />
              {!hasOwnHeader && (
                <div className="doc-meta">
                  <span><b>Paciente:</b> {patient.name} ({patient.species} · {patient.breed}{patient.color ? ' · ' + patient.color : ''})</span>
                  {patient.chip ? <span><b>Microchip:</b> {patient.chip}</span> : null}
                  <span><b>Tutor:</b> {ctx.tutor}</span>
                </div>
              )}
              <pre className="doc-body">{body}</pre>
              <div className="doc-signs">
                <div className="doc-sign">
                  {vet.sign ? <img src={vet.sign} alt="assinatura" className="doc-sign-img" /> : <div className="doc-sign-line" />}
                  <b>{vet.name ? 'M.V. ' + vet.name : 'Médico(a) Veterinário(a)'}</b>
                  <span>{[vet.crmv, vet.especialidade].filter(Boolean).join(' · ') || 'CRMV'}</span>
                </div>
                <div className="doc-sign">
                  <div className="doc-sign-line" style={signed ? { borderColor: 'var(--teal)' } : null} />
                  <b>{ctx.tutor}</b>
                  <span style={{ cursor: 'pointer', color: 'var(--teal-d)', fontWeight: 700 }} onClick={() => setSigned(!signed)}>{signed ? '✓ Assinado digitalmente' : 'Tutor (clique p/ simular assinatura)'}</span>
                </div>
              </div>
              {c.docObs ? <div className="doc-obs-foot" style={{ borderColor: accent }}>{c.docObs}</div> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { DocEditor, docCtx, docBody });
