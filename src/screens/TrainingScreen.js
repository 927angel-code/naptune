import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, TextInput } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useApp } from '../context/AppContext';
import { useLang } from '../context/LangContext';
import { gD, pp } from '../utils/helpers';
import { SV, LD } from '../utils/storage';
import { gP, FERBER } from '../utils/sleep';
import { COLORS } from '../utils/constants';

export default function TrainingScreen() {
  var ctx = useLang();
  var t = ctx.t;
  var lang = ctx.lang;
  var appCtx = useApp();
  var name = appCtx.name, bday = appCtx.bday, sl = appCtx.sl;
  var tOn = appCtx.tOn, setTOn = appCtx.setTOn;
  var tMe = appCtx.tMe, setTMe = appCtx.setTMe;
  var tMeNap = appCtx.tMeNap, setTMeNap = appCtx.setTMeNap;
  var tDy = appCtx.tDy, setTDy = appCtx.setTDy;
  var tDyNap = appCtx.tDyNap, setTDyNap = appCtx.setTDyNap;
  var tLg = appCtx.tLg, setTLg = appCtx.setTLg;
  var tStartDate = appCtx.tStartDate, setTStartDate = appCtx.setTStartDate;
  var tStartDateNap = appCtx.tStartDateNap, setTStartDateNap = appCtx.setTStartDateNap;
  var savedMethod = appCtx.savedMethod, setSavedMethod = appCtx.setSavedMethod;

  // Auto-calculate training day from start date (calendar days)
  useEffect(function() {
    if (tStartDate) {
      var s1 = new Date(tStartDate); s1.setHours(0,0,0,0);
      var t1 = new Date(); t1.setHours(0,0,0,0);
      var d = Math.floor((t1.getTime() - s1.getTime()) / 86400000) + 1;
      if (d !== tDy) setTDy(d);
    }
    if (tStartDateNap) {
      var s2 = new Date(tStartDateNap); s2.setHours(0,0,0,0);
      var t2 = new Date(); t2.setHours(0,0,0,0);
      var d2 = Math.floor((t2.getTime() - s2.getTime()) / 86400000) + 1;
      if (d2 !== tDyNap) setTDyNap(d2);
    }
  }, []);

  var rdyCh = appCtx.rdyCh, setRdyCh = appCtx.setRdyCh;
  var sleepMsg = appCtx.sleepMsg, setSleepMsg = appCtx.setSleepMsg;
  var show = appCtx.show;

  var stStep = useState(0); var tStep = stStep[0]; var _setTStep = stStep[1];
  var trainScroll = null;
  var setTStep = function(n) {
    _setTStep(n);
    setTimeout(function() { if (trainScroll) trainScroll.scrollTo({ y: 0, animated: true }); }, 100);
  };
  var stShowTimer = useState(null); var showTimer = stShowTimer[0]; var setShowTimer = stShowTimer[1];
  var stMethod = useState({ night: null, nap: null }); var method = stMethod[0]; var setMethod = stMethod[1];
  var stBypass = useState(false); var bypass = stBypass[0]; var setBypass = stBypass[1];
  var stMChk = useState({ nurse: false, hold: false, wake: false, quick: false, sens: false, sepa: false, fail: false, cry: false });
  var mChk = stMChk[0]; var setMChk = stMChk[1];
  var stEnvCh = useState({ temp: false, humid: false, dark: false, noise: false, routine: false });
  var envCh = stEnvCh[0]; var setEnvCh = stEnvCh[1];
  var stFading = useState(0); var fadingStep = stFading[0]; var setFadingStep = stFading[1];
  var stFadingNap = useState(0); var fadingStepNap = stFadingNap[0]; var setFadingStepNap = stFadingNap[1];
  var stWhatOpen = useState(false); var whatOpen = stWhatOpen[0]; var setWhatOpen = stWhatOpen[1];
  var stPredOpen = useState(false); var predOpen = stPredOpen[0]; var setPredOpen = stPredOpen[1];

  var days = bday ? gD(bday) : 0;
  var prof = days ? gP(days) : null;
  var n = name || t('c.baby');

  useEffect(function() {
    var key = 'envLastDate';
    var today = new Date().toDateString();
    LD(key, null).then(function(d) {
      if (d && d !== today) {
        setEnvCh({ temp: false, humid: false, dark: false, noise: false, routine: false });
      }
      SV(key, today);
    });
  }, []);

  if (!prof) return <View style={s.center}><Text style={s.dim}>{t('app.noBday')}</Text></View>;

  var trainDays = (function() { var dks = {}; sl.filter(function(l) { return l.end; }).forEach(function(l) { dks[new Date(l.start).toDateString()] = true; }); return Object.keys(dks).length; })();
  var trainAge = days >= 150;
  var trainData = trainDays >= 5;
  var trainBed = (function() { var beds = []; sl.filter(function(l) { return l.end; }).sort(function(a, b) { return b.start - a.start; }).slice(0, 10).forEach(function(l) { var h = new Date(l.start).getHours(); if (h >= 17 || h < 6) { var m = h * 60 + new Date(l.start).getMinutes(); if (h < 6) m += 1440; beds.push(m); } }); if (beds.length < 3) return false; var avg = beds.slice(0, 3).reduce(function(a, v) { return a + v; }, 0) / 3; return beds.slice(0, 3).every(function(b) { return Math.abs(b - avg) <= 30; }); })();
  var trainEase = (function() { var recent = sl.filter(function(l) { return l.end && l.ease; }).sort(function(a,b){return b.start-a.start;}).slice(0, 5); if (recent.length < 3) return false; var easy = recent.filter(function(l) { return l.ease === 'easy' || l.ease === 'under5' || l.ease === '5to15'; }).length; return easy >= Math.ceil(recent.length * 0.5); })();
  var trainScore = (trainAge ? 1 : 0) + (trainData ? 1 : 0) + (trainBed ? 1 : 0) + (trainEase ? 1 : 0);

  var toggleChk = function(k) { setMChk(function(p) { var o = {}; for (var key in p) o[key] = p[key]; o[k] = !o[k]; return o; }); };
  var toggleEnv = function(k) { setEnvCh(function(p) { var o = {}; for (var key in p) o[key] = p[key]; o[k] = !o[k]; return o; }); };
  var chkKeys = ['nurse', 'hold', 'wake', 'quick', 'sens', 'sepa', 'fail', 'cry'];
  var chkSides = { nurse: 'f', hold: 'f', wake: 'f', quick: 'f', sens: 'd', sepa: 'd', fail: 'd', cry: 'd' };
  var fScore = chkKeys.filter(function(k) { return chkSides[k] === 'f' && mChk[k]; }).length;
  var dScore = chkKeys.filter(function(k) { return chkSides[k] === 'd' && mChk[k]; }).length;
  var totalChecked = fScore + dScore;
  var rec = totalChecked < 2 ? null : fScore >= dScore ? 'ferber' : 'fading';
  var envSc = Object.values(envCh).filter(Boolean).length;
  var envReady = envSc >= 5;

  var copyPartner = function() { Clipboard.setStringAsync(t('train.partnerCopy')); show(t('train.copiedMsg'), COLORS.blue); };

  var calcPrediction = function() {
    var dks2 = {}; sl.filter(function(l) { return l.end && !l.micro; }).forEach(function(l) { var dk = new Date(l.start).toDateString(); if (!dks2[dk]) dks2[dk] = []; dks2[dk].push(l); });
    var dayKeys = Object.keys(dks2).sort(function(a, b) { return new Date(b) - new Date(a); });
    var bedMins = []; dayKeys.slice(0, 7).forEach(function(dk) { var ns = dks2[dk].filter(function(l) { var h = new Date(l.start).getHours(); return (h >= 17 || h < 6); }); if (ns.length > 0) { var m = new Date(ns[0].start).getHours() * 60 + new Date(ns[0].start).getMinutes(); if (m < 360) m += 1440; bedMins.push(m); } });
    var btScore = 0, btDetail = '';
    if (bedMins.length >= 3) { var avg = Math.round(bedMins.reduce(function(a, v) { return a + v; }, 0) / bedMins.length); var btStd = Math.round(Math.sqrt(bedMins.reduce(function(a, v) { return a + (v - avg) * (v - avg); }, 0) / bedMins.length)); if (btStd <= 10) { btScore = 25; btDetail = t('train.pred.veryStable', { std: btStd }); } else if (btStd <= 20) { btScore = 18; btDetail = t('train.pred.okStable', { std: btStd }); } else if (btStd <= 30) { btScore = 10; btDetail = t('train.pred.avgStable', { std: btStd }); } else if (btStd <= 45) { btScore = 5; btDetail = t('train.pred.irregular', { std: btStd }); } else { btScore = 2; btDetail = t('train.pred.irregular', { std: btStd }); } } else { btScore = 0; btDetail = t('train.pred.noData', { n: bedMins.length }); }
    // 깨시 적중률: ease==='5to15' (5-15분 sweet spot)만 카운트.
    // under5는 과피로 가능성, 15+는 WW 어긋남 → 둘 다 적중 아님.
    var allEase = sl.filter(function(l) { return l.end && l.ease && !l.micro; });
    var hitN = allEase.filter(function(l) { return l.ease === '5to15'; }).length;
    var ePct = allEase.length > 0 ? Math.round(hitN / allEase.length * 100) : 0;
    var wwScore = 0, wwDetail = '';
    if (allEase.length < 5) { wwScore = 0; wwDetail = t('train.pred.noDataWW', { n: allEase.length }); }
    else if (ePct >= 60) { wwScore = 25; wwDetail = t('train.pred.wwGood', { pct: ePct }); }
    else if (ePct >= 45) { wwScore = 20; wwDetail = t('train.pred.wwGood', { pct: ePct }); }
    else if (ePct >= 30) { wwScore = 14; wwDetail = t('train.pred.wwOk', { pct: ePct }); }
    else if (ePct >= 20) { wwScore = 8;  wwDetail = t('train.pred.wwBad', { pct: ePct }); }
    else { wwScore = 3; wwDetail = t('train.pred.wwBad', { pct: ePct }); }
    var nsScore = 0, nsDetail = '';
    var nwVals = []; dayKeys.slice(0, 7).forEach(function(dk) { var ns2 = dks2[dk].filter(function(l) { var h = new Date(l.start).getHours(); return (h >= 18 || h < 6) && l.end - l.start > 120 * 60000; }).sort(function(a,b){return (b.end-b.start)-(a.end-a.start);}); if (ns2.length > 0 && ns2[0].nightWakes != null) nwVals.push(ns2[0].nightWakes); });
    if (nwVals.length >= 3) {
      var nwAvg = nwVals.reduce(function(a, v) { return a + v; }, 0) / nwVals.length;
      var nwStd = Math.round(Math.sqrt(nwVals.reduce(function(a, v) { return a + (v - nwAvg) * (v - nwAvg); }, 0) / nwVals.length) * 10) / 10;
      if (nwStd <= 0.8) { nsScore = 25; nsDetail = t('train.pred.nsGreat', { std: nwStd }); }
      else if (nwStd <= 1.2) { nsScore = 18; nsDetail = t('train.pred.nsGood', { std: nwStd }); }
      else if (nwStd <= 1.8) { nsScore = 12; nsDetail = t('train.pred.nsShort', { std: nwStd }); }
      else { nsScore = 5; nsDetail = t('train.pred.nsBad', { std: nwStd }); }
    } else {
      var nightDurs = []; dayKeys.slice(0, 7).forEach(function(dk) { var ns3 = dks2[dk].filter(function(l) { var h = new Date(l.start).getHours(); return (h >= 18 || h < 6) && l.end - l.start > 120 * 60000; }).sort(function(a,b){return (b.end-b.start)-(a.end-a.start);}); if (ns3.length > 0) nightDurs.push(Math.round((ns3[0].end - ns3[0].start) / 60000)); });
      if (nightDurs.length >= 3) { var nsAvgF = Math.round(nightDurs.reduce(function(a, v) { return a + v; }, 0) / nightDurs.length); if (nsAvgF >= 600) { nsScore = 18; } else if (nsAvgF >= 540) { nsScore = 14; } else if (nsAvgF >= 480) { nsScore = 10; } else { nsScore = 5; } nsDetail = t('train.pred.nsFallback', { h: Math.round(nsAvgF / 60) }); }
      else { nsScore = 0; nsDetail = t('train.pred.nsNoData'); }
    }
    var napCounts = []; var firstNapMins = []; dayKeys.slice(0, 7).forEach(function(dk) { var dn = dks2[dk].filter(function(l) { var h = new Date(l.start).getHours(); return h >= 6 && h < 18 && !l.micro; }); napCounts.push(dn.length); if (dn.length > 0) { var sorted = dn.sort(function(a, b) { return a.start - b.start; }); var fst = new Date(sorted[0].start); firstNapMins.push(fst.getHours() * 60 + fst.getMinutes()); } });
    var ncScore = 0, ncDetail = '';
    if (napCounts.length >= 3) {
      var freq = {}; napCounts.forEach(function(v) { freq[v] = (freq[v] || 0) + 1; }); var entries = Object.entries(freq).sort(function(a, b) { return b[1] - a[1]; }); var mode = +entries[0][0]; var ncPct = Math.round(freq[mode] / napCounts.length * 100);
      var cntScore = 0; if (ncPct >= 90) { cntScore = 10; } else if (ncPct >= 75) { cntScore = 7; } else if (ncPct >= 60) { cntScore = 4; } else { cntScore = 1; }
      var timScore = 0; var fnStd = 0;
      if (firstNapMins.length >= 3) { var fnAvg = firstNapMins.reduce(function(a, v) { return a + v; }, 0) / firstNapMins.length; fnStd = Math.round(Math.sqrt(firstNapMins.reduce(function(a, v) { return a + (v - fnAvg) * (v - fnAvg); }, 0) / firstNapMins.length)); if (fnStd <= 15) { timScore = 15; } else if (fnStd <= 25) { timScore = 11; } else if (fnStd <= 40) { timScore = 6; } else { timScore = 2; } }
      else { timScore = 0; }
      ncScore = cntScore + timScore;
      if (ncScore >= 20) { ncDetail = t('train.pred.napStable', { n: mode, pct: ncPct, std: fnStd }); }
      else if (ncScore >= 10) { ncDetail = t('train.pred.napOk', { n: mode, pct: ncPct, std: fnStd }); }
      else { ncDetail = t('train.pred.napIrregular'); }
    } else { ncScore = 0; ncDetail = t('train.pred.noData', { n: napCounts.length }); }
    var total = btScore + wwScore + nsScore + ncScore; var pctR = Math.round(total);
    var gc2 = pctR >= 75 ? '#34d399' : pctR >= 55 ? '#60a5fa' : pctR >= 35 ? '#f0cd8a' : '#f87171';
    var grade = pctR >= 85 ? 'S' : pctR >= 70 ? 'A' : pctR >= 55 ? 'B' : pctR >= 35 ? 'C' : 'D';
    var verdict = grade + ' \u2014 ' + (pctR >= 75 ? t('train.pred.great') : pctR >= 55 ? t('train.pred.good') : pctR >= 35 ? t('train.pred.needMore') : t('train.pred.notReady'));
    return { total: total, pctR: pctR, gc: gc2, verdict: verdict, items: [
      { l: t('train.pred.bedConsist'), s: btScore, m: 25, d: btDetail, c: '#9a8cf0' },
      { l: t('train.pred.wwAccuracy'), s: wwScore, m: 25, d: wwDetail, c: '#34d399' },
      { l: t('train.pred.nightLen'), s: nsScore, m: 25, d: nsDetail, c: '#60a5fa' },
      { l: t('train.pred.napRegular'), s: ncScore, m: 25, d: ncDetail, c: '#f0cd8a' },
    ] };
  };

  var doStart = function() {
    var m = method || {};
    if (!m.night && !m.nap) { show(t('train.selectMethod'), '#f87171'); return; }
    setTOn(true);
    if (m.night) { setTMe(m.night); if (!tStartDate) { setTDy(1); setTStartDate(Date.now()); } setSavedMethod(m.night); }
    if (m.nap) { setTMeNap(m.nap); if (!tStartDateNap) { setTDyNap(1); setTStartDateNap(Date.now()); } if (!m.night && !savedMethod) setSavedMethod(m.nap); }
  };
  var doAddNap = function() {
    var m = method || {};
    if (!m.nap) { show(t('train.selectMethod'), '#f87171'); return; }
    setTMeNap(m.nap); setTDyNap(1); setTStartDateNap(Date.now()); if (!savedMethod) setSavedMethod(m.nap);
  };

  // ═══ LOCK SCREEN ═══
  if (!tOn && trainScore < 4 && !bypass) {
    var lockConds = [
      [t('train.lock.cond1'), trainAge, t('train.lock.fail1', { months: Math.floor(days / 30) })],
      [t('train.lock.cond2'), trainData, t('train.lock.fail2', { days: trainDays })],
      [t('train.lock.cond3'), trainBed, t('train.lock.fail3')],
      [t('train.lock.cond4'), trainEase, t('train.lock.fail4')],
    ];
    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.card}>
          <Text style={{ fontSize: 40, textAlign: 'center', marginBottom: 12 }}>{'\uD83D\uDD12'}</Text>
          <Text style={[s.lockTitle, { textAlign: 'center' }]}>{t('train.lock.preparing')}</Text>
          <Text style={s.lockSub}>{t('train.lock.sub')}</Text>
          {lockConds.map(function(cond, i) { return (
            <View key={i} style={s.condRow}>
              <View style={[s.condDot, cond[1] && s.condDotOk]}>{cond[1] && <Text style={{ color: '#fff', fontSize: 17, fontWeight: '900' }}>{'\u2713'}</Text>}</View>
              <View style={{ flex: 1 }}>
                <Text style={[s.condText, cond[1] && { color: COLORS.green }]}>{cond[0]}</Text>
                {!cond[1] && cond[2] ? <Text style={{ color: 'rgba(200,215,255,0.35)', fontSize: 15, lineHeight: 24, marginTop: 2 }}>{cond[2]}</Text> : null}
              </View>
            </View>
          ); })}
          <View style={s.progressBar}><View style={[s.progressFill, { width: (trainScore / 4 * 100) + '%' }]} /></View>
          <Text style={s.scoreText}>{trainScore + '/4 ' + t('train.lock.met')}</Text>
          <TouchableOpacity onPress={function() { setBypass(true); }} style={s.previewBtn}>
            <Text style={s.previewBtnText}>{t('train.preview')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // ═══ TIMER MODE ═══
  if (showTimer) {
    var isNight = showTimer === 'night';
    var timerMethod = isNight ? tMe : tMeNap;
    var timerDay = isNight ? tDy : tDyNap;
    var iF = timerMethod === 'ferber';
    var co = iF ? COLORS.red : COLORS.green;
    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[s.card, { borderColor: co + '40' }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ color: co, fontWeight: '800', fontSize: 17 }}>{(isNight ? '\uD83C\uDF19 ' : '\u2600\uFE0F ') + (iF ? t('train.ferber.title') : t('train.fading.title'))}</Text>
              <Text style={{ color: '#fff', fontWeight: '900', fontSize: 22, marginTop: 2 }}>{'Day ' + timerDay}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <TouchableOpacity onPress={function() { setTLg(function(p) { return p.concat([{ day: timerDay, rest: true, type: isNight ? 'night' : 'nap' }]); }); show(t('train.pauseToast'), COLORS.yellow); }} style={s.headerBtn}><Text style={s.headerBtnText}>{t('train.pauseBtn')}</Text></TouchableOpacity>
              <TouchableOpacity onPress={function() { if (isNight) { setTMe(null); setTDy(1); setTStartDate(null); if (!tMeNap) setTOn(false); } else { setTMeNap(null); setTDyNap(1); setTStartDateNap(null); if (!tMe) setTOn(false); } setShowTimer(null); }} style={[s.headerBtn, { borderColor: COLORS.red + '30' }]}>
                <Text style={[s.headerBtnText, { color: '#fca5a5' }]}>{t('train.reset')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        <TouchableOpacity onPress={function() { setShowTimer(null); }} style={{ alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(200,215,255,0.15)', marginBottom: 12 }}>
          <Text style={{ color: 'rgba(200,215,255,0.5)', fontWeight: '700', fontSize: 13 }}>{'\u2190 ' + t('c.back')}</Text>
        </TouchableOpacity>
        {iF && <FerberTimer day={timerDay} name={n} onSleepMsg={setSleepMsg} timerType={showTimer} />}
        {!iF && <FadingView step={isNight ? fadingStep : fadingStepNap} setStep={isNight ? setFadingStep : setFadingStepNap} day={timerDay} timerType={showTimer} />}
        <Modal visible={!!sleepMsg} transparent animationType="fade">
          <TouchableOpacity style={s.modalBg} activeOpacity={1} onPress={function() { setSleepMsg(null); }}>
            <View style={s.modalCard}>
              <Text style={{ fontSize: 48, marginBottom: 20, alignSelf: 'center' }}>{'\uD83C\uDF19'}</Text>
              <Text style={s.modalMsg}>{sleepMsg ? sleepMsg.msg : ''}</Text>
              <TouchableOpacity onPress={function() { setSleepMsg(null); }} style={s.modalBtn}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16, textAlign: 'center' }}>{sleepMsg ? sleepMsg.btn : t('c.ok')}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
        <View style={{ height: 20 }} />
      </ScrollView>
    );
  }

  // ═══ MAIN VIEW ═══
  var pred = calcPrediction();
  var tabLabels = t('train.tabs');
  var step0Items = t('train.step0');
  var step1Items = t('train.step1');
  var nightActive = !!tMe;
  var napActive = !!(tMeNap && tStartDateNap);

  return (
    <ScrollView ref={function(r) { if (r) trainScroll = r; }} showsVerticalScrollIndicator={false}>

      {tOn && <View style={[s.card, { borderColor: '#9a8cf040', backgroundColor: 'rgba(154,140,240,0.06)' }]}>
        <Text style={{ color: '#e0d4ff', fontWeight: '900', fontSize: 19, marginBottom: 14, lineHeight: 28, textAlign: 'center' }}>{t('train.dashboard.title')}</Text>
        {nightActive && <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' }}>
          <View style={{flex:1}}><Text style={{ color: tMe === 'ferber' ? COLORS.red : COLORS.green, fontWeight: '800', fontSize: 17, textAlign: 'center' }}>{t('train.dashboard.nightLabel') + ' ' + (tMe === 'ferber' ? t('train.ferber.title') : t('train.fading.title'))}</Text><Text style={{ color: 'rgba(200,215,255,0.5)', fontSize: 15, marginTop: 2, textAlign: 'center' }}>{'D+' + tDy}</Text></View>
        </View>}
        {napActive && <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' }}>
          <View style={{flex:1}}><Text style={{ color: tMeNap === 'ferber' ? COLORS.red : COLORS.green, fontWeight: '800', fontSize: 17, textAlign: 'center' }}>{t('train.dashboard.napLabel') + ' ' + (tMeNap === 'ferber' ? t('train.ferber.title') : t('train.fading.title'))}</Text><Text style={{ color: 'rgba(200,215,255,0.5)', fontSize: 15, marginTop: 2, textAlign: 'center' }}>{'D+' + tDyNap}</Text></View>
        </View>}
        {nightActive && !napActive && <View style={{ marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' }}>
          <Text style={{ color: 'rgba(200,215,255,0.35)', fontSize: 15 }}>{t('train.dashboard.napNone')}</Text>
          <TouchableOpacity onPress={function() { setTStep(1); }}><Text style={{ color: '#9a8cf0', fontSize: 15, fontWeight: '700', marginTop: 4 }}>{t('train.dashboard.napAdd') + ' \u2192'}</Text></TouchableOpacity>
        </View>}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12, gap: 8 }}>
          <Text style={{ color: envReady ? COLORS.green : 'rgba(200,215,255,0.5)', fontWeight: '800', fontSize: 15 }}>{t('train.dashboard.envLabel') + ' ' + envSc + '/5'}</Text>
          {!envReady && <Text style={{ color: 'rgba(200,215,255,0.3)', fontSize: 13 }}>{t('train.dashboard.envWarn')}</Text>}
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {nightActive && <TouchableOpacity onPress={function() { if (envReady) setShowTimer('night'); else show(t('train.dashboard.envWarn'), '#f87171'); }} style={[s.timerEntryBtn, { backgroundColor: envReady ? '#9a8cf0' : 'rgba(154,140,240,0.3)', opacity: envReady ? 1 : 0.5 }]}>
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15 }}>{t('train.dashboard.nightStart')}</Text>
          </TouchableOpacity>}
          {napActive && <TouchableOpacity onPress={function() { if (envReady) setShowTimer('nap'); else show(t('train.dashboard.envWarn'), '#f87171'); }} style={[s.timerEntryBtn, { backgroundColor: envReady ? '#059669' : 'rgba(5,150,105,0.3)', opacity: envReady ? 1 : 0.5 }]}>
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15 }}>{t('train.dashboard.napStart')}</Text>
          </TouchableOpacity>}
        </View>
      </View>}

      <View style={{ flexDirection: 'row', gap: 4, marginBottom: 14 }}>
        {tabLabels.map(function(sn, i) { return (
          <TouchableOpacity key={i} onPress={function() { setTStep(i); }} style={[s.stepTab, tStep === i && s.stepTabActive]}>
            <Text style={[s.stepTabText, tStep === i && { color: '#d4bbff' }]}>{sn}</Text>
          </TouchableOpacity>
        ); })}
      </View>

      {tStep === 0 && <View>
        <TouchableOpacity onPress={function() { setWhatOpen(!whatOpen); }} style={s.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: '#e0d4ff', fontWeight: '900', fontSize: 19, lineHeight: 28 }}>{t('train.whatIs')}</Text>
            <Text style={{ color: 'rgba(200,215,255,0.4)', fontSize: 17 }}>{whatOpen ? '\u25B2' : '\u25BC'}</Text>
          </View>
          {whatOpen && <View style={{ marginTop: 12 }}>
            <Text style={{ color: 'rgba(200,215,255,0.65)', fontSize: 17, lineHeight: 28 }}>{t('train.whatIsDesc')}</Text>
            <Text style={{ color: 'rgba(200,215,255,0.25)', fontSize: 15, marginTop: 8, lineHeight: 24 }}>{t('train.lock.disclaimer')}</Text>
          </View>}
        </TouchableOpacity>
        <TouchableOpacity onPress={copyPartner} style={s.partnerBtn}><Text style={{ color: '#93c5fd', fontWeight: '800', fontSize: 15 }}>{t('train.partner')}</Text></TouchableOpacity>

        <TouchableOpacity onPress={function() { setPredOpen(!predOpen); }} style={[s.card, { borderColor: '#9a8cf040', backgroundColor: 'rgba(154,140,240,0.08)' }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: '#e0d4ff', fontWeight: '900', fontSize: 19, lineHeight: 28 }}>{t('train.predict.title')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
              <Text style={{ color: pred.gc, fontWeight: '900', fontSize: 40 }}>{pred.verdict.split(' ')[0]}</Text>
              <Text style={{ color: 'rgba(200,215,255,0.4)', fontSize: 17 }}>{predOpen ? '\u25B2' : '\u25BC'}</Text>
            </View>
          </View>
          {predOpen && <View style={{ marginTop: 10 }}>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 8, height: 10, marginBottom: 12, overflow: 'hidden' }}><View style={{ width: pred.pctR + '%', height: '100%', borderRadius: 8, backgroundColor: pred.gc }} /></View>
            <Text style={{ color: pred.gc, fontSize: 15, fontWeight: '800', textAlign: 'center', marginBottom: 12 }}>{pred.verdict}</Text>
            {pred.items.map(function(it, i) { return (
              <View key={i} style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}><Text style={{ color: 'rgba(200,215,255,0.7)', fontSize: 15, fontWeight: '700' }}>{it.l}</Text><Text style={{ color: it.s >= 20 ? it.c : it.s >= 10 ? '#f0cd8a' : '#f87171', fontSize: 15, fontWeight: '900' }}>{it.s + '/' + it.m}</Text></View>
                <View style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 4, height: 5, marginBottom: 3 }}><View style={{ width: Math.round(it.s / it.m * 100) + '%', height: '100%', borderRadius: 4, backgroundColor: it.c }} /></View>
                <Text style={{ color: 'rgba(200,215,255,0.45)', fontSize: 15 }}>{it.d}</Text>
              </View>
            ); })}
            {pred.pctR < 60 && <View style={{ marginTop: 8, padding: 10, backgroundColor: 'rgba(248,113,113,0.06)', borderWidth: 1, borderColor: 'rgba(248,113,113,0.15)', borderRadius: 10 }}><Text style={{ color: '#fca5a5', fontSize: 15, fontWeight: '700', lineHeight: 25 }}>{t('train.pred.lowMsg')}</Text></View>}
            {pred.pctR >= 60 && pred.pctR < 80 && <View style={{ marginTop: 8, padding: 10, backgroundColor: 'rgba(96,165,250,0.06)', borderWidth: 1, borderColor: 'rgba(96,165,250,0.15)', borderRadius: 10 }}><Text style={{ color: '#93c5fd', fontSize: 15, fontWeight: '700', lineHeight: 25 }}>{t('train.pred.midMsg')}</Text></View>}
          </View>}
        </TouchableOpacity>

        <View style={s.card}>
          <Text style={{ color: '#e0d4ff', fontWeight: '900', fontSize: 19, marginBottom: 14, lineHeight: 28 }}>{step1Items.title}</Text>
          {step1Items.env.map(function(item, i) { var keys2 = ['temp', 'humid', 'dark', 'noise', 'routine']; var key = keys2[i]; return (
            <TouchableOpacity key={i} onPress={function() { toggleEnv(key); }} style={{ marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(154,140,240,0.1)' }}>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                <View style={[s.condDot, envCh[key] && s.condDotOk]}>{envCh[key] && <Text style={{ color: '#fff', fontSize: 17, fontWeight: '900' }}>{'\u2713'}</Text>}</View>
                <View style={{ flex: 1 }}><Text style={{ color: 'rgba(200,215,255,0.8)', fontSize: 17, fontWeight: '800' }}>{item[0] + ' ' + item[1]}</Text><Text style={{ color: 'rgba(200,215,255,0.4)', fontSize: 15, lineHeight: 25, marginTop: 2 }}>{item[2]}</Text></View>
              </View>
            </TouchableOpacity>
          ); })}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: envReady ? COLORS.green : 'rgba(200,215,255,0.35)', fontSize: 15 }}>{envSc + '/5'}</Text>
            <TouchableOpacity onPress={function() { setEnvCh({ temp: true, humid: true, dark: true, noise: true, routine: true }); }} style={{ padding: 10, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(52,211,153,0.3)', backgroundColor: 'rgba(52,211,153,0.08)' }}><Text style={{ color: COLORS.green, fontWeight: '800', fontSize: 15 }}>{step1Items.allCheck}</Text></TouchableOpacity>
          </View>
        </View>

        <View style={s.card}>
          <Text style={{ color: '#e0d4ff', fontWeight: '900', fontSize: 19, marginBottom: 14, lineHeight: 28 }}>{step0Items.title}</Text>
          {['health', 'agree', 'time', 'teeth', 'skill'].map(function(key, i) { var item = step0Items[key]; return (
            <TouchableOpacity key={i} onPress={function() { setRdyCh(function(p) { var o = p ? Object.assign({}, p) : {}; o[key] = !o[key]; return o; }); }} style={{ marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(154,140,240,0.1)' }}>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                <View style={[s.condDot, (rdyCh && rdyCh[key]) && s.condDotOk]}>{(rdyCh && rdyCh[key]) && <Text style={{ color: '#fff', fontSize: 17, fontWeight: '900' }}>{'\u2713'}</Text>}</View>
                <View style={{ flex: 1 }}><Text style={{ color: 'rgba(200,215,255,0.8)', fontSize: 17, fontWeight: '700' }}>{item[0] + ' ' + item[1]}</Text><Text style={{ color: 'rgba(200,215,255,0.4)', fontSize: 15, lineHeight: 28, marginTop: 2 }}>{item[2]}</Text></View>
              </View>
            </TouchableOpacity>
          ); })}
        </View>
      </View>}

      {tStep === 1 && <View>
        <View style={s.card}>
          <Text style={{ color: '#c4b5fd', fontWeight: '900', fontSize: 19, marginBottom: 4 }}>{t('train.method.title')}</Text>
          <Text style={{ color: 'rgba(200,215,255,0.35)', fontSize: 15, marginBottom: 8 }}>{t('train.method.sub')}</Text>
          <View style={{ height: 1.5, backgroundColor: 'rgba(154,140,240,0.2)', marginBottom: 12 }} />
          {chkKeys.map(function(key) { return (
            <TouchableOpacity key={key} onPress={function() { toggleChk(key); }} style={s.chkRow}>
              <View style={[s.chkBox, mChk[key] && s.chkBoxActive]}>{mChk[key] && <Text style={{ color: '#fff', fontSize: 17, fontWeight: '900' }}>{'\u2713'}</Text>}</View>
              <Text style={[s.chkLabel, mChk[key] && { color: 'rgba(200,215,255,0.85)', textDecorationLine: 'line-through', textDecorationColor: 'rgba(154,140,240,0.4)' }]}>{t('train.chk.' + key)}</Text>
            </TouchableOpacity>
          ); })}
          {totalChecked >= 2 && rec && <View style={[s.recBox, { borderColor: rec === 'ferber' ? COLORS.red + '40' : COLORS.green + '40', backgroundColor: rec === 'ferber' ? COLORS.red + '08' : COLORS.green + '08' }]}>
            <Text style={{ fontSize: 22, marginBottom: 12 }}>{rec === 'ferber' ? '\uD83D\uDD25' : '\uD83C\uDF3F'}</Text>
            <Text style={{ color: rec === 'ferber' ? COLORS.red : COLORS.green, fontWeight: '900', fontSize: 19, lineHeight: 28 }}>{rec === 'ferber' ? t('train.ferber.title') + ' ' + t('train.method.rec') : t('train.fading.title') + ' ' + t('train.method.rec')}</Text>
            <Text style={{ color: 'rgba(200,215,255,0.4)', fontSize: 15 }}>{t('train.method.score', { f: fScore, d: dScore })}</Text>
          </View>}
          {totalChecked >= 2 && <View style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 16, marginTop: 12 }}>
            <Text style={{ color: '#fde68a', fontSize: 15, fontWeight: '800', marginBottom: 14 }}>{t('train.method.tipsTitle')}</Text>
            {mChk.nurse && <Text style={s.tipText}>{t('train.customTips.nurse')}</Text>}
            {mChk.hold && <Text style={s.tipText}>{t('train.customTips.hold')}</Text>}
            {mChk.wake && <Text style={s.tipText}>{t('train.customTips.wake')}</Text>}
            {mChk.quick && <Text style={s.tipText}>{t('train.customTips.quick')}</Text>}
            {mChk.sepa && <Text style={s.tipText}>{t('train.customTips.sepa')}</Text>}
            {mChk.fail && <Text style={s.tipText}>{t('train.customTips.fail')}</Text>}
            {mChk.cry && <Text style={s.tipText}>{t('train.customTips.cry')}</Text>}
          </View>}
          {totalChecked < 2 && <Text style={{ color: 'rgba(200,215,255,0.35)', fontSize: 15, textAlign: 'center', marginTop: 8 }}>{t('train.method.checkMore')}</Text>}
        </View>
        <View style={s.card}>
          <Text style={{ color: '#e0d4ff', fontWeight: '900', fontSize: 19, marginBottom: 6, lineHeight: 28, textAlign: 'center' }}>{lang==='ko'?'어디서부터 시작할까요?':'Where to start?'}</Text>
          <Text style={{ color: 'rgba(200,215,255,0.35)', fontSize: 15, marginBottom: 14, textAlign: 'center' }}>{lang==='ko'?'밤잠과 낮잠 중 먼저 할 걸 골라주세요':'Choose whether to start with nights or naps'}</Text>
          <TouchableOpacity onPress={function() { setMethod(function(p) { return Object.assign({}, p || {}, { path: 'night' }); }); }} style={[s.methodBtn, { borderColor: (method && method.path) === 'night' ? '#9a8cf060' : 'rgba(255,255,255,0.06)', backgroundColor: (method && method.path) === 'night' ? '#9a8cf010' : 'transparent' }]}>
            <Text style={{ color: '#9a8cf0', fontWeight: '900', fontSize: 19, lineHeight: 27, textAlign: 'center' }}>{t('train.pathATitle')}</Text>
            <Text style={{ color: 'rgba(200,215,255,0.45)', fontSize: 15, lineHeight: 23, textAlign: 'center', marginTop: 4 }}>{t('train.pathAWhen')}</Text>
            <Text style={{ color: 'rgba(200,215,255,0.7)', fontSize: 15, marginTop: 14, lineHeight: 25, textAlign: 'center' }}>{t('train.pathADesc')}</Text>
            <View style={{ marginTop: 14, gap: 8 }}>
              <Text style={{ color: 'rgba(200,215,255,0.55)', fontSize: 15, lineHeight: 23, textAlign: 'center' }}>{'1️⃣ '+t('train.pathAStep1')}</Text>
              <Text style={{ color: 'rgba(200,215,255,0.55)', fontSize: 15, lineHeight: 23, textAlign: 'center' }}>{'2️⃣ '+t('train.pathAStep2')}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={function() { setMethod(function(p) { return Object.assign({}, p || {}, { path: 'nap' }); }); }} style={[s.methodBtn, { borderColor: (method && method.path) === 'nap' ? '#34d39960' : 'rgba(255,255,255,0.06)', backgroundColor: (method && method.path) === 'nap' ? '#34d39910' : 'transparent' }]}>
            <Text style={{ color: '#34d399', fontWeight: '900', fontSize: 19, lineHeight: 27, textAlign: 'center' }}>{t('train.pathBTitle')}</Text>
            <Text style={{ color: 'rgba(200,215,255,0.45)', fontSize: 15, lineHeight: 23, textAlign: 'center', marginTop: 4 }}>{t('train.pathBWhen')}</Text>
            <Text style={{ color: 'rgba(200,215,255,0.7)', fontSize: 15, marginTop: 14, lineHeight: 25, textAlign: 'center' }}>{t('train.pathBDesc')}</Text>
            <View style={{ marginTop: 14, gap: 8 }}>
              <Text style={{ color: 'rgba(200,215,255,0.55)', fontSize: 15, lineHeight: 23, textAlign: 'center' }}>{'1️⃣ '+t('train.pathBStep1')}</Text>
              <Text style={{ color: 'rgba(200,215,255,0.55)', fontSize: 15, lineHeight: 23, textAlign: 'center' }}>{'2️⃣ '+t('train.pathBStep2')}</Text>
            </View>
          </TouchableOpacity>
          <View style={{ backgroundColor: 'rgba(240,205,138,0.06)', borderRadius: 20, padding: 22, borderWidth: 1, borderColor: 'rgba(240,205,138,0.15)' }}>
            <Text style={{ color: '#fde68a', fontWeight: '800', fontSize: 17, lineHeight: 25, marginBottom: 10, textAlign: 'center' }}>{t('train.pathMix')}</Text>
            <Text style={{ color: 'rgba(200,215,255,0.7)', fontSize: 15, lineHeight: 25, textAlign: 'center' }}>{t('train.pathMixDesc')}</Text>
          </View>
          <Text style={{ color: 'rgba(200,215,255,0.3)', fontSize: 13, lineHeight: 21, marginTop: 14, textAlign: 'center' }}>{lang==='ko'?'📚 Mindell et al. (2006) Sleep, Galland et al. (2012) Sleep Medicine Reviews 기반':'📚 Based on Mindell et al. (2006) Sleep, Galland et al. (2012) Sleep Medicine Reviews'}</Text>
        </View>
        <View style={s.card}>
          <Text style={{ color: '#e0d4ff', fontWeight: '900', fontSize: 19, marginBottom: 12, lineHeight: 28 }}>{'\uD83C\uDF19 ' + t('train.method.nightMethod')}</Text>
          <TouchableOpacity onPress={function() { setMethod(function(p) { return Object.assign({}, p || {}, { night: 'ferber' }); }); }} style={[s.methodBtn, (method && method.night) === 'ferber' && { borderColor: COLORS.red + '60', backgroundColor: COLORS.red + '10' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={{ color: COLORS.red, fontWeight: '900', fontSize: 15 }}>{'\uD83D\uDD25 ' + t('train.ferber.title')}</Text>{rec === 'ferber' && <Text style={{ color: COLORS.yellow, fontSize: 15, fontWeight: '800' }}>{t('train.method.rec')}</Text>}</View>
            <Text style={{ color: 'rgba(200,215,255,0.5)', fontSize: 17, marginTop: 4 }}>{t('train.ferber.desc')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={function() { setMethod(function(p) { return Object.assign({}, p || {}, { night: 'fading' }); }); }} style={[s.methodBtn, (method && method.night) === 'fading' && { borderColor: COLORS.green + '60', backgroundColor: COLORS.green + '10' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={{ color: COLORS.green, fontWeight: '900', fontSize: 15 }}>{'\uD83C\uDF3F ' + t('train.fading.title')}</Text>{rec === 'fading' && <Text style={{ color: COLORS.yellow, fontSize: 15, fontWeight: '800' }}>{t('train.method.rec')}</Text>}</View>
            <Text style={{ color: 'rgba(200,215,255,0.5)', fontSize: 17, marginTop: 4 }}>{t('train.fading.desc')}</Text>
          </TouchableOpacity>
        </View>
        <View style={s.card}>
          <Text style={{ color: '#e0d4ff', fontWeight: '900', fontSize: 19, marginBottom: 12, lineHeight: 28 }}>{'\u2600\uFE0F ' + t('train.method.napMethod')}</Text>
          <TouchableOpacity onPress={function() { setMethod(function(p) { return Object.assign({}, p || {}, { nap: 'ferber' }); }); }} style={[s.methodBtn, (method && method.nap) === 'ferber' ? { borderColor: COLORS.red + '60', backgroundColor: COLORS.red + '10' } : {}]}>
            <Text style={{ color: COLORS.red, fontWeight: '900', fontSize: 15 }}>{'\uD83D\uDD25 ' + t('train.ferber.title')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={function() { setMethod(function(p) { return Object.assign({}, p || {}, { nap: 'fading' }); }); }} style={[s.methodBtn, (method && method.nap) === 'fading' ? { borderColor: COLORS.green + '60', backgroundColor: COLORS.green + '10' } : {}]}>
            <Text style={{ color: COLORS.green, fontWeight: '900', fontSize: 15 }}>{'\uD83C\uDF3F ' + t('train.fading.title')}</Text>
          </TouchableOpacity>
          {method && method.night && !method.nap && <Text style={{ color: 'rgba(200,215,255,0.4)', fontSize: 15, textAlign: 'center', marginTop: 4, lineHeight: 24 }}>{t('train.nightOnly')}</Text>}
        </View>
        {(method && method.night && !nightActive || method && method.nap && !napActive) && <TouchableOpacity onPress={doStart} style={[s.startBtn, { opacity: (method && (method.night || method.nap)) ? 1 : 0.4 }]}><Text style={{ color: '#fff', fontSize: 17, fontWeight: '900' }}>{t('train.start')}</Text></TouchableOpacity>}
      </View>}

      {tStep === 2 && <View>
        <View style={[s.card, { backgroundColor: 'rgba(248,113,113,0.06)', borderColor: 'rgba(248,113,113,0.2)' }]}>
          <Text style={{ color: '#fca5a5', fontWeight: '900', fontSize: 19, marginBottom: 14 }}>{t('train.mustKnow')}</Text>
          {[['\uD83D\uDCA5', t('train.mustKnow1_title'), t('train.mustKnow1_desc')], ['\uD83D\uDE34', t('train.mustKnow2_title'), t('train.mustKnow2_desc')], ['\u23F0', t('train.mustKnow3_title'), t('train.mustKnow3_desc')], ['\u2600\uFE0F', t('train.mustKnow4_title'), t('train.mustKnow4_desc')]].map(function(mk, i) { return (
            <View key={i} style={{ flexDirection: 'row', gap: 14, paddingBottom: 14, marginBottom: 14, borderBottomWidth: i < 3 ? 1 : 0, borderBottomColor: 'rgba(248,113,113,0.1)' }}>
              <Text style={{ fontSize: 17 }}>{mk[0]}</Text>
              <View style={{ flex: 1 }}><Text style={{ color: '#fca5a5', fontWeight: '800', fontSize: 17, marginBottom: 2 }}>{mk[1]}</Text><Text style={{ color: 'rgba(200,215,255,0.55)', fontSize: 15, lineHeight: 25 }}>{mk[2]}</Text></View>
            </View>
          ); })}
        </View>
        <View style={[s.card, { backgroundColor: 'rgba(240,205,138,0.05)', borderColor: 'rgba(240,205,138,0.15)' }]}>
          <Text style={{ color: '#fde68a', fontWeight: '900', fontSize: 19, marginBottom: 14 }}>{t('train.stop.title')}</Text>
          {[['\uD83E\uDD12', t('train.stop.sickTitle'), t('train.stop.sickDesc')], ['\uD83E\uDD2E', t('train.stop.vomitTitle'), t('train.stop.vomitDesc')], ['\uD83D\uDCC5', t('train.stop.noProgressTitle'), t('train.stop.noProgressDesc')], ['\uD83E\uDDB7', t('train.stop.teethTitle'), t('train.stop.teethDesc')], ['\uD83C\uDF31', t('train.stop.devTitle'), t('train.stop.devDesc')]].map(function(st, i) { return (
            <View key={i} style={{ flexDirection: 'row', gap: 14, paddingBottom: 14, marginBottom: 14, borderBottomWidth: i < 4 ? 1 : 0, borderBottomColor: 'rgba(240,205,138,0.08)' }}>
              <Text style={{ fontSize: 17 }}>{st[0]}</Text>
              <View style={{ flex: 1 }}><Text style={{ color: '#fde68a', fontWeight: '800', fontSize: 17, marginBottom: 2 }}>{st[1]}</Text><Text style={{ color: 'rgba(200,215,255,0.5)', fontSize: 15, lineHeight: 25 }}>{st[2]}</Text></View>
            </View>
          ); })}
          <View style={{ backgroundColor: 'rgba(240,205,138,0.06)', borderRadius: 8, padding: 8, marginTop: 4 }}><Text style={{ color: 'rgba(253,230,138,0.7)', fontSize: 15, lineHeight: 28 }}>{t('train.stop.footer')}</Text></View>
        </View>
        <View style={[s.card, { borderColor: COLORS.blue + '30' }]}>
          <Text style={{ color: '#93c5fd', fontWeight: '900', fontSize: 19, marginBottom: 12 }}>{t('train.regression.title')}</Text>
          <Text style={{ color: 'rgba(200,215,255,0.55)', fontSize: 15, lineHeight: 28, marginBottom: 14 }}>{t('train.regression.desc')}</Text>
          {[['\uD83E\uDDB7', t('train.regression.sick'), t('train.regression.sickDesc')], ['\u2708\uFE0F', t('train.regression.travel'), t('train.regression.travelDesc')], ['\uD83C\uDF31', t('train.regression.dev'), t('train.regression.devDesc')], ['\uD83D\uDCC5', t('train.regression.timeTitle'), t('train.regression.timeDesc')]].map(function(rg, i) { return (
            <View key={i} style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
              <Text style={{ fontSize: 17 }}>{rg[0]}</Text>
              <View style={{ flex: 1 }}><Text style={{ color: 'rgba(200,215,255,0.7)', fontSize: 17, fontWeight: '800' }}>{rg[1]}</Text><Text style={{ color: 'rgba(200,215,255,0.45)', fontSize: 15, lineHeight: 28 }}>{rg[2]}</Text></View>
            </View>
          ); })}
        </View>
      </View>}

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

function FerberTimer(props) {
  var day = props.day, name = props.name, onSleepMsg = props.onSleepMsg;
  var timerType = props.timerType || 'night';
  var ctx = useLang(); var t = ctx.t; var lang = ctx.lang;
  var fAppCtx = useApp(); var reviewed = fAppCtx.reviewed; var setReviewed = fAppCtx.setReviewed;
  var setAsleep = fAppCtx.setAsleep; var setSS = fAppCtx.setSS; var setSleepEase = fAppCtx.setSleepEase; var showToast = fAppCtx.show;
  var ints = FERBER[Math.min(day - 1, FERBER.length - 1)];
  var cheerArr = t('sleep.cheer');
  var stA = useState(false); var active = stA[0]; var setActive = stA[1];
  var stS = useState(0); var secs = stS[0]; var setSecs = stS[1];
  var stI = useState(0); var intIdx = stI[0]; var setIntIdx = stI[1];
  var stC = useState(false); var checkNow = stC[0]; var setCheckNow = stC[1];
  var stCh = useState(0); var cheerIdx = stCh[0]; var setCheerIdx = stCh[1];
  var timerRef = useRef(null); var cheerRef = useRef(null);
  var stCL = useState([]); var cryLog = stCL[0]; var setCryLog = stCL[1];
  var stCM = useState(''); var cryMin = stCM[0]; var setCryMin = stCM[1];
  var stCI = useState(0); var ciCount = stCI[0]; var setCiCount = stCI[1];
  var stSA = useState(null); var startedAt = stSA[0]; var setStartedAt = stSA[1];
  var cryLoaded = useRef(false);
  var cryKey = timerType === 'nap' ? 'cryLogNap' : 'cryLog';
  useEffect(function() { LD(cryKey, []).then(function(saved) { if (saved && saved.length > 0) setCryLog(saved); cryLoaded.current = true; }); }, []);
  useEffect(function() { if (cryLoaded.current) SV(cryKey, cryLog); }, [cryLog]);
  var n = name || t('c.baby');
  var np = lang === 'ko' ? { ns: pp(n, '\uC774\uB294', '\uB294'), ng: pp(n, '\uC774\uAC00', '\uAC00'), ne: pp(n, '\uC774\uC5D0\uAC8C', '\uC5D0\uAC8C'), nr: pp(n, '\uC774\uB97C', '\uB97C'), ns2: pp(n, '\uC774\uC758', '\uC758'), ns3: pp(n, '\uC774\uB294', '\uB294') } : { ns: n, ng: n, ne: n, nr: n, ns2: n + "'s", ns3: n, name: n };
  var sleepMsgFor = function(d) { var msgs = t('train.sleepMsgs'); var idx = Math.min(d - 1, msgs.length - 1); var msg = msgs[idx]; var txt = msg.msg; var btn = msg.btn; var keys = Object.keys(np); for (var i = 0; i < keys.length; i++) { txt = txt.split('{' + keys[i] + '}').join(np[keys[i]]); btn = btn.split('{' + keys[i] + '}').join(np[keys[i]]); } return { msg: txt, btn: btn }; };
  useEffect(function() { if (active && !checkNow) { timerRef.current = setInterval(function() { setSecs(function(s2) { if (s2 <= 1) { setCheckNow(true); return 0; } return s2 - 1; }); }, 1000); cheerRef.current = setInterval(function() { setCheerIdx(function(ci) { return (ci + 1) % (Array.isArray(cheerArr) ? cheerArr.length : 10); }); }, 6000); } return function() { clearInterval(timerRef.current); clearInterval(cheerRef.current); }; }, [active, checkNow]);
  var startTimer = function() { setSecs(ints[0] * 60); setCheckNow(false); setIntIdx(0); setActive(true); setCiCount(0); setStartedAt(Date.now()); };
  var afterCheckIn = function() { var next = Math.min(intIdx + 1, ints.length - 1); setIntIdx(next); setSecs(ints[next] * 60); setCheckNow(false); setCiCount(function(c2) { return c2 + 1; }); };
  var fellAsleep = function() {
    if (startedAt) {
      var elapsedMin = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
      setCryLog(function(p) { var filtered = p.filter(function(x) { return x.day !== day; }); return filtered.concat([{ min: elapsedMin, day: day }]); });
      // Auto-trigger sleep record via HomeScreen flow (same as manual "Fell asleep" button)
      var autoEase = elapsedMin < 5 ? 'under5' : elapsedMin < 15 ? '5to15' : elapsedMin < 30 ? '15to30' : 'over30';
      setAsleep(true); setSS(Date.now()); setSleepEase(autoEase);
      if (showToast) showToast((lang==='ko'?'😴 수면 시작 · ':'😴 Sleep started · ')+elapsedMin+(lang==='ko'?'분 만에 잠들었어요':' min to fall asleep'), '#9a8cf0');
      setStartedAt(null);
    }
    setActive(false); setCheckNow(false); setSecs(0);
    if (onSleepMsg) onSleepMsg(sleepMsgFor(day));
  };
  var logCry = function() { if (cryMin) { var m = +cryMin; setCryLog(function(p) { var filtered = p.filter(function(x) { return x.day !== day; }); return filtered.concat([{ min: m, day: day }]); }); setCryMin(''); if (m <= 10 && !reviewed) { setTimeout(function() { try { if (StoreReview && StoreReview.isAvailableAsync) { StoreReview.isAvailableAsync().then(function(ok) { if (ok) { StoreReview.requestReview(); setReviewed(true); } }); } } catch(e) {} }, 2000); } } };
  var totalSecs = ints[Math.min(intIdx, ints.length - 1)] * 60;
  var pctBar = totalSecs > 0 ? Math.round((totalSecs - secs) / totalSecs * 100) : 0;
  var mm = Math.floor(secs / 60), ss2 = secs % 60;
  var isLastInt = intIdx >= ints.length - 1;
  var nextIntMin = ints[Math.min(intIdx + 1, ints.length - 1)];
  var checkinSteps = t('train.ferber.checkinSteps');

  if (checkNow) return (
    <View style={[ts.card, { backgroundColor: 'rgba(240,205,138,0.1)', borderColor: 'rgba(240,205,138,0.4)' }]}>
      <View style={{ alignItems: 'center', marginBottom: 12 }}><Text style={{ fontSize: 48, marginBottom: 8 }}>{'\uD83D\uDD14'}</Text><Text style={{ color: '#f0cd8a', fontWeight: '900', fontSize: 22, lineHeight: 30 }}>{t('train.ferber.checkinAlert')}</Text><Text style={{ color: 'rgba(200,215,255,0.5)', fontSize: 15, marginTop: 4 }}>{t('train.ferber.checkinNum', { n: ciCount + 1 })}</Text></View>
      <View style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 14, marginBottom: 14 }}>
        <Text style={{ color: '#fde68a', fontWeight: '800', fontSize: 15, marginBottom: 10 }}>{t('train.ferber.checkinDo')}</Text>
        {Array.isArray(checkinSteps) && checkinSteps.map(function(step, i) { return (<View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 6 }}><Text style={{ color: '#f0cd8a', fontWeight: '900', fontSize: 15, width: 18 }}>{i + 1}</Text><Text style={{ color: 'rgba(200,215,255,0.75)', fontSize: 15, lineHeight: 24, flex: 1 }}>{step}</Text></View>); })}
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity onPress={afterCheckIn} style={{ flex: 2, padding: 14, borderRadius: 14, backgroundColor: '#dc2626', alignItems: 'center' }}><Text style={{ color: '#fff', fontWeight: '900', fontSize: 17 }}>{'\u23F1 ' + (isLastInt ? t('train.ferber.repeatInt', { min: ints[ints.length - 1] }) : t('train.ferber.nextInt', { min: nextIntMin }))}</Text></TouchableOpacity>
        <TouchableOpacity onPress={fellAsleep} style={{ flex: 1, padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(52,211,153,0.3)', backgroundColor: 'rgba(52,211,153,0.1)', alignItems: 'center' }}><Text style={{ color: '#34d399', fontWeight: '800', fontSize: 15 }}>{t('train.ferber.fellAsleep')}</Text></TouchableOpacity>
      </View>
      {isLastInt && <Text style={{ color: '#fca5a5', fontSize: 15, fontWeight: '700', textAlign: 'center', marginTop: 8 }}>{t('train.ferber.repeatNote', { min: ints[ints.length - 1] })}</Text>}
    </View>
  );

  return (
    <View>
      <View style={[ts.card, active ? { backgroundColor: 'rgba(248,113,113,0.06)', borderColor: 'rgba(248,113,113,0.25)' } : {}]}>
        {active && <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ color: '#f87171', fontWeight: '800', fontSize: 15 }}>{isLastInt ? t('train.ferber.repeating', { n: ciCount + 1, min: ints[ints.length - 1] }) : t('train.ferber.waiting', { n: intIdx + 1 })}</Text>
          <TouchableOpacity onPress={function() { setActive(false); setCheckNow(false); setSecs(0); }} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}><Text style={{ color: 'rgba(200,215,255,0.4)', fontSize: 15, fontWeight: '700' }}>{t('train.ferber.cancel')}</Text></TouchableOpacity>
        </View>}
        {!active && <Text style={ts.intLabel}>{t('train.ferber.intLabel', { d: day, ints: ints.join(' \u2192 ') })}</Text>}
        {!active && <Text style={{ color: 'rgba(200,215,255,0.4)', fontSize: 15, textAlign: 'center', marginBottom: 12, lineHeight: 24 }}>{t('train.ferber.intDesc', { a: ints[0], b: ints[1], c: ints[2] })}</Text>}
        <Text style={{ color: '#fff', fontSize: 60, fontWeight: '900', letterSpacing: -2, textAlign: 'center', marginVertical: active ? 8 : 0 }}>{String(mm).padStart(2, '0') + ':' + String(ss2).padStart(2, '0')}</Text>
        {active && <View style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 6, height: 10, marginVertical: 12, overflow: 'hidden' }}><View style={{ width: pctBar + '%', height: '100%', borderRadius: 6, backgroundColor: pctBar < 50 ? '#f87171' : pctBar < 80 ? '#f0cd8a' : '#34d399' }} /></View>}
        {active && <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 12 }}>{ints.map(function(_, i) { return <View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: i < intIdx ? '#34d399' : i === intIdx ? '#f87171' : 'rgba(255,255,255,0.1)' }} />; })}{isLastInt && <Text style={{ color: 'rgba(200,215,255,0.3)', fontSize: 15, marginLeft: 4 }}>{'\u2026' + ints[ints.length - 1] + 'm \u221E'}</Text>}</View>}
        {active && <View style={{ backgroundColor: 'rgba(154,140,240,0.1)', borderWidth: 1.5, borderColor: 'rgba(154,140,240,0.2)', borderRadius: 14, padding: 14, alignItems: 'center', marginBottom: 8 }}><Text style={{ color: '#c4b5fd', fontSize: 17, fontWeight: '700', lineHeight: 26, textAlign: 'center' }}>{Array.isArray(cheerArr) ? cheerArr[cheerIdx % cheerArr.length] : ''}</Text></View>}
        {active && <Text style={{ color: 'rgba(200,215,255,0.35)', fontSize: 15, textAlign: 'center' }}>{t('train.ferber.cryFading')}</Text>}
        {!active && <Text style={{ color: 'rgba(200,215,255,0.35)', fontSize: 15, textAlign: 'center', marginTop: 8 }}>{t('train.ferber.startTip')}</Text>}
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
          {!active ? (<TouchableOpacity onPress={startTimer} style={ts.startBtn}><Text style={ts.startBtnText}>{t('train.ferber.timerStart')}</Text></TouchableOpacity>) : (<TouchableOpacity onPress={function() { setActive(false); }} style={ts.pauseBtn}><Text style={ts.pauseBtnText}>{t('train.ferber.pause')}</Text></TouchableOpacity>)}
          <TouchableOpacity onPress={fellAsleep} style={ts.sleepBtn}><Text style={ts.sleepBtnText}>{t('train.ferber.fellAsleep')}</Text></TouchableOpacity>
        </View>
      </View>
      <View style={ts.card}>
        <Text style={{ color: 'rgba(200,215,255,0.7)', fontWeight: '800', fontSize: 17, marginBottom: 12, textAlign: 'center' }}>{t('train.ferber.cryTitle')}</Text>
        <Text style={{ color: 'rgba(200,215,255,0.35)', fontSize: 15, marginBottom: 10, lineHeight: 24 }}>{t('train.ferber.cryDesc')}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: 14, color: '#fff', fontSize: 22, fontWeight: '900', textAlign: 'center' }} value={cryMin} onChangeText={setCryMin} placeholder={t('c.min')} placeholderTextColor="rgba(200,215,255,0.25)" keyboardType="number-pad" selectTextOnFocus={true} />
          <TouchableOpacity onPress={logCry} style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: '#9a8cf0', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontSize: 19, fontWeight: '900' }}>{'\u2713'}</Text></TouchableOpacity>
        </View>
        <View style={{ marginTop: 14 }}>
          <Text style={{ color: 'rgba(200,215,255,0.5)', fontWeight: '800', fontSize: 15, marginBottom: 14, textAlign: 'center' }}>{t('train.ferber.cryWeek')}</Text>
          <View style={{ flexDirection: 'row', gap: 4, alignItems: 'flex-end', height: 80, marginBottom: 6, marginTop: 4 }}>
            {[1, 2, 3, 4, 5, 6, 7].map(function(d2) { var cl = cryLog.find(function(x) { return x.day === d2; }); var maxC = Math.max.apply(null, cryLog.map(function(x) { return x.min; }).concat([30])); return (
              <View key={d2} style={{ flex: 1, alignItems: 'center' }}>
                <View style={{ width: '100%', height: 65, justifyContent: 'flex-end', alignItems: 'center' }}>{cl ? <View style={{ width: '70%', height: Math.max(8, cl.min / maxC * 55), backgroundColor: cl.min <= 10 ? '#34d399' : cl.min <= 25 ? '#f0cd8a' : '#f87171', borderRadius: 6 }} /> : <View style={{ width: '70%', height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2 }} />}</View>
                {cl && <Text style={{ color: cl.min <= 10 ? '#34d399' : cl.min <= 25 ? '#f0cd8a' : '#f87171', fontSize: 15, fontWeight: '900', marginTop: 2, textAlign: 'center' }}>{cl.min + t('c.min')}</Text>}
                <Text style={{ color: d2 === day ? '#9a8cf0' : 'rgba(200,215,255,0.35)', fontSize: 15, fontWeight: d2 === day ? '800' : '400' }}>{'D' + d2}</Text>
              </View>
            ); })}
          </View>
          {cryLog.length >= 2 && (function() { var sorted = cryLog.slice().sort(function(a, b) { return a.day - b.day; }); var last2 = sorted.slice(-2); var diff = last2[1].min - last2[0].min; return diff < 0 ? <Text style={{ color: '#34d399', fontSize: 15, fontWeight: '700', textAlign: 'center' }}>{t('train.ferber.cryDown', { min: Math.abs(diff) })}</Text> : diff > 0 ? <Text style={{ color: '#f0cd8a', fontSize: 15, fontWeight: '700', textAlign: 'center' }}>{t('train.ferber.cryUp', { min: diff })}</Text> : <Text style={{ color: '#60a5fa', fontSize: 15, fontWeight: '700', textAlign: 'center' }}>{t('train.ferber.crySame')}</Text>; })()}
        </View>
      </View>
    </View>
  );
}

function FadingView(props) {
  var fi = props.step, setStep = props.setStep;
  var day = props.day || 1;
  var timerType = props.timerType || 'night';
  var ctx = useLang(); var t = ctx.t; var lang = ctx.lang;
  var fAppCtx = useApp(); var reviewed = fAppCtx.reviewed; var setReviewed = fAppCtx.setReviewed;
  var setAsleep = fAppCtx.setAsleep; var setSS = fAppCtx.setSS; var setSleepEase = fAppCtx.setSleepEase; var showToast = fAppCtx.show;
  var steps = t('sleep.fading.steps');
  if (!Array.isArray(steps) || steps.length === 0) return null;
  if (fi < 0) fi = 0;
  if (fi >= steps.length) fi = steps.length - 1;
  var step = steps[fi];

  // Onset timer state
  var stOA = useState(false); var onsetActive = stOA[0]; var setOnsetActive = stOA[1];
  var stOS = useState(0); var onsetSecs = stOS[0]; var setOnsetSecs = stOS[1];
  var onsetRef = useRef(null);
  var stOM = useState(''); var onsetManual = stOM[0]; var setOnsetManual = stOM[1];
  var onsetKey = timerType === 'nap' ? 'onsetLogNap' : 'onsetLog';
  var stOL = useState([]); var onsetLog = stOL[0]; var setOnsetLog = stOL[1];
  var onsetLoaded = useRef(false);
  useEffect(function() { LD(onsetKey, []).then(function(saved) { if (saved && saved.length > 0) setOnsetLog(saved); onsetLoaded.current = true; }); }, []);
  useEffect(function() { if (onsetLoaded.current) SV(onsetKey, onsetLog); }, [onsetLog]);

  // Timer tick
  useEffect(function() {
    if (onsetActive) { onsetRef.current = setInterval(function() { setOnsetSecs(function(s2) { return s2 + 1; }); }, 1000); }
    return function() { clearInterval(onsetRef.current); };
  }, [onsetActive]);

  var startOnset = function() { setOnsetSecs(0); setOnsetActive(true); };
  var stopOnset = function() {
    setOnsetActive(false);
    var min = Math.max(1, Math.round(onsetSecs / 60));
    logOnset(min);
    // Auto-trigger sleep record (same as manual "Fell asleep" button in HomeScreen)
    var autoEase = min < 5 ? 'under5' : min < 15 ? '5to15' : min < 30 ? '15to30' : 'over30';
    setAsleep(true); setSS(Date.now()); setSleepEase(autoEase);
    if (showToast) showToast((lang==='ko'?'😴 수면 시작 · ':'😴 Sleep started · ')+min+(lang==='ko'?'분 만에 잠들었어요':' min to fall asleep'), '#9a8cf0');
  };
  var logOnset = function(min) {
    if (!min || min <= 0) return;
    setOnsetLog(function(p) { var filtered = p.filter(function(x) { return x.day !== day; }); return filtered.concat([{ min: min, day: day }]); });
    setOnsetManual('');
    if (min <= 10 && !reviewed) {
      setTimeout(function() { try { if (StoreReview && StoreReview.isAvailableAsync) { StoreReview.isAvailableAsync().then(function(ok) { if (ok) { StoreReview.requestReview(); setReviewed(true); } }); } } catch(e) {} }, 2000);
    }
  };

  var oMin = Math.floor(onsetSecs / 60);
  var oSec = onsetSecs % 60;
  var todayOnset = onsetLog.find(function(x) { return x.day === day; });

  return (
    <View>
      <View style={ts.card}>
        <Text style={{ color: COLORS.green, fontWeight: '900', fontSize: 17, marginBottom: 12 }}>{t('train.fading.step', { n: fi + 1, total: steps.length })}</Text>
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 22, marginBottom: 12 }}>{step.title}</Text>
        <Text style={{ color: 'rgba(200,215,255,0.7)', fontSize: 17, lineHeight: 28 }}>{step.desc}</Text>
        <View style={{ backgroundColor: 'rgba(52,211,153,0.06)', borderRadius: 10, padding: 10, marginTop: 10 }}><Text style={{ color: 'rgba(200,215,255,0.5)', fontSize: 15, lineHeight: 25 }}>{'\uD83D\uDCA1 ' + step.tip}</Text></View>
        {fi < steps.length - 1 && <Text style={{ color: 'rgba(200,215,255,0.35)', fontSize: 17, marginTop: 8 }}>{t('train.fading.stayDur', { d: step.dur })}</Text>}
        {fi < steps.length - 1 && <Text style={{ color: 'rgba(200,215,255,0.35)', fontSize: 15, marginTop: 4 }}>{t('train.fading.nextCriteria')}</Text>}
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
          <TouchableOpacity onPress={function() { if (fi > 0) setStep(fi - 1); }} style={{ flex: 1, padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: fi > 0 ? 'rgba(240,205,138,0.3)' : 'rgba(255,255,255,0.06)', alignItems: 'center', opacity: fi > 0 ? 1 : 0.3 }}><Text style={{ color: '#fde68a', fontWeight: '800', fontSize: 17 }}>{t('train.fading.prevStep')}</Text></TouchableOpacity>
          <TouchableOpacity onPress={function() { if (fi < steps.length - 1) setStep(fi + 1); }} style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: COLORS.green + '20', borderWidth: 1.5, borderColor: COLORS.green + '40', alignItems: 'center', opacity: fi < steps.length - 1 ? 1 : 0.3 }}><Text style={{ color: COLORS.green, fontWeight: '800', fontSize: 17 }}>{t('train.fading.nextStep')}</Text></TouchableOpacity>
        </View>
      </View>

      {/* ═══ Onset Timer ═══ */}
      <View style={ts.card}>
        <Text style={{ color: 'rgba(200,215,255,0.7)', fontWeight: '800', fontSize: 17, marginBottom: 10, textAlign: 'center' }}>{t('train.ferber.onsetTitle')}</Text>
        <Text style={{ color: 'rgba(200,215,255,0.4)', fontSize: 14, marginBottom: 14 }}>{t('train.ferber.onsetDesc')}</Text>
        {onsetActive ? (
          <View style={{ alignItems: 'center', marginBottom: 14 }}>
            <Text style={{ color: '#fff', fontSize: 60, fontWeight: '900', letterSpacing: -2 }}>{(oMin < 10 ? '0' : '') + oMin + ':' + (oSec < 10 ? '0' : '') + oSec}</Text>
            <TouchableOpacity onPress={stopOnset} style={{ marginTop: 12, paddingVertical: 16, paddingHorizontal: 40, borderRadius: 20, backgroundColor: COLORS.green }}><Text style={{ color: '#fff', fontWeight: '900', fontSize: 19 }}>{t('train.ferber.onsetStop')}</Text></TouchableOpacity>
          </View>
        ) : (
          <View>
            {todayOnset ? (
              <View style={{ alignItems: 'center', marginBottom: 10 }}>
                <Text style={{ color: COLORS.green, fontSize: 28, fontWeight: '900' }}>{todayOnset.min + (lang === 'ko' ? '분' : ' min')}</Text>
                <Text style={{ color: 'rgba(200,215,255,0.4)', fontSize: 14, marginTop: 4 }}>{'D+' + day}</Text>
              </View>
            ) : (
              <TouchableOpacity onPress={startOnset} style={{ paddingVertical: 16, borderRadius: 20, backgroundColor: 'rgba(52,211,153,0.15)', borderWidth: 1.5, borderColor: 'rgba(52,211,153,0.3)', alignItems: 'center', marginBottom: 10 }}><Text style={{ color: COLORS.green, fontWeight: '900', fontSize: 19 }}>{'\u25B6 ' + t('train.ferber.onsetStart')}</Text></TouchableOpacity>
            )}
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <TextInput style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: 14, color: '#fff', fontSize: 22, fontWeight: '900', textAlign: 'center' }} value={onsetManual} onChangeText={setOnsetManual} placeholder={lang === 'ko' ? '분' : 'min'} placeholderTextColor="rgba(200,215,255,0.25)" keyboardType="number-pad" selectTextOnFocus={true} />
              <TouchableOpacity onPress={function() { if (onsetManual) logOnset(+onsetManual); }} style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: COLORS.green, alignItems: 'center', justifyContent: 'center', opacity: onsetManual ? 1 : 0.4 }}><Text style={{ color: '#fff', fontSize: 19, fontWeight: '900' }}>{'\u2713'}</Text></TouchableOpacity>
            </View>
          </View>
        )}
        {/* 7-day chart */}
        {onsetLog.length > 0 && <View style={{ marginTop: 16 }}>
          <Text style={{ color: 'rgba(200,215,255,0.5)', fontWeight: '800', fontSize: 15, marginBottom: 14, textAlign: 'center' }}>{t('train.ferber.onsetWeek')}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 70 }}>
            {[1, 2, 3, 4, 5, 6, 7].map(function(d2) { var ol = onsetLog.find(function(x) { return x.day === d2; }); var maxO = Math.max.apply(null, onsetLog.map(function(x) { return x.min; }).concat([30])); return (
              <View key={d2} style={{ flex: 1, alignItems: 'center' }}>
                {ol ? <View style={{ width: '80%', height: Math.max(3, ol.min / maxO * 55), backgroundColor: ol.min <= 10 ? '#34d399' : '#f0cd8a', borderRadius: 4 }} /> : <View style={{ width: '80%', height: 3, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2 }} />}
                {ol && <Text style={{ color: 'rgba(200,215,255,0.45)', fontSize: 11, marginTop: 2 }}>{ol.min + (lang === 'ko' ? '분' : 'm')}</Text>}
                <Text style={{ color: d2 === day ? '#fff' : 'rgba(200,215,255,0.3)', fontSize: 11, fontWeight: d2 === day ? '800' : '400' }}>{'D+' + d2}</Text>
              </View>
            ); })}
          </View>
          {onsetLog.length >= 2 && (function() { var sorted = onsetLog.slice().sort(function(a, b) { return a.day - b.day; }); var last2 = sorted.slice(-2); var diff = last2[1].min - last2[0].min; return diff < 0 ? <Text style={{ color: '#34d399', fontSize: 15, fontWeight: '700', textAlign: 'center', marginTop: 8 }}>{t('train.ferber.onsetDown', { min: Math.abs(diff) })}</Text> : diff > 0 ? <Text style={{ color: '#f0cd8a', fontSize: 15, fontWeight: '700', textAlign: 'center', marginTop: 8 }}>{t('train.ferber.onsetUp', { min: diff })}</Text> : <Text style={{ color: '#60a5fa', fontSize: 15, fontWeight: '700', textAlign: 'center', marginTop: 8 }}>{t('train.ferber.onsetSame')}</Text>; })()}
        </View>}
      </View>

      <View style={ts.card}>
        <Text style={{ color: 'rgba(200,215,255,0.5)', fontWeight: '800', fontSize: 15, marginBottom: 12 }}>{t('train.fading.allSteps')}</Text>
        {steps.map(function(st, i) { return (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14, opacity: i === fi ? 1 : 0.5 }}>
            <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: i < fi ? COLORS.green : i === fi ? COLORS.green + '40' : 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: i <= fi ? '#fff' : 'rgba(200,215,255,0.3)', fontSize: 17, fontWeight: '900' }}>{i < fi ? '\u2713' : (i + 1)}</Text></View>
            <Text style={{ color: i === fi ? '#fff' : 'rgba(200,215,255,0.4)', fontSize: 15, fontWeight: i === fi ? '800' : '600', flex: 1 }}>{st.title}</Text>
            <Text style={{ color: 'rgba(200,215,255,0.3)', fontSize: 15 }}>{st.dur}</Text>
          </View>
        ); })}
      </View>
    </View>
  );
}

var s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  dim: { color: 'rgba(200,215,255,0.5)', fontSize: 15, lineHeight: 28 },
  card: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: 22, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8 },
  lockTitle: { color: '#e0d4ff', fontWeight: '800', fontSize: 22, marginBottom: 10, letterSpacing: -0.5 },
  lockSub: { color: 'rgba(200,215,255,0.5)', fontSize: 15, lineHeight: 26, marginBottom: 20 },
  condRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 16 },
  condText: { color: 'rgba(200,215,255,0.6)', fontSize: 17, fontWeight: '700', lineHeight: 26 },
  condDot: { width: 28, height: 28, borderRadius: 9, borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.03)' },
  condDotOk: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  progressBar: { height: 5, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, marginTop: 16, marginBottom: 10 },
  progressFill: { height: 5, borderRadius: 3, backgroundColor: COLORS.green },
  scoreText: { color: COLORS.purple, fontWeight: '800', fontSize: 15, textAlign: 'center', marginTop: 6 },
  previewBtn: { marginTop: 16, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center' },
  previewBtnText: { color: 'rgba(200,215,255,0.4)', fontSize: 17, fontWeight: '600' },
  partnerBtn: { padding: 16, borderRadius: 16, borderWidth: 1.5, borderColor: COLORS.blue + '25', backgroundColor: COLORS.blue + '06', alignItems: 'center', marginBottom: 20 },
  stepTab: { flex: 1, padding: 10, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.06)', alignItems: 'center' },
  stepTabActive: { borderColor: 'rgba(154,140,240,0.4)', backgroundColor: 'rgba(154,140,240,0.12)' },
  stepTabText: { color: 'rgba(200,215,255,0.4)', fontSize: 15, fontWeight: '700' },
  chkRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  chkBox: { width: 28, height: 28, borderRadius: 9, borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.03)' },
  chkBoxActive: { borderColor: '#9a8cf0', backgroundColor: '#9a8cf0' },
  chkLabel: { color: 'rgba(200,215,255,0.65)', fontSize: 17, fontWeight: '500', flex: 1, lineHeight: 28 },
  recBox: { borderWidth: 1.5, borderRadius: 18, padding: 20, marginTop: 16, alignItems: 'center' },
  tipText: { color: 'rgba(200,215,255,0.6)', fontSize: 15, lineHeight: 25, marginBottom: 10, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' },
  methodBtn: { padding: 20, borderRadius: 18, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 12 },
  startBtn: { padding: 18, borderRadius: 18, backgroundColor: '#9a8cf0', alignItems: 'center', marginTop: 8 },
  timerEntryBtn: { flex: 1, padding: 14, borderRadius: 14, alignItems: 'center' },
  headerBtn: { padding: 8, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  headerBtnText: { color: 'rgba(200,215,255,0.5)', fontWeight: '600', fontSize: 15 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: '#1a1040', borderWidth: 1, borderColor: COLORS.purple + '30', borderRadius: 28, padding: 32, maxWidth: 360, width: '100%' },
  modalMsg: { color: '#e0d4ff', fontSize: 16, lineHeight: 30, fontWeight: '500', textAlign: 'left', marginBottom: 28 },
  modalBtn: { padding: 16, paddingHorizontal: 32, borderRadius: 16, backgroundColor: '#9a8cf0', alignSelf: 'center' },
});

var ts = StyleSheet.create({
  card: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: 22, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8 },
  intLabel: { color: 'rgba(200,215,255,0.5)', fontSize: 15, fontWeight: '600', textAlign: 'center', marginBottom: 10 },
  startBtn: { flex: 1, padding: 16, borderRadius: 16, backgroundColor: '#9a8cf0', alignItems: 'center' },
  startBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  pauseBtn: { flex: 1, padding: 16, borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center' },
  pauseBtnText: { color: 'rgba(200,215,255,0.5)', fontWeight: '700', fontSize: 15 },
  sleepBtn: { flex: 1, padding: 16, borderRadius: 16, borderWidth: 1.5, borderColor: COLORS.green + '40', backgroundColor: COLORS.green + '10', alignItems: 'center' },
  sleepBtnText: { color: COLORS.green, fontWeight: '700', fontSize: 15 },
});

