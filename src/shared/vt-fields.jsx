/* ============================================================
   VetTooth Pro — campos inteligentes (máscaras + validação)
   Exposto em window: máscaras e componentes de campo
   ============================================================ */
const { useState: vtUseState, useRef: vtUseRef, useEffect: vtUseEffect } = React;

/* ---------------- máscaras ---------------- */
const onlyD = (s) => (s || '').replace(/\D/g, '');

function maskCPF(v) {
  const d = onlyD(v).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}
function maskCNPJ(v) {
  const d = onlyD(v).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}
function maskPhone(v) {
  const d = onlyD(v).slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
  }
  return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
}
function maskCEP(v) {
  const d = onlyD(v).slice(0, 8);
  return d.replace(/^(\d{5})(\d)/, '$1-$2');
}
function maskDate(v) {
  const d = onlyD(v).slice(0, 8);
  return d.replace(/^(\d{2})(\d)/, '$1/$2').replace(/^(\d{2})\/(\d{2})(\d)/, '$1/$2/$3');
}
function maskMoney(v) {
  // Os dígitos digitados são tratados como REAIS, não centavos: 350 → R$ 350,00.
  // Os centavos só entram quando o usuário digita a vírgula (ex.: 350,50 → R$ 350,50).
  let s = String(v == null ? '' : v).replace(/[^\d,]/g, '');
  if (!s) return '';
  const parts = s.split(',');
  const intNum = parseInt(parts[0] || '0', 10) || 0;
  const intFmt = intNum.toLocaleString('pt-BR');
  if (parts.length === 1) return 'R$ ' + intFmt;
  const dec = parts.slice(1).join('').slice(0, 2);
  return 'R$ ' + intFmt + ',' + dec;
}
function maskWeight(v) {
  const d = onlyD(v);
  if (!d) return '';
  const n = parseInt(d, 10) / 10;
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' kg';
}
function maskCRMV(v) {
  // CRMV-SP 12345
  let s = (v || '').toUpperCase();
  const m = s.match(/([A-Z]{0,2})\s*(\d{0,6})/);
  const uf = (m && m[1]) || '';
  const num = (m && m[2]) || '';
  return ('CRMV-' + uf + (num ? ' ' + num : '')).replace(/CRMV-\s/, 'CRMV-');
}

/* ---------------- validação ---------------- */
function validCPF(v) {
  const c = onlyD(v);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += parseInt(c[i], 10) * (10 - i);
  let r = (s * 10) % 11; if (r === 10) r = 0;
  if (r !== parseInt(c[9], 10)) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += parseInt(c[i], 10) * (11 - i);
  r = (s * 10) % 11; if (r === 10) r = 0;
  return r === parseInt(c[10], 10);
}
function validCNPJ(v) {
  const c = onlyD(v);
  if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false;
  const calc = (base) => {
    let len = base.length - 7, sum = 0;
    for (let i = base.length; i >= 1; i--) {
      sum += parseInt(base[base.length - i], 10) * len--;
      if (len < 2) len = 9;
    }
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const d1 = calc(c.slice(0, 12));
  const d2 = calc(c.slice(0, 12) + d1);
  return c === c.slice(0, 12) + '' + d1 + d2;
}
function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v || ''); }

const EMAIL_DOMAINS = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'icloud.com', 'live.com', 'uol.com.br', 'bol.com.br'];

/* ---------------- componente de campo ---------------- */
function VtField({ label, value, onChange, mask, validate, type = 'text', placeholder, width, hint, required, suffix, error }) {
  const apply = (raw) => {
    let v = raw;
    if (mask === 'cpf') v = maskCPF(raw);
    else if (mask === 'cnpj') v = maskCNPJ(raw);
    else if (mask === 'phone') v = maskPhone(raw);
    else if (mask === 'cep') v = maskCEP(raw);
    else if (mask === 'date') v = maskDate(raw);
    else if (mask === 'money') v = maskMoney(raw);
    else if (mask === 'weight') v = maskWeight(raw);
    else if (mask === 'crmv') v = maskCRMV(raw);
    onChange(v);
  };
  let state = null;
  if (value) {
    if (validate === 'cpf') state = validCPF(value);
    else if (validate === 'cnpj') state = validCNPJ(value);
    else if (validate === 'email') state = validEmail(value);
  }
  return (
    <label className="vtf" style={width ? { width } : undefined}>
      <span className="vtf-label">{label}{required && <i className="vtf-req">*</i>}</span>
      <span className="vtf-inputwrap">
        <input
          className={`vtf-input${state === false ? ' invalid' : ''}${state === true ? ' valid' : ''}`}
          type={type} value={value || ''} placeholder={placeholder}
          onChange={(e) => apply(e.target.value)}
        />
        {suffix && <span className="vtf-suffix">{suffix}</span>}
        {state === true && <span className="vtf-check ok">✓</span>}
        {state === false && <span className="vtf-check bad">✕</span>}
      </span>
      {hint && !error && <span className="vtf-hint">{hint}</span>}
      {error && <span className="vtf-err">{error}</span>}
      {state === false && validate === 'email' && <span className="vtf-err">Email inválido</span>}
      {state === false && validate === 'cpf' && <span className="vtf-err">CPF inválido</span>}
      {state === false && validate === 'cnpj' && <span className="vtf-err">CNPJ inválido</span>}
    </label>
  );
}

/* Campo de email com autocomplete de domínio */
function VtEmailField({ label, value, onChange, width, required }) {
  const [open, setOpen] = vtUseState(false);
  const suggestions = (() => {
    const v = value || '';
    const at = v.indexOf('@');
    if (at < 0) return [];
    const local = v.slice(0, at);
    const domPart = v.slice(at + 1).toLowerCase();
    if (!local) return [];
    return EMAIL_DOMAINS.filter((d) => d.startsWith(domPart) && d !== domPart).slice(0, 6).map((d) => local + '@' + d);
  })();
  const state = value ? validEmail(value) : null;
  return (
    <label className="vtf" style={width ? { width } : undefined}>
      <span className="vtf-label">{label}{required && <i className="vtf-req">*</i>}</span>
      <span className="vtf-inputwrap">
        <input
          className={`vtf-input${state === false ? ' invalid' : ''}${state === true ? ' valid' : ''}`}
          type="text" value={value || ''} placeholder="nome@email.com"
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
        {state === true && <span className="vtf-check ok">✓</span>}
        {state === false && <span className="vtf-check bad">✕</span>}
        {open && suggestions.length > 0 && (
          <span className="vtf-suggest">
            {suggestions.map((s) => (
              <button key={s} type="button" className="vtf-suggest-item" onMouseDown={(e) => { e.preventDefault(); onChange(s); setOpen(false); }}>{s}</button>
            ))}
          </span>
        )}
      </span>
    </label>
  );
}

/* Campo WhatsApp com botão de abrir */
function VtWhatsField({ label, value, onChange, width }) {
  const num = onlyD(value);
  return (
    <label className="vtf" style={width ? { width } : undefined}>
      <span className="vtf-label">{label}</span>
      <span className="vtf-inputwrap">
        <input className="vtf-input" value={value || ''} placeholder="(00) 00000-0000"
          onChange={(e) => onChange(maskPhone(e.target.value))} />
        <a className={`vtf-whats${num.length >= 10 ? '' : ' disabled'}`}
          href={num.length >= 10 ? `https://wa.me/55${num}` : undefined} target="_blank" rel="noreferrer"
          title="Abrir WhatsApp">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-2.8.7.8-2.7-.2-.3A8 8 0 1 1 12 20zm4.4-5.6c-.2-.1-1.4-.7-1.6-.8s-.4-.1-.5.1-.6.8-.8 1-.3.2-.5.1a6.5 6.5 0 0 1-1.9-1.2 7.3 7.3 0 0 1-1.4-1.7c-.1-.2 0-.4.1-.5l.4-.4.2-.4a.5.5 0 0 0 0-.5l-.8-1.9c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11 11 0 0 0 4.3 3.8c2.6 1 2.6.7 3.1.7a2.5 2.5 0 0 0 1.7-1.2 2 2 0 0 0 .1-1.2c0-.1-.2-.2-.4-.3z" /></svg>
        </a>
      </span>
    </label>
  );
}

Object.assign(window, {
  maskCPF, maskCNPJ, maskPhone, maskCEP, maskDate, maskMoney, maskWeight, maskCRMV,
  validCPF, validCNPJ, validEmail, onlyD, VtField, VtEmailField, VtWhatsField,
});

/* ---------------- toast global ---------------- */
(function () {
  function ensureHost() {
    let h = document.getElementById('vt-toast-host');
    if (!h) { h = document.createElement('div'); h.id = 'vt-toast-host'; document.body.appendChild(h); }
    return h;
  }
  window.vtToast = function (msg, kind) {
    const host = ensureHost();
    const el = document.createElement('div');
    const isErr = kind === 'err' || kind === 'error';
    const isWarn = kind === 'warn' || kind === 'warning';
    el.className = 'vt-toast ' + (isErr ? 'err' : isWarn ? 'warn' : 'ok');
    el.textContent = (isErr ? '✕  ' : isWarn ? '⚠  ' : '✓  ') + msg;
    host.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 250); }, isErr ? 3800 : 2600);
  };
})();
