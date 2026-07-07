/* ============================================================
   VetTooth Pro — Ficha Anestésica + Checklist Pré/Pós-Op
   ============================================================ */

/* ---- Checklist padrão ---- */
const ANE_PRE_DEFAULT = [
  'Jejum alimentar confirmado (mínimo 6h)',
  'Jejum hídrico confirmado (mínimo 2h)',
  'Exame físico pré-anestésico realizado',
  'FC, FR, Temp, SpO2 registrados',
  'Peso atualizado',
  'Acesso venoso estabelecido',
  'Pré-medicação anestésica administrada',
  'Material de emergência disponível',
  'Monitor multiparamétrico ligado',
  'Consentimento informado assinado',
];
const ANE_POS_DEFAULT = [
  'Extubação realizada com segurança',
  'Reflexo de deglutição presente',
  'Temperatura corporal monitorada',
  'Dor pós-operatória avaliada',
  'Analgesia pós-op administrada',
  'Tutor orientado sobre cuidados em casa',
  'Prescrição entregue ao tutor',
  'Retorno agendado',
];

/* ---- Componente de checklist ---- */
function AneChecklist({ items, checked, onChange, title, color }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontWeight: 700, fontSize: 14, color, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
        {title}
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginLeft: 'auto' }}>
          {checked.filter(Boolean).length}/{items.length}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((item, i) => (
          <label key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', padding: '8px 12px', borderRadius: 10, background: checked[i] ? (color === 'var(--green)' ? 'var(--green-t)' : 'var(--teal-t)') : 'var(--bg)', border: `1px solid ${checked[i] ? color + '40' : 'var(--line)'}`, transition: 'all .12s' }}>
            <input type="checkbox" checked={!!checked[i]} onChange={e => onChange(i, e.target.checked)}
              style={{ width: 16, height: 16, accentColor: color, flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 13.5, color: checked[i] ? 'var(--ink)' : 'var(--muted)', fontWeight: checked[i] ? 600 : 400, textDecoration: checked[i] ? 'none' : 'none' }}>
              {item}
            </span>
            {checked[i] && <span style={{ marginLeft: 'auto', color, fontSize: 16, flexShrink: 0 }}>✓</span>}
          </label>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   FichaAnestesica — componente principal
   Usado dentro do prontuário como aba extra
   ============================================================ */
function FichaAnestesica({ atendimentoId, patientId, patient, readOnly }) {
  const storeKey = `anestesia_${atendimentoId || patientId || 'new'}`;

  const load = () => {
    try {
      const d = window.VtStore && window.VtStore.getData();
      return (d && d[storeKey]) || null;
    } catch { return null; }
  };

  const [data, setData] = vtUseState(() => load() || {
    // identificação
    data: new Date().toISOString().slice(0, 10),
    anestesista: '',
    cirurgiao: '',
    procedimento: '',
    duracao: '',
    // pré-anestésico
    preChecked: new Array(ANE_PRE_DEFAULT.length).fill(false),
    // parâmetros vitais intraop (array de linhas)
    vitais: [{ t: '0', fc: '', fr: '', temp: '', spo2: '', pa: '', obs: '' }],
    // fármacos utilizados
    farmacos: [{ nome: '', dose: '', via: '', horario: '', obs: '' }],
    // pós-operatório
    posChecked: new Array(ANE_POS_DEFAULT.length).fill(false),
    // observações gerais
    obsGeral: '',
    // classificação ASA
    asa: 'ASA I',
    // tipo anestesia
    tipoAne: 'Geral inalatória',
    // intercorrências
    intercorrencias: '',
    // assinaturas
    assinado: false,
  });

  const persist = (next) => {
    setData(next);
    if (window.VtStore) window.VtStore.setData({ [storeKey]: next });
  };

  const s = k => v => persist({ ...data, [k]: v });

  const setPreCheck = (i, v) => {
    const arr = [...data.preChecked];
    arr[i] = v;
    persist({ ...data, preChecked: arr });
  };
  const setPosCheck = (i, v) => {
    const arr = [...data.posChecked];
    arr[i] = v;
    persist({ ...data, posChecked: arr });
  };

  const addVital = () => persist({ ...data, vitais: [...data.vitais, { t: '', fc: '', fr: '', temp: '', spo2: '', pa: '', obs: '' }] });
  const setVital = (i, k, v) => {
    const arr = data.vitais.map((row, j) => j === i ? { ...row, [k]: v } : row);
    persist({ ...data, vitais: arr });
  };

  const addFarmaco = () => persist({ ...data, farmacos: [...data.farmacos, { nome: '', dose: '', via: '', horario: '', obs: '' }] });
  const setFarmaco = (i, k, v) => {
    const arr = data.farmacos.map((row, j) => j === i ? { ...row, [k]: v } : row);
    persist({ ...data, farmacos: arr });
  };
  const delFarmaco = (i) => persist({ ...data, farmacos: data.farmacos.filter((_, j) => j !== i) });

  const TIPOS = ['Geral inalatória', 'Geral TIVA', 'Loco-regional', 'Sedação', 'Local'];
  const ASAS = ['ASA I', 'ASA II', 'ASA III', 'ASA IV', 'ASA V'];
  const VIAS = ['IV', 'IM', 'SC', 'EV', 'PO', 'Epidural', 'Intratecal', 'Inalatória'];

  const preOk = data.preChecked.filter(Boolean).length;
  const posOk = data.posChecked.filter(Boolean).length;

  const inputStyle = { padding: '6px 10px', border: '1px solid var(--line)', borderRadius: 8, fontFamily: 'inherit', fontSize: 13, width: '100%', background: readOnly ? 'var(--bg)' : 'var(--card)', color: 'var(--ink)' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Cabeçalho */}
      <div style={{ background: 'var(--navy)', borderRadius: 14, padding: '16px 20px', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 22 }}>🩺</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17 }}>Ficha Anestésica</div>
            <div style={{ fontSize: 12.5, opacity: .75 }}>{patient ? patient.name : 'Paciente'} · {patient ? patient.species : ''}</div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ fontSize: 12, opacity: .7 }}>Pré-op</div>
            <div style={{ fontWeight: 800, color: preOk === ANE_PRE_DEFAULT.length ? '#4ade80' : '#fbbf24' }}>{preOk}/{ANE_PRE_DEFAULT.length}</div>
          </div>
          <div style={{ textAlign: 'right', marginLeft: 16 }}>
            <div style={{ fontSize: 12, opacity: .7 }}>Pós-op</div>
            <div style={{ fontWeight: 800, color: posOk === ANE_POS_DEFAULT.length ? '#4ade80' : '#fbbf24' }}>{posOk}/{ANE_POS_DEFAULT.length}</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))', gap: 10 }}>
          {[
            { label: 'Data', value: data.data, key: 'data', type: 'date' },
            { label: 'Anestesista', value: data.anestesista, key: 'anestesista' },
            { label: 'Cirurgião/Responsável', value: data.cirurgiao, key: 'cirurgiao' },
            { label: 'Procedimento', value: data.procedimento, key: 'procedimento' },
          ].map(f => (
            <div key={f.key}>
              <div style={{ fontSize: 11, opacity: .7, marginBottom: 3 }}>{f.label}</div>
              <input type={f.type || 'text'} value={f.value} onChange={e => s(f.key)(e.target.value)} readOnly={readOnly}
                style={{ ...inputStyle, background: 'rgba(255,255,255,.12)', color: '#fff', border: '1px solid rgba(255,255,255,.25)' }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 10 }}>
          <div>
            <div style={{ fontSize: 11, opacity: .7, marginBottom: 3 }}>Tipo de anestesia</div>
            <select value={data.tipoAne} onChange={e => s('tipoAne')(e.target.value)} disabled={readOnly}
              style={{ ...inputStyle, background: 'rgba(255,255,255,.12)', color: '#fff', border: '1px solid rgba(255,255,255,.25)' }}>
              {TIPOS.map(t => <option key={t} style={{ color: 'var(--ink)' }}>{t}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, opacity: .7, marginBottom: 3 }}>Classificação ASA</div>
            <select value={data.asa} onChange={e => s('asa')(e.target.value)} disabled={readOnly}
              style={{ ...inputStyle, background: 'rgba(255,255,255,.12)', color: '#fff', border: '1px solid rgba(255,255,255,.25)' }}>
              {ASAS.map(a => <option key={a} style={{ color: 'var(--ink)' }}>{a}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, opacity: .7, marginBottom: 3 }}>Duração estimada</div>
            <input value={data.duracao} onChange={e => s('duracao')(e.target.value)} readOnly={readOnly} placeholder="Ex.: 1h30min"
              style={{ ...inputStyle, background: 'rgba(255,255,255,.12)', color: '#fff', border: '1px solid rgba(255,255,255,.25)' }} />
          </div>
        </div>
      </div>

      {/* Checklists */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="vt-card" style={{ padding: '16px 18px' }}>
          <AneChecklist
            title="Checklist Pré-Operatório"
            items={ANE_PRE_DEFAULT}
            checked={data.preChecked}
            onChange={setPreCheck}
            color="var(--teal-d)"
          />
        </div>
        <div className="vt-card" style={{ padding: '16px 18px' }}>
          <AneChecklist
            title="Checklist Pós-Operatório"
            items={ANE_POS_DEFAULT}
            checked={data.posChecked}
            onChange={setPosCheck}
            color="var(--green)"
          />
        </div>
      </div>

      {/* Fármacos utilizados */}
      <div className="vt-card" style={{ padding: '16px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <b style={{ fontSize: 14 }}>💉 Fármacos Utilizados</b>
          {!readOnly && <button className="vt-btn-primary" style={{ padding: '5px 12px', fontSize: 12 }} onClick={addFarmaco}>+ Adicionar</button>}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg)' }}>
                {['Fármaco', 'Dose', 'Via', 'Horário', 'Observação', ''].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: 'var(--muted)', fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.farmacos.map((f, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--line-2)' }}>
                  <td style={{ padding: '6px 6px' }}><input value={f.nome} onChange={e => setFarmaco(i, 'nome', e.target.value)} readOnly={readOnly} placeholder="Ex.: Propofol" style={{ ...inputStyle, width: 140 }} /></td>
                  <td style={{ padding: '6px 6px' }}><input value={f.dose} onChange={e => setFarmaco(i, 'dose', e.target.value)} readOnly={readOnly} placeholder="Ex.: 4 mg/kg" style={{ ...inputStyle, width: 100 }} /></td>
                  <td style={{ padding: '6px 6px' }}>
                    <select value={f.via} onChange={e => setFarmaco(i, 'via', e.target.value)} disabled={readOnly} style={{ ...inputStyle, width: 90 }}>
                      <option value="">—</option>
                      {VIAS.map(v => <option key={v}>{v}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: '6px 6px' }}><input value={f.horario} onChange={e => setFarmaco(i, 'horario', e.target.value)} readOnly={readOnly} placeholder="HH:MM" style={{ ...inputStyle, width: 80 }} /></td>
                  <td style={{ padding: '6px 6px' }}><input value={f.obs} onChange={e => setFarmaco(i, 'obs', e.target.value)} readOnly={readOnly} placeholder="Observação" style={{ ...inputStyle, width: 160 }} /></td>
                  <td style={{ padding: '6px 6px' }}>
                    {!readOnly && data.farmacos.length > 1 && (
                      <button onClick={() => delFarmaco(i)} style={{ color: 'var(--red)', fontSize: 16, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--red)', background: 'var(--red-t)', cursor: 'pointer' }}>×</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monitoração intraoperatória */}
      <div className="vt-card" style={{ padding: '16px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <b style={{ fontSize: 14 }}>📊 Monitoração Intraoperatória</b>
          {!readOnly && <button className="vt-btn-primary" style={{ padding: '5px 12px', fontSize: 12 }} onClick={addVital}>+ Linha</button>}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg)' }}>
                {['T (min)', 'FC (bpm)', 'FR (rpm)', 'Temp (°C)', 'SpO₂ (%)', 'PA (mmHg)', 'Obs'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: 'var(--muted)', fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.vitais.map((v, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--line-2)' }}>
                  {['t', 'fc', 'fr', 'temp', 'spo2', 'pa', 'obs'].map(k => (
                    <td key={k} style={{ padding: '6px 6px' }}>
                      <input value={v[k]} onChange={e => setVital(i, k, e.target.value)} readOnly={readOnly}
                        style={{ ...inputStyle, width: k === 'obs' ? 160 : 70 }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Intercorrências + Observações */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="vt-card" style={{ padding: '16px 18px' }}>
          <b style={{ fontSize: 14, display: 'block', marginBottom: 10 }}>⚠️ Intercorrências</b>
          <textarea value={data.intercorrencias} onChange={e => s('intercorrencias')(e.target.value)} readOnly={readOnly}
            placeholder="Registre qualquer intercorrência durante o procedimento..."
            style={{ ...inputStyle, height: 100, resize: 'vertical' }} />
        </div>
        <div className="vt-card" style={{ padding: '16px 18px' }}>
          <b style={{ fontSize: 14, display: 'block', marginBottom: 10 }}>📝 Observações Gerais</b>
          <textarea value={data.obsGeral} onChange={e => s('obsGeral')(e.target.value)} readOnly={readOnly}
            placeholder="Observações adicionais sobre o procedimento..."
            style={{ ...inputStyle, height: 100, resize: 'vertical' }} />
        </div>
      </div>

      {/* Assinatura */}
      {!readOnly && (
        <div className="vt-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={!!data.assinado} onChange={e => s('assinado')(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: 'var(--teal)' }} />
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>
              Ficha anestésica revisada e assinada digitalmente pelo responsável
            </span>
          </label>
          {data.assinado && <span style={{ marginLeft: 'auto', color: 'var(--green)', fontWeight: 700, fontSize: 13 }}>✓ Assinada</span>}
        </div>
      )}
    </div>
  );
}

/* Expor globalmente para uso no prontuário */
window.FichaAnestesica = FichaAnestesica;
