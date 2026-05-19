import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Keyboard, TouchableWithoutFeedback, Alert } from 'react-native';
import { useApp } from '../context/AppContext';
import { useLang } from '../context/LangContext';
import { gD, fD, fT, fM, uid } from '../utils/helpers';
import { isNightSleep, getWWRange, gP, getPerNapCap, getLastNapRec, getLateNapCutoffMin, anaNapDur, predictDaySchedule } from '../utils/sleep';
import { COLORS } from '../utils/constants';
import { SV, LD } from '../utils/storage';
import ScheduleArc from '../components/ScheduleArc';
import WWHistoryCard from '../components/WWHistoryCard';
var StoreReview = null;
try { StoreReview = require('expo-store-review'); } catch(e) {}

export default function HomeScreen() {
  var ctx = useLang();
  var t = ctx.t;
  var lang = ctx.lang;
  var appCtx = useApp();
  var name = appCtx.name, setName = appCtx.setName, bday = appCtx.bday, setBday = appCtx.setBday;
  var asleep = appCtx.asleep, setAsleep = appCtx.setAsleep, sS = appCtx.sS, setSS = appCtx.setSS;
  var sleepEase = appCtx.sleepEase, setSleepEase = appCtx.setSleepEase;
  var sl = appCtx.sl, setSl = appCtx.setSl, lW = appCtx.lW, setLW = appCtx.setLW;
  var feeds = appCtx.feeds, show = appCtx.show;
  var bH = appCtx.bH, bM2 = appCtx.bM2;
  var selfSleep = appCtx.selfSleep, setSelfSleep = appCtx.setSelfSleep;
  var reviewed = appCtx.reviewed, setReviewed = appCtx.setReviewed;

  var celebrateSelfSleep = function() {
    setSelfSleep(true);
    SV('selfSleep', true);
    Alert.alert(
      t('app.selfSleepCelebTitle'),
      t('app.selfSleepCelebMsg'),
      [{ text: '💜', onPress: function() { setTimeout(tryReview, 1500); } }]
    );
  };

  var tryReview = function() {
    if (reviewed) return;
    try {
      if (StoreReview && StoreReview.isAvailableAsync) {
        StoreReview.isAvailableAsync().then(function(ok) {
          if (ok) { StoreReview.requestReview(); setReviewed(true); }
        });
      }
    } catch(e) {}
  };

  var stEl = useState(0); var el = stEl[0]; var setEl = stEl[1];
  var stAw = useState(0); var awMs = stAw[0]; var setAwMs = stAw[1];
  var stMicro = useState(false); var microOpen = stMicro[0]; var setMicroOpen = stMicro[1];
  var stPend = useState(null); var pendingStop = stPend[0]; var setPendingStop = stPend[1];
  var stBD = useState(true); var bannerDismissed = stBD[0]; var setBannerDismissed = stBD[1];
  useEffect(function() { LD('bannerDismissed', false).then(function(v) { stBD[1](v); }); }, []);
  // 스케줄 가이드 카드 — 처음엔 열려있고, 한번 닫으면 다음에도 닫힌 채로 유지
  var stSA = useState(true); var schedAdviceOpen = stSA[0]; var setSchedAdviceOpen = stSA[1];
  useEffect(function() { LD('schedAdviceOpen', true).then(function(v) { stSA[1](v); }); }, []);
  // 낮잠 개수 사용자 override (영구 저장, null이면 월령 default)
  var stNC = useState(null); var napCountOverride = stNC[0]; var setNapCountOverride = stNC[1];
  useEffect(function() { LD('napCountOverride', null).then(function(v) { stNC[1](v); }); }, []);
  var cycleNapCount = function() {
    setNapCountOverride(function(prev) {
      var cur = prev != null ? prev : (profForWW ? profForWW.n : 3);
      var next = cur + 1;
      if (next > 5) next = 1;
      SV('napCountOverride', next);
      return next;
    });
  };
  // 낮잠 드래그 오버라이드 — 오늘만 유지, 자정 지나면 초기화
  var stNO = useState({}); var napOverrides = stNO[0]; var setNapOverrides = stNO[1];
  useEffect(function() {
    LD('napOverrides', null).then(function(stored) {
      if (stored) setNapOverrides(stored);
    });
  }, []);
  var updateNapOverride = function(slotIdx, newTs) {
    var today = new Date(); today.setHours(0,0,0,0);
    var todayKey = today.getTime();
    var wakeKey = arcWakeTs ? Math.round(arcWakeTs / (10 * 60000)) : 0;
    var napCountKey = effectiveNapCount || 0;
    setNapOverrides(function(prev) {
      var nextData = {};
      if (prev && prev.dateKey === todayKey && prev.wakeKey === wakeKey && prev.napCount === napCountKey && prev.data) {
        nextData = Object.assign({}, prev.data);
      }
      nextData[slotIdx] = newTs;
      var next = { dateKey: todayKey, wakeKey: wakeKey, napCount: napCountKey, data: nextData };
      SV('napOverrides', next);
      return next;
    });
  };
  var stSN = useState(''); var setupName = stSN[0]; var setSetupName = stSN[1];
  var stSY = useState('2025'); var sYear = stSY[0]; var setSYear = stSY[1];
  var stSM = useState('01'); var sMonth = stSM[0]; var setSMonth = stSM[1];
  var stSD = useState('01'); var sDay = stSD[0]; var setSDay = stSD[1];

  useEffect(function() {
    var iv = setInterval(function() {
      if (asleep && sS) setEl(Date.now() - sS);
      if (!asleep && lW) setAwMs(Date.now() - lW);
    }, 1000);
    return function() { clearInterval(iv); };
  }, [asleep, sS, lW]);

  // Auto-recompute lW whenever sl changes (add/edit/delete in any tab)
  useEffect(function() {
    if (asleep) return;
    var td = new Date(); td.setHours(0,0,0,0);
    var todayEnds = sl.filter(function(l){return l.end && l.end >= td.getTime();}).map(function(l){return l.end;});
    if (todayEnds.length > 0) {
      var latestEnd = Math.max.apply(null, todayEnds);
      if (latestEnd !== lW) setLW(latestEnd);
    }
  }, [sl, asleep]);

  // Warn when approaching 300 record cap
  useEffect(function() {
    if (sl.length >= 280 && sl.length < 300) show('⚠️ ' + (lang === 'ko' ? '수면 기록 ' + sl.length + '/300 — 곧 오래된 기록이 삭제돼요' : 'Sleep records ' + sl.length + '/300 — oldest will be removed soon'), '#f0cd8a');
  }, [sl.length >= 280]);
  useEffect(function() {
    if (feeds.length >= 280 && feeds.length < 300) show('⚠️ ' + (lang === 'ko' ? '수유 기록 ' + feeds.length + '/300 — 곧 오래된 기록이 삭제돼요' : 'Feed records ' + feeds.length + '/300 — oldest will be removed soon'), '#f0cd8a');
  }, [feeds.length >= 280]);

  var awMin = Math.floor(awMs / 60000);

  // ═══ Handlers ═══
  var startSl = function(ease) {
    setAsleep(true); setSS(Date.now()); setEl(0); setSleepEase(ease);
    if (ease === '5to15' && !reviewed) {
      var recent = sl.filter(function(l) { return l.end && !l.micro && l.ease; }).sort(function(a,b){return b.start-a.start;}).slice(0, 2);
      if (recent.length >= 2 && recent[0].ease === '5to15' && recent[1].ease === '5to15') {
        setTimeout(tryReview, 2000);
      }
    }
  };
  var stopSl = function() {
    if (!sS) return;
    var entry = { id: uid(), start: sS, end: Date.now(), ease: sleepEase || 'normal' };
    var h = new Date(sS).getHours();
    var isNight = h >= 18 || h < 6;
    if (Date.now() - sS > 60000) {
      if (isNight) {
        setSl(function(p){return [entry].concat(p).slice(0,300);});
        setPendingStop(entry);
      }
      else { setSl(function(p){return [entry].concat(p).slice(0,300);}); show('😴 ' + fD(Date.now() - sS), COLORS.purpleLight); }
    } else {
      show(lang === 'ko' ? '1분 미만은 기록되지 않아요' : 'Too short to log (under 1 min)', 'rgba(200,215,255,0.5)');
    }
    setAsleep(false); setSS(null); setSleepEase(null); setLW(Date.now()); setAwMs(0); setEl(0);
  };
  var saveNightWakes = function(n2) {
    if (!pendingStop) return;
    var eid = pendingStop.id;
    setSl(function(p){return p.map(function(l){return l.id === eid ? Object.assign({}, l, {nightWakes: n2}) : l;});});
    show('🌙 ' + fD(pendingStop.end - pendingStop.start), COLORS.purpleLight);
    setPendingStop(null);
    if (n2 === 0 && !reviewed) {
      var hadZero = sl.some(function(l) { return l.nightWakes === 0; });
      if (!hadZero) setTimeout(tryReview, 2000);
    }
  };
  var recMicro = function(min) {
    var now2 = Date.now();
    setSl(function(p){return [{id:uid(),start:now2-min*60000,end:now2,ease:'micro',micro:true}].concat(p).slice(0,300);});
    show('🚗 ' + min + t('c.min'), '#60a5fa');
    setMicroOpen(false);
  };

  // ═══ Ease labels ═══
  var easeArr = [
    ['under5', t('home.ease.under5'), selfSleep ? '#34d399' : '#a0a0a0'],
    ['5to15', t('home.ease.5to15'), '#34d399'],
    ['15to30', t('home.ease.15to30'), '#f0cd8a'],
    ['over30', t('home.ease.over30'), '#f87171'],
  ];

  // ═══ Setup ═══
  if (!bday) {
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}><View style={s.setupWrap}>
        <Text style={{fontSize:56,marginBottom:16}}>{'🌙'}</Text>
        <Text style={s.setupTitle}>Naptune</Text>
        <Text style={s.setupSub}>{t('home.setupDesc')}</Text>
        <View style={{width:'100%',maxWidth:300,marginTop:24}}>
          <Text style={s.label}>{t('app.babyName')}</Text>
          <TextInput style={s.input} value={setupName} onChangeText={setSetupName} placeholder={t('app.namePH')} placeholderTextColor="rgba(200,215,255,0.25)" selectTextOnFocus={true}/>
          <Text style={s.label}>{t('app.birthday')}</Text>
          <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
            <View style={{flex:3}}>
              <Text style={{color:'rgba(200,215,255,0.35)',fontSize:12,fontWeight:'700',textAlign:'center',marginBottom:3}}>Y</Text>
              <TextInput style={s.bdayInput} value={sYear} onChangeText={function(v){setSYear(v.replace(/[^0-9]/g,'').slice(0,4));}} placeholder="2025" placeholderTextColor="rgba(200,215,255,0.2)" keyboardType="number-pad" maxLength={4} selectTextOnFocus={true}/>
            </View>
            <Text style={{color:'rgba(255,255,255,0.15)',fontSize:20,fontWeight:'300',marginTop:16}}>.</Text>
            <View style={{flex:2}}>
              <Text style={{color:'rgba(200,215,255,0.35)',fontSize:12,fontWeight:'700',textAlign:'center',marginBottom:3}}>M</Text>
              <TextInput style={s.bdayInputS} value={sMonth} onChangeText={function(v){setSMonth(v.replace(/[^0-9]/g,'').slice(0,2));}} placeholder="10" placeholderTextColor="rgba(200,215,255,0.2)" keyboardType="number-pad" maxLength={2} selectTextOnFocus={true}/>
            </View>
            <Text style={{color:'rgba(255,255,255,0.15)',fontSize:20,fontWeight:'300',marginTop:16}}>.</Text>
            <View style={{flex:2}}>
              <Text style={{color:'rgba(200,215,255,0.35)',fontSize:12,fontWeight:'700',textAlign:'center',marginBottom:3}}>D</Text>
              <TextInput style={s.bdayInputS} value={sDay} onChangeText={function(v){setSDay(v.replace(/[^0-9]/g,'').slice(0,2));}} placeholder="15" placeholderTextColor="rgba(200,215,255,0.2)" keyboardType="number-pad" maxLength={2} selectTextOnFocus={true}/>
            </View>
          </View>
          <TouchableOpacity onPress={function(){var y=sYear.length===2?'20'+sYear:sYear;var bd=y+'-'+sMonth.padStart(2,'0')+'-'+sDay.padStart(2,'0');if(bd.match(/^\d{4}-\d{2}-\d{2}$/)){setName(setupName);setBday(bd);}}} style={[s.startBtn,!(sYear.length>=2&&sMonth.length>=1&&sDay.length>=1)&&{opacity:0.4}]}>
            <Text style={s.startBtnText}>{t('app.startBtn')}</Text>
          </TouchableOpacity>
        </View>
      </View></TouchableWithoutFeedback>
    );
  }

  // ═══ Wake window range (WW v2 — Huckleberry 보간) ═══
  // 3개월 이상이면 1낮잠 포함 모든 월령에서 WW 표시.
  var days = bday ? gD(bday) : 0;
  var profForWW = days ? gP(days) : null;
  var wwRange = days >= 90 ? getWWRange(days) : null;
  var months = Math.floor(days / 30);
  var ageLabel = lang === 'ko' ? months + '개월' : months + 'mo';
  // 낮잠 개수 라벨 — 사용자 override 또는 월령 default + 권장 범위 표시
  var displayNapCount = profForWW ? (napCountOverride != null ? napCountOverride : profForWW.n) : 0;
  var napCountLabel = (function() {
    if (!profForWW) return '';
    var range;
    if (days < 120) range = '4-5';
    else if (days < 180) range = '3-4';
    else if (days < 210) range = '3';
    else if (days < 270) range = '2-3';
    else if (days < 420) range = '2';
    else if (days < 540) range = '1-2';
    else range = '1';
    if (lang === 'ko') return '낮잠 ' + displayNapCount + '회 ✏️ · 권장 ' + range;
    var isOne = displayNapCount === 1;
    return displayNapCount + (isOne ? ' nap' : ' naps') + ' ✏️ · age ' + range;
  })();

  // ═══ Schedule arc inputs (recording-driven) ═══
  var todayStart = new Date(); todayStart.setHours(0,0,0,0);
  var todayMs = todayStart.getTime();
  var morningWake = sl.filter(function(l){
    return l.end && isNightSleep(l) && l.end >= todayMs && l.end <= todayMs + 12*3600000;
  }).sort(function(a,b){return b.end - a.end;})[0];
  var arcWakeTs = morningWake ? morningWake.end :
    ((lW && lW >= todayMs && lW <= todayMs + 12*3600000) ? lW : todayMs + 7*3600000);
  var bedMin = bH * 60 + bM2;
  var arcBedTs = todayMs + bedMin * 60000;
  if (arcBedTs <= arcWakeTs) arcBedTs = arcWakeTs + 12 * 3600000;
  // 실제 밤잠이 기록/진행중이면 그 시각 사용 (설정 목표 시각 대신)
  var todayEveningSleep = sl.filter(function(l){
    if (l.start < todayMs || l.start >= todayMs + 24*3600000) return false;
    var h = new Date(l.start).getHours();
    return h >= 17 && h < 24;
  }).sort(function(a,b){return a.start - b.start;})[0];
  if (todayEveningSleep) {
    arcBedTs = todayEveningSleep.start;
  } else if (asleep && sS) {
    var sH = new Date(sS).getHours();
    if (sH >= 17 && sS >= todayMs) arcBedTs = sS;
  }
  var todayNapsForArc = sl.filter(function(l){
    return l.end && l.start >= todayMs && !isNightSleep(l) && !l.micro;
  }).sort(function(a,b){return a.start - b.start;});

  // ═══ WW v2 — 하루 스케줄 예측 (forward from wake) ═══
  // 기록된 낮잠은 그대로, 미진행분은 WW 배열로 forward 계산.
  // 1회 낮잠은 wwArr null → 빈 slots (예측 안 함, ScheduleArc는 wake-bed 직선)
  var napDurAvg = anaNapDur(sl);
  // 낮잠 개수: 사용자가 수동 조정 가능, 미조정 시 월령 default
  var effectiveNapCount = profForWW ? (napCountOverride != null ? napCountOverride : profForWW.n) : 0;
  var sched = profForWW ? predictDaySchedule({
    wakeTs: arcWakeTs,
    days: days,
    napCount: effectiveNapCount,
    recordedNaps: todayNapsForArc,
    napDurAvg: napDurAvg,
    napDurDefault: profForWW.nd
  }) : { slots: [], predBedTs: 0 };
  // 낮잠 드래그 오버라이드 적용 — 예측 낮잠만, 시작 시각만 이동 (지속시간 유지)
  var overrideWakeKey = arcWakeTs ? Math.round(arcWakeTs / (10 * 60000)) : 0;
  var activeNapOverrides = {};
  if (napOverrides && napOverrides.dateKey === todayMs && napOverrides.wakeKey === overrideWakeKey && napOverrides.napCount === effectiveNapCount && napOverrides.data) {
    activeNapOverrides = napOverrides.data;
  }
  var arcSlots = sched.slots.map(function(sl, idx) {
    if (!sl.predicted) return sl;
    var ov = activeNapOverrides[idx];
    if (!ov) return sl;
    var dur = sl.end ? sl.end - sl.start : (sl.predDur || 60) * 60000;
    return Object.assign({}, sl, { start: ov, end: ov + dur });
  });
  // 취침 시각은 사용자 목표(또는 default 7:30 PM) 그대로 사용. 예측치로 덮어쓰지 않음.

  // ═══ Static counters for coach (no prediction) ═══
  var prof = days ? gP(days) : null;
  var nowDate = new Date();
  var nowHour = nowDate.getHours();
  var nowMinute = nowDate.getMinutes();
  var nowMin = nowHour * 60 + nowMinute;
  var isNightHour = nowHour >= 20 || nowHour < 6;
  var todayNaps = todayNapsForArc;
  var napsDoneToday = todayNaps.length;
  var totDayNapMs = todayNaps.reduce(function(a,n){return a + (n.end - n.start);}, 0);
  var maxDayNapMs = prof ? prof.maxDay * 60000 : Infinity;
  var oversleptDay = totDayNapMs > maxDayNapMs;
  var nearMaxDay = totDayNapMs > maxDayNapMs * 0.9;
  var napBudgetLeft = Math.max(0, Math.floor((maxDayNapMs - totDayNapMs) / 60000));
  var napsLeft = prof ? Math.max(0, prof.n - napsDoneToday) : 0;
  var currentNapNum = napsDoneToday + 1;
  var headingToBed = napsLeft === 0;
  var minToBed = Math.floor((arcBedTs - Date.now()) / 60000);

  // 직전 sleep — 현재 wake window를 야기한 sleep
  var precedesCurrentWW = function(l) { return lW ? Math.abs(l.end - lW) < 60*60000 : true; };
  var lastSleep = sl.slice().sort(function(a,b){return b.start - a.start;}).find(function(l){
    return l.end && !isNightSleep(l) && !l.micro && precedesCurrentWW(l);
  });
  var lastNapDur = lastSleep ? Math.round((lastSleep.end - lastSleep.start) / 60000) : 0;
  var lastNapWasShort = lastNapDur > 0 && lastNapDur < 40;

  // ═══ COACH ENGINE (정적 규칙만, 예측 없음) ═══
  var coach = null;
  if (prof && !asleep) {
    if (isNightHour) {
      // 밤시간 깸 (수면교육 중이거나 일반)
      var isEarlyMorning = nowHour >= 5 && nowHour < 6;
      if (awMin < 5) coach = {c:'#9a8cf0',icon:'🌙',t:t('home.coach.wokeAtNight'),sub:t('home.nightCoach.babyWoke')};
      else if (awMin < 15) coach = {c:'#9a8cf0',icon:'🌙',t:t('home.coach.awakeMin',{min:awMin}),sub:t('home.nightCoach.quietFeed')};
      else if (awMin < 30) coach = {c:'#9a8cf0',icon:'🌙',t:isEarlyMorning?t('home.coach.earlyMorning',{min:awMin}):t('home.coach.awakeMinLong',{min:awMin}),sub:isEarlyMorning?t('home.nightCoach.earlyDawnDesc'):t('home.nightCoach.layDown')};
      else if (awMin < 60) coach = {c:'#9a8cf0',icon:'🌙',t:t('home.coach.awakeMinLong',{min:awMin}),sub:isEarlyMorning?t('home.nightCoach.earlyDawnLong'):t('home.nightCoach.checkTeeth')};
      else if (awMin < 120) coach = {c:'#f87171',icon:'🌙',t:t('home.coach.awakeMin',{min:awMin}),sub:t('home.nightCoach.minimize')};
      else coach = {c:'#f87171',icon:'🌙',t:t('home.coach.awakeMinLong',{min:awMin}),sub:t('home.nightCoach.hardNight')};
    } else if (awMin > 120 && nowHour >= 5 && nowHour < 9) {
      // 아침 자연 기상
      coach = {c:'#60a5fa',icon:'☀️',t:t('home.coach.morningDetect'),sub:t('home.coach.morningDesc')};
    } else if (headingToBed && minToBed > 0 && minToBed <= 25) {
      // 취침 루틴 (설정 시각 25분 전부터)
      coach = {c:'#9a8cf0',icon:'🌙',t:t('home.coach.bedRoutine'),sub:t('home.coach.bedRoutineSub')};
    } else if (wwRange) {
      // 깨시 범위 기반 상태 (정적)
      if (awMin >= wwRange.max + 30) {
        coach = {c:'#f87171',icon:'🧡',t:t('home.coach.overdue'),sub:t('home.coach.overdueDesc')};
      } else if (awMin > wwRange.max) {
        coach = {c:'#f0cd8a',icon:'💛',t:t('home.coach.late'),sub:t('home.coach.startRoutine')};
      } else if (awMin >= wwRange.min) {
        // 졸음창 안 — 들어왔다는 사실만 표시
        if (headingToBed) coach = {c:'#34d399',icon:'💚',t:lang==='ko'?'밤잠 시간대':'Bedtime window',sub:lang==='ko'?'졸음창 안에 들어왔어요':'In the sleep window'};
        else coach = {c:'#34d399',icon:'💚',t:lang==='ko'?'졸음창 ('+currentNapNum+'낮잠)':'Sleep window (Nap '+currentNapNum+')',sub:lang==='ko'?'졸음창 안에 들어왔어요':'In the sleep window'};
      } else if (awMin >= wwRange.min - 15) {
        // 졸음창 직전
        coach = {c:'#60a5fa',icon:'💙',t:lang==='ko'?'곧 졸려요':'Getting sleepy',sub:lang==='ko'?'곧 졸음창에 들어와요':'Approaching sleep window'};
      } else {
        coach = {c:'#60a5fa',icon:'⏰',t:lang==='ko'?'놀이 시간':'Play time',sub:t('home.coach.playDescLong')};
      }
    } else {
      coach = {c:'#60a5fa',icon:'⏰',t:lang==='ko'?'기록만 — 깨시 범위는 3개월부터':'Recording only — WW range from 3mo',sub:''};
    }

    // ─── Tips (정적 규칙) ───
    if (!isNightHour && coach) {
      var tips = [];
      var isAfternoon = nowHour >= 14 && nowHour < 18;
      var isLast2 = headingToBed || (prof.n > 0 && currentNapNum >= prof.n - 1);
      var cutoffMin = getLateNapCutoffMin(days);

      if (isLast2) {
        if (headingToBed && wwRange && awMin >= wwRange.min - 15 && awMin <= wwRange.max && isAfternoon) tips.push(t('home.tips.bath'));
        if (isAfternoon && napsLeft === 1 && !asleep) tips.push(t('home.tips.lastNapAnywhere'));
        if (prof.n >= 2 && lastNapWasShort && wwRange && awMin < wwRange.min) tips.push(t('home.tips.afterShort'));
        if (prof.n === 1 && lastNapWasShort && wwRange && awMin < wwRange.min) tips.push(t('home.tips.afterShort1'));
      }
      // 늦은 오후 마지막 낮잠 놓침
      if (nowMin >= cutoffMin && !asleep && napsDoneToday < prof.n && !headingToBed) {
        var earlier = days < 240 ? 30 : days < 360 ? 45 : 30;
        tips.push(t('home.tips.missedLastNap', {min:earlier}));
      }
      if (tips.length > 0) coach.tips = tips;

      // ─── napAlert: 일일 budget 경고 (정적, 누적 기준) ───
      if (oversleptDay && !headingToBed) {
        coach.napAlert = {level:'red',msg:t('home.napAlert.dayOver'),sub:t('home.napAlert.overShort')};
      } else if (nearMaxDay && !headingToBed && napBudgetLeft > 20) {
        coach.napAlert = {level:'yellow',msg:t('home.napAlert.nextShort',{min:napBudgetLeft}),sub:t('home.napAlert.budgetLeft',{min:napBudgetLeft})};
      } else if (nearMaxDay && !headingToBed && napBudgetLeft <= 20) {
        coach.napAlert = {level:'yellow',msg:t('home.napAlert.almostDone'),sub:t('home.napAlert.microOnly')};
      }
    }
  }

  // ═══ ASLEEP COACHING (정적 규칙) ═══
  if (prof && asleep && sS) {
    var sleepMin = Math.floor(el / 60000);
    var sH = new Date(sS).getHours();
    var isNightNow = sH >= 18 || sH < 6 || headingToBed;
    if (isNightNow) {
      var nm = '';
      if (sleepMin < 5) nm = t('home.nightSleep.starting');
      else if (sleepMin < 15) nm = t('home.nightSleep.light');
      else if (sleepMin < 60) nm = t('home.nightSleep.deep');
      else if (sleepMin < 180) nm = t('home.nightSleep.ok');
      else if (sleepMin < 360) nm = t('home.nightSleep.stir');
      else nm = t('home.nightSleep.dawn');
      coach = {c:'#9a8cf0',icon:'🌙',t:fD(el),sub:nm};
    } else {
      // 낮잠중 — 정적 규칙: 단계, 하드캡, budget, last-nap catnap
      var perNapCap = getPerNapCap(days);
      var phase = '';
      if (sleepMin < 10) phase = t('home.napSleep.light');
      else if (sleepMin < 30) phase = t('home.napSleep.entering');
      else if (sleepMin < 45) phase = t('home.napSleep.cycle');
      else if (sleepMin < 55) phase = t('home.napSleep.transition');
      else phase = t('home.napSleep.deep');

      var sleepMsg = phase;
      var isLastOrOnly = napsLeft <= 1;
      var timeToBedMin = Math.max(0, Math.floor((arcBedTs - Date.now()) / 60000));

      if (isLastOrOnly && prof.n >= 2) {
        var rec = getLastNapRec(days, timeToBedMin);
        if (sleepMin >= perNapCap) {
          sleepMsg = t('home.napSleep.overCap',{min:perNapCap});
        } else if (rec.skip) {
          sleepMsg = t('home.napSleep.skipNap',{bed:fT(arcBedTs)});
        } else if (sleepMin >= rec.max) {
          sleepMsg = phase + '\n\n' + t('home.napSleep.recMax',{min:rec.max,bed:fT(Date.now())});
        } else if (sleepMin >= rec.min) {
          sleepMsg = phase + '\n\n' + t('home.napSleep.recInRange',{min:rec.min,max:rec.max});
        } else if (sleepMin >= 20) {
          sleepMsg = phase + '\n\n' + t('home.napSleep.recBelow',{min:rec.min,max:rec.max});
        }
      } else {
        // 일반 낮잠 — 단순 단계 + 하드캡
        if (sleepMin < 30) sleepMsg = phase + t('home.napSleep.let30');
        else if (sleepMin < perNapCap - 10) sleepMsg = phase + t('home.napSleep.letSleep');
        else if (sleepMin < perNapCap) sleepMsg = (lang==='ko'?'⏰ 10분 후 깨워주세요 — 2시간 넘으면 밤잠에 영향':'⏰ Wake in 10 min — over 2h affects night sleep');
        else sleepMsg = t('home.napSleep.enough');
      }

      coach = {c:'#9a8cf0',icon:'😴',t:t('home.sleeping')+fD(el),sub:sleepMsg};

      // 하드캡 / budget 경고
      var capLabel = perNapCap === 150 ? '2.5h' : (perNapCap === 180 ? '3h' : '2h');
      var runningTotal = totDayNapMs + el;
      var budgetNow = Math.max(0, Math.floor((maxDayNapMs - runningTotal) / 60000));
      if (sleepMin >= perNapCap) coach.napAlert = {level:'red',msg:t('home.napAlert.capOver',{cap:capLabel}),sub:t('home.napAlert.capSub')};
      else if (runningTotal > maxDayNapMs) coach.napAlert = {level:'red',msg:t('home.napAlert.dayOver'),sub:t('home.napAlert.dayOverWake')};
      else if (budgetNow <= 10 && sleepMin >= 20) coach.napAlert = {level:'red',msg:t('home.napAlert.budgetLow',{min:budgetNow}),sub:t('home.napAlert.budgetWake')};
      else if (budgetNow <= 30 && sleepMin >= 15) coach.napAlert = {level:'yellow',msg:t('home.napAlert.budgetLow',{min:budgetNow}),sub:fD(runningTotal)+' / '+fM(prof.maxDay)};
    }
  }

  if (!coach) coach = {c:'#60a5fa',icon:'⏰',t:'',sub:''};

  return (
    <ScrollView showsVerticalScrollIndicator={false}>

      {/* ═══ Self-sleep banner ═══ */}
      {!selfSleep && !asleep && sl.length < 3 && !bannerDismissed && <View style={[s.card,{backgroundColor:'rgba(52,211,153,0.06)',borderColor:'rgba(52,211,153,0.2)'}]}>
        <Text style={{color:'#34d399',fontSize:17,fontWeight:'800',lineHeight:26,marginBottom:4}}>{t('app.selfSleepBanner')}</Text>
        <Text style={{color:'rgba(200,215,255,0.45)',fontSize:14,marginBottom:12}}>{t('app.selfSleepBannerSub')}</Text>
        <View style={{flexDirection:'row',gap:10}}>
          <TouchableOpacity onPress={function(){ celebrateSelfSleep(); setBannerDismissed(true); SV('bannerDismissed', true); }} style={{flex:1,padding:12,borderRadius:14,backgroundColor:'rgba(52,211,153,0.15)',borderWidth:1.5,borderColor:'rgba(52,211,153,0.3)',alignItems:'center'}}>
            <Text style={{color:'#34d399',fontWeight:'900',fontSize:15}}>{t('app.selfSleepOn')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={function(){ setBannerDismissed(true); SV('bannerDismissed', true); }} style={{flex:1,padding:12,borderRadius:14,backgroundColor:'rgba(255,255,255,0.04)',borderWidth:1.5,borderColor:'rgba(255,255,255,0.08)',alignItems:'center'}}>
            <Text style={{color:'rgba(200,215,255,0.5)',fontWeight:'900',fontSize:15}}>{t('app.selfSleepOff')}</Text>
          </TouchableOpacity>
        </View>
      </View>}

      {/* ═══ Wake window range (age-based, informational) ═══ */}
      {wwRange && <View style={[s.card,{backgroundColor:'rgba(154,140,240,0.06)',borderColor:'rgba(154,140,240,0.2)',padding:14}]}>
        <Text style={{color:'rgba(200,215,255,0.5)',fontSize:13,fontWeight:'700',textAlign:'center',marginBottom:4}}>{lang==='ko'?'권장 깨시':'Wake window'}</Text>
        <Text style={{color:'#c4b5fd',fontSize:19,fontWeight:'900',textAlign:'center',lineHeight:28}}>{fM(wwRange.min)+' ~ '+fM(wwRange.max)}</Text>
      </View>}

      {/* ═══ Coach Card (정적 규칙 기반) ═══ */}
      {prof && coach && coach.t ? <View style={[s.card,{borderColor:coach.c+'30'}]}>
        <View style={{alignItems:'center',gap:4}}>
          <Text style={{fontSize:20}}>{coach.icon}</Text>
          <Text style={{color:coach.c,fontSize:19,fontWeight:'800',textAlign:'center'}}>{coach.t}</Text>
          {!asleep && lW ? <Text style={{color:'rgba(200,215,255,0.45)',fontSize:13,fontWeight:'600',marginTop:2}}>{(lang==='ko'?'깨어있는 시간 ':'awake ')+fD(awMs)}</Text> : null}
        </View>
        {coach.sub ? <Text style={{color:'rgba(200,215,255,0.55)',fontSize:15,lineHeight:25,marginTop:8,textAlign:'center'}}>{coach.sub}</Text> : null}
        {coach.tips && coach.tips.length > 0 ? <View style={{marginTop:8,gap:4}}>
          {coach.tips.map(function(tip,i){return <View key={i} style={{backgroundColor:'rgba(255,255,255,0.04)',borderWidth:1,borderColor:'rgba(255,255,255,0.08)',borderRadius:12,padding:10}}>
            <Text style={{color:'rgba(200,215,255,0.6)',fontSize:15,lineHeight:25,textAlign:'center'}}>{tip}</Text>
          </View>;})}
        </View> : null}
        {coach.napAlert ? <View style={{marginTop:10,padding:14,borderRadius:14,borderWidth:1.5,borderColor:coach.napAlert.level==='red'?'rgba(248,113,113,0.4)':'rgba(240,205,138,0.3)',backgroundColor:coach.napAlert.level==='red'?'rgba(248,113,113,0.1)':'rgba(240,205,138,0.08)'}}>
          <Text style={{color:coach.napAlert.level==='red'?'#f87171':'#f0cd8a',fontWeight:'900',fontSize:17,lineHeight:26,textAlign:'center'}}>{coach.napAlert.msg}</Text>
          <Text style={{color:coach.napAlert.level==='red'?'#fca5a5':'#fde68a',fontSize:15,lineHeight:24,marginTop:2,textAlign:'center'}}>{coach.napAlert.sub}</Text>
        </View> : null}
      </View> : null}

      {/* ═══ Night wakes modal (Coach Card 직후) ═══ */}
      {pendingStop && <View style={[s.card,{backgroundColor:'rgba(154,140,240,0.12)',borderColor:'rgba(154,140,240,0.35)'}]}>
        <Text style={{color:'#e0d4ff',fontWeight:'900',fontSize:19,textAlign:'center',marginBottom:6,lineHeight:28}}>{t('home.nightWakes.title')}</Text>
        <Text style={{color:'rgba(200,215,255,0.45)',fontSize:15,textAlign:'center',marginBottom:12,lineHeight:24}}>{fD(pendingStop.end-pendingStop.start)+' — '+t('home.nightWakes.desc')}</Text>
        <View style={{flexDirection:'row',gap:6}}>
          {[0,1,2,3,4].map(function(n2){return(
            <TouchableOpacity key={n2} onPress={function(){saveNightWakes(n2);}} style={{flex:1,padding:14,borderRadius:14,borderWidth:1.5,borderColor:'rgba(154,140,240,0.3)',backgroundColor:'rgba(154,140,240,0.08)',alignItems:'center'}}>
              <Text style={{color:'#e0d4ff',fontWeight:'900',fontSize:19}}>{n2}</Text>
              <Text style={{color:'rgba(200,215,255,0.45)',fontSize:15}}>{n2===0?t('home.nightWakes.never'):t('home.nightWakes.times')}</Text>
            </TouchableOpacity>
          );})}
        </View>
      </View>}

      {/* ═══ Sleep / Wake card ═══ */}
      <View style={s.card}>
        {!asleep ? (<View>
          <Text style={{fontSize:32,textAlign:'center',marginBottom:4}}>{'💤'}</Text>
          <Text style={{color:'#e0d4ff',fontSize:19,fontWeight:'900',textAlign:'center',marginBottom:4,lineHeight:28}}>{t('home.tapToSleep')}</Text>

          <View style={{flexDirection:'row',gap:10,marginBottom:10}}>
            {easeArr.slice(0,2).map(function(ea){return(
              <TouchableOpacity key={ea[0]} onPress={function(){startSl(ea[0]);}} style={{flex:1,paddingVertical:18,borderRadius:16,borderWidth:1.5,borderColor:ea[2]+'40',backgroundColor:ea[2]+'0a',alignItems:'center'}}>
                <Text style={{color:ea[2],fontSize:15,fontWeight:'900'}}>{ea[1]}</Text>
              </TouchableOpacity>
            );})}
          </View>
          <View style={{flexDirection:'row',gap:10,marginBottom:10}}>
            {easeArr.slice(2,4).map(function(ea){return(
              <TouchableOpacity key={ea[0]} onPress={function(){startSl(ea[0]);}} style={{flex:1,paddingVertical:18,borderRadius:16,borderWidth:1.5,borderColor:ea[2]+'40',backgroundColor:ea[2]+'0a',alignItems:'center'}}>
                <Text style={{color:ea[2],fontSize:15,fontWeight:'900'}}>{ea[1]}</Text>
              </TouchableOpacity>
            );})}
          </View>
          <TouchableOpacity onPress={function(){setMicroOpen(!microOpen);}} style={{padding:8,borderRadius:10,borderWidth:1,borderColor:'rgba(96,165,250,0.2)',alignItems:'center'}}>
            <Text style={{color:'#93c5fd',fontWeight:'700',fontSize:15}}>{t('home.microNap')}</Text>
          </TouchableOpacity>
          {microOpen && <View style={{flexDirection:'row',gap:5,marginTop:6}}>
            {[3,5,10,15].map(function(m){return(
              <TouchableOpacity key={m} onPress={function(){recMicro(m);}} style={{flex:1,padding:8,borderRadius:8,borderWidth:1,borderColor:'rgba(96,165,250,0.25)',backgroundColor:'rgba(96,165,250,0.08)',alignItems:'center'}}>
                <Text style={{color:'#93c5fd',fontWeight:'900',fontSize:15}}>{m+t('c.min')}</Text>
              </TouchableOpacity>
            );})}
            <TouchableOpacity onPress={function(){setMicroOpen(false);}} style={{padding:8,paddingHorizontal:12,borderRadius:8,borderWidth:1,borderColor:'rgba(255,255,255,0.1)',alignItems:'center'}}>
              <Text style={{color:'rgba(200,215,255,0.65)',fontWeight:'800',fontSize:15}}>✕</Text>
            </TouchableOpacity>
          </View>}
        </View>) : (<View>
          <View style={{alignItems:'center',marginBottom:8}}>
            <Text style={{color:'#fff',fontSize:32,fontWeight:'900',letterSpacing:-2}}>{fD(el)}</Text>
            {sS && <Text style={{color:'rgba(200,215,255,0.45)',fontSize:15,lineHeight:24}}>{fT(sS)+' ~'}</Text>}
            <View style={{flexDirection:'row',gap:6,justifyContent:'center',marginTop:8}}>
              {[-5,-10].map(function(m){return(
                <TouchableOpacity key={m} onPress={function(){setSS(function(p){return p+m*60000;});}} style={{padding:6,paddingHorizontal:12,borderRadius:8,borderWidth:1,borderColor:'rgba(255,255,255,0.15)',backgroundColor:'rgba(255,255,255,0.06)'}}>
                  <Text style={{color:'rgba(200,215,255,0.65)',fontWeight:'800',fontSize:15}}>{m+t('c.min')}</Text>
                </TouchableOpacity>
              );})}
            </View>
            <Text style={{color:'rgba(200,215,255,0.45)',fontSize:15,marginTop:4,lineHeight:24}}>{t('home.adjustTime')}</Text>
          </View>
          <TouchableOpacity onPress={stopSl} style={{padding:15,borderRadius:14,backgroundColor:'#dc2626',alignItems:'center'}}>
            <Text style={{color:'#fff',fontWeight:'900',fontSize:17}}>{t('home.woke')}</Text>
          </TouchableOpacity>
        </View>)}
      </View>

      {/* ═══ Schedule arc (오늘 ☀️ → 🌙) ═══ */}
      <ScheduleArc
        wakeTs={arcWakeTs}
        bedTs={arcBedTs}
        bedPredicted={!todayEveningSleep && !(asleep && sS && new Date(sS).getHours() >= 17 && sS >= todayMs)}
        slots={arcSlots}
        name={name}
        ageLabel={napCountLabel}
        lang={lang}
        onDragNap={updateNapOverride}
        napDurDays={napDurAvg._days || 0}
        onAgeLabelPress={cycleNapCount}
        wwMinMs={wwRange ? wwRange.min * 60000 : null}
        wwMaxMs={wwRange ? wwRange.max * 60000 : null}
      />

      {/* ═══ Wake window history (최근 3일) ═══ */}
      <WWHistoryCard sl={sl} lang={lang} />

      {/* ═══ Schedule advice (collapsible, persisted) ═══ */}
      <View style={[s.card,{backgroundColor:'rgba(154,140,240,0.06)',borderColor:'rgba(154,140,240,0.2)',padding:16}]}>
        <TouchableOpacity onPress={function(){ var next = !schedAdviceOpen; setSchedAdviceOpen(next); SV('schedAdviceOpen', next); }} activeOpacity={0.7} style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
          <Text style={{color:'#c4b5fd',fontSize:15,fontWeight:'800'}}>{t('home.schedAdvice.title')}</Text>
          <Text style={{color:'rgba(200,215,255,0.5)',fontSize:17,fontWeight:'800'}}>{schedAdviceOpen ? '−' : '+'}</Text>
        </TouchableOpacity>
        {schedAdviceOpen && <View style={{marginTop:12,gap:14}}>
          <Text style={{color:'rgba(200,215,255,0.75)',fontSize:14,lineHeight:21}}>{t('home.schedAdvice.tip1')}</Text>
          <Text style={{color:'rgba(200,215,255,0.75)',fontSize:14,lineHeight:21}}>{t('home.schedAdvice.tip2')}</Text>
          <Text style={{color:'rgba(200,215,255,0.75)',fontSize:14,lineHeight:21}}>{t('home.schedAdvice.tip3')}</Text>
          <Text style={{color:'rgba(200,215,255,0.75)',fontSize:14,lineHeight:21}}>{t('home.schedAdvice.tip4')}</Text>
          <Text style={{color:'rgba(200,215,255,0.75)',fontSize:14,lineHeight:21}}>{t('home.schedAdvice.tip5')}</Text>
          <Text style={{color:'rgba(200,215,255,0.75)',fontSize:14,lineHeight:21}}>{t('home.schedAdvice.tip6')}</Text>
        </View>}
      </View>

      <View style={{height:100}}/>
    </ScrollView>
  );
}

var s = StyleSheet.create({
  setupWrap:{flex:1,alignItems:'center',justifyContent:'center',padding:24},
  setupTitle:{color:'#fff',fontSize:22,fontWeight:'800',marginBottom:10,letterSpacing:-0.5},
  setupSub:{color:'rgba(200,215,255,0.5)',fontSize:17,lineHeight:26},
  label:{color:'rgba(200,215,255,0.5)',fontSize:15,fontWeight:'700',marginBottom:6,marginTop:14},
  input:{backgroundColor:'rgba(255,255,255,0.07)',borderWidth:1.5,borderColor:'rgba(255,255,255,0.13)',borderRadius:14,padding:14,color:'#fff',fontSize:20,fontWeight:'800',textAlign:'center'},
  bdayInput:{flex:2,backgroundColor:'rgba(255,255,255,0.07)',borderWidth:1.5,borderColor:'rgba(255,255,255,0.13)',borderRadius:14,padding:14,color:'#fff',fontSize:20,fontWeight:'800',textAlign:'center'},
  bdayInputS:{flex:1,backgroundColor:'rgba(255,255,255,0.07)',borderWidth:1.5,borderColor:'rgba(255,255,255,0.13)',borderRadius:14,padding:14,color:'#fff',fontSize:20,fontWeight:'800',textAlign:'center'},
  startBtn:{marginTop:24,padding:18,borderRadius:18,backgroundColor:'#9a8cf0',alignItems:'center'},
  startBtnText:{color:'#fff',fontSize:17,fontWeight:'800'},
  card:{backgroundColor:'rgba(255,255,255,0.05)',borderRadius:20,padding:22,marginBottom:20,borderWidth:1,borderColor:'rgba(255,255,255,0.06)',shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.12,shadowRadius:6},
});
