/**
 * 시간대 계산(브라우저·서버 공용, Intl 기반). DB에는 UTC instant 만 저장하고,
 * "행사 현지 날짜" 같은 달력 개념은 IANA 시간대(기본 Asia/Seoul)로 계산한다.
 */
                                // 'YYYY-MM-DD'
                                // 'HH:mm'

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

const formatterCache = new Map                             ();
function formatter(timeZone        )                      {
  let f = formatterCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    formatterCache.set(timeZone, f);
  }
  return f;
}

function zonedParts(instant      , timeZone        ) {
  const parts                         = {};
  for (const p of formatter(timeZone).formatToParts(instant)) {
    if (p.type !== 'literal') parts[p.type] = Number(p.value);
  }
  return parts                                                                                              ;
}

/** instant 시점에 timeZone 의 UTC 오프셋(분). 서울은 +540. */
export function timeZoneOffsetMinutes(instant      , timeZone        )         {
  const p = zonedParts(instant, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - Math.floor(instant.getTime() / 1000) * 1000) / 60000);
}

export function parseLocalDate(date           )                                      {
  const m = DATE_RE.exec(date);
  if (!m) throw new RangeError(`invalid local date: ${date}`);
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const daysInMonth = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  if (mo < 1 || mo > 12 || d < 1 || d > daysInMonth) throw new RangeError(`invalid local date: ${date}`);
  return { y, m: mo, d };
}

export function parseLocalTime(time           )                             {
  const m = TIME_RE.exec(time);
  if (!m) throw new RangeError(`invalid local time: ${time}`);
  return { h: Number(m[1]), min: Number(m[2]) };
}

/** 현지 날짜+시각 → UTC instant. DST 전환이 있는 시간대도 오프셋을 재확인해 보정한다. */
export function zonedLocalToUtc(date           , time           , timeZone        )       {
  const { y, m, d } = parseLocalDate(date);
  const { h, min } = parseLocalTime(time);
  const naive = Date.UTC(y, m - 1, d, h, min);
  let guess = naive - timeZoneOffsetMinutes(new Date(naive), timeZone) * 60000;
  const corrected = naive - timeZoneOffsetMinutes(new Date(guess), timeZone) * 60000;
  if (corrected !== guess) guess = corrected;
  return new Date(guess);
}

export function localDateOf(instant      , timeZone        )            {
  const p = zonedParts(instant, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

export function localTimeOf(instant      , timeZone        )            {
  const p = zonedParts(instant, timeZone);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

export function addLocalDays(date           , days        )            {
  const { y, m, d } = parseLocalDate(date);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** 달력 날짜 차이(b - a, 일). */
export function diffLocalDays(a           , b           )         {
  const pa = parseLocalDate(a);
  const pb = parseLocalDate(b);
  return Math.round((Date.UTC(pb.y, pb.m - 1, pb.d) - Date.UTC(pa.y, pa.m - 1, pa.d)) / 86_400_000);
}

/** 해당 현지 날짜의 시작(00:00) UTC instant. */
export function startOfLocalDay(date           , timeZone        )       {
  return zonedLocalToUtc(date, '00:00', timeZone);
}

export function addHours(instant      , hours        )       {
  return new Date(instant.getTime() + hours * 3_600_000);
}

/** 한국어 표시용 "2026년 11월 7일(토) 오후 2:00" */
export function formatKoreanDateTime(instant      , timeZone        )         {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone, year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
    hour: 'numeric', minute: '2-digit',
  }).format(instant);
}

export function formatKoreanDate(instant      , timeZone        )         {
  return new Intl.DateTimeFormat('ko-KR', { timeZone, year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }).format(instant);
}

function pad(n        )         {
  return String(n).padStart(2, '0');
}
