// 출석 교회 인증 사진: 보내기 전에 휴대폰에서 크기를 줄이고(긴 변 1600px) JPEG 로 다시 저장한다.
// 다시 저장하면 사진의 위치·기기 정보(EXIF)가 빠진다.
const MAX_SIDE = 1600;
const QUALITY = 0.82;

async function decode(file) {
  if ('createImageBitmap' in window) {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { /* 아래 방법으로 */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** 파일 → { base64, blob, width, height }. 사진이 아니거나 열 수 없으면 오류. */
export async function prepareProofImage(file) {
  if (!file || !file.type.startsWith('image/')) throw new Error('사진 파일을 골라 주세요.');
  let src;
  try { src = await decode(file); } catch {
    throw new Error('이 사진을 열 수 없어요. 다른 사진을 고르거나 화면 캡처로 다시 시도해 주세요.');
  }
  const w = src.width;
  const hgt = src.height;
  const scale = Math.min(1, MAX_SIDE / Math.max(w, hgt));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(hgt * scale));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
  if (typeof src.close === 'function') src.close();
  const blob = await new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('사진을 변환하지 못했어요.'))), 'image/jpeg', QUALITY));
  const base64 = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
    r.onerror = () => reject(new Error('사진을 읽지 못했어요.'));
    r.readAsDataURL(blob);
  });
  return { base64, blob, width: canvas.width, height: canvas.height };
}
