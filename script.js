/* ── State ─────────────────────────────────────────────── */
const result = { privateKey: '', certificate: '', certName: '' };
let secretVisible = false;

/* ── Helpers ───────────────────────────────────────────── */
function $(id) { return document.getElementById(id); }
function val(id) { return $(id).value.trim(); }

function toggleSecret() {
  secretVisible = !secretVisible;
  $('ds-secret').type = secretVisible ? 'text' : 'password';
  $('eye-icon').innerHTML = secretVisible
    ? '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>'
    : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
}

function showError(msg) {
  $('error-text').textContent = msg;
  $('error-banner').classList.add('visible');
}

function hideError() {
  $('error-banner').classList.remove('visible');
}

function clearFieldErrors() {
  document.querySelectorAll('.error-field').forEach(el => el.classList.remove('error-field'));
}

function markField(id) {
  $(id).classList.add('error-field');
  $(id).focus();
}

/* ── Validation ────────────────────────────────────────── */
const FIELDS = [
  { id: 'customer-name', label: 'Customer name' },
  { id: 'cert-name',     label: 'Certificate name' },
  { id: 'cn',            label: 'Common name (CN)' },
  { id: 'ds-uri',        label: 'Service URI' },
  { id: 'ds-url',        label: 'Token URL' },
  { id: 'ds-cid',        label: 'Client ID' },
  { id: 'ds-secret',     label: 'Client secret' },
];

function validate() {
  clearFieldErrors();
  for (const f of FIELDS) {
    if (!val(f.id)) {
      markField(f.id);
      return `${f.label} is required.`;
    }
  }
  return null;
}

/* ── Submit ────────────────────────────────────────────── */
async function handleSubmit() {
  hideError();
  $('result-card').classList.remove('visible');

  const err = validate();
  if (err) { showError(err); return; }

  const btn = $('submit-btn');
  const status = $('status-msg');
  btn.disabled = true;
  status.classList.add('visible');

  const payload = {
    customerName: val('customer-name'),
    certName:     val('cert-name'),
    cn:           val('cn'),
    destination: {
      uri:          val('ds-uri'),
      url:          val('ds-url'),
      clientId:     val('ds-cid'),
      clientSecret: val('ds-secret'),
    }
  };

  try {
    const response = await fetch(payload.destination.uri, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error(`iFlow returned HTTP ${response.status} — ${response.statusText}`);

    const data = await response.json();

    result.privateKey  = data.privateKey  || data.private_key  || data.key  || '';
    result.certificate = data.certificate || data.cert         || data.crt  || '';
    result.certName    = payload.certName;

    if (!result.privateKey || !result.certificate) {
      throw new Error('Response received but private key or certificate fields were empty. Check the iFlow response field names.');
    }

    $('key-filename').textContent     = `${result.certName}.key`;
    $('cert-filename').textContent    = `${result.certName}.crt`;
    $('result-subtitle').textContent  = `${payload.certName} · ${payload.customerName}`;
    $('result-card').classList.add('visible');
    $('result-card').scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  } catch (e) {
    showError(e.message);
  } finally {
    btn.disabled = false;
    status.classList.remove('visible');
  }
}

/* ── Downloads ─────────────────────────────────────────── */
function triggerDownload(content, filename) {
  const blob = new Blob([content], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

function downloadFile(type) {
  if (type === 'key') {
    triggerDownload(result.privateKey, `${result.certName}.key`);
  } else {
    triggerDownload(result.certificate, `${result.certName}.crt`);
  }
}

async function downloadZip() {
  const zip = new JSZip();
  zip.file(`${result.certName}.key`, result.privateKey);
  zip.file(`${result.certName}.crt`, result.certificate);
  const blob = await zip.generateAsync({ type: 'blob' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${result.certName}-bundle.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

/* ── Enter key submit ──────────────────────────────────── */
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.tagName === 'INPUT' && !$('submit-btn').disabled) {
    handleSubmit();
  }
});