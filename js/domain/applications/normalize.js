/** 입력 정규화(서버·클라이언트 공용). 저장 전에 항상 거친다. */

const MOBILE_RE = /^01[016789]\d{7,8}$/;

/** 한국 휴대전화번호 → E.164(+8210...). 형식이 맞지 않으면 null. */
export function normalizeKoreanMobile(input        )                {
  let digits = input.replace(/[\s\-().]/g, '');
  if (digits.startsWith('+82')) digits = '0' + digits.slice(3);
  else if (digits.startsWith('82') && digits.length >= 11) digits = '0' + digits.slice(2);
  if (!/^\d+$/.test(digits) || !MOBILE_RE.test(digits)) return null;
  return '+82' + digits.slice(1);
}

export function maskPhone(e164        )         {
  const local = '0' + e164.replace(/^\+82/, '');
  return `${local.slice(0, 3)}-****-${local.slice(-4)}`;
}

/** E.164 → 010-1234-5678 (운영자 화면 표시용) */
export function formatPhone(e164        )         {
  const local = '0' + e164.replace(/^\+82/, '');
  return `${local.slice(0, 3)}-${local.slice(3, -4)}-${local.slice(-4)}`;
}

export function phoneLast4(e164        )         {
  return e164.slice(-4);
}

/** 카카오 1:1 오픈채팅 URL만 허용(https://open.kakao.com/o/...). 쿼리·프래그먼트 제거. */
export function normalizeOpenChatUrl(input        )                {
  let url     ;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.hostname !== 'open.kakao.com') return null;
  if (!/^\/o\/[A-Za-z0-9_-]{4,40}$/.test(url.pathname)) return null;
  return `https://open.kakao.com${url.pathname}`;
}

/** 공백 정리 + 유니코드 정규화. 빈 문자열은 null. */
export function cleanText(input                           , maxLength        )                {
  if (input == null) return null;
  const v = input.normalize('NFC').replace(/\s+/g, ' ').trim();
  if (v === '') return null;
  return v.length > maxLength ? v.slice(0, maxLength) : v;
}

/** 여러 줄 텍스트: 줄바꿈 유지, 연속 공백만 정리. */
export function cleanMultiline(input                           , maxLength        )                {
  if (input == null) return null;
  const v = input.normalize('NFC').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  if (v === '') return null;
  return v.length > maxLength ? v.slice(0, maxLength) : v;
}
