// ═══ Age-based sleep profiles (HTML 원본 값 — Galland 2012 메타분석 기반) ═══
export const PROF = [
  { ko: '0~6주', min: 0, max: 41, a: 45, b: 60, ot: 70, n: 5, nd: 45, ts: 960, ns: 480, maxDay: 480 },
  { ko: '6주~3개월', min: 42, max: 89, a: 60, b: 80, ot: 95, n: 4, nd: 60, ts: 900, ns: 540, maxDay: 300 },
  { ko: '3~4개월', min: 90, max: 134, a: 75, b: 100, ot: 115, n: 4, nd: 75, ts: 870, ns: 600, maxDay: 270 },
  { ko: '4~6개월', min: 135, max: 209, a: 105, b: 135, ot: 150, n: 3, nd: 90, ts: 840, ns: 630, maxDay: 210 },
  { ko: '6~8개월', min: 210, max: 269, a: 120, b: 160, ot: 180, n: 3, nd: 80, ts: 840, ns: 660, maxDay: 180 },
  { ko: '8~10개월', min: 270, max: 314, a: 150, b: 180, ot: 210, n: 2, nd: 90, ts: 810, ns: 660, maxDay: 150 },
  { ko: '10~12개월', min: 315, max: 374, a: 170, b: 210, ot: 240, n: 2, nd: 90, ts: 780, ns: 660, maxDay: 150 },
  { ko: '12~14개월', min: 375, max: 424, a: 190, b: 215, ot: 245, n: 2, nd: 75, ts: 780, ns: 660, maxDay: 150 },
  { ko: '14~18개월', min: 425, max: 544, a: 240, b: 300, ot: 330, n: 1, nd: 120, ts: 780, ns: 660, maxDay: 120 },
  { ko: '18~24개월', min: 545, max: 9999, a: 270, b: 330, ot: 360, n: 1, nd: 110, ts: 750, ns: 630, maxDay: 120 },
];

export const FERBER = [
  [3, 5, 10], [5, 10, 12], [10, 12, 15], [12, 15, 17], [15, 17, 20], [17, 20, 25], [20, 25, 30],
];

export const FADING = {
  ko: [
    {l:'옆에서 토닥이기',d:'2~4일',h:'아기 옆에서 등을 일정한 리듬으로 토닥여주세요.',tip:'처음에는 30분 넘게 걸릴 수 있어요. 정상이에요! 첫째 날은 일정한 리듬을 유지하고, 이후 매일 조금씩 토닥이는 횟수와 강도를 줄여주세요.'},
    {l:'손만 올려두기',d:'2~4일',h:'토닥이지 말고 등에 손만 가만히 올려두세요.',tip:'이전 단계에서 토닥임을 서서히 줄여왔기 때문에 아기가 이미 적응 중이에요. 처음 1~2일은 불안해할 수 있지만, 손의 무게감만으로도 안정을 느끼는 아기가 많아요.'},
    {l:'옆에 앉아있기',d:'3~4일',h:'손을 떼고 침대 옆에 앉아만 있으세요.',tip:'쉿쉿 소리를 내도 괜찮아요. 핵심은 신체 접촉 없이 존재감만으로 안심시키는 거예요. 아기가 울면 잠깐 토닥여준 뒤 다시 손을 떼세요.'},
    {l:'방 중간으로 이동',d:'2~4일',h:'의자를 방 중간으로 옮기세요.',tip:'거리가 멀어져도 아기가 당신을 볼 수 있어요. 여기서 좀 더 오래(3~5일) 머물러도 괜찮아요. 서두르지 마세요.'},
    {l:'문 앞으로 이동',d:'2~4일',h:'문 앞까지 이동하세요.',tip:'아기 시야 경계에 있는 거예요. 이 단계가 되면 보통 울음이 많이 줄어있어요. 안 줄었다면 이전 단계로 돌아가세요.'},
    {l:'문 밖에서 목소리만',d:'3~5일',h:'문 밖에서 괜찮아~ 목소리만 들려주세요.',tip:'첫 번째 큰 분리예요. 처음 1~2일은 울 수 있지만 대부분 5~10분 이내에 잠들어요. 들어가고 싶으면 2분만 더 기다려보세요.'},
    {l:'혼자 잠들기',d:'완료!',h:'축하해요! 독립 수면 성공!',tip:'가끔 퇴행할 수 있어요. 이앓이, 감기, 여행 후 1~2일은 이전 단계로 돌아갔다가 다시 빼면 돼요.'},
  ],
};

export const CHEER_KO = [
  '괜찮아요. 아기가 배우고 있어요 💜',
  '당신은 좋은 부모예요 🤍',
  '울음이 줄어들 거예요 💪',
  '아기는 안전해요 🌙',
  '곧 나아져요 ✨',
  '수면교육은 선물이에요 🎁',
  '매일 나아지고 있어요 🌟',
  '심호흡해도 괜찮아요 🫁',
  '수많은 부모가 해냈어요 🌍',
  '내일은 더 쉬워져요 🌅',
];

export const isNightSleep = (log) => {
  const h = new Date(log.start).getHours();
  return h >= 18 || h < 6;
};

// ═══ WW v2 — Huckleberry 검증 데이터 (월령 앵커 + 선형 보간) ═══
// 일수(days) 기준 wake window {min, max} (분).
// 앵커 사이는 선형 보간, 범위 밖은 가장 가까운 앵커 값 사용.
export const HB_WW = [
  { days: 90,  min: 60,  max: 120 },
  { days: 120, min: 90,  max: 150 },
  { days: 150, min: 120, max: 180 },
  { days: 180, min: 120, max: 180 },
  { days: 210, min: 135, max: 210 },
  { days: 240, min: 135, max: 210 },
  { days: 270, min: 165, max: 210 },
  { days: 300, min: 180, max: 225 },
  { days: 330, min: 180, max: 225 },
  { days: 360, min: 195, max: 240 },
  { days: 420, min: 195, max: 240 },
  { days: 480, min: 195, max: 240 }
];

// WW v2 — Huckleberry 테이블에서 선형 보간으로 {min, max} 반환.
export const getHbWW = (days) => {
  if (days <= HB_WW[0].days) return { min: HB_WW[0].min, max: HB_WW[0].max };
  if (days >= HB_WW[HB_WW.length - 1].days) {
    const last = HB_WW[HB_WW.length - 1];
    return { min: last.min, max: last.max };
  }
  for (let i = 0; i < HB_WW.length - 1; i++) {
    const a = HB_WW[i];
    const b = HB_WW[i + 1];
    if (days >= a.days && days <= b.days) {
      const span = Math.max(1, b.days - a.days);
      const r = (days - a.days) / span;
      return {
        min: Math.round(a.min + (b.min - a.min) * r),
        max: Math.round(a.max + (b.max - a.max) * r)
      };
    }
  }
  return { min: HB_WW[0].min, max: HB_WW[0].max };
};

// WW v2 — getWWRange는 getHbWW 위임 (기존 API 유지).
// 90일 미만은 변동성 커서 null 반환 (UI에서 안 표시).
export const getWWRange = (days) => {
  if (days < 90) return null;
  return getHbWW(days);
};

// WW v2 — 낮잠 N회 기준 슬롯별 WW 배열.
// 슬롯 수 = napCount + 1 (마지막은 취침 전 깨시).
// 1회 낮잠은 null 반환 → UI에서 WW 섹션 숨김.
//   5회: [min, mid, mid, mid, mid, max]
//   4회: [min, mid, mid, mid, max]
//   3회: [min, mid, mid, max]
//   2회: [min, mid, max]
export const getWWArray = (days, napCount) => {
  if (!napCount || napCount < 2) return null;
  const r = getHbWW(days);
  const min = r.min;
  const max = r.max;
  const mid = Math.round((min + max) / 2);
  const slots = napCount + 1;
  const arr = [];
  for (let i = 0; i < slots; i++) {
    if (i === 0) arr.push(min);
    else if (i === slots - 1) arr.push(max);
    else arr.push(mid);
  }
  return arr;
};

// WW v2 — 가드레일: 계산된 WW를 [min, max] 범위로 자르기.
export const clampWW = (ww, days) => {
  const r = getHbWW(days);
  if (ww > r.max) return r.max;
  if (ww < r.min) return r.min;
  return ww;
};

// ═══ Catnap (last nap of multi-nap day) max length by months ═══
// Sources: Weissbluth, Cara Babies (bridge nap 30-45min @6-12mo), Wee Bee Dreaming
export const catnapMaxByMonths = (months) => {
  if (months <= 4) return 45;
  if (months <= 6) return 40;
  if (months <= 9) return 35;
  if (months <= 11) return 30;
  if (months <= 12) return 20;
  return 0; // 13mo+: catnap dropped
};

// ═══ Last-nap recommendation (static, age + time-to-bed only) ═══
// Returns { skip, ideal, max, min } in minutes.
//   skip: if too close to bedtime, recommend skipping this nap
//   min/max/ideal: bracket for safe last-nap duration
export const getLastNapRec = (days, timeToBedMin) => {
  const months = Math.floor((days || 0) / 30);
  const catMax = catnapMaxByMonths(months);
  if (catMax === 0) return { skip: false, ideal: 60, max: 90, min: 30 };
  if (timeToBedMin < 90) return { skip: true, ideal: 0, max: 0, min: 0 };
  if (timeToBedMin > 240) return { skip: false, ideal: catMax, max: catMax, min: 20 };
  return {
    skip: false,
    ideal: Math.min(catMax, Math.max(20, Math.floor((timeToBedMin - 90) / 2))),
    max: catMax,
    min: 20
  };
};

// ═══ Per-nap hard cap (protect night sleep) — Weissbluth/Cara consensus ═══
export const getPerNapCap = (days) => {
  if (days < 360) return 120;       // <12mo: 2h
  if (days < 540) return 150;       // 12-18mo: 2.5h (or 2h if 2 naps still)
  return 180;                        // 18mo+: 3h
};

// ═══ Late-nap cutoff (protect bedtime) — by age ═══
export const getLateNapCutoffMin = (days) => {
  if (days < 180) return 17 * 60;          // 4-6mo: 17:00
  if (days < 240) return 16 * 60 + 30;     // 6-8mo: 16:30
  if (days < 360) return 16 * 60;          // 8-12mo: 16:00
  if (days < 540) return 15 * 60 + 30;     // 12-18mo: 15:30
  return 15 * 60;                           // 18mo+: 15:00
};

// ═══ Wee Bee Dreaming 기반 rescue nap 기준 ═══
// 월령별: 정상 낮잠 cutoff, rescue nap window, rescue 실패 시 취침 시각
// 기준: https://www.weebeedreaming.com/my-blog/early-bedtime-vs-late-nap
export const getRescueNapWindow = (days) => {
  if (days < 120) {
    // 3-4개월: 4:45pm 이전 = crib, 그 후 = 5:00-5:30 rescue, 실패 시 6:00pm 취침
    return { cribCutoffH: 16.75, rescueStartH: 17.0, rescueEndH: 17.5, rescueCapMin: 30, earlyBedH: 18.0 };
  }
  if (days < 270) {
    // 4-9개월: 4:15pm 이전 = crib, 그 후 = 4:30-5:00 rescue, 실패 시 5:30pm 취침
    return { cribCutoffH: 16.25, rescueStartH: 16.5, rescueEndH: 17.0, rescueCapMin: 30, earlyBedH: 17.5 };
  }
  // 9개월+: 3:45pm 이전 = crib, 그 후 = 3:30-4:00 rescue, 실패 시 17:00 취침
  return { cribCutoffH: 15.75, rescueStartH: 15.5, rescueEndH: 16.0, rescueCapMin: 30, earlyBedH: 17.0 };
};

// ═══ 밤잠 감지: 늦은 오후 잠이 밤잠일 확률 ═══
// 조건: 잠 시작 시간 + 잠 길이 + 완료된 낮잠 개수 종합 판단
// - rescue window 내의 짧은 잠(≤45min, 끝난 상태)은 쪽잠으로 인정
// - rescue window 이후 시작 + 낮잠 충분 → 밤잠
// - rescueEndH 이후 시작 (길이 무관) → 밤잠
// - 낮잠 0개 + 매우 늦은 시각 → overtired 밤잠
export const detectNightSleepStart = (sleepStartTs, sleepEndTs, days, completedNapCount, expectedNapCount) => {
  const startH = new Date(sleepStartTs).getHours();
  const startM = new Date(sleepStartTs).getMinutes();
  const startTimeH = startH + startM / 60;
  const win = getRescueNapWindow(days);
  const durMin = sleepEndTs != null && sleepEndTs > sleepStartTs 
    ? Math.round((sleepEndTs - sleepStartTs) / 60000) 
    : 0; // in-progress (end===start)

  // Rule 0 (최우선): 18시 이후 시작된 잠은 길이 무관 밤잠 (false start 포함)
  // - 19시 시작 45분 잠 = false start 밤잠 (쪽잠으로 오인 방지)
  if (startTimeH >= 18) return true;

  // 완료된 짧은 잠(0 < dur ≤45min)은 쪽잠으로 인식 (18시 이전 한정)
  if (durMin > 0 && durMin <= 45) return false;
  
  // Rule 1: 낮잠 0개 + rescueEndH 이상 → overtired 밤잠 (진행중 or 완료 무관)
  if (completedNapCount === 0 && startTimeH >= win.rescueEndH) {
    return true;
  }
  // Rule 2: 낮잠 충분 + rescueEndH 확실히 지남 (30분+) → 밤잠
  if (completedNapCount >= expectedNapCount - 1 && startTimeH > win.rescueEndH + 0.5) {
    return true;
  }
  return false;
};

export const gP = (days) => {
  for (let i = 0; i < PROF.length; i++) {
    if (days >= PROF[i].min && days <= PROF[i].max) return PROF[i];
  }
  return PROF[PROF.length - 1];
};

// WW v2 — interpWW 제거됨. getHbWW / getWWArray 사용.

// WW v2 — 위치별 낮잠 길이 5일 평균 (이상값 30~120분 필터, 마이크로/밤잠 제외)
// 반환: { 1: avgMin, 2: avgMin, ... } (1-indexed by nap order)
export const anaNapDur = (sl) => {
  const result = {};
  if (!sl || sl.length === 0) return result;
  const today0 = new Date(); today0.setHours(0,0,0,0);
  const cutoff = today0.getTime() - 5 * 86400000;

  const byDay = {};
  for (let i = 0; i < sl.length; i++) {
    const l = sl[i];
    if (!l.end) continue;
    if (l.start < cutoff) continue;
    const h = new Date(l.start).getHours();
    if (h >= 18 || h < 6) continue;
    if (l.micro) continue;
    const d = new Date(l.start);
    const key = d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();
    if (!byDay[key]) byDay[key] = [];
    byDay[key].push(l);
  }

  const byPos = {};
  Object.keys(byDay).forEach(function(key) {
    const naps = byDay[key].sort(function(a, b) { return a.start - b.start; });
    for (let ni = 0; ni < naps.length; ni++) {
      const dur = Math.floor((naps[ni].end - naps[ni].start) / 60000);
      if (dur < 30 || dur > 120) continue;
      const pos = ni + 1;
      if (!byPos[pos]) byPos[pos] = [];
      byPos[pos].push(dur);
    }
  });

  Object.keys(byPos).forEach(function(pos) {
    const arr = byPos[pos];
    if (arr.length === 0) return;
    let sum = 0;
    for (let k = 0; k < arr.length; k++) sum += arr[k];
    result[pos] = Math.round(sum / arr.length);
  });

  return result;
};

// WW v2 — 하루 스케줄 예측 (forward from wake).
// 기록된 낮잠은 그대로 사용, 미진행 슬롯은 WW 배열로 forward 계산.
// 마지막 낮잠은 catnap (월령별 max 적용). 모든 낮잠은 perNapCap로 제한.
//
// params:
//   wakeTs:        오늘 기상 timestamp
//   recordedNaps:  오늘 기록된 낮잠 [{start, end}, ...] (시간 순)
//   days:          아기 일수
//   napCount:      목표 낮잠 수 (보통 prof.n)
//   napDurAvg:     anaNapDur 결과 {pos: avgMin} (없으면 napDurDefault 사용)
//   napDurDefault: 평균 없을 때 fallback (분, 보통 prof.nd)
//
// 반환: { slots: [...], predBedTs }
//   slot: {start, end, predDur, isCatnap, lastNap, recorded:true|undefined, predicted:true|undefined}
export const predictDaySchedule = (params) => {
  const days = params.days || 0;
  const napCount = params.napCount || 0;
  const wakeTs = params.wakeTs;
  const recordedNaps = params.recordedNaps || [];
  const napDurAvg = params.napDurAvg || {};
  const napDurDefault = params.napDurDefault || 60;

  const wwArr = getWWArray(days, napCount);
  if (!wwArr || !wakeTs) return { slots: [], predBedTs: 0 };

  const months = Math.floor(days / 30);
  const catMax = catnapMaxByMonths(months);
  const cap = getPerNapCap(days);

  const slots = [];
  let cur = wakeTs;

  for (let i = 0; i < napCount; i++) {
    const isLast = i === napCount - 1;
    const isCatnap = isLast && napCount >= 2 && catMax > 0;
    const ww = wwArr[i];

    if (i < recordedNaps.length) {
      const rec = recordedNaps[i];
      slots.push({
        start: rec.start,
        end: rec.end,
        predDur: Math.round((rec.end - rec.start) / 60000),
        isCatnap: isCatnap,
        lastNap: isLast,
        recorded: true
      });
      cur = rec.end;
    } else {
      const napStart = cur + ww * 60000;
      let napDur = napDurAvg[i + 1] ? napDurAvg[i + 1] : napDurDefault;
      if (isCatnap && catMax > 0) napDur = Math.min(napDur, catMax);
      napDur = Math.min(napDur, cap);
      napDur = Math.max(20, napDur);
      const napEnd = napStart + napDur * 60000;
      slots.push({
        start: napStart,
        end: napEnd,
        predDur: napDur,
        isCatnap: isCatnap,
        lastNap: isLast,
        predicted: true
      });
      cur = napEnd;
    }
  }

  const lastWW = wwArr[wwArr.length - 1];
  const predBedTs = cur + lastWW * 60000;
  return { slots: slots, predBedTs: predBedTs };
};

