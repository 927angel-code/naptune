import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Keyboard, TouchableWithoutFeedback, Alert } from 'react-native';
import { useApp } from '../context/AppContext';
import { useLang } from '../context/LangContext';
import { gD, fD, fT, fM, uid } from '../utils/helpers';
import { isNightSleep, getWWRange } from '../utils/sleep';
import { COLORS } from '../utils/constants';
import { SV, LD } from '../utils/storage';
import ScheduleArc from '../components/ScheduleArc';
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
    var onFail = function() { show(lang === 'ko' ? '⚠️ 저장 실패. 다시 눌러주세요' : '⚠️ Save failed. Tap again', '#f87171'); };
    if (Date.now() - sS > 60000) {
      if (isNight) {
        setSl(function(p){var newSl=[entry].concat(p).slice(0,300); SV('sl',newSl,onFail); return newSl;});
        setPendingStop(entry);
      }
      else { setSl(function(p){var newSl=[entry].concat(p).slice(0,300); SV('sl',newSl,onFail); return newSl;}); show('😴 ' + fD(Date.now() - sS), COLORS.purpleLight); }
    } else {
      show(lang === 'ko' ? '1분 미만은 기록되지 않아요' : 'Too short to log (under 1 min)', 'rgba(200,215,255,0.5)');
    }
    setAsleep(false); setSS(null); setLW(Date.now()); setAwMs(0); setEl(0);
  };
  var saveNightWakes = function(n2) {
    if (!pendingStop) return;
    var eid = pendingStop.id;
    var onFail = function() { show(lang === 'ko' ? '⚠️ 저장 실패' : '⚠️ Save failed', '#f87171'); };
    setSl(function(p){var newSl=p.map(function(l){return l.id === eid ? Object.assign({}, l, {nightWakes: n2}) : l;}); SV('sl',newSl,onFail); return newSl;});
    show('🌙 ' + fD(pendingStop.end - pendingStop.start), COLORS.purpleLight);
    setPendingStop(null);
    if (n2 === 0 && !reviewed) {
      var hadZero = sl.some(function(l) { return l.nightWakes === 0; });
      if (!hadZero) setTimeout(tryReview, 2000);
    }
  };
  var recMicro = function(min) {
    var now2 = Date.now();
    var onFail = function() { show(lang === 'ko' ? '⚠️ 저장 실패' : '⚠️ Save failed', '#f87171'); };
    setSl(function(p){var newSl=[{id:uid(),start:now2-min*60000,end:now2,ease:'micro',micro:true}].concat(p).slice(0,300); SV('sl',newSl,onFail); return newSl;});
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

  // ═══ Status line: awake / sleeping duration ═══
  var statusLine = null;
  if (asleep && sS) {
    statusLine = (lang === 'ko' ? '💤 자는 중 ' : '💤 Sleeping ') + fD(el);
  } else if (lW) {
    statusLine = (lang === 'ko' ? '☀️ 깨어있는 시간 ' : '☀️ Awake ') + fD(awMs);
  }

  // ═══ Wake window range (Huckleberry, by month) ═══
  var days = bday ? gD(bday) : 0;
  var wwRange = days ? getWWRange(days) : null;
  var months = Math.floor(days / 30);
  var ageLabel = lang === 'ko' ? months + '개월' : months + 'mo';

  // ═══ Schedule arc inputs (recording-driven) ═══
  var todayStart = new Date(); todayStart.setHours(0,0,0,0);
  var todayMs = todayStart.getTime();
  var morningWake = sl.filter(function(l){
    return l.end && isNightSleep(l) && l.end >= todayMs && l.end <= todayMs + 12*3600000;
  }).sort(function(a,b){return b.end - a.end;})[0];
  var arcWakeTs = morningWake ? morningWake.end :
    ((lW && lW >= todayMs && lW <= todayMs + 12*3600000) ? lW : todayMs + 7*3600000);
  var arcBedTs = todayMs + (bH * 60 + bM2) * 60000;
  if (arcBedTs <= arcWakeTs) arcBedTs = arcWakeTs + 12 * 3600000;
  var todayNapsForArc = sl.filter(function(l){
    return l.end && l.start >= todayMs && !isNightSleep(l) && !l.micro;
  }).sort(function(a,b){return a.start - b.start;});
  var arcSlots = todayNapsForArc.map(function(n, i) {
    var dur = Math.round((n.end - n.start) / 60000);
    return {
      start: n.start,
      end: n.end,
      predDur: dur,
      isCatnap: false,
      lastNap: i === todayNapsForArc.length - 1 && dur < 50
    };
  });

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

      {/* ═══ Status line ═══ */}
      {statusLine && <Text style={{color:'rgba(200,215,255,0.55)',fontSize:15,fontWeight:'700',textAlign:'center',marginBottom:10,marginTop:4}}>{statusLine}</Text>}

      {/* ═══ Wake window range (age-based, informational) ═══ */}
      {wwRange && <View style={[s.card,{backgroundColor:'rgba(154,140,240,0.06)',borderColor:'rgba(154,140,240,0.2)',padding:14}]}>
        <Text style={{color:'rgba(200,215,255,0.5)',fontSize:13,fontWeight:'700',textAlign:'center',marginBottom:4}}>{lang==='ko'?'권장 깨시':'Wake window'}</Text>
        <Text style={{color:'#c4b5fd',fontSize:19,fontWeight:'900',textAlign:'center',lineHeight:28}}>{fM(wwRange.min)+' ~ '+fM(wwRange.max)}</Text>
      </View>}

      {/* ═══ Schedule arc (오늘 ☀️ → 🌙) ═══ */}
      <ScheduleArc
        wakeTs={arcWakeTs}
        bedTs={arcBedTs}
        slots={arcSlots}
        name={name}
        ageLabel={ageLabel}
        lang={lang}
      />

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

      {/* ═══ Night wakes modal ═══ */}
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

      <View style={{height:20}}/>
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
