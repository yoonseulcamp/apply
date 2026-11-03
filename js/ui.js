import { INTAKE_URL } from './site-config.js';

// 화면 도구. 참가자가 입력한 값·서버 응답은 항상 textContent 로 넣는다(innerHTML 금지).
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v === false || v === null || v === undefined) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k === 'value') el.value = v;
    else if (k === 'checked') el.checked = !!v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

export function clear(el, ...children) {
  el.replaceChildren();
  append(el, children);
  return el;
}

const TZ = 'Asia/Seoul';
const dateFmt = new Intl.DateTimeFormat('ko-KR', { timeZone: TZ, year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
const timeFmt = new Intl.DateTimeFormat('ko-KR', { timeZone: TZ, hour: 'numeric', minute: '2-digit' });

export function fmtDate(iso) { return dateFmt.format(new Date(iso)); }
export function fmtTime(iso) { return timeFmt.format(new Date(iso)); }
export function fmtKrw(n) { return `${Number(n).toLocaleString('ko-KR')}원`; }

export function fmtDuration(min) {
  if (!min || min <= 0) return null;
  const hh = Math.floor(min / 60);
  const mm = min % 60;
  return `약 ${hh ? `${hh}시간` : ''}${hh && mm ? ' ' : ''}${mm ? `${mm}분` : ''}`;
}

export async function api(method, path, body) {
  if (INTAKE_URL) return (await import('./intake.js')).intakeApi(method, path, body);
  let res;
  try {
    res = await fetch(`/api/v1${path}`, {
      method, credentials: 'same-origin',
      headers: { accept: 'application/json', ...(body ? { 'content-type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw Object.assign(new Error('인터넷 연결을 확인한 뒤 다시 시도해 주세요.'), { code: 'NETWORK' });
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const e = data?.error ?? {};
    throw Object.assign(new Error(e.message ?? `요청을 처리하지 못했어요(${res.status}).`), { code: e.code ?? 'UNKNOWN', details: e.details, status: res.status });
  }
  return data;
}

/** 세션 저장소(탭을 닫으면 사라짐). 막혀 있어도 화면은 정상 동작. */
export const draft = {
  load(key) { try { return JSON.parse(sessionStorage.getItem(key) ?? 'null'); } catch { return null; } },
  save(key, v) { try { sessionStorage.setItem(key, JSON.stringify(v)); } catch { /* 저장 안 돼도 됨 */ } },
  clear(key) { try { sessionStorage.removeItem(key); } catch { /* 무시 */ } },
};
