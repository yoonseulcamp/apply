                                                 
import { applicationWindowState } from '../time/deadline.js';

                                        
                                                                                       
                       
                 
                                                               
 

                                 
                 
                    
                               
                                 
 

                              
                         
                          
                        
                             
                            
                            

export const ELIGIBILITY_MESSAGES                                             = {
  EVENT_NOT_PUBLISHED: '지금은 모집 중인 행사가 아니에요.',
  APPLICATION_NOT_OPEN: '아직 신청 기간이 아니에요.',
  APPLICATION_CLOSED: '신청이 마감되었어요.',
  BIRTH_YEAR_NOT_ELIGIBLE: '이번 회차의 참가 연령(출생연도) 범위가 아니에요.',
  PARTICIPANT_RESTRICTED: '현재 참가 신청이 제한되어 있어요. 문의해 주세요.',
  DUPLICATE_APPLICATION: '이미 이 회차에 신청하셨어요. 내 신청에서 확인해 주세요.',
};

/**
 * 신청 가능 여부. 정원이 찼어도 신청은 받는다(운영자 심사 후 대기 처리) — 정원 검사는 승인 시점에 한다.
 * DB 트리거(trg_applications_guard)와 같은 규칙.
 */
export function checkEligibility(event                       , applicant                , now      )                     {
  const issues                     = [];
  if (event.status !== 'published') issues.push('EVENT_NOT_PUBLISHED');
  const window = applicationWindowState(now, { opensAt: event.opensAt, closesAt: event.closesAt });
  if (window === 'not_open') issues.push('APPLICATION_NOT_OPEN');
  if (window === 'closed') issues.push('APPLICATION_CLOSED');
  const range = event.birthYearRange[applicant.gender];
  if (!range || applicant.birthYear < range.min || applicant.birthYear > range.max) issues.push('BIRTH_YEAR_NOT_ELIGIBLE');
  if (applicant.restrictedUntil && applicant.restrictedUntil > now) issues.push('PARTICIPANT_RESTRICTED');
  if (applicant.alreadyAppliedToEvent) issues.push('DUPLICATE_APPLICATION');
  return issues;
}
