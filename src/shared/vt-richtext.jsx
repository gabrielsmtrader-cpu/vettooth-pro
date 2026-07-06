/* ============================================================
   VetTooth Pro — Editor de texto rico (contentEditable)
   Barra: negrito, itálico, sublinhado, fonte, tamanho,
   alinhamento, listas, títulos.
   Uso: <VtRichText value={html} onChange={fn} placeholder="..." />
   ============================================================ */
const { useRef: rtRef, useEffect: rtEff } = React;

const RT_FONTS = ['Padrão', 'Serif', 'Mono'];
const RT_FONT_CSS = { 'Padrão': 'inherit', 'Serif': 'Georgia, serif', 'Mono': "'Courier New', monospace" };

function VtRichText({ value, onChange, placeholder, minHeight }) {
  const ref = rtRef(null);
  const last = rtRef(value || '');
  rtEff(() => {
    if (ref.current && (value || '') !== ref.current.innerHTML) {
      ref.current.innerHTML = value || '';
      last.current = value || '';
    }
  }, [value]);
  const cmd = (c, val) => { document.execCommand(c, false, val || null); fire(); ref.current && ref.current.focus(); };
  const fire = () => { if (ref.current) { last.current = ref.current.innerHTML; onChange && onChange(ref.current.innerHTML); } };
  const btn = (c, label, arg) => <button type="button" className="rt-btn" onMouseDown={(e) => { e.preventDefault(); cmd(c, arg); }} title={label}>{label}</button>;
  return (
    <div className="rt-wrap">
      <div className="rt-toolbar">
        {btn('bold', 'B')}
        {btn('italic', 'I')}
        {btn('underline', 'U')}
        <span className="rt-sep" />
        <select className="rt-sel" onMouseDown={(e) => e.stopPropagation()} onChange={(e) => { cmd('formatBlock', e.target.value); e.target.value = ''; }} defaultValue="">
          <option value="" disabled>Estilo</option>
          <option value="h2">Título</option>
          <option value="h3">Subtítulo</option>
          <option value="p">Parágrafo</option>
        </select>
        <select className="rt-sel" onMouseDown={(e) => e.stopPropagation()} onChange={(e) => { cmd('fontName', RT_FONT_CSS[e.target.value]); e.target.value = ''; }} defaultValue="">
          <option value="" disabled>Fonte</option>
          {RT_FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <select className="rt-sel" onMouseDown={(e) => e.stopPropagation()} onChange={(e) => { cmd('fontSize', e.target.value); e.target.value = ''; }} defaultValue="">
          <option value="" disabled>Tam.</option>
          <option value="2">Pequeno</option><option value="3">Normal</option><option value="5">Grande</option>
        </select>
        <span className="rt-sep" />
        {btn('justifyLeft', '⯇')}
        {btn('justifyCenter', '≡')}
        {btn('justifyRight', '⯈')}
        {btn('justifyFull', '☰')}
        <span className="rt-sep" />
        {btn('insertUnorderedList', '•')}
        {btn('insertOrderedList', '1.')}
        {btn('removeFormat', '⌫')}
      </div>
      <div ref={ref} className="rt-edit" contentEditable suppressContentEditableWarning
        data-ph={placeholder || 'Digite...'} style={{ minHeight: minHeight || 90 }}
        onInput={fire} onBlur={fire} />
    </div>
  );
}
window.VtRichText = VtRichText;
