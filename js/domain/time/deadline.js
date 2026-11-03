import { addLocalDays, localDateOf, zonedLocalToUtc,                } from './zoned.js';

/**
 * 신청 마감 = 행사 시작 현지 날짜의 "전날" closeLocalTime.
 * 예) 11/8(토) 14:00 행사, 마감 21:00 → 11/7(금) 21:00 KST.
 */
export function computeApplicationDeadline(eventStartsAt      , closeLocalTime           , timeZone        )       {
  const eventDate = localDateOf(eventStartsAt, timeZone);
  const deadline = zonedLocalToUtc(addLocalDays(eventDate, -1), closeLocalTime, timeZone);
  if (deadline.getTime() >= eventStartsAt.getTime()) {
    throw new RangeError('application deadline must be before event start');
  }
  return deadline;
}

                                                                    

export function applicationWindowState(
  now      ,
  window                                          ,
)                         {
  if (window.opensAt && now < window.opensAt) return 'not_open';
  return now < window.closesAt ? 'open' : 'closed';
}
