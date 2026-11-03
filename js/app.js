import { h, clear, api, fmtDate, fmtTime, fmtKrw, fmtDuration, draft } from './ui.js';
import { prepareProofImage } from './image.js';

/**
 * 윤슬 참가 신청 사이트. 로그인·인증·내 신청 조회 없음(decisions D-015) — 신청서 제출만.
 * 화면 문구는 운영진이 확정한 신청서 양식(decisions D-020)을 따른다. 참가 조건·검증은 서버가 판단한다.
 */

const ABOUT = '윤슬은 신앙과 일상을 살아가는 청년들이 차 한 잔을 곁에 두고 서로의 이야기를 나누는 자리입니다. 사람마다 걸어온 길과 마음의 속도는 다르지만, 저마다의 물결에는 신앙과 일상, 관계에 대한 생각과 소망이 담겨 있습니다. 그 이야기를 따라가다 보면 하나님께서 각 사람에게 주신 고유한 빛도 조금씩 드러납니다. 서로의 물결 위에 빛이 머물러 작은 윤슬이 되듯, 이곳에서 천천히 서로를 알아가며 따뜻한 연결과 기억을 만들어가길 바랍니다.';

const main = document.getElementById('main');

function route() {
  const hash = location.hash.replace(/^#/, '') || '/';
  const m = hash.match(/^\/apply\/([0-9a-f-]{36})$/);
  window.scrollTo(0, 0);
  if (m) return applyPage(m[1]);
  if (hash === '/done') return donePage();
  return homePage();
}

function failPage(err) {
  clear(main, h('div', { class: 'empty' }, err?.message ?? '잠시 후 다시 시도해 주세요.', h('p', {}, h('a', { href: '#/' }, '처음으로'))));
}

// ── 첫 화면: 모집 중인 모임 ──────────────────────────────
async function homePage() {
  document.title = '윤슬 — 기독 청년들의 이야기 모임';
  let items = [];
  try { ({ items } = await api('GET', '/public/events')); } catch (err) { return failPage(err); }
  const open = items.filter((e) => e.recruitState === 'open');
  const others = items.filter((e) => e.recruitState !== 'open');
  clear(main,
    h('section', { class: 'hero' },
      h('p', { class: 'eyebrow' }, 'YOONSEUL'),
      h('h1', {}, '윤슬은 어떤 모임인가요?'),
      h('div', { class: 'ripple', 'aria-hidden': 'true' }),
      h('p', {}, ABOUT)),
    h('h2', { class: 'section-label' }, '참가 신청 받는 모임'),
    open.length ? open.map(eventCard) : h('div', { class: 'empty' }, '지금 신청을 받는 모임이 없어요. 다음 모임을 준비하고 있어요.'),
    others.length ? [h('h2', { class: 'section-label' }, '다가오는 모임'), others.map(eventCard)] : null);
}

function eventCard(e) {
  const open = e.recruitState === 'open';
  const state = { open: '신청 받는 중', not_open: '신청 오픈 전', closed: '신청 마감', not_recruiting: '모집 종료' }[e.recruitState] ?? '';
  const seat = (g, label) => (e.seats[g].available === 0 ? h('span', { class: 'pill mute' }, `${label} 마감`) : null);
  const body = [
    h('div', { class: 't' }, e.title),
    h('div', { class: 'meta' }, `${fmtDate(e.startsAt)} ${fmtTime(e.startsAt)} · ${e.region}`),
    e.summary ? h('div', { class: 'meta' }, e.summary) : null,
    h('div', { class: 'foot' },
      h('span', { class: open ? 'pill sun' : 'pill mute' }, state),
      h('span', { class: 'pill' }, fmtKrw(e.feeKrw)),
      seat('male', '남성'), seat('female', '여성'),
      open ? h('span', { class: 'cta' }, '신청하기 →') : null),
  ];
  return open ? h('a', { class: 'event-card', href: `#/apply/${e.id}` }, body) : h('div', { class: 'event-card' }, body);
}

// ── 신청서 ──────────────────────────────────────────────
const SOURCES = ['인스타그램', '지인 소개', '교회 공동체', '기타'];
const REQUIRED_TEXT = ['realName', 'birthYear', 'occupation', 'residenceRegion', 'phone', 'openChatUrl', 'intro', 'churchName', 'pastorName',
  'denomination', 'attendancePeriod', 'faithIntro', 'selfExpression', 'relationshipValues'];
const REQUIRED_CHECKS = {
  confirmsSchedule: '안내된 날짜와 시간에 참석할 수 있는지 확인해 주세요.',
  confirmsAge: '모집 연령 기준을 확인해 주세요.',
  confirmsSingle: '미혼 청년 대상 모임이라는 점을 확인해 주세요.',
  'consents.termsRefund': '참가비와 취소·환불 기준을 확인해 주세요.',
  'consents.conductPhotoBan': '참가 규칙을 확인해 주세요.',
  'consents.privacyRequired': '개인정보 수집·이용에 동의해야 신청할 수 있어요.',
  'consents.sensitiveReligion': '민감정보 수집·이용에 동의해야 신청할 수 있어요.',
};

async function applyPage(eventId) {
  let ev;
  let policies;
  try {
    [ev, policies] = await Promise.all([api('GET', `/public/events/${eventId}`), api('GET', '/public/policies')]);
  } catch (err) { return failPage(err); }
  document.title = `${ev.title} 참가 신청 · 윤슬`;
  const draftKey = `yoonseul-draft-${eventId}`;
  const saved = draft.load(draftKey) ?? {};

  if (ev.recruitState !== 'open') {
    clear(main, h('a', { class: 'back', href: '#/' }, '← 모임 목록'), h('h1', { class: 'form-title' }, ev.title),
      h('div', { class: 'empty' }, ev.recruitState === 'not_open' ? '아직 신청을 받기 전이에요.' : '이 모임은 신청이 마감되었어요.'));
    return;
  }

  // 입력칸 모음(이름 → 요소)
  const f = {};
  const errSlots = {};
  const q = (name, label, control, { hint, optional, wrapClass } = {}) => {
    const err = h('p', { class: 'err', role: 'alert' });
    errSlots[name] = err;
    return h('div', { class: `q ${wrapClass ?? ''}`, dataset: { field: name } },
      h('label', { class: 'label', for: `f-${name}` }, label, optional ? h('span', { class: 'opt' }, '(선택)') : h('span', { class: 'req', 'aria-hidden': 'true' }, '*')),
      hint ? h('p', { class: 'hint' }, hint) : null,
      control, err);
  };
  const text = (name, attrs = {}) => (f[name] = h('input', { id: `f-${name}`, name, type: 'text', autocomplete: 'off', value: saved[name] ?? '', ...attrs }));
  const area = (name, attrs = {}) => {
    const el = h('textarea', { id: `f-${name}`, name, rows: 4, ...attrs });
    el.value = saved[name] ?? '';
    return (f[name] = el);
  };
  const radios = (name, options, cls = '') => {
    const box = h('div', { class: `choices ${cls}`, role: 'radiogroup', id: `f-${name}` },
      options.map(([value, label, sub]) => h('label', { class: 'choice' },
        h('input', { type: 'radio', name, value, checked: saved[name] === value }),
        h('span', {}, label, sub ? h('small', {}, sub) : null))));
    f[name] = box;
    return box;
  };
  const check = (name, label, extra) => {
    const input = h('input', { type: 'checkbox', id: `f-${name}`, name, checked: saved[name] === true });
    f[name] = input;
    return h('div', { class: 'q', dataset: { field: name } },
      extra ?? null,
      h('label', { class: 'check' }, input, h('span', { class: 'txt' }, label)),
      (errSlots[name] = h('p', { class: 'err', role: 'alert' })));
  };
  const radioValue = (name) => f[name].querySelector('input:checked')?.value ?? '';

  // 안내
  const eli = ev.eligibility;
  const ageText = eli.male.min === eli.female.min && eli.male.max === eli.female.max
    ? `${eli.male.min}~${eli.male.max}년생`
    : `남성 ${eli.male.min}~${eli.male.max}년생 · 여성 ${eli.female.min}~${eli.female.max}년생`;
  const maxM = ev.headcount.maxPerGender.male;
  const maxF = ev.headcount.maxPerGender.female;
  const maxText = maxM === maxF ? `${maxM}명` : `남 ${maxM}명 · 여 ${maxF}명`;
  const headText = ev.headcount.minPerGender > 0 && maxM === maxF ? `남녀 각 ${ev.headcount.minPerGender}명~${maxM}명` : `남녀 각 최대 ${maxText}`;
  const place = ev.venue ? `${ev.region} · ${ev.venue.name}` : `${ev.region}, 상세 장소는 참가 확정자에게 별도 안내`;
  const info = [
    ['일시', `${fmtDate(ev.startsAt)} ${fmtTime(ev.startsAt)}`],
    ['장소', place],
    ['대상', '현재 교회에 출석하며 신앙생활을 이어가는 미혼 청년'],
    ['참가 인원', headText],
    ['진행 시간', ev.durationNote || fmtDuration(ev.durationMinutes)],
    ['참가비', fmtKrw(ev.feeKrw)],
    ['제공', ev.providedNote || null],
  ].filter(([, v]) => v);

  const proofInput = h('input', { type: 'file', accept: 'image/*', id: 'f-churchProofImage', name: 'churchProofImage' });
  const proofPreview = h('div', { class: 'photo-preview', hidden: true });
  const proofLabel = h('span', {}, '📷 사진 고르기');
  let proof = null; // { base64 }
  proofInput.addEventListener('change', async () => {
    const file = proofInput.files?.[0];
    errSlots.churchProofImage.textContent = '';
    if (!file) return;
    proofLabel.textContent = '사진 준비 중…';
    try {
      const p = await prepareProofImage(file);
      proof = { base64: p.base64 };
      const url = URL.createObjectURL(p.blob);
      clear(proofPreview, h('img', { src: url, alt: '첨부한 출석 교회 인증 사진 미리보기' }),
        h('p', { class: 'hint' }, `첨부됨 (${Math.round(p.base64.length * 0.75 / 1024)}KB). 다른 사진으로 바꾸려면 다시 고르세요.`));
      proofPreview.hidden = false;
      proofLabel.textContent = '📷 다른 사진으로 바꾸기';
    } catch (err) {
      proof = null;
      proofPreview.hidden = true;
      proofLabel.textContent = '📷 사진 고르기';
      errSlots.churchProofImage.textContent = err.message;
    }
  });

  const otherSource = text('sourceOther', { placeholder: '어떻게 알게 되셨는지 적어 주세요', maxlength: 40 });
  const sourceBox = radios('sourceChannel', SOURCES.map((s) => [s, s]));
  const syncOther = () => { otherSource.hidden = radioValue('sourceChannel') !== '기타'; };
  sourceBox.addEventListener('change', syncOther);

  const formError = h('div', { class: 'form-error', role: 'alert', hidden: true });
  const submit = h('button', { type: 'submit', class: 'btn-main' }, '신청서 제출하기');

  const sec = (no, title, desc, ...children) => h('section', { class: 'sec' },
    h('div', { class: 'sec-head' }, no ? h('p', { class: 'no' }, no) : null, h('h2', {}, title), desc ? h('p', {}, desc) : null),
    ...children);

  const form = h('form', { class: 'apply', novalidate: true },
    sec(null, '신청 구분', null,
      q('applicationType', '윤슬에 신청하신 적이 있나요?', radios('applicationType', [
        ['first', '처음 신청해요'], ['reapply', '전에 신청하거나 참가한 적이 있어요'],
      ], 'stack'), { hint: '재신청이면 전에 쓰신 휴대전화 번호를 그대로 적어 주세요.' })),

    sec('01', '윤슬에서 만날 당신', '먼저 윤슬에서 만날 당신에 대해 알려주세요.',
      q('realName', '이름을 적어주세요.', text('realName', { autocomplete: 'name', maxlength: 30 })),
      q('gender', '성별을 선택해주세요.', radios('gender', [['female', '여성'], ['male', '남성']])),
      q('birthYear', '출생연도를 적어주세요.', text('birthYear', { inputmode: 'numeric', maxlength: 4, placeholder: '1995' }), { hint: 'ex. 1995' }),
      q('occupation', '현재 하는 일이나 전공을 알려주세요.', text('occupation', { maxlength: 50 }), { hint: 'ex. 대학생(전공), 교사, 의료직, IT, 디자인' }),
      q('residenceRegion', '주로 생활하는 지역을 알려주세요.', text('residenceRegion', { maxlength: 30, placeholder: '예: 서울 마포구' })),
      q('phone', '휴대전화 번호를 적어주세요.', text('phone', { type: 'tel', inputmode: 'tel', autocomplete: 'tel', maxlength: 13, placeholder: '010-0000-0000' })),
      q('openChatUrl', '연락받을 카카오톡 1:1 오픈채팅 링크를 적어주세요.', text('openChatUrl', { type: 'url', inputmode: 'url', maxlength: 300, placeholder: 'https://open.kakao.com/o/...' }),
        { hint: '참가 가능 여부와 입금 방법을 이 오픈채팅으로 안내드려요. 카카오톡 → 새로운 채팅 → 오픈채팅 → 1:1 채팅 (채팅방 이름: 윤슬, 참여설정: 기본 프로필, 검색 허용 X) → 확인 → 링크 복사' }),
      q('sourceChannel', '윤슬을 어떻게 알게 되셨나요?', h('div', {}, sourceBox, otherSource)),
      q('intro', '간단한 자기소개를 들려주세요.', area('intro', { maxlength: 500, rows: 3 }), { hint: '캠프장이 신청 내용을 확인할 때 참고해요. (10자 이상)' })),

    sec('02', '당신의 신앙 물결', '현재의 교회 생활과 신앙에 대해 편하게 들려주세요.',
      q('churchName', '현재 출석하고 있는 교회 이름과 담임 목사님 성함을 알려주세요.',
        h('div', { class: 'two' }, text('churchName', { maxlength: 60, placeholder: '교회 이름 (ex. 사랑교회)', 'aria-label': '교회 이름' }),
          text('pastorName', { maxlength: 30, placeholder: '담임 목사님 (ex. 홍길동 목사님)', 'aria-label': '담임 목사님 성함' })),
        { hint: 'ex. 사랑교회, 홍길동 목사님' }),
      h('p', { class: 'err', role: 'alert', dataset: { for: 'pastorName' } }),
      q('denomination', '교회 교단을 알려주세요.', text('denomination', { maxlength: 40 }), { hint: 'ex. 대한예수교장로회(합동), 기독교대한감리회, 기독교한국침례회 등' }),
      q('attendancePeriod', '현재 교회에 출석한 기간을 알려주세요.', text('attendancePeriod', { maxlength: 30 }), { hint: 'ex. 모태신앙, 4년' }),
      q('churchActivities', '교회에서 함께하고 있는 활동이나 봉사에 대해 알려주세요.', area('churchActivities', { maxlength: 300, rows: 2 }), { hint: 'ex. 청년부 임원, 소그룹장, 찬양팀', optional: true }),
      q('churchProofImage', '출석 교회를 인증할 수 있는 사진을 첨부해주세요.',
        h('div', { class: 'photo-box' }, h('label', { class: 'photo-pick' }, proofInput, proofLabel), proofPreview),
        { hint: 'ex. 직접 찍은 주보 사진, 헌금 봉투, 본당 사진, 단톡방 등. 사진은 캠프장만 확인하고, 위치 정보는 지운 뒤 올라가요.' }),
      q('faithIntro', '요즘 신앙생활에서 소중하게 느끼는 것을 알려주세요.', area('faithIntro', { maxlength: 500 }),
        { hint: 'ex. 예배를 통해 마음을 다잡는 시간, 함께 기도하고 말씀을 나누는 공동체, 일상에서 하나님을 기억하고 감사하는 마음 등' })),

    sec('03', '당신의 빛', '요즘의 당신과 관계에서 소중하게 여기는 것을 들려주세요.',
      q('selfExpression', '요즘의 나를 잘 표현하는 단어나 문장이 있나요? 그렇게 고른 이유도 들려주세요.', area('selfExpression', { maxlength: 500 })),
      q('relationshipValues', '관계에서 소중하게 생각하는 가치는 무엇인가요?', area('relationshipValues', { maxlength: 300, rows: 3 }), { hint: 'ex. 신뢰, 배려 등' }),
      q('relationshipStory', '최근 나눔, 교제, 관계에 있어 나누고 싶은 고민이나 이야기가 있다면 적어주세요.', area('relationshipStory', { maxlength: 1000 }), { optional: true })),

    sec('04', '함께 나눌 시간', '참여 전에 아래 내용을 확인 후 체크해주세요.',
      check('confirmsSchedule', `안내된 날짜와 시간(${fmtDate(ev.startsAt)} ${fmtTime(ev.startsAt)})에 참석할 수 있어요.`),
      check('confirmsAge', `모집 연령 기준(${ageText})을 확인했고, 해당해요.`),
      check('confirmsSingle', '현재 미혼이며, 미혼 청년 대상 모임이라는 점을 확인했어요.'),
      check('consents.termsRefund', '참가비와 취소·환불 기준을 확인했어요.',
        h('div', { class: 'policy' }, `참가비는 ${fmtKrw(ev.feeKrw)}이며, ${ev.refundPolicy?.body ?? '취소·환불 기준은 캠프장에게 문의해 주세요.'}`)),
      policies.conduct ? check('consents.conductPhotoBan', '모임 중 참가자 사진 촬영 금지와 서로를 존중하는 참가 규칙을 지킬게요.',
        h('div', { class: 'policy' }, policies.conduct.body)) : null),

    sec('05', '윤슬과 연락을 이어가기 위해', '신청 내용을 확인하고 모임을 준비하기 위해 필요한 동의를 부탁드립니다.',
      check('consents.privacyRequired', '개인정보 수집·이용에 동의합니다.', policies.privacy ? h('div', { class: 'policy' }, policies.privacy.body) : null),
      check('consents.sensitiveReligion', '민감정보(종교·신앙 관련 정보) 수집·이용에 동의합니다.', policies.sensitive_religion ? h('div', { class: 'policy' }, policies.sensitive_religion.body) : null)),

    h('div', { class: 'submit-bar' },
      h('p', { class: 'note' }, '신청서를 제출해주시면 윤슬 캠프장이 신청 내용을 확인한 뒤 참가 가능 여부와 입금 방법을 안내드립니다. 참가 가능 안내를 받은 후 참가비 입금이 확인되면 신청이 최종 확정됩니다.'),
      formError, submit));
  errSlots.pastorName = form.querySelector('[data-for="pastorName"]');
  syncOther();
  if (saved.sourceChannel === '기타' && saved.sourceOther) otherSource.value = saved.sourceOther;

  // 입력 중인 내용은 이 탭에만 임시 저장(사진 제외) — 새로고침해도 다시 쓰지 않도록
  const collect = () => {
    const v = {};
    for (const [k, el] of Object.entries(f)) {
      if (el.tagName === 'DIV') v[k] = radioValue(k);
      else if (el.type === 'checkbox') v[k] = el.checked;
      else if (el.type !== 'file') v[k] = el.value;
    }
    return v;
  };
  // 고친 항목의 오류 표시는 바로 지운다
  const clearFieldError = (e) => {
    const name = e.target?.name;
    const key = name === 'sourceOther' ? 'sourceChannel' : name;
    const slot = errSlots[key];
    if (!slot || !slot.textContent) return;
    slot.textContent = '';
    (slot.closest('.q') ?? slot.previousElementSibling)?.classList.remove('invalid');
  };
  form.addEventListener('input', (e) => { clearFieldError(e); draft.save(draftKey, collect()); });
  form.addEventListener('change', (e) => { clearFieldError(e); draft.save(draftKey, collect()); });

  const showErrors = (fields) => {
    for (const slot of Object.values(errSlots)) slot.textContent = '';
    form.querySelectorAll('.q.invalid').forEach((x) => x.classList.remove('invalid'));
    const alias = { attendsChurch: 'churchName', agreesPurpose: 'confirmsSingle' };
    let first = null;
    for (const [key, msg] of Object.entries(fields)) {
      const k = alias[key] ?? key;
      const slot = errSlots[k];
      if (!slot) continue;
      if (!slot.textContent) slot.textContent = String(msg);
      const wrap = slot.closest('.q') ?? slot.previousElementSibling;
      wrap?.classList.add('invalid');
      first ??= wrap ?? slot;
    }
    first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return !!first;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    formError.hidden = true;
    const v = collect();
    // 화면에서 바로 알려 줄 수 있는 것만 먼저 확인(나머지는 서버가 판단)
    const pre = {};
    if (!v.applicationType) pre.applicationType = '처음 신청인지, 재신청인지 골라 주세요.';
    if (!v.gender) pre.gender = '성별을 선택해 주세요.';
    if (!v.sourceChannel) pre.sourceChannel = '윤슬을 알게 된 경로를 골라 주세요.';
    if (v.sourceChannel === '기타' && !v.sourceOther.trim()) pre.sourceChannel = '어떻게 알게 되셨는지 적어 주세요.';
    if (!proof) pre.churchProofImage = '출석 교회를 인증할 수 있는 사진을 첨부해 주세요.';
    // 비어 있는 필수 항목은 한 번에 표시(형식·길이 같은 세부 규칙은 서버가 판단)
    for (const k of REQUIRED_TEXT) if (!String(v[k] ?? '').trim()) pre[k] ??= '이 항목을 적어 주세요.';
    for (const [k, msg] of Object.entries(REQUIRED_CHECKS)) if (f[k] && v[k] !== true) pre[k] ??= msg;
    if (Object.keys(pre).length) {
      showErrors(pre);
      formError.textContent = '표시된 항목을 확인해 주세요.';
      formError.hidden = false;
      return;
    }
    const year = Number(v.birthYear.replace(/\D/g, ''));
    const body = {
      eventId, applicationType: v.applicationType,
      realName: v.realName, gender: v.gender, birthYear: Number.isFinite(year) ? year : 0,
      occupation: v.occupation, residenceRegion: v.residenceRegion, phone: v.phone, openChatUrl: v.openChatUrl.trim(),
      sourceChannel: v.sourceChannel === '기타' ? `기타: ${v.sourceOther.trim()}` : v.sourceChannel,
      intro: v.intro,
      // 교회 이름을 적은 것 = 현재 출석 중, 미혼 청년 대상 확인 = 모임 취지 동의(양식에 별도 질문 없음, decisions D-020)
      attendsChurch: v.churchName.trim() !== '', agreesPurpose: v.confirmsSingle === true,
      churchName: v.churchName, pastorName: v.pastorName, denomination: v.denomination, attendancePeriod: v.attendancePeriod,
      churchActivities: v.churchActivities || null, faithIntro: v.faithIntro,
      selfExpression: v.selfExpression, relationshipValues: v.relationshipValues, relationshipStory: v.relationshipStory || null,
      confirmsSchedule: v.confirmsSchedule === true, confirmsAge: v.confirmsAge === true, confirmsSingle: v.confirmsSingle === true,
      sameChurchPreference: 'ask_me',
      churchProofImage: { dataBase64: proof.base64 },
      consents: {
        privacyRequired: v['consents.privacyRequired'] === true, sensitiveReligion: v['consents.sensitiveReligion'] === true,
        termsRefund: v['consents.termsRefund'] === true, conductPhotoBan: v['consents.conductPhotoBan'] === true,
        reapplyRetention: false,
      },
    };
    submit.disabled = true;
    submit.textContent = '제출하는 중…';
    try {
      await api('POST', '/applications', body);
      draft.clear(draftKey);
      location.hash = '#/done';
    } catch (err) {
      const fields = err.details?.fields;
      if (fields && showErrors(fields)) {
        formError.textContent = '표시된 항목을 확인해 주세요.';
      } else {
        formError.textContent = err.message;
      }
      formError.hidden = false;
      if (!fields) formError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } finally {
      submit.disabled = false;
      submit.textContent = '신청서 제출하기';
    }
  });

  clear(main,
    h('a', { class: 'back', href: '#/' }, '← 모임 목록'),
    h('h1', { class: 'form-title' }, ev.title),
    h('p', { class: 'meta' }, '참가신청서'),
    h('section', { class: 'intro-block' },
      h('h2', {}, '윤슬은 어떤 모임인가요?'),
      h('p', {}, ABOUT)),
    h('section', { class: 'intro-block' },
      h('h2', {}, '안내'),
      h('ul', { class: 'info-list' }, info.map(([k, v]) => h('li', {}, h('b', {}, k), h('span', {}, v)))),
      ev.description ? h('p', { class: 'note prewrap' }, ev.description) : null,
      h('p', { class: 'note' }, '신청서를 제출해주시면 윤슬 캠프장이 신청 내용을 확인한 뒤 참가 가능 여부와 입금 방법을 안내드립니다. 참가 가능 안내를 받은 후 참가비 입금이 확인되면 신청이 최종 확정됩니다.')),
    form);
}

// ── 접수 완료 ────────────────────────────────────────────
function donePage() {
  document.title = '신청 완료 · 윤슬';
  clear(main, h('section', { class: 'done' },
    h('div', { class: 'mark', 'aria-hidden': 'true' }, '✓'),
    h('h1', {}, '신청서가 잘 전달되었어요'),
    h('p', {}, '소중한 이야기를 들려주셔서 고맙습니다.'),
    h('ol', { class: 'steps' },
      h('li', {}, '윤슬 캠프장이 신청 내용을 확인해요.'),
      h('li', {}, '남겨 주신 오픈채팅으로 참가 가능 여부와 입금 방법을 안내드려요.'),
      h('li', {}, '안내를 받은 뒤 참가비 입금이 확인되면 신청이 최종 확정돼요.')),
    h('p', { class: 'fine' }, '신청 내용을 바꾸거나 취소하고 싶으시면 안내받은 오픈채팅으로 말씀해 주세요.'),
    h('p', {}, h('a', { href: '#/' }, '처음으로'))));
}

window.addEventListener('hashchange', route);
route();
