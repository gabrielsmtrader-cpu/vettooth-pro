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
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>{IMG_CATS.find(c => c.id === activeCat)?.label}</div>
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
  function WizHeader({ step, onClose, date, setDate, images, onOpenModal, onGoStep, patientSelected, patientName, ownerName }) {
    const totalImgs = (images || []).length;
    return (
      <div style={{ background: 'var(--card)', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
        {/* Linha 1 — Título da página + controles (padrão do VetTooth Pro) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px 10px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: 'var(--ink)', lineHeight: 1.1 }}>Odontograma</h1>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {patientName
                ? <><span style={{ fontWeight: 600, color: 'var(--navy-3)' }}>{patientName}</span>{ownerName ? <span> · {ownerName}</span> : null}</>
                : 'Novo exame dental — selecione o paciente'}
            </p>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>
            📅 <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="vt-input" style={{ padding: '4px 8px', fontSize: 12, width: 130 }} />
          </label>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button onClick={step >= 2 ? onOpenModal : undefined} disabled={step < 2}
              title={step < 2 ? 'Selecione o paciente primeiro' : 'Adicionar fotos e radiografias'}
              className="vt-btn-primary"
              style={{ fontSize: 12, padding: '6px 12px', opacity: step < 2 ? .45 : 1, cursor: step < 2 ? 'not-allowed' : 'pointer' }}>
              📷 Fotos
            </button>
            {totalImgs > 0 && (
              <span style={{ position: 'absolute', top: -5, right: -5, background: '#e74c3c', color: '#fff', borderRadius: '50%', width: 17, height: 17, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {totalImgs}
              </span>
            )}
          </div>
          <button onClick={onClose} className="vt-btn-ghost" style={{ fontSize: 12, padding: '6px 12px', flexShrink: 0 }}>✕ Fechar</button>
        </div>
        {/* Linha 2 — Tabs de passo */}
        <div style={{ display: 'flex', alignItems: 'stretch', overflowX: 'auto', borderTop: '1px solid var(--line)', padding: '0 12px', gap: 2 }}>
          {STEPS.map((s) => {
            const isActive = step === s.n;
            const isDone = step > s.n;
            const canGo = s.n === 1 || patientSelected;
            return (
              <button key={s.n} onClick={() => canGo && onGoStep(s.n)}
                title={!canGo ? 'Selecione o paciente primeiro' : s.label}
                style={{ display: 'flex', alignItems: 'center', gap: 7, height: 40, padding: '0 16px', border: 'none',
                  borderBottom: isActive ? '2.5px solid var(--teal)' : '2.5px solid transparent',
                  cursor: canGo ? 'pointer' : 'not-allowed', background: 'transparent',
                  fontSize: 12.5, fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'var(--teal)' : isDone ? 'var(--ink)' : 'var(--muted)',
                  whiteSpace: 'nowrap', opacity: canGo ? 1 : .45, flexShrink: 0, transition: 'color .15s' }}>
                <span style={{ width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, flexShrink: 0,
                  background: isActive ? 'var(--teal)' : isDone ? 'var(--teal)' : 'var(--bg)',
                  border: `1.5px solid ${isActive ? 'var(--teal)' : isDone ? 'var(--teal)' : 'var(--line)'}`,
                  color: isActive ? '#fff' : isDone ? '#fff' : 'var(--muted)' }}>
                  {isDone ? '✓' : s.n}
                </span>
                {s.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  /* ─── PASSO 1: Seleção de Paciente ─────────────────────── */
  function Step1Patient({ wiz, setW, onNext }) {
    const [selectedOwner, setSelectedOwner] = useState(wiz.ownerName || null);
    const [ownerQuery, setOwnerQuery] = useState('');
    const [patientQuery, setPatientQuery] = useState('');

    const allPatients = useMemo(() => {
      const d = window.VtStore && window.VtStore.getData();
      return (d && d.patients) || [];
    }, []);

    const speciesLabel = (p) => {
      const s = (p.species || '').toLowerCase();
      if (/cavalo|equ|égua|egua|muar/i.test(s)) return { emoji: '🐴', label: 'Equino' };
      if (/gato|felin/i.test(s)) return { emoji: '🐱', label: 'Gato' };
      return { emoji: '🐶', label: 'Cão' };
    };

    const ownerMap = useMemo(() => {
      const map = {};
      allPatients.forEach(p => {
        const owner = p.owner || 'Sem tutor';
        if (!map[owner]) map[owner] = [];
        map[owner].push(p);
      });
      return map;
    }, [allPatients]);

    const recentOwners = useMemo(() => {
      const seen = new Set();
      const result = [];
      allPatients.forEach(p => {
        if (!p.owner || seen.has(p.owner)) return;
        const hist = JSON.parse(localStorage.getItem('vt-odonto-hist:' + p.id) || '[]');
        if (hist.length > 0) { seen.add(p.owner); result.push(p.owner); }
      });
      return result.slice(0, 5);
    }, [allPatients]);

    const allOwners = useMemo(() => Object.keys(ownerMap).sort(), [ownerMap]);

    const filteredOwners = useMemo(() => {
      const q = ownerQuery.toLowerCase();
      if (!q) return allOwners;
      return allOwners.filter(o => o.toLowerCase().includes(q));
    }, [ownerQuery, allOwners]);

    const ownerPatients = useMemo(() => {
      if (!selectedOwner) return [];
      const patients = ownerMap[selectedOwner] || [];
      const q = patientQuery.toLowerCase();
      if (!q) return patients;
      return patients.filter(p => p.name.toLowerCase().includes(q));
    }, [selectedOwner, ownerMap, patientQuery]);

    const getLastVisit = (patientId) => {
      const hist = JSON.parse(localStorage.getItem('vt-odonto-hist:' + patientId) || '[]');
      if (!hist.length) return null;
      hist.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      return hist[0].date || null;
    };

    const formatDate = (d) => {
      if (!d) return null;
      const [y, m, day] = d.split('-');
      return day + '/' + m + '/' + y;
    };

    const select = (p) => {
      const sp = speciesLabel(p);
      setW({ patientId: p.id, patientName: p.name, ownerName: p.owner || '', species: sp.label });
      onNext();
    };

    const renderOwnerRow = (owner) => {
      const isSelected = selectedOwner === owner;
      return (
        <button key={owner} onClick={() => { setSelectedOwner(owner); setPatientQuery(''); }}
          style={{ width: '100%', textAlign: 'left', padding: '11px 16px', background: isSelected ? 'var(--teal-t)' : 'transparent',
            border: 'none', borderBottom: '1px solid var(--line)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>👤</span>
          <span style={{ flex: 1, fontWeight: isSelected ? 700 : 500, fontSize: 13.5, color: isSelected ? 'var(--teal)' : 'var(--ink)' }}>{owner}</span>
          <span style={{ fontSize: 11, color: 'var(--muted)', marginRight: 4 }}>{(ownerMap[owner] || []).length}</span>
          <span style={{ color: 'var(--muted)', fontSize: 15 }}>›</span>
        </button>
      );
    };

    return (
      <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
        {/* Coluna Esquerda – Tutores */}
        <div style={{ width: '44%', minWidth: 180, borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '13px 16px 10px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>Tutores</span>
            <button className="vt-btn-ghost" style={{ fontSize: 11, padding: '3px 8px' }}>Adicionar Tutor +</button>
          </div>
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
            <input className="vt-input" placeholder="🔍 Buscar tutor…" value={ownerQuery} onChange={e => setOwnerQuery(e.target.value)}
              style={{ width: '100%', fontSize: 13 }} />
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {recentOwners.length > 0 && !ownerQuery && (
              <>
                <div style={{ padding: '8px 16px 4px', fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6 }}>Recentes</div>
                {recentOwners.filter(o => allOwners.includes(o)).map(renderOwnerRow)}
                <div style={{ padding: '8px 16px 4px', fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6 }}>Todos os Tutores</div>
              </>
            )}
            {filteredOwners.length === 0
              ? <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Nenhum tutor encontrado.</div>
              : filteredOwners.map(renderOwnerRow)
            }
          </div>
        </div>

        {/* Coluna Direita – Pacientes */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '13px 16px 10px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>Paciente</span>
            <button className="vt-btn-ghost" style={{ fontSize: 11, padding: '3px 8px' }}>Adicionar Paciente +</button>
          </div>
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
            <input className="vt-input" placeholder="🔍 Buscar animal…" value={patientQuery} onChange={e => setPatientQuery(e.target.value)}
              style={{ width: '100%', fontSize: 13 }} disabled={!selectedOwner} />
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {!selectedOwner
              ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 32 }}>
                  <div style={{ textAlign: 'center', color: 'var(--muted)' }}>
                    <div style={{ fontSize: 38, marginBottom: 10 }}>🐾</div>
                    <div style={{ fontSize: 13 }}>Selecione um tutor para ver os pacientes</div>
                  </div>
                </div>
              : ownerPatients.length === 0
                ? <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Nenhum animal encontrado.</div>
                : ownerPatients.map(p => {
                    const sp = speciesLabel(p);
                    const isSelected = wiz.patientId === p.id;
                    const lastVisit = getLastVisit(p.id);
                    return (
                      <button key={p.id} onClick={() => select(p)}
                        style={{ width: '100%', textAlign: 'left', padding: '12px 16px',
                          background: isSelected ? 'var(--teal-t)' : 'transparent',
                          border: 'none', borderBottom: '1px solid var(--line)', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 24 }}>{sp.emoji}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 14, color: isSelected ? 'var(--teal)' : 'var(--ink)' }}>{p.name}</div>
                          {lastVisit
                            ? <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                                ATEND. ANTERIOR: <span style={{ color: 'var(--red)', fontWeight: 700 }}>{formatDate(lastVisit)}</span>
                              </div>
                            : <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                                {p.species || sp.label}{p.breed ? ' · ' + p.breed : ''}{p.sex ? ' · ' + p.sex : ''}
                              </div>
                          }
                        </div>
                        <span style={{ color: 'var(--muted)', fontSize: 16 }}>›</span>
                      </button>
                    );
                  })
            }
          </div>
        </div>
      </div>
    );
  }

  /* ─── PASSO 2: Avaliação Inicial ─────────────────────────── */
  function Step2Avaliacao({ wiz, setW }) {
    const bcsMax = 9;
    const bcsScore = wiz.condScore || 5;
    const MAX_NOTES = 270;
    const FARMACOS = ['Detomidina', 'Butorfanol', 'Iombina', 'Dexmedetomidina', 'Acepromazina', 'Midazolam', 'Propofol', 'Ketamina', 'Xilazina', 'Morfina', 'Tramadol', 'Outro'];

    const sedAtiva = wiz.sedAtiva || false;
    const sedRows = wiz.sedRows || [
      { tempo: '', tipo: '', quantidade: '' }, { tempo: '', tipo: '', quantidade: '' },
      { tempo: '', tipo: '', quantidade: '' }, { tempo: '', tipo: '', quantidade: '' },
    ];

    const updateSedRow = (i, field, val) => {
      const rows = sedRows.map((r, idx) => idx === i ? { ...r, [field]: val } : r);
      setW({ sedRows: rows, sedTipo: rows.filter(r => r.tipo).map(r => r.tipo).join(', ') });
    };

    const loadPrevNotes = () => {
      const hist = JSON.parse(localStorage.getItem('vt-odonto-hist:' + wiz.patientId) || '[]');
      if (!hist.length) return;
      hist.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      if (hist[0].clinicalNotes) setW({ clinicalNotes: hist[0].clinicalNotes });
    };

    const bcsLabel = (n) => {
      if (n <= 2) return 'Caquético / Muito magro';
      if (n <= 4) return 'Abaixo do peso';
      if (n === 5) return 'Peso ideal';
      if (n <= 7) return 'Acima do peso';
      return 'Obeso / Muito obeso';
    };

    const inputStyle = { width: '100%' };

    return (
      <div style={{ padding: 24, flex: 1, overflowY: 'auto' }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 20, color: 'var(--ink)' }}>📋 Avaliação Inicial</h2>
        <p style={{ margin: '0 0 20px', color: 'var(--muted)', fontSize: 13 }}>Paciente: <b>{wiz.patientName}</b> — {wiz.ownerName}</p>

        {/* BCS Slider */}
        <div className="vt-card vt-sec vt-form" style={{ marginBottom: 16 }}>
          <div className="vt-form-sec" style={{ marginBottom: 10 }}>Condição Corporal (BCS 1–9)</div>
          <div style={{ userSelect: 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2, padding: '0 1px' }}>
              {Array.from({ length: bcsMax }, (_, i) => i + 1).map(n => (
                <span key={n} style={{ fontSize: 11, color: n === bcsScore ? 'var(--teal)' : 'var(--muted)', fontWeight: n === bcsScore ? 800 : 400,
                  width: (100 / bcsMax) + '%', textAlign: 'center', display: 'block' }}>{n}</span>
              ))}
            </div>
            <input type="range" min={1} max={bcsMax} step={1} value={bcsScore}
              onChange={e => setW({ condScore: Number(e.target.value) })}
              style={{ width: '100%', accentColor: 'var(--teal)', cursor: 'pointer', height: 20, margin: '2px 0' }} />
            <div style={{ textAlign: 'center', marginTop: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--teal)' }}>{bcsScore}/9</span>
              <span style={{ fontSize: 12.5, color: 'var(--muted)', marginLeft: 8 }}>{bcsLabel(bcsScore)}</span>
            </div>
          </div>
        </div>

        {/* Notas de Histórico Clínico */}
        <div className="vt-card vt-sec vt-form" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
            <div className="vt-form-sec" style={{ margin: 0, flex: 1 }}>Notas de Histórico Clínico</div>
            <span style={{ fontSize: 12, color: 'var(--muted)', marginRight: 10 }}>({(wiz.clinicalNotes || '').length}/{MAX_NOTES})</span>
            <button className="vt-btn-ghost" style={{ fontSize: 12, padding: '4px 10px', color: 'var(--teal)', borderColor: 'var(--teal)' }}
              onClick={loadPrevNotes}>+ Carregar Anterior</button>
          </div>
          <textarea className="vt-input" rows={4} maxLength={MAX_NOTES}
            placeholder="Adicione notas pré-tratamento, observações relevantes…"
            value={wiz.clinicalNotes} onChange={e => setW({ clinicalNotes: e.target.value })}
            style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit', fontSize: 13 }} />
        </div>

        {/* Sedação — card com toggle */}
        <div className="vt-card vt-sec vt-form">
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: sedAtiva ? 16 : 0 }}>
            <div className="vt-form-sec" style={{ margin: 0, flex: 1 }}>Sedação</div>
            <span style={{ fontSize: 12, color: 'var(--muted)', marginRight: 7 }}>{sedAtiva ? 'ON' : 'OFF'}</span>
            <div onClick={() => setW({ sedAtiva: !sedAtiva })}
              style={{ width: 44, height: 24, borderRadius: 12, background: sedAtiva ? 'var(--teal)' : 'var(--faint)',
                position: 'relative', cursor: 'pointer', transition: 'background .2s', flexShrink: 0 }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute',
                top: 3, left: sedAtiva ? 23 : 3, transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.25)' }} />
            </div>
          </div>

          {sedAtiva && (
            <div>
              {/* Veterinário Presente */}
              <div style={{ padding: '12px 14px', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 8, marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Veterinário Presente</div>
                <div className="vt-form-row">
                  <label className="vtf" style={{ flex: 1 }}>
                    <span className="vtf-label">Consultório</span>
                    <span className="vtf-inputwrap"><input className="vtf-input" placeholder="Nome do consultório" value={wiz.sedVetConsultorio || ''} onChange={e => setW({ sedVetConsultorio: e.target.value })} /></span>
                  </label>
                  <label className="vtf" style={{ flex: 1 }}>
                    <span className="vtf-label">Nome do Veterinário</span>
                    <span className="vtf-inputwrap"><input className="vtf-input" placeholder="Dr(a)." value={wiz.sedVetNome || ''} onChange={e => setW({ sedVetNome: e.target.value, sedVet: e.target.value })} /></span>
                  </label>
                </div>
              </div>

              {/* Tabela de sedação */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Protocolo</div>
                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 110px', gap: 6, marginBottom: 5, padding: '0 2px' }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>Tempo</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>Fármaco</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>Quantidade</span>
                </div>
                {sedRows.map((row, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 110px', gap: 6, marginBottom: 6 }}>
                    <input type="time" className="vtf-input" value={row.tempo} onChange={e => updateSedRow(i, 'tempo', e.target.value)} style={inputStyle} />
                    <select className="vtf-input" value={row.tipo} onChange={e => updateSedRow(i, 'tipo', e.target.value)} style={inputStyle}>
                      <option value="">— Fármaco —</option>
                      {FARMACOS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <input className="vtf-input" placeholder="Ex: 5 mg" value={row.quantidade} onChange={e => updateSedRow(i, 'quantidade', e.target.value)} style={inputStyle} />
                  </div>
                ))}
                <button className="vt-btn-ghost" onClick={() => setW({ sedRows: [...sedRows, { tempo: '', tipo: '', quantidade: '' }] })}
                  style={{ fontSize: 12, padding: '5px 12px', marginTop: 4 }}>+ Adicionar linha</button>
              </div>
            </div>
          )}
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

  function Step3Odontograma({ wiz, date, setW }) {
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
      <button onClick={onClick} title={label} className="vt-btn-ghost"
        style={{ fontSize: 12, padding: '5px 11px', gap: 6 }}>
        <span style={{ fontSize: 14 }}>{icon}</span>{label}
      </button>
    );

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>

        {/* ── Header do Gráfico ── */}
        <div style={{ background: 'var(--card)', borderBottom: '1px solid var(--line)', padding: '9px 18px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)', marginRight: 4 }}>🦷 Gráfico Odontológico</span>
          <div style={{ flex: 1 }} />
          {wiz.chartImage && (
            <span style={{ fontSize: 11, color: 'var(--teal)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--teal)', display: 'inline-block' }} />✓ Capturado para PDF
            </span>
          )}
          <button onClick={handleLoadPrev} className="vt-btn-ghost" style={{ fontSize: 12, padding: '5px 11px' }}>📋 Histórico</button>
          <button onClick={() => ctrl() && ctrl().undoShape()} className="vt-btn-ghost" style={{ fontSize: 12, padding: '5px 11px' }}>↩ Desfazer</button>
          <button onClick={() => ctrl() && ctrl().clearAll()}
            style={{ fontSize: 12, padding: '5px 11px', border: '1.5px solid #fcd0d0', borderRadius: 7, background: 'transparent', color: '#c0392b', cursor: 'pointer', fontWeight: 600 }}>
            ✕ Limpar
          </button>
          <button onClick={() => ctrl() && ctrl().novoExame()} className="vt-btn-primary" style={{ fontSize: 12, padding: '5px 12px' }}>➕ Adicionar</button>
        </div>

        {/* ── Ações rápidas ── */}
        <div style={{ padding: '8px 18px', display: 'flex', gap: 8, flexShrink: 0, background: 'var(--bg)', borderBottom: '1px solid var(--line)' }}>
          <button onClick={handleLoadPrev} className="vt-btn-primary" style={{ fontSize: 12 }}>
            ＋ Carregar Anterior
          </button>
          <button onClick={() => window.vtToast && window.vtToast('Visão incisal em breve.', 'ok')} className="vt-btn-ghost" style={{ fontSize: 12 }}>
            ＋ Visão Incisal
          </button>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 11.5, color: 'var(--muted)', display: 'flex', alignItems: 'center' }}>
            📅 {formatDate(date)}
          </span>
        </div>

        {/* ── Chart ── */}
        <div style={{ flex: 1, overflow: 'auto', padding: '0 20px' }}>
          <div style={{ background: 'var(--card)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden', minHeight: 300 }}>
            <window.OdontogramaModule
              initialPatientId={wiz.patientId}
              slim={true}
              moduleRef={odoRef}
            />
          </div>
        </div>

        {/* ── Bottom Tool Palette ── */}
        <div style={{ flexShrink: 0, background: 'var(--card)', borderTop: '1px solid var(--line)', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto' }}>

          {/* Label: ferramentas */}
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.07em', color: 'var(--muted)', textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0 }}>Ferramenta</span>

          {/* Grupo 1: ferramentas de desenho */}
          <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
            {DRAW_TOOLS.map((t, i) => (
              <button key={i} onClick={() => handleTool(t.id)} title={t.label}
                style={{ height: 32, minWidth: 32, padding: '0 8px', borderRadius: 7, cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: activeTool === t.id ? 'none' : '1.5px solid var(--line)',
                  background: activeTool === t.id ? 'var(--navy-3)' : 'transparent',
                  color: activeTool === t.id ? '#fff' : 'var(--ink)' }}>
                {t.icon}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 28, background: 'var(--line)', flexShrink: 0 }} />

          {/* Label: condições */}
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.07em', color: 'var(--muted)', textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0 }}>Condição</span>

          {/* Grupo 2: condições com label curto */}
          <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
            {COND_TOOLS.map((t, i) => (
              <button key={i} onClick={() => handleCond(t.cond)} title={t.label}
                style={{ height: 28, padding: '0 9px', borderRadius: 14, border: '1.5px solid var(--line)',
                  cursor: 'pointer', fontSize: 10.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4,
                  background: 'transparent', color: 'var(--ink)', whiteSpace: 'nowrap' }}>
                <span style={{ fontSize: 13 }}>{t.icon}</span>
                <span style={{ fontSize: 10 }}>{t.label.split(' ')[0]}</span>
              </button>
            ))}
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 28, background: 'var(--line)', flexShrink: 0 }} />

          {/* Grupo 3: badges de status */}
          <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
            {BADGE_TOOLS.map((t, i) => (
              <button key={i} onClick={() => handleBadge(t)} title={t.label}
                style={{ height: 28, padding: '0 10px', borderRadius: 14, border: 'none', cursor: 'pointer',
                  fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 5,
                  background: 'var(--navy-3)', color: '#fff', whiteSpace: 'nowrap' }}>
                <span>{t.icon}</span>
                <span style={{ fontSize: 10, fontWeight: 700 }}>{t.label.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Painel de histórico (load previous) ── */}
        {histPanelOpen && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => setHistPanelOpen(false)}>
            <div style={{ background: 'var(--card)', borderRadius: 'var(--radius)', padding: 24, minWidth: 360, maxWidth: 480, maxHeight: '80vh', overflowY: 'auto', boxShadow: 'var(--shadow)' }}
              onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 16, color: 'var(--navy-3)' }}>📋 Gráficos Anteriores</h3>
                <button onClick={() => setHistPanelOpen(false)} style={{ border: 'none', background: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--faint)' }}>✕</button>
              </div>
              {histList.length === 0
                ? <p style={{ color: 'var(--faint)', fontSize: 13 }}>Nenhum gráfico anterior registrado para este paciente.</p>
                : histList.map((h, i) => (
                  <div key={i} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '12px 14px', marginBottom: 8, cursor: 'pointer' }}
                    onClick={() => { ctrl() && ctrl().loadExam(h); setHistPanelOpen(false); }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--navy-3)' }}>{h.date} — {h.speciesLabel}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{h.summary}</div>
                    <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 2 }}>{h.anorm} anormal · {h.tratados} tratados · Vet: {h.vet}</div>
                  </div>
                ))
              }
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ─── PASSO 4: Achados & Tratamentos (layout two-column) ─── */
  function Step4Tratamentos({ wiz, setW }) {
    const isHorse = /equi|caval/i.test(wiz.species || '');
    const isGato  = /gato|felin/i.test(wiz.species || '');
    const speciesKey = isHorse ? 'equino' : isGato ? 'gatos' : 'caes';

    const dxCfg = useMemo(() => window.vtOdontoDxCfg ? window.vtOdontoDxCfg() : {}, []);
    const speciesData = dxCfg[speciesKey] || {};

    const CAT_LABELS = { incisivos:'Incisivos', caninos:'Caninos', denteslobo:'Dente de Lobo', premolares:'Pré-molares', molares:'Molares', outros:'Outros' };
    const catOrder = isHorse
      ? ['incisivos','caninos','denteslobo','premolares','molares','outros']
      : ['incisivos','caninos','premolares','molares','outros'];

    const availCats = catOrder.filter(c => (speciesData[c] || []).length > 0);
    const [activeCat, setActiveCat] = useState(() => availCats[0] || 'incisivos');
    const [openNotes, setOpenNotes] = useState({});

    const findings = wiz.findings || {};
    const key = (cat, id) => `${cat}:${id}`;
    const getF = (cat, item) => findings[key(cat, item.id)] || { checked: false, price: item.price || 0, note: '' };

    const toggle = (cat, item) => {
      const k = key(cat, item.id); const cur = getF(cat, item);
      setW({ findings: { ...findings, [k]: { ...cur, checked: !cur.checked, price: cur.price || item.price || 0 } } });
    };
    const setPrice = (cat, item, val) => {
      const k = key(cat, item.id); const cur = getF(cat, item);
      setW({ findings: { ...findings, [k]: { ...cur, price: val } } });
    };
    const setNote = (cat, item, note) => {
      const k = key(cat, item.id); const cur = getF(cat, item);
      setW({ findings: { ...findings, [k]: { ...cur, note } } });
    };

    const checkedItems = Object.entries(findings).filter(([,v]) => v.checked);
    const total = checkedItems.reduce((s,[,v]) => s + (parseFloat(v.price)||0), 0);

    const catCheckedCount = (cat) => {
      const items = speciesData[cat] || [];
      return items.filter(item => (findings[key(cat, item.id)] || {}).checked).length;
    };

    const activeItems = speciesData[activeCat] || [];

    if (Object.keys(speciesData).length === 0) return (
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:32 }}>
        <div className="vt-ai-note" style={{ maxWidth:480 }}>
          Nenhum achado configurado para esta espécie. Acesse <b>Configurações → Odontograma → Achados por Espécie</b> para adicionar.
        </div>
      </div>
    );

    return (
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

        {/* ── Barra de totais ── */}
        <div style={{ background:'var(--card)', borderBottom:'1px solid var(--line)', padding:'9px 18px', display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
          <span style={{ fontWeight:700, fontSize:14, color:'var(--ink)' }}>✅ Tratamentos e Achados</span>
          <span style={{ fontSize:12, color:'var(--muted)' }}>
            {checkedItems.length > 0
              ? <span style={{ color:'var(--teal)', fontWeight:600 }}>{checkedItems.length} item(ns) selecionado(s)</span>
              : `Selecione os achados para ${wiz.species || 'o paciente'}`}
          </span>
          {total > 0 && (
            <div style={{ marginLeft:'auto', background:'var(--teal)', borderRadius:20, padding:'5px 16px', fontSize:13, fontWeight:700, color:'#fff' }}>
              Total: R$ {total.toLocaleString('pt-BR',{minimumFractionDigits:2})}
            </div>
          )}
        </div>

        {/* ── Layout two-column ── */}
        <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

          {/* Sidebar — categorias */}
          <div style={{ width:200, flexShrink:0, borderRight:'1px solid var(--line)', background:'var(--card)', overflowY:'auto', padding:'8px 0' }}>
            {availCats.map(cat => {
              const isActive = cat === activeCat;
              const cnt = catCheckedCount(cat);
              return (
                <button key={cat} onClick={() => setActiveCat(cat)}
                  style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between',
                    padding:'13px 18px', border:'none', cursor:'pointer', textAlign:'left',
                    background: isActive ? '#f0faf6' : 'transparent',
                    borderLeft: isActive ? '3.5px solid var(--teal)' : '3.5px solid transparent',
                    fontWeight: isActive ? 700 : 400, fontSize:14,
                    color: isActive ? 'var(--teal)' : 'var(--ink)', transition:'all .12s' }}>
                  <span>{CAT_LABELS[cat] || cat}</span>
                  {cnt > 0 && (
                    <span style={{ background:'var(--teal)', color:'#fff', borderRadius:12, padding:'1px 7px', fontSize:11, fontWeight:700 }}>{cnt}</span>
                  )}
                </button>
              );
            })}
            {/* Linha de observações gerais */}
            <button onClick={() => setActiveCat('__obs__')}
              style={{ width:'100%', display:'flex', alignItems:'center', padding:'13px 18px', border:'none', cursor:'pointer', textAlign:'left', marginTop:8,
                background: activeCat === '__obs__' ? '#f0faf6' : 'transparent',
                borderTop:'1px solid var(--line)',
                borderLeft: activeCat === '__obs__' ? '3.5px solid var(--teal)' : '3.5px solid transparent',
                fontWeight: activeCat === '__obs__' ? 700 : 400, fontSize:14,
                color: activeCat === '__obs__' ? 'var(--teal)' : 'var(--muted)' }}>
              Observações
            </button>
          </div>

          {/* Painel direito — itens da categoria ativa */}
          <div style={{ flex:1, overflowY:'auto', background:'var(--bg)' }}>
            {activeCat === '__obs__' ? (
              <div style={{ padding:24 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:10 }}>Observações Gerais</div>
                <textarea className="vt-input" rows={6} placeholder="Notas gerais sobre tratamentos realizados…"
                  value={wiz.anomaliasObs || ''} onChange={e => setW({ anomaliasObs: e.target.value })}
                  style={{ width:'100%', maxWidth:600, resize:'vertical', fontFamily:'inherit', fontSize:13 }} />
              </div>
            ) : (
              <div style={{ background:'var(--card)', margin:0 }}>
                {activeItems.map((item, idx) => {
                  const f = getF(activeCat, item);
                  const nk = key(activeCat, item.id);
                  const noteOpen = openNotes[nk];
                  return (
                    <div key={item.id}>
                      <div style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 20px',
                        borderBottom: idx < activeItems.length - 1 ? '1px solid var(--line)' : 'none' }}>

                        {/* Checkbox teal */}
                        <button onClick={() => toggle(activeCat, item)}
                          style={{ width:26, height:26, borderRadius:6, flexShrink:0, cursor:'pointer',
                            border: f.checked ? 'none' : '2px solid #cbd5e0',
                            background: f.checked ? 'var(--teal)' : 'transparent',
                            display:'flex', alignItems:'center', justifyContent:'center' }}>
                          {f.checked && <span style={{ color:'#fff', fontSize:14, fontWeight:700, lineHeight:1 }}>✓</span>}
                        </button>

                        {/* Nome uppercase */}
                        <span style={{ flex:1, fontSize:14, fontWeight:600, letterSpacing:'.03em',
                          textTransform:'uppercase', color: f.checked ? 'var(--ink)' : 'var(--muted)' }}>
                          {item.name}
                        </span>

                        {/* Preço */}
                        <span style={{ fontSize:13, fontWeight:600, color:'var(--muted)', flexShrink:0 }}>R$</span>
                        <input type="number" min="0" step="0.01" value={f.price}
                          onChange={e => setPrice(activeCat, item, parseFloat(e.target.value)||0)}
                          style={{ width:90, background:'var(--teal)', color:'#fff', border:'none', borderRadius:22,
                            padding:'6px 14px', fontSize:13, fontWeight:700, textAlign:'center',
                            outline:'none', fontFamily:'inherit', cursor: f.checked ? 'text' : 'default',
                            opacity: f.checked ? 1 : 0.35 }}
                          disabled={!f.checked} />

                        {/* Botão + (toggle notas) */}
                        <button onClick={() => { if (!f.checked) toggle(activeCat, item); else setOpenNotes(n => ({...n, [nk]: !n[nk]})); }}
                          style={{ width:32, height:32, borderRadius:'50%', border:'none', cursor:'pointer', flexShrink:0,
                            background:'var(--teal)', color:'#fff', fontSize:20, fontWeight:300,
                            display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1 }}>
                          {f.checked && noteOpen ? '−' : '+'}
                        </button>
                      </div>

                      {/* Nota expandida */}
                      {f.checked && noteOpen && (
                        <div style={{ padding:'0 20px 14px 60px', background:'#f8fffe', borderBottom: idx < activeItems.length - 1 ? '1px solid var(--line)' : 'none' }}>
                          <textarea className="vt-input" rows={2} placeholder={`Anotação sobre ${item.name}…`} value={f.note}
                            onChange={e => setNote(activeCat, item, e.target.value)}
                            style={{ width:'100%', maxWidth:500, fontSize:13, resize:'vertical', fontFamily:'inherit' }} />
                        </div>
                      )}
                    </div>
                  );
                })}
                {activeItems.length === 0 && (
                  <div style={{ padding:32, textAlign:'center', color:'var(--muted)', fontSize:13 }}>
                    Nenhum item nesta categoria.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ─── PASSO 5: Notas & Prévia PDF multi-página ──────────── */
  function Step5Notas({ wiz, setW }) {
    const checkedAnomalias = [
      ...Object.entries(wiz.findings || {}).filter(([,v]) => v && v.checked).map(([k,v]) => {
        const [cat, id] = k.split(':');
        const dxCfg = window.vtOdontoDxCfg ? window.vtOdontoDxCfg() : {};
        const isHorse = /equi|caval/i.test(wiz.species||'');
        const isGato = /gato|felin/i.test(wiz.species||'');
        const spKey = isHorse?'equino':isGato?'gatos':'caes';
        const items = (dxCfg[spKey]||{})[cat]||[];
        const item = items.find(i=>i.id===id);
        const name = item ? item.name : id;
        const note = v.note || (v.price > 0 ? `R$ ${parseFloat(v.price).toFixed(2)}` : '');
        return [name, { checked:true, note }];
      }),
      ...Object.entries(wiz.anomalias || {}).filter(([, v]) => v && v.checked),
    ];
    const clinic = window.vtClinic ? window.vtClinic() : {};
    const _cu    = (window.VtStore && window.VtStore.currentUser && window.VtStore.currentUser()) || {};
    const clinicName  = clinic.name     || _cu.clinic || 'Dentalis Vet';
    const _addr       = clinic.addr || {};
    const clinicAddr  = clinic.address || [_addr.street, _addr.num, _addr.district, _addr.city, _addr.state].filter(Boolean).join(', ') || '';
    const clinicPhone = clinic.phone || clinic.tel || '';
    const clinicEmail = clinic.email    || '';
    const clinicInsta = clinic.instagram || clinic.social || '';
    const clinicSite  = clinic.site || clinic.website || '';
    const clinicLogo  = clinic.logo     || '';
    const clinicVet   = clinic.vetName  || wiz.sedVet || 'M.V. Veterinário';
    const clinicCrmv  = clinic.crmv || (_cu.crmv ? `CRMV-${_cu.crmvUF || 'SP'} ${_cu.crmv}` : '');
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
            <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>Anotações Clínicas</span>
            <button onClick={loadPrev} className="vt-btn-primary"
              style={{ fontSize: 11, padding: '4px 10px' }}>
              ↩ Carregar
            </button>
          </div>
          <textarea
            value={wiz.chartNotes}
            onChange={e => setW({ chartNotes: e.target.value })}
            placeholder="Achados clínicos, observações por região dentária, recomendações pós-procedimento…"
            className="vt-input"
            style={{ flex: 1, resize: 'none', fontSize: 12, lineHeight: 1.7 }}
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
            <SecDiv label="Gráfico Odontológico" />
            {wiz.chartImage
              ? <img src={wiz.chartImage} alt="Gráfico odontológico" style={{ width:'100%', maxHeight:220, objectFit:'contain', border:'1px solid #eee', borderRadius:4, marginBottom:8 }} />
              : <div style={{ border:'1px dashed #ccc', borderRadius:4, padding:'14px 12px', marginBottom:8, background:'#f9f9f9', textAlign:'center', color:'#bbb', fontSize:11, minHeight:80 }}>
                  [ Gráfico será incluído automaticamente ao passar pelo Passo 3 ]
                </div>
            }

            {/* Faturamento e Próximo Retorno — sempre visível */}
            <SecDiv label="Faturamento e Próximo Retorno" />
            {(() => {
              const findingsTotal = Object.values(wiz.findings||{}).filter(f=>f.checked).reduce((s,f)=>s+(parseFloat(f.price)||0),0);
              const charges = parseFloat(wiz.charges||0);
              const callout = parseFloat(wiz.callout||0);
              const tax = parseFloat(wiz.taxRate||0);
              const total = (charges + callout) * (1 + tax/100);
              return (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 20px', marginBottom:8 }}>
                  <div style={{ fontSize:10 }}>
                    {findingsTotal > 0 && <div style={{ marginBottom:3 }}><b>Tratamentos (Passo 4):</b> R$ {findingsTotal.toFixed(2)}</div>}
                    {charges > 0 && <div style={{ marginBottom:3 }}><b>Cobranças adicionais:</b> R$ {charges.toFixed(2)}</div>}
                    {callout > 0 && <div style={{ marginBottom:3 }}><b>Chamada / Visita:</b> R$ {callout.toFixed(2)}</div>}
                    {(findingsTotal > 0 || charges > 0 || callout > 0) && (
                      <div style={{ borderTop:'1px solid #eee', paddingTop:4, marginTop:4, fontWeight:700, fontSize:12 }}>
                        Total: R$ {(findingsTotal + total).toFixed(2)}
                      </div>
                    )}
                    {!(findingsTotal > 0 || charges > 0 || callout > 0) && <div style={{ color:'#aaa', fontStyle:'italic' }}>A preencher no Passo 6.</div>}
                    {wiz.paid && <div style={{ color:'#14a8a0', fontWeight:700, marginTop:4 }}>✔ PAGO — {wiz.paidType}</div>}
                    {wiz.refNum && <div style={{ color:'#888', fontSize:9 }}>Ref: {wiz.refNum}</div>}
                  </div>
                  <div style={{ borderLeft:'1px solid #eee', paddingLeft:12, fontSize:10 }}>
                    <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:.8, color:'#999', marginBottom:4 }}>Próximo Retorno</div>
                    <div style={{ fontSize:14, fontWeight:700, color:'#16395f' }}>{CB_SLOTS_LOCAL[wiz.callbackDays] || 'Nenhum'}</div>
                    {wiz.callbackObs && <div style={{ fontSize:10, color:'#777', marginTop:4 }}>{wiz.callbackObs}</div>}
                  </div>
                </div>
              );
            })()}

            <PdfFooter />
          </div>

          {/* ════════════════════════════════════════
              FOLHA 2 — Achados (esq.) · Anotações (dir.)
              ════════════════════════════════════════ */}
          <div style={pageStyle}>
            <PdfHeader pageNum={2} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', gap: '0 20px', flex: 1 }}>

              {/* Esquerda: Achados/Anomalias */}
              <div>
                <SecDiv label="Achados e Tratamentos" />
                {checkedAnomalias.length === 0
                  ? <div style={{ fontSize: 10, color: '#aaa', fontStyle: 'italic' }}>Nenhum achado registrado.</div>
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

              {/* Direita: Anotações */}
              <div>
                <SecDiv label="Anotações" />
                {wiz.chartNotes
                  ? <div style={{ fontSize: 10, lineHeight: 1.9, whiteSpace: 'pre-wrap', color: '#222' }}>{wiz.chartNotes}</div>
                  : <div style={{ fontSize: 10, color: '#aaa', fontStyle: 'italic' }}>Nenhuma anotação registrada.</div>
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
                        {img.description && <div style={{ fontSize: 9, color: '#444', lineHeight: 1.5, marginTop: 3 }}>{img.description}</div>}
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
    const findingsTotal = Object.values(wiz.findings||{}).filter(f=>f.checked).reduce((s,f)=>s+(parseFloat(f.price)||0),0);
    const charges = Number(wiz.charges) || 0;
    const callout = Number(wiz.callout) || 0;
    const tax     = Number(wiz.taxRate) || 0;
    const total   = (findingsTotal + charges + callout) * (1 + tax / 100);
    const refNum  = wiz.refNum || '';

    /* ── campo de valor com reset ── */
    const MoneyField = ({ label, desc, fieldKey }) => (
      <div style={{ background: 'var(--card)', borderRadius: 'var(--radius)', padding: '18px 20px', marginBottom: 14, border: '1px solid var(--line)', boxShadow: 'var(--shadow)' }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)', marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>{desc}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)', flexShrink: 0 }}>R$</span>
          <input type="number" min="0" step="0.01" placeholder="0.00" value={wiz[fieldKey]}
            onChange={e => setW({ [fieldKey]: e.target.value })}
            style={{ flex: 1, border: '1.5px solid var(--line)', borderRadius: 10, padding: '8px 14px', fontSize: 15, fontFamily: 'inherit', textAlign: 'right', outline: 'none' }} />
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
          <h2 style={{ margin: '0 0 18px', fontSize: 18, color: 'var(--ink)', fontWeight: 700 }}>
            Cobrança e Notificações de Ligar de Volta
          </h2>

          {findingsTotal > 0 && (
            <div style={{ background: 'var(--teal-t)', borderRadius: 'var(--radius)', padding: '14px 20px', marginBottom: 14, border: '1px solid var(--teal)', boxShadow: 'var(--shadow)' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)', marginBottom: 2 }}>Tratamentos selecionados (Passo 4)</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
                {Object.entries(wiz.findings||{}).filter(([,v])=>v.checked).length} item(ns) selecionado(s)
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <span style={{ fontWeight: 800, fontSize: 20, color: 'var(--teal)' }}>
                  R$ {findingsTotal.toLocaleString('pt-BR',{minimumFractionDigits:2})}
                </span>
              </div>
            </div>
          )}

          <MoneyField label="Cobranças adicionais"
            desc="Valores adicionais além dos tratamentos do Passo 4."
            fieldKey="charges" />

          <MoneyField label="Chamar Cobrança"
            desc="Se taxa normal é definido, este será exibido. Digite o valor a descontar."
            fieldKey="callout" />

          {/* Total + Pago */}
          <div style={{ background: 'var(--card)', borderRadius: 'var(--radius)', padding: '18px 20px', marginBottom: 14, border: '1px solid var(--line)', boxShadow: 'var(--shadow)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>Total</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Total cobrança ao cliente. Imposto sera adicionado automaticamente se selecionado.</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                {findingsTotal > 0 && <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>Tratamentos: R$ {findingsTotal.toFixed(2)} + Extras: R$ {(charges+callout).toFixed(2)}</div>}
                <span style={{ fontWeight: 800, fontSize: 22, color: 'var(--ink)' }}>
                  {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
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
          <div style={{ background: 'var(--card)', borderRadius: 'var(--radius)', padding: '18px 20px', border: '1px solid var(--line)', boxShadow: 'var(--shadow)' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)', marginBottom: 4 }}>Notificação de ligar de volta</div>
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
          <button onClick={onSave}
            className="vt-btn-primary"
            style={{ padding: '12px 10px', fontSize: 13, fontWeight: 700, lineHeight: 1.3 }}>
            ✓ Concluir Exame
          </button>
          <button onClick={() => {
            if (!wiz.patientId) { window.vtToast && window.vtToast('Selecione um paciente.', 'err'); return; }
            const key = `vt-odonto-draft:${wiz.patientId}`;
            localStorage.setItem(key, JSON.stringify({ ...wiz, date: wiz.date, _draft: true }));
            window.vtToast && window.vtToast('Rascunho salvo.', 'ok');
          }} className="vt-btn-ghost" style={{ padding: '10px', fontSize: 12 }}>
            Salvar rascunho
          </button>
          <button onClick={() => { window._vtSetActive && window._vtSetActive('agenda'); onClose && onClose(); }}
            className="vt-btn-ghost" style={{ padding: '10px', fontSize: 12 }}>
            Agendar retorno
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
      condScore: 5, lastTreatment: '', clinicalNotes: '',
      sedVet: '', sedTipo: '', sedDose: '', sedVia: '', sedObs: '',
      sedAtiva: false, sedVetConsultorio: '', sedVetNome: '',
      sedRows: [{ tempo: '', tipo: '', quantidade: '' }, { tempo: '', tipo: '', quantidade: '' }, { tempo: '', tipo: '', quantidade: '' }, { tempo: '', tipo: '', quantidade: '' }],
      anomalias: {}, anomaliasObs: '', chartNotes: '', chartImage: '',
      findings: {},
      charges: '', callout: '', taxRate: '', paid: false, paidType: 'Dinheiro', refNum: '',
      callbackDays: 0, callbackObs: '', images: [],
    });
    const setW = (patch) => setWizRaw(p => ({ ...p, ...patch }));
    const wizWithDate = { ...wiz, date };

    const captureStep3 = () => {
      const svg = document.querySelector('.odm-svg, [class*="odm-wrap"] svg, .odm-chart svg');
      if (!svg) return;
      try {
        const clone = svg.cloneNode(true);
        clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        const s = new XMLSerializer().serializeToString(clone);
        const url = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(s)));
        setW({ chartImage: url });
      } catch(e) {}
    };

    const goNext = () => { if (step === 3) captureStep3(); setStep(s => Math.min(s + 1, 6)); };
    const goPrev = () => setStep(s => Math.max(s - 1, 1));
    const goStep = (n) => { if (n !== 3 && step === 3) captureStep3(); if (n === 1 || wiz.patientId) setStep(n); };

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
        findings: wiz.findings,
        anomaliasObs: wiz.anomaliasObs,
        chartNotes: wiz.chartNotes,
        chartImage: wiz.chartImage,
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
          images={wiz.images} onOpenModal={() => setShowImgModal(true)}
          onGoStep={goStep} patientSelected={!!wiz.patientId}
          patientName={wiz.patientName} ownerName={wiz.ownerName} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {step === 1 && <Step1Patient wiz={wizWithDate} setW={setW} onNext={goNext} />}
          {step === 2 && <Step2Avaliacao wiz={wizWithDate} setW={setW} />}
          {step === 3 && <Step3Odontograma wiz={wizWithDate} date={date} setW={setW} />}
          {step === 4 && <Step4Tratamentos wiz={wizWithDate} setW={setW} />}
          {step === 5 && <Step5Notas wiz={wizWithDate} setW={setW} />}
          {step === 6 && <Step6Faturamento wiz={wizWithDate} setW={setW} onSave={saveExam} onClose={onClose} onPrev={goPrev} />}
        </div>
      </div>
    );
  }

  window.OdontogramaWizard = OdontogramaWizard;
})();
