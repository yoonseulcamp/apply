// 내보낸 신청 사이트(서버 없음)에서 API 대신 구글 접수 창구를 쓰는 부분. decisions D-028.
// 제출 전 검사는 서버와 같은 도메인 코드(내보낼 때 js/domain 으로 복사)로 하고, 가져올 때 서버가 다시 검사한다.
import { checkEligibility, ELIGIBILITY_MESSAGES } from './domain/applications/eligibility.js';
import { validateApplicationInput } from './domain/applications/validate.js';
import { applicationWindowState } from './domain/time/deadline.js';
import { INTAKE_URL } from './site-config.js';

const fail = (code, message, details) => Object.assign(new Error(message), { code, details });

async function call(init) {
  let res;
  try {
    res = await fetch(INTAKE_URL, { redirect: 'follow', credentials: 'omit', ...init });
  } catch {
    throw fail('NETWORK', '인터넷 연결을 확인한 뒤 다시 시도해 주세요.');
  }
  const data = await res.json().catch(() => null);
  if (!data?.ok) throw fail(data?.error?.code ?? 'UNKNOWN', data?.error?.message ?? '잠시 후 다시 시도해 주세요.');
  return data;
}

let sitePromise;
const site = () => (sitePromise ??= call({ method: 'GET' }).then((d) => d.site));

/** 저장된 공개 정보는 시간이 지나 있으므로 모집 상태는 지금 시각으로 다시 계산한다 */
function withCurrentState(e) {
  if (e.status !== 'published') return { ...e, recruitState: 'not_recruiting' };
  const opensAt = e.applicationOpensAt ? new Date(e.applicationOpensAt) : null;
  return { ...e, recruitState: applicationWindowState(new Date(), { opensAt, closesAt: new Date(e.applicationClosesAt) }) };
}

async function submit(body) {
  const now = new Date();
  const checked = validateApplicationInput(body, now.getUTCFullYear());
  if (!checked.ok) throw fail('VALIDATION_FAILED', '신청서 내용을 확인해 주세요.', { fields: checked.errors });
  const ev = (await site()).items.find((e) => e.id === body.eventId);
  if (!ev) throw fail('NOT_FOUND', '행사를 찾을 수 없습니다.');
  const issues = checkEligibility({
    status: ev.status, opensAt: ev.applicationOpensAt ? new Date(ev.applicationOpensAt) : null, closesAt: new Date(ev.applicationClosesAt), birthYearRange: ev.eligibility,
  }, { gender: checked.value.gender, birthYear: checked.value.birthYear, restrictedUntil: null, alreadyAppliedToEvent: false }, now);
  if (issues.length) throw fail(issues[0], ELIGIBILITY_MESSAGES[issues[0]]);
  // text/plain 이어야 브라우저가 사전 요청 없이 Apps Script 로 보낼 수 있다
  return call({ method: 'POST', headers: { 'content-type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'submit', application: body }) });
}

export async function intakeApi(method, path, body) {
  if (method === 'POST' && path === '/applications') return submit(body);
  const s = await site();
  if (path === '/public/events') return { items: s.items.map(withCurrentState) };
  if (path === '/public/policies') return s.policies;
  const m = path.match(/^\/public\/events\/([0-9a-f-]{36})$/);
  const ev = m && s.items.find((e) => e.id === m[1]);
  if (ev) return withCurrentState(ev);
  throw fail('NOT_FOUND', '행사를 찾을 수 없습니다.');
}
