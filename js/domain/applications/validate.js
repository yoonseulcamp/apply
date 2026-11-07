                                                 
import { cleanMultiline, cleanText, normalizeKakaoId, normalizeKoreanMobile } from './normalize.js';

/**
 * 신청서 입력 검증(운영자 확정 양식 v2, decisions D-020). 화면은 섹션별로 안내하고, API가 전체를 다시 검증한다(서버 검증이 기준).
 * 신앙 정보는 점수화하지 않는다. 주민번호·목회자 연락처는 받지 않는다.
 * 출석 교회 인증 사진은 운영자 결정으로 받으며, 파일 검증은 attachment.ts(checkProofImage)가 한다.
 */
                                   
           
                   
                    
                 
                
                
                  
                        
                             
                                  
           
                         
                         
                             
                             
                               
                               
                                   
                                   
                             
                             
          
                                 
                                     
                                    
                 
                            
                       
                          
                                    
                                   
                                 
                                                  
           
             
                             
                               
                         
                             
                                    
    
 

                                        
                   
                    
                 
                    
                
                  
                        
                     
                          
                      
                      
                     
                     
                              
                       
                           
                                  
                     
                         
                             
                                   
                         
                    
                       
                                   
                                  
                                
                                                  
                                         
 

                                                          
                              
                                                                     
                                       

/** 신청서 섹션(운영자 양식 순서): 1 윤슬에서 만날 당신 · 2 신앙 물결 · 3 당신의 빛 · 4 함께 나눌 시간 · 5 동의 */
export const APPLICATION_STEPS = {
  1: ['realName', 'gender', 'birthYear', 'occupation', 'residenceRegion', 'phone', 'kakaoId', 'sourceChannel', 'intro'],
  2: ['attendsChurch', 'churchName', 'pastorName', 'churchRegion', 'denomination', 'attendancePeriod', 'churchActivities', 'churchProofImage', 'faithIntro'],
  3: ['selfExpression', 'relationshipValues', 'relationshipStory', 'applicationReason', 'preferredAgeNote', 'onsiteNickname', 'sameChurchPreference'],
  4: ['confirmsSchedule', 'confirmsAge', 'confirmsSingle', 'agreesPurpose', 'consents.termsRefund', 'consents.conductPhotoBan'],
  5: ['consents.privacyRequired', 'consents.sensitiveReligion'],
}         ;

export function validateApplicationInput(input                  , currentYear        )                   {
  const errors              = {};
  const warnings              = {};

  const realName = cleanText(input.realName, 30);
  if (!realName || realName.length < 2) errors.realName = '실명을 2자 이상 입력해 주세요.';

  if (!Number.isInteger(input.birthYear) || input.birthYear < currentYear - 80 || input.birthYear > currentYear - 19) {
    errors.birthYear = '출생연도를 확인해 주세요.';
  }
  if (input.gender !== 'male' && input.gender !== 'female') errors.gender = '성별을 선택해 주세요.';

  const phoneE164 = normalizeKoreanMobile(input.phone ?? '');
  if (!phoneE164) errors.phone = '휴대전화번호 형식이 올바르지 않습니다.';

  const intro = cleanMultiline(input.intro, 500);
  if (!intro || intro.length < 10) errors.intro = '자기소개를 10자 이상 적어 주세요.';

  const kakaoId = normalizeKakaoId(input.kakaoId ?? '');
  if (!kakaoId) errors.kakaoId = '카카오톡 아이디를 확인해 주세요(영문·숫자·. _ - 만 쓸 수 있어요).';

  const sourceChannel = cleanText(input.sourceChannel, 50);
  if (!sourceChannel) errors.sourceChannel = '윤슬을 알게 된 경로를 알려 주세요.';
  const occupation = cleanText(input.occupation, 50);
  if (!occupation) errors.occupation = '현재 하는 일이나 전공을 적어 주세요.';
  const residenceRegion = cleanText(input.residenceRegion, 30);
  if (!residenceRegion) errors.residenceRegion = '주로 생활하는 지역을 적어 주세요.';

  if (input.attendsChurch !== true) errors.attendsChurch = '현재 교회에 출석 중인 분만 신청할 수 있어요.';
  if (input.agreesPurpose !== true) errors.agreesPurpose = '모임 취지에 동의해 주세요.';
  const churchName = cleanText(input.churchName, 60);
  if (!churchName) errors.churchName = '출석하고 있는 교회 이름을 적어 주세요.';
  const pastorName = cleanText(input.pastorName, 30);
  if (!pastorName) errors.pastorName = '담임 목사님 성함을 적어 주세요.';
  const denomination = cleanText(input.denomination, 40);
  if (!denomination) errors.denomination = '교회 교단을 적어 주세요. 잘 모르시면 "모름"이라고 적어 주세요.';
  const attendancePeriod = cleanText(input.attendancePeriod, 30);
  if (!attendancePeriod) errors.attendancePeriod = '교회에 출석한 기간을 적어 주세요.';
  const faithIntro = cleanMultiline(input.faithIntro, 500);
  if (!faithIntro) errors.faithIntro = '요즘 신앙생활에서 소중하게 느끼는 것을 적어 주세요.';

  const selfExpression = cleanMultiline(input.selfExpression, 500);
  if (!selfExpression) errors.selfExpression = '요즘의 나를 표현하는 단어나 문장과 그 이유를 적어 주세요.';
  const relationshipValues = cleanMultiline(input.relationshipValues, 300);
  if (!relationshipValues) errors.relationshipValues = '관계에서 소중하게 생각하는 가치를 적어 주세요.';

  if (input.confirmsSchedule !== true) errors.confirmsSchedule = '안내된 날짜와 시간에 참석할 수 있는 분만 신청할 수 있어요.';
  if (input.confirmsAge !== true) errors.confirmsAge = '모집 연령 기준을 확인해 주세요.';
  if (input.confirmsSingle !== true) errors.confirmsSingle = '미혼 청년 대상 모임이에요. 현재 미혼인지 확인해 주세요.';
  if (!['ask_me', 'ok', 'avoid'].includes(input.sameChurchPreference)) {
    errors.sameChurchPreference = '같은 교회 참가 선호를 선택해 주세요.';
  }

  const c = input.consents ?? ({}                                );
  if (c.privacyRequired !== true) errors['consents.privacyRequired'] = '개인정보 수집·이용에 동의해야 신청할 수 있어요.';
  if (c.sensitiveReligion !== true) errors['consents.sensitiveReligion'] = '종교 관련 정보 처리에 대한 별도 동의가 필요해요.';
  if (c.termsRefund !== true) errors['consents.termsRefund'] = '참가비와 취소·환불 기준을 확인해 주세요.';
  if (c.conductPhotoBan !== true) errors['consents.conductPhotoBan'] = '사진 촬영 금지·상호 존중 규칙에 동의해 주세요.';

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    warnings,
    value: {
      realName: realName ,
      birthYear: input.birthYear,
      gender: input.gender,
      phoneE164: phoneE164 ,
      intro: intro ,
      kakaoId: kakaoId ,
      sourceChannel: sourceChannel ,
      occupation: occupation ,
      residenceRegion: residenceRegion ,
      attendsChurch: true,
      agreesPurpose: true,
      churchName: churchName ,
      pastorName: pastorName ,
      churchRegion: cleanText(input.churchRegion, 30),
      denomination: denomination ,
      attendancePeriod: attendancePeriod ,
      churchActivities: cleanMultiline(input.churchActivities, 300),
      faithIntro: faithIntro ,
      selfExpression: selfExpression ,
      relationshipValues: relationshipValues ,
      relationshipStory: cleanMultiline(input.relationshipStory, 1000),
      confirmsSchedule: true,
      confirmsAge: true,
      confirmsSingle: true,
      applicationReason: cleanMultiline(input.applicationReason, 500),
      preferredAgeNote: cleanText(input.preferredAgeNote, 100),
      onsiteNickname: cleanText(input.onsiteNickname, 20),
      sameChurchPreference: input.sameChurchPreference,
      consents: { ...c, reapplyRetention: c.reapplyRetention === true },
    },
  };
}

/** 특정 단계의 오류만 추린다(다단계 폼의 '다음' 버튼용). */
export function errorsForStep(errors             , step                                )              {
  const fields = new Set        (APPLICATION_STEPS[step]);
  return Object.fromEntries(Object.entries(errors).filter(([k]) => fields.has(k)));
}
