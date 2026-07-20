/* ============================================================
   VetTooth Pro — Odontograma Wizard (6 Passos — estilo Pimbury Dental)
   Exposto como window.OdontogramaWizard
   ============================================================ */
(function () {
  const { useState, useEffect, useMemo, useRef } = React;

  /* ─── Passos ─────────────────────────────────────────── */
  const STEPS = [
    { n: 1, label: 'Paciente',          icon: '🐾' },
    { n: 2, label: 'Avaliação Inicial', icon: '📋' },
    { n: 3, label: 'Odontograma',       icon: '🦷' },
    { n: 4, label: 'Tratamentos',       icon: '✅' },
    { n: 5, label: 'Notas & Prévia',    icon: '📝' },
    { n: 6, label: 'Faturamento',       icon: '💰' },
  ];

  const PAID_TYPES = ['Dinheiro', 'Débito', 'Crédito', 'PIX', 'Boleto', 'Cortesia'];

  /* ─── Categorias de imagem ─────────────────────────────── */
  const IMG_CATS = [
    { id: 'pac-rosto',   label: 'Paciente · Rosto',           group: 'Paciente' },
    { id: 'pac-corpo',   label: 'Paciente · Corpo inteiro',   group: 'Paciente' },
    { id: 'arc-100-400', label: 'Arcada 100 & 400',           group: 'Dentes' },
    { id: 'arc-200-300', label: 'Arcada 200 & 300',           group: 'Dentes' },
    { id: 'incisivos',   label: 'Incisivos',                  group: 'Dentes' },
    { id: 'achados',     label: 'Achados',                    group: 'Dentes' },
    { id: 'rx-inc',      label: 'Rx · Incisivos',             group: 'Radiografias' },
    { id: 'rx-can',      label: 'Rx · Caninos',               group: 'Radiografias' },
    { id: 'rx-pm100',    label: 'Rx · Pré-mol. 100',          group: 'Radiografias' },
    { id: 'rx-pm200',    label: 'Rx · Pré-mol. 200',          group: 'Radiografias' },
    { id: 'rx-pm300',    label: 'Rx · Pré-mol. 300',          group: 'Radiografias' },
    { id: 'rx-pm400',    label: 'Rx · Pré-mol. 400',          group: 'Radiografias' },
    { id: 'rx-mol100',   label: 'Rx · Molares 100',           group: 'Radiografias' },
    { id: 'rx-mol200',   label: 'Rx · Molares 200',           group: 'Radiografias' },
    { id: 'rx-mol300',   label: 'Rx · Molares 300',           group: 'Radiografias' },
    { id: 'rx-mol400',   label: 'Rx · Molares 400',           group: 'Radiografias' },
    { id: 'rx-achados',  label: 'Achados Radiográficos',      group: 'Radiografias' },
  ];

  /* ─── Modal de imagens ─────────────────────────────────── */
  function ImageModal({ images, onUpdate, onClose }) {
    const [activeCat, setActiveCat] = useState(IMG_CATS[0].id);
    const [annotating, setAnnotating] = useState(null); // índice da imagem sendo anotada
    const fileRef = useRef(null);

    const catImages = images.filter(img => img.category === activeCat);
    const allCount = images.length;

    /* ── Upload de arquivo ── */
    const handleFiles = (e) => {
      const files = Array.from(e.target.files);
      if (!files.length) return;
      Promise.all(files.map(f => new Promise(res => {
        const r = new FileReader();
        r.onload = ev => res({ url: ev.target.result, label: f.name.replace(/\.[^.]+$/, ''), description: '', category: activeCat, markers: [] });
        r.readAsDataURL(f);
      }))).then(newImgs => { onUpdate([...images, ...newImgs]); });
      e.target.value = '';
    };

    /* ── Remover imagem ── */
    const removeImg = (globalIdx) => onUpdate(images.filter((_, i) => i !== globalIdx));

    /* ── Atualizar campo de uma imagem ── */
    const updateImg = (globalIdx, patch) => {
      const next = images.map((img, i) => i === globalIdx ? { ...img, ...patch } : img);
      onUpdate(next);
    };

    /* ── Adicionar marcador clicando na imagem ── */
    const addMarker = (globalIdx, e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width * 100).toFixed(1);
      const y = ((e.clientY - rect.top) / rect.height * 100).toFixed(1);
      const img = images[globalIdx];
      const letter = String.fromCharCode(65 + (img.markers || []).length); // A, B, C…
      updateImg(globalIdx, { markers: [...(img.markers || []), { x: parseFloat(x), y: parseFloat(y), letter, note: '' }] });
    };

    /* ── Remover marcador ── */
    const removeMarker = (globalIdx, mIdx) => {
      const img = images[globalIdx];
      updateImg(globalIdx, { markers: img.markers.filter((_, i) => i !== mIdx) });
    };

    const groups = [...new Set(IMG_CATS.map(c => c.group))];

    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 9000, display: 'flex', alignItems: 'stretch' }}>
        <div style={{ display: 'flex', width: '100%', height: '100%', background: 'var(--bg)' }}>

          {/* ── Sidebar de categorias ── */}
          <div style={{ width: 200, flexShrink: 0, background: 'var(--navy, #16395f)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>📷 Imagens</span>
              <span style={{ background: '#e74c3c', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>{allCount}</span>
            </div>
            {groups.map(grp => (
              <div key={grp}>
                <div style={{ padding: '8px 16px 4px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(255,255,255,.4)' }}>{grp}</div>
                {IMG_CATS.filter(c => c.group === grp).map(cat => {
                  const cnt = images.filter(img => img.category === cat.id).length;
                  const active = activeCat === cat.id;
                  return (
                    <button key={cat.id} onClick={() => { setActiveCat(cat.id); setAnnotating(null); }}
                      style={{ width: '100%', textAlign: 'left', padding: '7px 16px', border: 'none', cursor: 'pointer', fontSize: 11,
                        background: active ? 'rgba(255,255,255,.15)' : 'transparent',
                        color: active ? '#fff' : 'rgba(255,255,255,.65)',
                        borderLeft: active ? '3px solid var(--teal, #14a8a0)' : '3px solid transparent',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{cat.label}</span>
                      {cnt > 0 && <span style={{ background: 'var(--teal, #14a8a0)', color: '#fff', borderRadius: 8, padding: '0 5px', fontSize: 10, fontWeight: 700 }}>{cnt}</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* ── Área principal ── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Topo */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--card)', flexShrink: 0 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy, #16395f)' }}>{IMG_CATS.find(c => c.id === activeCat)?.label}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Clique em uma imagem para adicionar marcadores de letra. Sem limite de fotos.</div>
              </div>
              <button onClick={() => fileRef.current && fileRef.current.click()}
                style={{ background: 'var(--teal, #14a8a0)', border: 'none', color: '#fff', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                + Adicionar fotos
              </button>
              <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFiles} />
              <button onClick={onClose}
                style={{ background: 'none', border: '1.5px solid var(--line)', color: 'var(--muted)', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13 }}>
                ✕ Fechar
              </button>
            </div>

            {/* Grid de imagens */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
              {catImages.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📷</div>
                  <div style={{ fontSize: 14, marginBottom: 8 }}>Nenhuma imagem nesta categoria</div>
                  <button onClick={() => fileRef.current && fileRef.current.click()}
                    style={{ background: 'var(--teal, #14a8a0)', border: 'none', color: '#fff', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                    + Adicionar fotos
                  </button>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {catImages.map((img) => {
                  const globalIdx = images.indexOf(img);
                  const isAnnotating = annotating === globalIdx;
                  return (
                    <div key={globalIdx} style={{ background: 'var(--card)', border: '1.5px solid var(--line)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
                      {/* Imagem com marcadores */}
                      <div style={{ position: 'relative', background: '#000', cursor: isAnnotating ? 'crosshair' : 'default' }}
                        onClick={isAnnotating ? (e) => addMarker(globalIdx, e) : undefined}>
                        <img src={img.url} alt={img.label}
                          style={{ width: '100%', display: 'block', maxHeight: 220, objectFit: 'contain', userSelect: 'none', pointerEvents: 'none' }} />
                        {/* Marcadores */}
                        {(img.markers || []).map((m, mIdx) => (
                          <div key={mIdx}
                            style={{ position: 'absolute', left: m.x + '%', top: m.y + '%', transform: 'translate(-50%, -50%)',
                              width: 22, height: 22, borderRadius: '50%', background: '#e74c3c', color: '#fff',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 11, fontWeight: 900, border: '2px solid #fff',
                              boxShadow: '0 1px 4px rgba(0,0,0,.5)', cursor: 'pointer', zIndex: 10 }}
                            onClick={(e) => { e.stopPropagation(); removeMarker(globalIdx, mIdx); }}>
                            {m.letter}
                          </div>
                        ))}
                        {/* Overlay de modo anotação */}
                        {isAnnotating && (
                          <div style={{ position: 'absolute', inset: 0, background: 'rgba(20,168,160,.15)', border: '2px dashed #14a8a0', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', padding: 6 }}>
                            <span style={{ background: '#14a8a0', color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 6, padding: '2px 7px' }}>Clique para marcar</span>
                          </div>
                        )}
                      </div>

                      {/* Controles */}
                      <div style={{ padding: '10px 12px' }}>
                        {/* Label editável */}
                        <input value={img.label} onChange={e => updateImg(globalIdx, { label: e.target.value })}
                          style={{ width: '100%', border: '1px solid var(--line)', borderRadius: 6, padding: '5px 8px', fontSize: 12, fontFamily: 'inherit', marginBottom: 8, outline: 'none', background: 'var(--bg)', color: 'var(--text)' }}
                          placeholder="Nome/título da imagem" />

                        {/* Descrição */}
                        <textarea value={img.description || ''} onChange={e => updateImg(globalIdx, { description: e.target.value })}
                          rows={2} placeholder="Descrição da imagem…"
                          style={{ width: '100%', border: '1px solid var(--line)', borderRadius: 6, padding: '5px 8px', fontSize: 11, fontFamily: 'inherit', resize: 'none', outline: 'none', background: 'var(--bg)', color: 'var(--text)', marginBottom: 8 }} />

                        {/* Legenda dos marcadores */}
                        {(img.markers || []).length > 0 && (
                          <div style={{ marginBottom: 8 }}>
                            {img.markers.map((m, mIdx) => (
                              <div key={mIdx} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#e74c3c', color: '#fff', fontSize: 9, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{m.letter}</span>
                                <input value={m.note} onChange={e => {
                                  const newMarkers = img.markers.map((mk, i) => i === mIdx ? { ...mk, note: e.target.value } : mk);
                                  updateImg(globalIdx, { markers: newMarkers });
                                }} placeholder={`Achado ${m.letter}…`}
                                  style={{ flex: 1, border: '1px solid var(--line)', borderRadius: 5, padding: '3px 7px', fontSize: 11, fontFamily: 'inherit', outline: 'none', background: 'var(--bg)', color: 'var(--text)' }} />
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Botões */}
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => setAnnotating(isAnnotating ? null : globalIdx)}
                            style={{ flex: 1, padding: '5px 0', borderRadius: 6, border: `1.5px solid ${isAnnotating ? 'var(--teal)' : 'var(--line)'}`,
                              background: isAnnotating ? 'var(--teal)' : 'transparent', color: isAnnotating ? '#fff' : 'var(--muted)',
                              fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                            {isAnnotating ? '✔ Marcar' : '✎ Anotar'}
                          </button>
                          <button onClick={() => removeImg(globalIdx)}
                            style={{ padding: '5px 10px', borderRadius: 6, border: '1.5px solid #e74c3c', background: 'transparent', color: '#e74c3c', fontSize: 11, cursor: 'pointer' }}>
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Cabeçalho do Wizard ─────────────────────────────── */
  function WizHeader({ step, onClose, date, setDate, images, onOpenModal }) {
    const totalImgs = (images || []).length;
    return (
      <div style={{ background: 'var(--navy, #16395f)', color: '#fff', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,.12)', border: 'none', color: '#fff', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontSize: 13 }}>✕ Fechar</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, flex: 1, overflowX: 'auto' }}>
          {STEPS.map((s, i) => (
            <React.Fragment key={s.n}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 64 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700,
                  background: step === s.n ? 'var(--teal, #14a8a0)' : step > s.n ? 'rgba(255,255,255,.4)' : 'rgba(255,255,255,.12)',
                  border: step === s.n ? '2px solid #fff' : '2px solid transparent', color: '#fff' }}>
                  {step > s.n ? '✓' : s.n}
                </div>
                <span style={{ fontSize: 9, fontWeight: step === s.n ? 700 : 400, opacity: step === s.n ? 1 : .6, whiteSpace: 'nowrap' }}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <div style={{ flex: 1, height: 2, background: step > s.n ? 'rgba(255,255,255,.5)' : 'rgba(255,255,255,.15)', margin: '0 2px', marginBottom: 14 }} />}
            </React.Fragment>
          ))}
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(255,255,255,.8)', flexShrink: 0 }}>
          📅 <input type="date" value={date} onChange={e => setDate(e.target.value)}
            style={{ background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.25)', borderRadius: 6, color: '#fff', padding: '3px 7px', fontSize: 12 }} />
        </label>
        {/* Botão Adicionar — ativo somente a partir do Passo 2 */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button onClick={step >= 2 ? onOpenModal : undefined}
            disabled={step < 2}
            title={step < 2 ? 'Selecione o paciente primeiro' : 'Adicionar fotos e radiografias'}
            style={{ background: step >= 2 ? 'var(--teal, #14a8a0)' : 'rgba(255,255,255,.12)', border: 'none', color: '#fff',
              borderRadius: 8, padding: '6px 12px', cursor: step >= 2 ? 'pointer' : 'not-allowed',
              fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5, opacity: step < 2 ? .5 : 1 }}>
            📷 Adicionar
          </button>
          {totalImgs > 0 && (
            <span style={{ position: 'absolute', top: -6, right: -6, background: '#e74c3c', color: '#fff', borderRadius: '50%', width: 18, height: 18, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {totalImgs}
            </span>
          )}
        </div>
      </div>
    );
  }

  /* ─── Botões de Navegação ─────────────────────────────── */
  function WizNav({ step, onPrev, onNext, nextLabel, nextDisabled }) {
    return (
      <div style={{ borderTop: '1px solid var(--line)', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--card)', flexShrink: 0 }}>
        <button className="vt-btn-ghost" onClick={onPrev} disabled={step === 1} style={{ opacity: step === 1 ? .3 : 1 }}>← Voltar</button>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>Passo {step} de {STEPS.length}</span>
        <button className="vt-btn-primary" onClick={onNext} disabled={nextDisabled}>
          {nextLabel || (step === 6 ? '💾 Salvar Exame' : 'Próximo →')}
        </button>
      </div>
    );
  }

  /* ─── PASSO 1: Seleção de Paciente ─────────────────────── */
  function Step1Patient({ wiz, setW, onNext }) {
    const [query, setQuery] = useState('');
    const [expanded, setExpanded] = useState({});
    const allPatients = useMemo(() => { const d = window.VtStore && window.VtStore.getData(); return (d && d.patients) || []; }, []);

    const filtered = useMemo(() => {
      const q = query.toLowerCase();
      if (!q) return allPatients;
      return allPatients.filter(p => p.name.toLowerCase().includes(q) || (p.owner || '').toLowerCase().includes(q));
    }, [query, allPatients]);

    /* Agrupar por tutor */
    const byOwner = useMemo(() => {
      const map = {};
      filtered.forEach(p => {
        const owner = p.owner || 'Sem tutor';
        if (!map[owner]) map[owner] = [];
        map[owner].push(p);
      });
      return map;
    }, [filtered]);

    const speciesLabel = (p) => {
      const s = (p.species || '').toLowerCase();
      if (/cavalo|equ|égua|egua|muar/i.test(s)) return { emoji: '🐴', label: 'Equino' };
      if (/gato|felin/i.test(s)) return { emoji: '🐱', label: 'Gato' };
      return { emoji: '🐶', label: 'Cão' };
    };

    const select = (p) => {
      const sp = speciesLabel(p);
      setW({ patientId: p.id, patientName: p.name, ownerName: p.owner || '', species: sp.label });
      onNext();
    };

    return (
      <div style={{ padding: 24, flex: 1, overflowY: 'auto' }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 20, color: 'var(--navy, #16395f)' }}>🐾 Selecione o paciente</h2>
        <p style={{ margin: '0 0 18px', color: 'var(--muted)', fontSize: 13 }}>Toque no nome do tutor para ver os animais. Selecione o animal para avançar automaticamente.</p>

        <input className="vt-input" placeholder="Buscar por paciente ou tutor…" value={query} onChange={e => setQuery(e.target.value)}
          style={{ width: '100%', marginBottom: 16, maxWidth: 520 }} />

        {Object.keys(byOwner).length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Nenhum paciente encontrado.</div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 600 }}>
          {Object.entries(byOwner).map(([owner, patients]) => (
            <div key={owner} style={{ border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
              <button onClick={() => setExpanded(e => ({ ...e, [owner]: !e[owner] }))}
                style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: 'var(--card)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 16 }}>👤</span>
                <span style={{ fontWeight: 600, fontSize: 14, flex: 1 }}>{owner}</span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{patients.length} animal(is)</span>
                <span style={{ color: 'var(--muted)', fontSize: 12 }}>{expanded[owner] ? '▲' : '▼'}</span>
              </button>
              {expanded[owner] && (
                <div style={{ background: 'var(--bg)' }}>
                  {patients.map(p => {
                    const sp = speciesLabel(p);
                    const isSelected = wiz.patientId === p.id;
                    return (
                      <button key={p.id} onClick={() => select(p)}
                        style={{ width: '100%', textAlign: 'left', padding: '11px 18px 11px 36px', background: isSelected ? 'var(--teal-t, #e2f4f3)' : 'transparent',
                          border: 'none', borderTop: '1px solid var(--line)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 18 }}>{sp.emoji}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: isSelected ? 'var(--teal)' : 'var(--ink)' }}>{p.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{p.species || sp.label} {p.breed ? '· ' + p.breed : ''} {p.sex ? '· ' + p.sex : ''}</div>
                        </div>
                        {isSelected && <span style={{ color: 'var(--teal)', fontWeight: 700, fontSize: 13 }}>✓ Selecionado</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ─── PASSO 2: Avaliação Inicial ─────────────────────────── */
  function Step2Avaliacao({ wiz, setW }) {
    const hasHistory = useMemo(() => {
      const hist = JSON.parse(localStorage.getItem(`vt-odonto-hist:${wiz.patientId}`) || '[]');
      return hist.length > 0;
    }, [wiz.patientId]);

    const protocols = useMemo(() => window.vtSedProtocols ? window.vtSedProtocols() : [], []);

    const SCORE_LABELS = ['N/A', '1 — Saudável', '2 — Leve', '3 — Moderada', '4 — Grave', '5 — Muito Grave'];

    const applyProtocol = (proto) => {
      if (!proto) return;
      const p = protocols.find(p => p.nome === proto);
      if (p) setW({ sedTipo: p.nome, sedDose: p.dose || '', sedVia: p.via || '', sedObs: p.obs || '' });
    };

    return (
      <div style={{ padding: 24, flex: 1, overflowY: 'auto' }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 20, color: 'var(--navy, #16395f)' }}>📋 Avaliação Inicial</h2>
        <p style={{ margin: '0 0 20px', color: 'var(--muted)', fontSize: 13 }}>Paciente: <b>{wiz.patientName}</b> — {wiz.ownerName}</p>

        {/* Pontuação de condição */}
        <div className="vt-card vt-sec vt-form" style={{ marginBottom: 16 }}>
          <div className="vt-form-sec">Pontuação de Condição Dentária</div>
          <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '0 0 14px' }}>Deslize para registrar a pontuação. Deixe em N/A para não registrar.</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {SCORE_LABELS.map((lbl, i) => {
              const val = i === 0 ? null : i;
              const active = wiz.condScore === val;
              return (
                <button key={i} onClick={() => setW({ condScore: val })}
                  style={{ padding: '7px 14px', borderRadius: 20, border: `2px solid ${active ? 'var(--teal)' : 'var(--line)'}`,
                    background: active ? 'var(--teal)' : 'var(--card)', color: active ? '#fff' : 'var(--ink)',
                    cursor: 'pointer', fontSize: 13, fontWeight: active ? 700 : 400 }}>
                  {lbl}
                </button>
              );
            })}
          </div>
        </div>

        {/* Último tratamento — só mostra se NÃO tem histórico */}
        {!hasHistory && (
          <div className="vt-card vt-sec vt-form" style={{ marginBottom: 16 }}>
            <div className="vt-form-sec">Último Período de Tratamento</div>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '0 0 12px' }}>Registre a data do último tratamento odontológico conhecido. Este campo não aparece quando o animal já possui gráficos anteriores.</p>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input type="date" className="vt-input" value={wiz.lastTreatment} onChange={e => setW({ lastTreatment: e.target.value })} style={{ width: 180 }} />
              <button className="vt-btn-ghost" style={{ fontSize: 12 }} onClick={() => setW({ lastTreatment: '' })}>Não informado</button>
            </div>
          </div>
        )}
        {hasHistory && (
          <div className="vt-ai-note" style={{ marginBottom: 16, fontSize: 12.5 }}>
            ℹ️ Este animal possui gráficos anteriores. A data do gráfico mais recente será registrada automaticamente.
          </div>
        )}

        {/* Notas de Histórico Clínico */}
        <div className="vt-card vt-sec vt-form" style={{ marginBottom: 16 }}>
          <div className="vt-form-sec">Notas de Histórico Clínico</div>
          <textarea className="vt-input" rows={3} placeholder="Adicione notas pré-tratamento, observações relevantes…"
            value={wiz.clinicalNotes} onChange={e => setW({ clinicalNotes: e.target.value })}
            style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit', fontSize: 13 }} />
        </div>

        {/* Sedação */}
        <div className="vt-card vt-sec vt-form">
          <div className="vt-form-sec">Sedação</div>
          <div className="vt-form-row" style={{ marginBottom: 12 }}>
            <label className="vtf" style={{ width: '48%' }}>
              <span className="vtf-label">Veterinário assistente</span>
              <span className="vtf-inputwrap"><input className="vtf-input" placeholder="Nome do veterinário" value={wiz.sedVet} onChange={e => setW({ sedVet: e.target.value })} /></span>
            </label>
            <label className="vtf" style={{ width: '48%' }}>
              <span className="vtf-label">Protocolo pré-configurado</span>
              <span className="vtf-inputwrap">
                <select className="vtf-input" value={wiz.sedTipo} onChange={e => applyProtocol(e.target.value)}>
                  <option value="">— Selecionar protocolo —</option>
                  {protocols.map(p => <option key={p.id} value={p.nome}>{p.nome} ({p.especie})</option>)}
                </select>
              </span>
            </label>
          </div>
          <div className="vt-form-row" style={{ marginBottom: 12 }}>
            <label className="vtf" style={{ width: '34%' }}>
              <span className="vtf-label">Tipo / Fármaco</span>
              <span className="vtf-inputwrap"><input className="vtf-input" placeholder="Ex: Dexmedetomidina" value={wiz.sedTipo} onChange={e => setW({ sedTipo: e.target.value })} /></span>
            </label>
            <label className="vtf" style={{ width: '28%' }}>
              <span className="vtf-label">Dose</span>
              <span className="vtf-inputwrap"><input className="vtf-input" placeholder="Ex: 0,01 mg/kg" value={wiz.sedDose} onChange={e => setW({ sedDose: e.target.value })} /></span>
            </label>
            <label className="vtf" style={{ width: '18%' }}>
              <span className="vtf-label">Via</span>
              <span className="vtf-inputwrap">
                <select className="vtf-input" value={wiz.sedVia} onChange={e => setW({ sedVia: e.target.value })}>
                  <option value="">—</option>
                  {['IV', 'IM', 'SC', 'VO', 'IN', 'Tópica'].map(v => <option key={v}>{v}</option>)}
                </select>
              </span>
            </label>
          </div>
          <label className="vtf">
            <span className="vtf-label">Observações da sedação</span>
            <span className="vtf-inputwrap"><input className="vtf-input" placeholder="Ex: administrado 15 min antes do procedimento" value={wiz.sedObs} onChange={e => setW({ sedObs: e.target.value })} /></span>
          </label>
        </div>
      </div>
    );
  }

  /* ─── PASSO 3: Gráfico Visual (estilo Pimbury) ─────────────── */
  const DRAW_TOOLS = [
    { id: 'pencil', icon: '✎',  label: 'Lápis' },
    { id: 'erase',  icon: '⌫',  label: 'Borracha' },
    { id: 'circle', icon: '◉',  label: 'Círculo preenchido' },
    { id: 'circle', icon: '○',  label: 'Círculo vazio' },
    { id: 'line',   icon: '╱',  label: 'Linha' },
    { id: 'arrow',  icon: '↗',  label: 'Seta' },
  ];
  const COND_TOOLS = [
    { cond: 'normal',       icon: '▬', label: 'Normal',       color: '#14a8a0' },
    { cond: 'ausente',      icon: '▲', label: 'Ausente',      color: '#14a8a0' },
    { cond: 'abrasao',      icon: '◣', label: 'Abrasão',      color: '#14a8a0' },
    { cond: 'atricao',      icon: '◢', label: 'Atrição',      color: '#14a8a0' },
    { cond: 'gengivite',    icon: '↕', label: 'Gengivite',    color: '#14a8a0' },
    { cond: 'periodontite', icon: '≈', label: 'Periodontite', color: '#14a8a0' },
    { cond: 'massa',        icon: '✦', label: 'Massa',        color: '#14a8a0' },
    { cond: 'reabsorcao',   icon: '⚡', label: 'Reabsorção',  color: '#14a8a0' },
    { cond: 'carie',        icon: '●', label: 'Cárie',        color: '#14a8a0' },
  ];
  const BADGE_TOOLS = [
    { key: 'div',     icon: '|', label: 'Divisor' },
    { key: 'normal',  icon: 'V', label: 'Normal / verificado', cond: 'normal' },
    { key: 'carie',   icon: 'C', label: 'Cárie',  cond: 'carie' },
    { key: 'reab',    icon: 'U', label: 'Reabsorção', cond: 'reabsorcao' },
    { key: 'treated', icon: 'T', label: 'Tratado' },
  ];

  function Step3Odontograma({ wiz, date }) {
    const odoRef = useRef(null);
    const [activeTool, setActiveTool] = useState('pencil');
    const [histPanelOpen, setHistPanelOpen] = useState(false);
    const [histList, setHistList] = useState([]);

    if (!window.OdontogramaModule) return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--muted)' }}>
        <div style={{ width: 32, height: 32, border: '3px solid var(--line)', borderTopColor: 'var(--teal)', borderRadius: '50%', animation: 'vtspin .7s linear infinite' }} />
        Carregando odontograma…
      </div>
    );

    const ctrl = () => odoRef.current;

    const handleTool = (id) => {
      setActiveTool(id);
      if (id === 'erase') { ctrl() && ctrl().clearShapes(); }
      else { ctrl() && ctrl().setTool(id); }
    };

    const handleCond = (condId) => {
      ctrl() && ctrl().applyCondToSelected(condId);
    };

    const handleBadge = (b) => {
      if (b.key === 'treated') { ctrl() && ctrl().markTreated(); }
      else if (b.cond) { ctrl() && ctrl().applyCondToSelected(b.cond); }
    };

    const handleLoadPrev = () => {
      const h = ctrl() ? ctrl().getHistory() : [];
      setHistList(h);
      setHistPanelOpen(true);
    };

    const formatDate = (d) => {
      if (!d) return '';
      const parts = d.split('-');
      if (parts.length !== 3) return d;
      const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
      return `${parts[2]} ${months[parseInt(parts[1], 10) - 1]} ${parts[0]}`;
    };

    /* ── botão do toolbar ── */
    const TbBtn = ({ label, icon, onClick }) => (
      <button onClick={onClick} title={label}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 11px', border: '1px solid #d1d9e0', borderRadius: 8,
          background: '#fff', fontSize: 12, color: '#344054', cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap' }}>
        <span style={{ fontSize: 14 }}>{icon}</span>{label}
      </button>
    );

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f4f6f8' }}>

        {/* ── Header Pimbury ── */}
        <div style={{ background: '#fff', borderBottom: '1px solid #e0e5ea', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 800, fontSize: 17, color: '#16395f', marginRight: 4 }}>Gráfico Visual</span>
          <span style={{ color: '#94a3b8', fontSize: 13, marginRight: 12, cursor: 'pointer' }} title="Ajuda">(?)</span>

          <TbBtn icon="✕" label="Limpar Gráfico" onClick={() => ctrl() && ctrl().clearAll()} />
          <TbBtn icon="↩" label="Desfazer" onClick={() => ctrl() && ctrl().undoShape()} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 11px', border: '1px solid #d1d9e0', borderRadius: 8, background: '#fff', fontSize: 12, color: '#344054' }}>
            📅 {formatDate(date)}
          </div>
          <TbBtn icon="📋" label="Gráficos Anteriores" onClick={handleLoadPrev} />
          <div style={{ flex: 1 }} />
          <TbBtn icon="➕" label="Adicionar" onClick={() => ctrl() && ctrl().novoExame()} />
          <TbBtn icon="✕" label="eFechar" onClick={() => {}} />
        </div>

        {/* ── Action buttons ── */}
        <div style={{ padding: '10px 20px', display: 'flex', gap: 10, flexShrink: 0 }}>
          <button onClick={handleLoadPrev}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, border: '2px solid var(--teal)', background: 'var(--teal)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            ＋ LOAD PREVIOUS
          </button>
          <button onClick={() => window.vtToast && window.vtToast('Visão incisal em breve.', 'ok')}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, border: '2px solid var(--teal)', background: 'var(--teal)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            ＋ INCISOR VIEW
          </button>
        </div>

        {/* ── Chart ── */}
        <div style={{ flex: 1, overflow: 'auto', padding: '0 20px' }}>
          <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,.09)', overflow: 'hidden', minHeight: 300 }}>
            <window.OdontogramaModule
              initialPatientId={wiz.patientId}
              slim={true}
              moduleRef={odoRef}
            />
          </div>
        </div>

        {/* ── Bottom Tool Palette (3 grupos) ── */}
        <div style={{ flexShrink: 0, background: '#fff', borderTop: '1px solid #e0e5ea', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>

          {/* Grupo 1: ferramentas de desenho */}
          <div style={{ display: 'flex', gap: 4, padding: '6px 10px', background: '#f0f2f5', borderRadius: 12 }}>
            {DRAW_TOOLS.map((t, i) => (
              <button key={i} onClick={() => handleTool(t.id)} title={t.label}
                style={{ width: 36, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: activeTool === t.id ? '#16395f' : 'transparent', color: activeTool === t.id ? '#fff' : '#344054' }}>
                {t.icon}
              </button>
            ))}
          </div>

          <div style={{ width: 1, height: 36, background: '#e0e5ea' }} />

          {/* Grupo 2: condições dentárias */}
          <div style={{ display: 'flex', gap: 4, padding: '6px 10px', background: '#f0f2f5', borderRadius: 12 }}>
            {COND_TOOLS.map((t, i) => (
              <button key={i} onClick={() => handleCond(t.cond)} title={t.label}
                style={{ width: 36, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'transparent', color: 'var(--teal)' }}>
                {t.icon}
              </button>
            ))}
          </div>

          <div style={{ width: 1, height: 36, background: '#e0e5ea' }} />

          {/* Grupo 3: badges de status */}
          <div style={{ display: 'flex', gap: 6, padding: '6px 10px', background: '#f0f2f5', borderRadius: 12 }}>
            {BADGE_TOOLS.map((t, i) => (
              <button key={i} onClick={() => handleBadge(t)} title={t.label}
                style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: '#16395f', color: '#fff' }}>
                {t.icon}
              </button>
            ))}
          </div>
        </div>

        {/* ── Painel de histórico (load previous) ── */}
        {histPanelOpen && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => setHistPanelOpen(false)}>
            <div style={{ background: '#fff', borderRadius: 16, padding: 24, minWidth: 360, maxWidth: 480, maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,.2)' }}
              onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 16, color: '#16395f' }}>📋 Gráficos Anteriores</h3>
                <button onClick={() => setHistPanelOpen(false)} style={{ border: 'none', background: 'none', fontSize: 18, cursor: 'pointer', color: '#94a3b8' }}>✕</button>
              </div>
              {histList.length === 0
                ? <p style={{ color: '#94a3b8', fontSize: 13 }}>Nenhum gráfico anterior registrado para este paciente.</p>
                : histList.map((h, i) => (
                  <div key={i} style={{ border: '1px solid #e0e5ea', borderRadius: 10, padding: '12px 14px', marginBottom: 8, cursor: 'pointer' }}
                    onClick={() => { ctrl() && ctrl().loadExam(h); setHistPanelOpen(false); }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#16395f' }}>{h.date} — {h.speciesLabel}</div>
                    <div style={{ fontSize: 12, color: '#667085', marginTop: 3 }}>{h.summary}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{h.anorm} anormal · {h.tratados} tratados · Vet: {h.vet}</div>
                  </div>
                ))
              }
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ─── PASSO 4: Tratamentos & Anomalias ─────────────────── */
  function Step4Tratamentos({ wiz, setW }) {
    const flags = window.PR ? window.PR.odontoFlags : [
      'Placa', 'Cálculo', 'Gengivite', 'Periodontite', 'Mobilidade', 'Furca',
      'Fraturas', 'Ausências dentárias', 'Persistência decídua', 'Lesões',
      'Reabsorções', 'Maloclusões', 'Diastemas',
    ];

    const toggleFlag = (f) => {
      const cur = wiz.anomalias[f] || { checked: false, note: '' };
      setW({ anomalias: { ...wiz.anomalias, [f]: { ...cur, checked: !cur.checked } } });
    };
    const setNote = (f, note) => {
      const cur = wiz.anomalias[f] || { checked: true, note: '' };
      setW({ anomalias: { ...wiz.anomalias, [f]: { ...cur, note } } });
    };

    const checked = flags.filter(f => wiz.anomalias[f] && wiz.anomalias[f].checked);

    return (
      <div style={{ padding: 24, flex: 1, overflowY: 'auto' }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 20, color: 'var(--navy, #16395f)' }}>✅ Tratamentos & Anomalias</h2>
        <p style={{ margin: '0 0 18px', color: 'var(--muted)', fontSize: 13 }}>Selecione as anomalias identificadas. Adicione notas em cada item se necessário.</p>

        {checked.length > 0 && (
          <div className="vt-ai-note" style={{ marginBottom: 16, fontSize: 12.5 }}>
            {checked.length} anomalia(s) selecionada(s): {checked.join(' · ')}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 640 }}>
          {flags.map(f => {
            const entry = wiz.anomalias[f] || { checked: false, note: '' };
            return (
              <div key={f} style={{ border: `1px solid ${entry.checked ? 'var(--teal)' : 'var(--line)'}`, borderRadius: 10,
                background: entry.checked ? 'var(--teal-t, #e2f4f3)' : 'var(--card)', overflow: 'hidden', transition: 'all .15s' }}>
                <button onClick={() => toggleFlag(f)}
                  style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${entry.checked ? 'var(--teal)' : 'var(--muted)'}`,
                    background: entry.checked ? 'var(--teal)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, flexShrink: 0 }}>
                    {entry.checked ? '✓' : ''}
                  </div>
                  <span style={{ fontWeight: entry.checked ? 600 : 400, fontSize: 14, color: entry.checked ? 'var(--teal)' : 'var(--ink)' }}>{f}</span>
                </button>
                {entry.checked && (
                  <div style={{ padding: '0 16px 12px' }}>
                    <input className="vt-input" placeholder={`Notas sobre ${f}…`} value={entry.note}
                      onChange={e => setNote(f, e.target.value)}
                      style={{ width: '100%', fontSize: 13 }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Observações gerais</div>
          <textarea className="vt-input" rows={3} placeholder="Notas gerais sobre tratamento realizado…"
            value={wiz.anomaliasObs} onChange={e => setW({ anomaliasObs: e.target.value })}
            style={{ width: '100%', maxWidth: 640, resize: 'vertical', fontFamily: 'inherit', fontSize: 13 }} />
        </div>
      </div>
    );
  }

  /* ─── PASSO 5: Notas & Prévia PDF multi-página ──────────── */
  function Step5Notas({ wiz, setW }) {
    const checkedAnomalias = Object.entries(wiz.anomalias || {}).filter(([, v]) => v && v.checked);
    const clinic = window.vtClinic ? window.vtClinic() : {};
    const clinicName  = clinic.name     || 'Dentalis Vet';
    const clinicAddr  = clinic.address  || '';
    const clinicPhone = clinic.phone || clinic.tel || '';
    const clinicEmail = clinic.email    || '';
    const clinicInsta = clinic.instagram || clinic.social || '';
    const clinicSite  = clinic.site || clinic.website || '';
    const clinicLogo  = clinic.logo     || '';
    const clinicVet   = clinic.vetName  || wiz.sedVet || 'M.V. Veterinário';
    const clinicCrmv  = clinic.crmv     || '';
    const images = wiz.images || [];

    const loadPrev = () => {
      if (!wiz.patientId) return;
      const hist = JSON.parse(localStorage.getItem(`vt-odonto-hist:${wiz.patientId}`) || '[]');
      if (!hist.length) { window.vtToast && window.vtToast('Nenhum exame anterior encontrado.', 'err'); return; }
      setW({ chartNotes: hist[0].chartNotes || wiz.chartNotes });
      window.vtToast && window.vtToast('Anotações do exame anterior carregadas.', 'ok');
    };

    const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const fmtDatePimbury = (iso) => {
      if (!iso) return '';
      const [y, m, d] = iso.split('-');
      return `${parseInt(d, 10)} ${MESES[parseInt(m,10)-1]} ${y}`;
    };
    const fmtDateBR = (iso) => {
      if (!iso) return '';
      const [y, m, d] = iso.split('-');
      return `${d}/${m}/${y}`;
    };

    const histNum = (() => {
      if (!wiz.patientId) return '---';
      const hist = JSON.parse(localStorage.getItem(`vt-odonto-hist:${wiz.patientId}`) || '[]');
      return String(hist.length + 1).padStart(3, '0');
    })();

    const CB_SLOTS_LOCAL = ['Nenhum', '1 Semana', '2 Meses', '3 Meses', '6 Meses', '9 Meses', '1 Ano', '18 Meses', '24 Meses'];
    const isHorse = (wiz.species || '').toLowerCase().includes('equi') || (wiz.species || '').toLowerCase().includes('caval');

    /* ── Componentes visuais do PDF ── */
    const Gauge = ({ pct = 0, label = '', size = 52 }) => {
      const r = (size - 6) / 2;
      const circ = 2 * Math.PI * r;
      const offset = circ * (1 - pct / 100);
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e0e0e0" strokeWidth={4} />
            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#14a8a0" strokeWidth={4}
              strokeDasharray={circ} strokeDashoffset={offset}
              strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} />
            <text x={size/2} y={size/2 + 4} textAnchor="middle" fontSize={10} fontWeight="700" fill="#333">{Math.round(pct)}%</text>
          </svg>
          {label && <span style={{ fontSize: 9, color: '#555', textAlign: 'center', maxWidth: 64 }}>{label}</span>}
        </div>
      );
    };
    const condPct = wiz.condScore ? (wiz.condScore / 5) * 100 : 0;

    const SecDiv = ({ label }) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '10px 0 6px' }}>
        <div style={{ flex: 1, height: 1, background: '#d0d0d0' }} />
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: '#888', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{label}</span>
        <div style={{ flex: 1, height: 1, background: '#d0d0d0' }} />
      </div>
    );

    const PCell = ({ label, value, span = false }) => (
      <div style={{ gridColumn: span ? '1/-1' : undefined, padding: '3px 0', borderBottom: '1px solid #eee', fontSize: 10 }}>
        <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .8, color: '#999', display: 'block' }}>{label}</span>
        <span style={{ fontSize: 11, color: '#222', fontWeight: 500 }}>{value || '—'}</span>
      </div>
    );

    /* ── Cabeçalho reutilizável para cada página A4 ── */
    const PdfHeader = ({ pageNum }) => (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, paddingBottom: 12, borderBottom: '2px solid #14a8a0', marginBottom: 12 }}>
        <div style={{ flexShrink: 0, width: 60, height: 60 }}>
          {clinicLogo
            ? <img src={clinicLogo} alt="logo" style={{ width: 60, height: 60, objectFit: 'contain', borderRadius: 6 }} />
            : <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#14a8a0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: '#fff' }}>🦷</div>
          }
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 900, fontSize: 14, letterSpacing: .3, textTransform: 'uppercase', color: '#16395f', marginBottom: 2 }}>{clinicName}</div>
          {clinicAddr  && <div style={{ fontSize: 9, color: '#555' }}>{clinicAddr}</div>}
          <div style={{ fontSize: 9, color: '#555' }}>
            {clinicPhone && <span>Tel: {clinicPhone}  </span>}
            {clinicEmail && <span>{clinicEmail}  </span>}
            {clinicInsta && <span>@{clinicInsta.replace('@', '')}  </span>}
            {clinicSite  && <span>{clinicSite}</span>}
          </div>
        </div>
        <div style={{ flexShrink: 0, textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: '#666' }}>
            <span style={{ fontWeight: 700, color: '#16395f', fontSize: 11 }}>#{histNum}</span>
            {'  '}<span style={{ fontSize: 9 }}>{fmtDatePimbury(wiz.date)}</span>
          </div>
          <div style={{ marginTop: 6, fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 11, color: '#444', lineHeight: 1.2 }}>
            {clinicVet}<br />
            <span style={{ fontSize: 9, fontStyle: 'normal', color: '#888' }}>{clinicCrmv || 'Odontologia Veterinária'}</span>
          </div>
          {pageNum > 1 && <div style={{ fontSize: 9, color: '#aaa', marginTop: 4 }}>Página {pageNum}</div>}
        </div>
      </div>
    );

    /* ── Rodapé reutilizável ── */
    const PdfFooter = () => (
      <div style={{ borderTop: '1px solid #ddd', marginTop: 16, paddingTop: 7, display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#aaa' }}>
        <span>{clinicName} · {clinicPhone}</span>
        <span>Laudo {histNum} · {fmtDateBR(wiz.date)} · VetTooth Pro</span>
      </div>
    );

    /* ── Estilo da "folha A4" ── */
    const pageStyle = {
      background: '#fff',
      maxWidth: 794,
      margin: '0 auto 24px',
      padding: '28px 32px',
      fontFamily: 'Arial, sans-serif',
      color: '#111',
      fontSize: 11,
      boxShadow: '0 2px 20px rgba(0,0,0,.25)',
      lineHeight: 1.4,
      minHeight: 1000,
    };

    /* ── Imagens por categoria para páginas 3+ ── */
    const imgsByGroup = (() => {
      const groups = [];
      const CATS_ORDER = ['pac-rosto','pac-corpo','arc-100-400','arc-200-300','incisivos','achados','rx-inc','rx-can','rx-pm100','rx-pm200','rx-pm300','rx-pm400','rx-mol100','rx-mol200','rx-mol300','rx-mol400','rx-achados'];
      let currentGroup = null;
      let currentCatId = null;
      CATS_ORDER.forEach(catId => {
        const catImgs = images.filter(img => img.category === catId);
        if (!catImgs.length) return;
        const catDef = IMG_CATS.find(c => c.id === catId);
        if (!currentGroup || catDef.group !== currentCatId) {
          currentGroup = { groupLabel: catDef.group, cats: [] };
          groups.push(currentGroup);
          currentCatId = catDef.group;
        }
        currentGroup.cats.push({ catId, catLabel: catDef.label, imgs: catImgs });
      });
      return groups;
    })();

    return (
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Coluna esquerda: Anotações ── */}
        <div style={{ width: 280, minWidth: 200, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--line)', background: 'var(--bg)', padding: '14px 12px', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--navy, #16395f)' }}>Anotações Clínicas</span>
            <button onClick={loadPrev}
              style={{ background: 'var(--teal, #14a8a0)', border: 'none', color: '#fff', borderRadius: 20, padding: '4px 10px', fontSize: 10, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              ↩ Carregar
            </button>
          </div>
          <textarea
            value={wiz.chartNotes}
            onChange={e => setW({ chartNotes: e.target.value })}
            placeholder="Achados clínicos, observações por região dentária, recomendações pós-procedimento…"
            style={{ flex: 1, border: '1px solid var(--line)', borderRadius: 10, padding: '10px 12px', fontSize: 12, fontFamily: 'inherit', resize: 'none', outline: 'none', background: 'var(--card)', color: 'var(--text)', lineHeight: 1.7 }}
          />
          {images.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 1 }}>{images.length} imagens adicionadas</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {images.slice(0, 12).map((img, i) => (
                  <img key={i} src={img.url} alt={img.label} title={img.label}
                    style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, border: '1.5px solid var(--line)' }} />
                ))}
                {images.length > 12 && <div style={{ width: 44, height: 44, borderRadius: 6, background: 'var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>+{images.length - 12}</div>}
              </div>
            </div>
          )}
        </div>

        {/* ── Coluna direita: Prévia PDF multi-página ── */}
        <div style={{ flex: 1, overflowY: 'auto', background: '#c0c0c0', padding: '20px' }}>

          {/* ════════════════════════════════════════
              FOLHA 1 — Paciente · Avaliação · Odontograma · Faturamento
              ════════════════════════════════════════ */}
          <div style={pageStyle}>
            <PdfHeader pageNum={1} />

            {/* Dados do Paciente */}
            <SecDiv label="Dados do Paciente" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px', marginBottom: 8 }}>
              {/* Esquerda: paciente */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 10px' }}>
                <PCell label="Paciente" value={wiz.patientName} />
                <PCell label="Espécie" value={wiz.species} />
                {wiz.breed && <PCell label="Raça" value={wiz.breed} />}
                {wiz.age   && <PCell label="Idade" value={wiz.age} />}
                {wiz.sex   && <PCell label="Sexo" value={wiz.sex} />}
                {wiz.color && <PCell label="Cor / Pelagem" value={wiz.color} />}
                {wiz.weight && <PCell label="Peso" value={wiz.weight + ' kg'} />}
                {wiz.height && <PCell label="Altura" value={wiz.height} />}
              </div>
              {/* Direita: tutor */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 10px', borderLeft: '1px solid #eee', paddingLeft: 12 }}>
                <SecDiv label="Tutor / Responsável" />
                <PCell label="Nome" value={wiz.ownerName} span />
                {wiz.ownerPhone   && <PCell label="Telefone" value={wiz.ownerPhone} />}
                {wiz.ownerEmail   && <PCell label="E-mail" value={wiz.ownerEmail} />}
                {wiz.ownerAddress && <PCell label="Endereço" value={wiz.ownerAddress} span />}
              </div>
            </div>

            {/* Propriedade (equinos) */}
            {isHorse && (wiz.propertyName || wiz.propertyCity || wiz.propertyPhone) && (
              <>
                <SecDiv label="Propriedade / Haras" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2px 10px', marginBottom: 8 }}>
                  {wiz.propertyName  && <PCell label="Nome da Propriedade" value={wiz.propertyName} />}
                  {wiz.propertyCity  && <PCell label="Cidade" value={wiz.propertyCity} />}
                  {wiz.propertyPhone && <PCell label="Telefone" value={wiz.propertyPhone} />}
                </div>
              </>
            )}

            {/* Passo 2 — Avaliação e Sedação */}
            <SecDiv label="Avaliação Clínica — Passo 2" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px', marginBottom: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 10px' }}>
                <PCell label="Veterinário Responsável" value={clinicVet + (clinicCrmv ? ' · ' + clinicCrmv : '')} span />
                <PCell label="Data do Exame" value={fmtDateBR(wiz.date)} />
                {wiz.condScore !== null && wiz.condScore !== undefined && <PCell label="Score Condição Dentária" value={`${wiz.condScore}/5`} />}
                {wiz.lastTreatment && <PCell label="Último Tratamento" value={fmtDateBR(wiz.lastTreatment)} />}
                {wiz.clinicalNotes && <PCell label="Notas Clínicas" value={wiz.clinicalNotes} span />}
              </div>
              <div style={{ borderLeft: '1px solid #eee', paddingLeft: 12 }}>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .8, color: '#999', marginBottom: 4 }}>Sedação</div>
                {wiz.sedTipo ? (
                  <div style={{ fontSize: 10, lineHeight: 1.8 }}>
                    <div><b>Tipo:</b> {wiz.sedTipo}</div>
                    {wiz.sedVia  && <div><b>Via:</b> {wiz.sedVia}</div>}
                    {wiz.sedDose && <div><b>Dose:</b> {wiz.sedDose}</div>}
                    {wiz.sedVet  && <div><b>Vet. Anest.:</b> {wiz.sedVet}</div>}
                    {wiz.sedObs  && <div style={{ color: '#777', fontStyle: 'italic' }}>{wiz.sedObs}</div>}
                  </div>
                ) : <div style={{ fontSize: 10, color: '#aaa' }}>Não informada</div>}
              </div>
            </div>

            {/* Examinação Pré-Atendimento (Gauges) */}
            {wiz.condScore && (
              <div style={{ border: '1px solid #ddd', borderRadius: 4, padding: '8px 12px', marginBottom: 8, background: '#fafafa' }}>
                <div style={{ textAlign: 'center', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#555', marginBottom: 8 }}>Examinação Pré-Atendimento</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2px 1fr' }}>
                  <div>
                    <div style={{ textAlign: 'center', fontSize: 9, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Direita</div>
                    <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                      <Gauge pct={condPct} label="% Oclusão" />
                      <Gauge pct={Math.min(condPct * .9, 100)} label="Ângulo Molares" />
                      <Gauge pct={Math.min(condPct * .8, 100)} label="Excursão Lateral" />
                    </div>
                  </div>
                  <div style={{ background: '#ddd', width: 1, margin: '0 8px' }} />
                  <div>
                    <div style={{ textAlign: 'center', fontSize: 9, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Esquerda</div>
                    <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                      <Gauge pct={Math.min(condPct * .8, 100)} label="Excursão Lateral" />
                      <Gauge pct={Math.min(condPct * .9, 100)} label="Ângulo Molares" />
                      <Gauge pct={condPct} label="% Oclusão" />
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'center', marginTop: 6, fontSize: 9, color: '#777' }}>Movimento Rostral / Caudal — Ângulo dos Incisores</div>
              </div>
            )}

            {/* Passo 3 — Gráfico Odontológico */}
            <SecDiv label="Gráfico Odontológico — Passo 3" />
            <div style={{ border: '1px dashed #ccc', borderRadius: 4, padding: '14px 12px', marginBottom: 8, background: '#f9f9f9', textAlign: 'center', color: '#bbb', fontSize: 11, minHeight: 120 }}>
              [ Gráfico odontológico do Passo 3 será incorporado aqui no PDF exportado ]
            </div>

            {/* Passo 6 — Faturamento e Próximo Retorno */}
            {(wiz.charges || wiz.callout || wiz.callbackDays > 0) && (
              <>
                <SecDiv label="Faturamento e Próximo Retorno — Passo 6" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px', marginBottom: 8 }}>
                  <div style={{ fontSize: 10 }}>
                    {wiz.charges && <div style={{ marginBottom: 3 }}><b>Cobranças de Tratamento:</b> R$ {parseFloat(wiz.charges || 0).toFixed(2)}</div>}
                    {wiz.callout && <div style={{ marginBottom: 3 }}><b>Chamada / Visita:</b> R$ {parseFloat(wiz.callout || 0).toFixed(2)}</div>}
                    {(wiz.charges || wiz.callout) && (
                      <div style={{ borderTop: '1px solid #eee', paddingTop: 4, marginTop: 4, fontWeight: 700, fontSize: 12 }}>
                        Total: R$ {((parseFloat(wiz.charges || 0) + parseFloat(wiz.callout || 0)) * (1 + (parseFloat(wiz.taxRate || 0) / 100))).toFixed(2)}
                      </div>
                    )}
                    {wiz.paid && <div style={{ color: '#14a8a0', fontWeight: 700 }}>✔ PAGO — {wiz.paidType}</div>}
                    {wiz.refNum && <div style={{ color: '#888', fontSize: 9 }}>Ref: {wiz.refNum}</div>}
                  </div>
                  <div style={{ borderLeft: '1px solid #eee', paddingLeft: 12, fontSize: 10 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .8, color: '#999', marginBottom: 4 }}>Próximo Retorno</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#16395f' }}>{CB_SLOTS_LOCAL[wiz.callbackDays] || 'Nenhum'}</div>
                    {wiz.callbackObs && <div style={{ fontSize: 10, color: '#777', marginTop: 4 }}>{wiz.callbackObs}</div>}
                  </div>
                </div>
              </>
            )}

            <PdfFooter />
          </div>

          {/* ════════════════════════════════════════
              FOLHA 2 — Achados (esq.) · Anotações (dir.)
              ════════════════════════════════════════ */}
          <div style={pageStyle}>
            <PdfHeader pageNum={2} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', gap: '0 20px', flex: 1 }}>

              {/* Esquerda: Passo 4 — Achados/Anomalias */}
              <div>
                <SecDiv label="Achados e Anomalias — Passo 4" />
                {checkedAnomalias.length === 0
                  ? <div style={{ fontSize: 10, color: '#aaa', fontStyle: 'italic' }}>Nenhum achado registrado no Passo 4.</div>
                  : (
                    <ul style={{ margin: 0, paddingLeft: 14, fontSize: 10, lineHeight: 2 }}>
                      {checkedAnomalias.map(([f, v]) => (
                        <li key={f}>
                          <b>{f}</b>
                          {v.note ? <span style={{ color: '#555' }}>: {v.note}</span> : ''}
                        </li>
                      ))}
                    </ul>
                  )
                }
                {wiz.anomaliasObs && (
                  <div style={{ marginTop: 10, padding: '6px 10px', background: '#f9f9f9', border: '1px solid #eee', borderRadius: 4, fontSize: 10, color: '#555', fontStyle: 'italic' }}>
                    {wiz.anomaliasObs}
                  </div>
                )}
              </div>

              {/* Divisor */}
              <div style={{ background: '#ddd' }} />

              {/* Direita: Passo 5 — Anotações */}
              <div>
                <SecDiv label="Anotações Clínicas — Passo 5" />
                {wiz.chartNotes
                  ? <div style={{ fontSize: 10, lineHeight: 1.9, whiteSpace: 'pre-wrap', color: '#222' }}>{wiz.chartNotes}</div>
                  : <div style={{ fontSize: 10, color: '#aaa', fontStyle: 'italic' }}>Nenhuma anotação registrada no Passo 5.</div>
                }
              </div>
            </div>
            <PdfFooter />
          </div>

          {/* ════════════════════════════════════════
              FOLHAS 3+ — Imagens por categoria
              ════════════════════════════════════════ */}
          {imgsByGroup.map((grp, gIdx) => (
            <div key={gIdx} style={pageStyle}>
              <PdfHeader pageNum={3 + gIdx} />
              <SecDiv label={grp.groupLabel} />
              {grp.cats.map((cat) => (
                <div key={cat.catId} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#16395f', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid #eee' }}>
                    {cat.catLabel}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    {cat.imgs.map((img, iIdx) => (
                      <div key={iIdx} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <div style={{ position: 'relative', background: '#000', borderRadius: 6, overflow: 'hidden' }}>
                          <img src={img.url} alt={img.label}
                            style={{ width: '100%', height: 130, objectFit: 'contain', display: 'block' }} />
                          {/* Marcadores sobre a imagem */}
                          {(img.markers || []).map((m, mIdx) => (
                            <div key={mIdx} style={{
                              position: 'absolute', left: m.x + '%', top: m.y + '%',
                              transform: 'translate(-50%, -50%)',
                              width: 18, height: 18, borderRadius: '50%',
                              background: '#e74c3c', color: '#fff',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 9, fontWeight: 900, border: '1.5px solid #fff',
                              boxShadow: '0 1px 3px rgba(0,0,0,.5)'
                            }}>{m.letter}</div>
                          ))}
                        </div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: '#333' }}>{img.label}</div>
                        {img.description && <div style={{ fontSize: 9, color: '#666', lineHeight: 1.5 }}>{img.description}</div>}
                        {(img.markers || []).length > 0 && (
                          <div style={{ fontSize: 9 }}>
                            {img.markers.map((m, mIdx) => (
                              <div key={mIdx} style={{ display: 'flex', gap: 4, lineHeight: 1.6 }}>
                                <span style={{ fontWeight: 900, color: '#e74c3c', flexShrink: 0 }}>{m.letter}.</span>
                                <span style={{ color: '#555' }}>{m.note || '—'}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <PdfFooter />
            </div>
          ))}

          {/* Mensagem quando não há imagens */}
          {images.length === 0 && (
            <div style={{ ...pageStyle, minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10, color: '#bbb' }}>
              <div style={{ fontSize: 32 }}>📷</div>
              <div style={{ fontSize: 12 }}>As páginas de imagens aparecerão aqui conforme você adiciona fotos pelo botão <b>📷 Adicionar</b> no topo</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ─── PASSO 6: Cobrança & Notificações ────────────────────── */
  const CB_SLOTS = ['Nenhum', '1 Semana', '2 Meses', '3 Meses', '6 Meses', '9 Meses', '1 Ano', '18 Meses', '24 Meses'];

  function Step6Faturamento({ wiz, setW, onSave, onClose, onPrev }) {
    const charges = Number(wiz.charges) || 0;
    const callout = Number(wiz.callout) || 0;
    const tax     = Number(wiz.taxRate) || 0;
    const total   = (charges + callout) * (1 + tax / 100);
    const refNum  = wiz.refNum || '';

    /* ── campo de valor com reset ── */
    const MoneyField = ({ label, desc, fieldKey }) => (
      <div style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', marginBottom: 14, boxShadow: '0 1px 4px rgba(0,0,0,.07)' }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy, #16395f)', marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>{desc}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy, #16395f)', flexShrink: 0 }}>R$</span>
          <input type="number" min="0" step="0.01" placeholder="0.00" value={wiz[fieldKey]}
            onChange={e => setW({ [fieldKey]: e.target.value })}
            style={{ flex: 1, border: '1.5px solid var(--line)', borderRadius: 20, padding: '8px 14px', fontSize: 15, fontFamily: 'inherit', textAlign: 'right', outline: 'none' }} />
          <button onClick={() => setW({ [fieldKey]: '' })}
            style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: 'var(--teal)', color: '#fff', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>↺</button>
        </div>
      </div>
    );

    /* ── slider de retorno ── */
    const sliderIdx = typeof wiz.callbackDays === 'number' ? wiz.callbackDays : 0;

    return (
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* coluna esquerda — conteúdo */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', background: 'var(--bg)' }}>
          <h2 style={{ margin: '0 0 18px', fontSize: 18, color: 'var(--navy, #16395f)', fontWeight: 700 }}>
            Cobrança e Notificações de Ligar de Volta
          </h2>

          <MoneyField label="Cobranças de Tratamento"
            desc="Cobranças total dos tratamentos no gráfico. Digite o valor a descontar."
            fieldKey="charges" />

          <MoneyField label="Chamar Cobrança"
            desc="Se taxa normal é definido, este será exibido. Digite o valor a descontar."
            fieldKey="callout" />

          {/* Total + Pago */}
          <div style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', marginBottom: 14, boxShadow: '0 1px 4px rgba(0,0,0,.07)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy, #16395f)' }}>Total</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Total cobrança ao cliente. Imposto sera adicionado automaticamente se selecionado.</div>
              </div>
              <span style={{ fontWeight: 800, fontSize: 22, color: 'var(--navy, #16395f)' }}>
                {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>Pago?</span>
                {wiz.paid && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--teal)', fontSize: 13 }}>
                    <span style={{ fontSize: 16 }}>✔</span>
                    <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{refNum}</span>
                  </span>
                )}
              </div>
              {/* iOS-style toggle */}
              <button onClick={() => {
                const newPaid = !wiz.paid;
                const ref = newPaid ? (Date.now().toString().slice(-11)) : '';
                setW({ paid: newPaid, refNum: ref });
              }} style={{ width: 52, height: 30, borderRadius: 15, border: 'none', cursor: 'pointer', position: 'relative', padding: 0, flexShrink: 0,
                background: wiz.paid ? 'var(--teal)' : '#ccc', transition: 'background .2s' }}>
                <div style={{ position: 'absolute', top: 3, left: wiz.paid ? 24 : 3, width: 24, height: 24, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.3)', transition: 'left .2s' }} />
              </button>
            </div>
            {wiz.paid && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
                {PAID_TYPES.map(t => (
                  <button key={t} onClick={() => setW({ paidType: t })}
                    style={{ padding: '5px 13px', borderRadius: 20, border: `2px solid ${wiz.paidType === t ? 'var(--teal)' : 'var(--line)'}`,
                      background: wiz.paidType === t ? 'var(--teal)' : 'transparent', color: wiz.paidType === t ? '#fff' : 'var(--ink)',
                      cursor: 'pointer', fontSize: 13 }}>{t}</button>
                ))}
              </div>
            )}
          </div>

          {/* Slider de retorno */}
          <div style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,.07)' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy, #16395f)', marginBottom: 4 }}>Notificação de ligar de volta</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 20 }}>Período selecionado: <b style={{ color: 'var(--teal)' }}>{CB_SLOTS[sliderIdx]}</b></div>

            {/* labels acima do slider */}
            <div style={{ position: 'relative', paddingBottom: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                {CB_SLOTS.map((l, i) => (
                  <span key={i} style={{ fontSize: 10, color: i === sliderIdx ? 'var(--teal)' : 'var(--muted)', fontWeight: i === sliderIdx ? 700 : 400,
                    flex: 1, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l}</span>
                ))}
              </div>
              <input type="range" min="0" max={CB_SLOTS.length - 1} step="1" value={sliderIdx}
                onChange={e => setW({ callbackDays: Number(e.target.value) })}
                style={{ width: '100%', accentColor: 'var(--teal)', height: 6, cursor: 'pointer' }} />
            </div>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Observações de retorno</span>
              <input className="vt-input" placeholder="Ex: retornar para avaliação de cicatrização"
                value={wiz.callbackObs} onChange={e => setW({ callbackObs: e.target.value })}
                style={{ fontSize: 13 }} />
            </label>
          </div>
        </div>

        {/* coluna direita — ações */}
        <div style={{ width: 190, flexShrink: 0, background: 'var(--card)', borderLeft: '1px solid var(--line)', padding: '24px 14px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
          <button onClick={() => window.vtToast && window.vtToast('Prévia do gráfico em breve.', 'ok')}
            style={{ padding: '14px 10px', borderRadius: 12, border: 'none', background: 'var(--teal)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', lineHeight: 1.3 }}>
            Visualização do Gráfico
          </button>
          <button onClick={() => { window._vtSetActive && window._vtSetActive('agenda'); onClose && onClose(); }}
            style={{ padding: '14px 10px', borderRadius: 12, border: 'none', background: 'var(--teal)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', lineHeight: 1.3 }}>
            Marcar Consulta
          </button>
          <button onClick={() => {
            if (!wiz.patientId) { window.vtToast && window.vtToast('Selecione um paciente.', 'err'); return; }
            const key = `vt-odonto-draft:${wiz.patientId}`;
            localStorage.setItem(key, JSON.stringify({ ...wiz, date: wiz.date, _draft: true }));
            window.vtToast && window.vtToast('Rascunho salvo.', 'ok');
          }} style={{ padding: '14px 10px', borderRadius: 12, border: 'none', background: 'var(--navy, #16395f)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', lineHeight: 1.3 }}>
            Save Draft
          </button>
          <button onClick={onSave}
            style={{ padding: '14px 10px', borderRadius: 12, border: 'none', background: 'var(--navy, #16395f)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', lineHeight: 1.3 }}>
            Gráfico Salvar
          </button>
          <button onClick={onSave}
            style={{ padding: '14px 10px', borderRadius: 12, border: 'none', background: '#27ae60', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', lineHeight: 1.3, marginTop: 8 }}>
            Enviar
          </button>

          <div style={{ flex: 1 }} />
          <button onClick={onPrev}
            style={{ padding: '10px', borderRadius: 12, border: '1.5px solid var(--line)', background: 'transparent', color: 'var(--muted)', fontSize: 13, cursor: 'pointer' }}>
            ← Voltar
          </button>
        </div>
      </div>
    );
  }

  /* ─── Componente Principal ────────────────────────────────── */
  function OdontogramaWizard({ onClose }) {
    const today = new Date().toISOString().slice(0, 10);
    const [step, setStep] = useState(1);
    const [date, setDate] = useState(today);
    const [showImgModal, setShowImgModal] = useState(false);
    const [wiz, setWizRaw] = useState({
      patientId: null, patientName: '', ownerName: '', species: 'Cão',
      breed: '', age: '', sex: '', color: '', weight: '', height: '',
      ownerPhone: '', ownerEmail: '', ownerAddress: '',
      propertyName: '', propertyCity: '', propertyPhone: '',
      condScore: null, lastTreatment: '', clinicalNotes: '',
      sedVet: '', sedTipo: '', sedDose: '', sedVia: '', sedObs: '',
      anomalias: {}, anomaliasObs: '', chartNotes: '',
      charges: '', callout: '', taxRate: '', paid: false, paidType: 'Dinheiro', refNum: '',
      callbackDays: 0, callbackObs: '', images: [],
    });
    const setW = (patch) => setWizRaw(p => ({ ...p, ...patch }));
    const wizWithDate = { ...wiz, date };

    const goNext = () => setStep(s => Math.min(s + 1, 6));
    const goPrev = () => setStep(s => Math.max(s - 1, 1));

    const saveExam = () => {
      if (!wiz.patientId) { window.vtToast && window.vtToast('Selecione um paciente antes de salvar.', 'err'); return; }
      const checkedFlags = Object.entries(wiz.anomalias).filter(([, v]) => v.checked).map(([k, v]) => ({ flag: k, note: v.note }));
      const entry = {
        id: 'WZ-' + Date.now().toString(36),
        date: date,
        vet: window.vtCurrentVet ? window.vtCurrentVet() : 'Equipe',
        species: wiz.species,
        patientName: wiz.patientName,
        ownerName: wiz.ownerName,
        condScore: wiz.condScore,
        lastTreatment: wiz.lastTreatment,
        clinicalNotes: wiz.clinicalNotes,
        sedacao: { vet: wiz.sedVet, tipo: wiz.sedTipo, dose: wiz.sedDose, via: wiz.sedVia, obs: wiz.sedObs },
        anomalias: checkedFlags,
        anomaliasObs: wiz.anomaliasObs,
        chartNotes: wiz.chartNotes,
        billing: { charges: wiz.charges, callout: wiz.callout, taxRate: wiz.taxRate, paid: wiz.paid, paidType: wiz.paidType, refNum: wiz.refNum },
        callback: { period: CB_SLOTS[wiz.callbackDays] || 'Nenhum', obs: wiz.callbackObs },
        source: 'wizard',
      };
      const key = `vt-odonto-hist:${wiz.patientId}`;
      const hist = JSON.parse(localStorage.getItem(key) || '[]');
      hist.unshift(entry);
      localStorage.setItem(key, JSON.stringify(hist));
      window.vtToast && window.vtToast('Exame salvo com sucesso!', 'ok');
      onClose && onClose();
    };

    const handleNext = () => {
      if (step === 1 && !wiz.patientId) { window.vtToast && window.vtToast('Selecione um paciente para continuar.', 'err'); return; }
      if (step === 6) { saveExam(); return; }
      goNext();
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)', overflow: 'hidden' }}>
        {showImgModal && (
          <ImageModal
            images={wiz.images || []}
            onUpdate={(imgs) => setW({ images: imgs })}
            onClose={() => setShowImgModal(false)} />
        )}
        <WizHeader step={step} onClose={onClose} date={date} setDate={setDate}
          images={wiz.images}
          onOpenModal={() => setShowImgModal(true)} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {step === 1 && <Step1Patient wiz={wizWithDate} setW={setW} onNext={goNext} />}
          {step === 2 && <Step2Avaliacao wiz={wizWithDate} setW={setW} />}
          {step === 3 && <Step3Odontograma wiz={wizWithDate} date={date} />}
          {step === 4 && <Step4Tratamentos wiz={wizWithDate} setW={setW} />}
          {step === 5 && <Step5Notas wiz={wizWithDate} setW={setW} />}
          {step === 6 && <Step6Faturamento wiz={wizWithDate} setW={setW} onSave={saveExam} onClose={onClose} onPrev={goPrev} />}
        </div>
        {step < 6 && (
          <WizNav step={step} onPrev={goPrev} onNext={handleNext}
            nextDisabled={step === 1 && !wiz.patientId} />
        )}
      </div>
    );
  }

  window.OdontogramaWizard = OdontogramaWizard;
})();
