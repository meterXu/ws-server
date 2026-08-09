export function fmtBytes(mb) {
  if (mb >= 1024) return (mb / 1024).toFixed(1) + ' GB';
  return mb.toFixed(0) + ' MB';
}

export function fmtUptime(s) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h > 0 ? h + 'h ' + m + 'm ' + sec + 's' : m + 'm ' + sec + 's';
}

export function elapsed(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return s + 's';
  if (s < 3600) return Math.floor(s / 60) + 'm' + (s % 60) + 's';
  return Math.floor(s / 3600) + 'h' + Math.floor((s % 3600) / 60) + 'm';
}

export function timePart(iso) {
  const d = new Date(iso);
  return d.getHours().toString().padStart(2, '0') + ':' +
         d.getMinutes().toString().padStart(2, '0') + ':' +
         d.getSeconds().toString().padStart(2, '0');
}

export function datePart(iso) {
  const d = new Date(iso);
  return (d.getMonth() + 1) + '/' + d.getDate();
}

export function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function escAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function barColor(pct) {
  if (pct < 50) return 'bg-accent-500';
  if (pct < 80) return 'bg-amber-500';
  return 'bg-red-500';
}

/**
 * copy text to clipboard
 *
 * works in ALL environments
 * - https / localhost → uses navigator.clipboard (fast, secure-context API)
 * - plain http (non-localhost) → falls back to execCommand('copy')
 */
export async function copyToClipboard(text) {
  // try the modern API first (requires secure context)
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // clipboard API can throw even when present (permission denied, etc.)
    }
  }

  // fallback: classic textarea + execCommand (works everywhere)
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  ta.style.top = '-9999px';
  ta.style.opacity = '0';
  ta.setAttribute('readonly', '');
  document.body.appendChild(ta);
  ta.select();
  ta.setSelectionRange(0, text.length);
  document.execCommand('copy');
  document.body.removeChild(ta);
}
