/* ============================================================
   VetTooth Pro — Peso & Escore Corporal
   Componente PesoTab usado pela aba "Peso & Escore" do prontuário.
   (Resumo/Histórico/Cabeçalho vivem no prontuário — vt-prontuario*.jsx)
   ============================================================ */
const { useState: fUse, useRef: fRef } = React;

function fParseBR(d) { const m = (d || '').match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? new Date(+m[3], +m[2] - 1, +m[1]).getTime() : 0; }
function fTodayBR() { return new Date().toLocaleDateString('pt-BR'); }

/* ---------- Aba Peso & Escore ---------- */
function PesoTab({ p, weights, onAdd, onNew }) {
  const scale = window.VtScores.scaleFor(p.species);
  const sorted = [...weights].sort((a, b) => fParseBR(a.date) - fParseBR(b.date));
  return (
    <div className="fc-pane">
      <div className="vt-head-row" style={{ marginBottom: 14 }}>
        <h3 className="vt-sec-title" style={{ margin: 0 }}>Peso & Escore Corporal <span className="vt-count-badge">{weights.length}</span></h3>
        <button className="pr-qbtn primary" onClick={onNew}><VtIcon name="plus" size={15} /> Cadastrar peso</button>
      </div>
      <div className="vt-grid" style={{ gridTemplateColumns: '1.3fr 1fr', alignItems: 'start' }}>
        <div className="vt-card vt-sec">
          <h4 className="vt-sec-title" style={{ fontSize: 15 }}>Evolução de peso</h4>
          <WeightChart data={sorted} />
        </div>
        <div className="vt-card vt-sec">
          <h4 className="vt-sec-title" style={{ fontSize: 15 }}>Registros</h4>
          <div className="fc-weight-list">
            {sorted.slice().reverse().map((w, i) => (
              <div key={i} className="fc-weight-row"><span><b>{w.weight}</b> · ECC {w.score}</span><span className="vt-muted">{w.date}</span></div>
            ))}
            {weights.length === 0 && <p className="vt-empty">Nenhum peso registrado.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
function WeightChart({ data }) {
  if (!data || data.length === 0) return <p className="vt-empty">Sem dados para o gráfico.</p>;
  const vals = data.map((d) => Number((d.weight || '').replace(/[^\d,]/g, '').replace(',', '.')) || 0);
  const max = Math.max(...vals) * 1.1 || 1, min = Math.min(...vals) * 0.9;
  const W = 460, H = 170, pad = 24;
  const x = (i) => pad + (i * (W - pad * 2)) / Math.max(1, data.length - 1);
  const y = (v) => H - pad - ((v - min) / (max - min || 1)) * (H - pad * 2);
  const pts = vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="180">
      <path d={pts} fill="none" stroke="#14a8a0" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      {vals.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="4" fill="#14a8a0" />)}
      {data.map((d, i) => <text key={i} x={x(i)} y={H - 6} fontSize="10" fill="#97a4b3" textAnchor="middle">{d.date.slice(0, 5)}</text>)}
    </svg>
  );
}
function PesoModal({ p, scale, onClose, onSave }) {
  const [w, setW] = fUse('');
  const [unit, setUnit] = fUse('kg');
  const [score, setScore] = fUse(5);
  const [obs, setObs] = fUse('');
  const sel = scale.list.find((s) => s.n === score);
  const save = () => {
    if (!w) { window.vtToast('Informe o peso.', 'err'); return; }
    onSave({ date: fTodayBR(), weight: unit === 'kg' ? window.maskWeight(w) : (window.onlyD(w) + ' g'), score, obs });
  };
  return (
    <div className="fin-modal-bg" onClick={onClose}>
      <div className="fin-modal" style={{ width: 560 }} onClick={(e) => e.stopPropagation()}>
        <h3>Novo peso & escore · {p.name}</h3>
        <p>{scale.label} — silhueta e interpretação por espécie.</p>
        <div className="vt-form-row">
          <VtField label="Peso" value={w} onChange={setW} placeholder="0,0" width="40%" />
          <label className="vtf" style={{ width: '24%' }}><span className="vtf-label">Unidade</span><span className="vtf-inputwrap"><select className="vtf-input" value={unit} onChange={(e) => setUnit(e.target.value)}><option value="kg">Kg</option><option value="g">g</option></select></span></label>
          <VtField label="Data" value={fTodayBR()} onChange={() => {}} width="30%" />
        </div>
        <div className="vtf-label" style={{ marginTop: 6 }}>Escore corporal: <b>{score}</b> — {sel.name}</div>
        <div className="fc-score-scale">
          {scale.list.map((s) => (
            <button key={s.n} className={`fc-score-btn ${s.cls}${score === s.n ? ' active' : ''}`} onClick={() => setScore(s.n)}>{s.n}</button>
          ))}
        </div>
        <div className="fc-score-desc"><BodySilhouette species={p.species} cls={sel.cls} /><div><b>{sel.name}</b><p>{sel.desc}</p></div></div>
        <label className="vtf"><span className="vtf-label">Observações</span><textarea className="vtf-input" style={{ minHeight: 56 }} value={obs} onChange={(e) => setObs(e.target.value)} /></label>
        <div className="fin-modal-actions" style={{ marginTop: 12 }}><button className="vt-btn-ghost" onClick={onClose}>Cancelar</button><button className="vt-btn-primary" onClick={save}>Salvar</button></div>
      </div>
    </div>
  );
}
function BodySilhouette({ species, cls }) {
  const color = cls === 'baixo' ? '#e2912a' : cls === 'alto' ? '#e0533c' : '#1fa971';
  const w = cls === 'baixo' ? 0.7 : cls === 'alto' ? 1.3 : 1;
  return (
    <svg width="84" height="60" viewBox="0 0 84 60" style={{ flex: 'none' }}>
      <ellipse cx="42" cy="34" rx={26 * w} ry="15" fill={color} opacity="0.25" />
      <ellipse cx="42" cy="34" rx={26 * w} ry="15" fill="none" stroke={color} strokeWidth="2" />
      <circle cx={42 - 24 * w} cy="26" r="9" fill={color} opacity="0.35" stroke={color} strokeWidth="2" />
      <line x1="32" y1="48" x2="32" y2="56" stroke={color} strokeWidth="2" /><line x1="52" y1="48" x2="52" y2="56" stroke={color} strokeWidth="2" />
    </svg>
  );
}

Object.assign(window, { PesoTab, fParseBR, fTodayBR });
