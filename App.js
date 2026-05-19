import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Platform, Modal, TextInput, Alert, ScrollView, Dimensions, Keyboard, Image, Linking, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { AppProvider, useApp } from './src/context/AppContext';
import { LangProvider, useLang } from './src/context/LangContext';
import HomeScreen from './src/screens/HomeScreen';
import { SV } from './src/utils/storage';
import { gD, fD, fM, setHelperLang, uid } from './src/utils/helpers';
import { gP, isNightSleep } from './src/utils/sleep';
import { COLORS } from './src/utils/constants';
import FeedScreen from './src/screens/FeedScreen';
import AnalysisScreen from './src/screens/AnalysisScreen';
import TrainingScreen from './src/screens/TrainingScreen';
import LogScreen from './src/screens/LogScreen';

function AppContent() {
  var ctx = useLang();
  var t = ctx.t;
  var lang = ctx.lang;
  var setLang = ctx.setLang;
  setHelperLang(lang); // sync helper formatting with current language
  var appCtx = useApp();
  var tab = appCtx.tab, setTab = appCtx.setTab, toast = appCtx.toast;
  var showSettings = appCtx.showSettings, setShowSettings = appCtx.setShowSettings;
  var name = appCtx.name, setName = appCtx.setName;
  var bday = appCtx.bday, setBday = appCtx.setBday;
  var bH = appCtx.bH, setBH = appCtx.setBH;
  var bM2 = appCtx.bM2, setBM2 = appCtx.setBM2;
  var sl = appCtx.sl, setSl = appCtx.setSl;
  var feeds = appCtx.feeds, setFeeds = appCtx.setFeeds;
  var show = appCtx.show, onboard = appCtx.onboard, setOnboard = appCtx.setOnboard;
  var lW = appCtx.lW, setLW = appCtx.setLW;
  var selfSleep = appCtx.selfSleep, setSelfSleep = appCtx.setSelfSleep;
  var stSiri = useState(false); var siriOpen = stSiri[0]; var setSiriOpen = stSiri[1];
  var appCtxRef = useRef(appCtx);
  var feedsRef = useRef(feeds);
  var langRef = useRef(lang);
  var tRef = useRef(t);
  appCtxRef.current = appCtx;
  feedsRef.current = feeds;
  langRef.current = lang;
  tRef.current = t;

  // ═══ Siri Shortcuts / Deep Link Handler ═══
  var handleDeepLink = function(url) {
    if (!url) return;
    var app = appCtxRef.current;
    var latestFeeds = feedsRef.current || [];
    var currentLang = langRef.current;
    var tr = tRef.current;
    var stripped = url.replace(/^naptune:\/\//, '');
    var parts = stripped.split('?');
    var path = parts[0] || '';
    var params = {};
    if (parts[1]) { parts[1].split('&').forEach(function(p) { var kv = p.split('='); if (kv[0]) params[kv[0]] = kv[1] || ''; }); }
    var now = Date.now();

    if (path === 'left' || path === 'right') {
      app.setFSide(path === 'left' ? 'left' : 'right');
      app.setFStart(now);
      app.setFEl(0);
      app.setFTab('breast');
      setTab('feed');
      show(path === 'left' ? '🤱 ' + tr('c.left') : '🤱 ' + tr('c.right'), '#f0a8c9');
    }
    else if (path === 'feed-stop') {
      if (app.fStart && app.fSide && app.fTab === 'breast') {
        var dur = now - app.fStart;
        var side = app.fSide === 'left' ? '\uC67C\uCABD' : '\uC624\uB978\uCABD';
        if (currentLang !== 'ko') side = app.fSide;
        setFeeds(function(p) { return [{ id: uid(), ts: app.fStart, type: '\uBAA8\uC720', side: side, dur: dur }].concat(p).slice(0, 500); });
        app.setFSide(null);
        app.setFStart(null);
        app.setFEl(0);
        show('🤱 ' + fD(dur), '#f0a8c9');
      } else {
        show('⚠️ ' + (currentLang === 'ko' ? '수유 타이머가 시작되지 않았어요' : 'No active feed timer'), '#f0cd8a');
      }
    }
    else if (path === 'quick-feed') {
      // Fix Z (v54u): 정렬 후 선택 — LogScreen 편집 후에도 진짜 최근 수유의 side 사용
      // \uBE60\uB978 \uAE30\uB85D\uC740 side \uBBF8\uC9C0\uC815 (\uC67C\uCABD/\uC624\uB978\uCABD \uD45C\uC2DC \uC548 \uD568)
      setFeeds(function(p) { return [{ id: uid(), ts: now, type: '\uBAA8\uC720', side: null, dur: null }].concat(p).sort(function(a,b){return b.ts-a.ts;}).slice(0, 500); });
      show('🤱 ' + tr('feed.quickRecord'), '#f0a8c9');
    }
    else if (path === 'bottle') {
      var ml = params.ml ? +params.ml : 0;
      if (!ml) {
        // Fix Z (v54u): 정렬 후 선택
        var lastBottle = latestFeeds.slice().sort(function(a,b){return b.ts-a.ts;}).find(function(f) { return f.type === '\uBD84\uC720'; });
        ml = lastBottle ? lastBottle.ml : 0;
      }
      if (ml > 0) {
        setFeeds(function(p) { return [{ id: uid(), ts: now, type: '\uBD84\uC720', ml: ml }].concat(p).sort(function(a,b){return b.ts-a.ts;}).slice(0, 500); });
        show('\uD83C\uDF7C ' + ml + 'ml', '#f0cd8a');
      } else {
        show('\u26A0\uFE0F ' + (currentLang === 'ko' ? '\uC774\uC804 \uBD84\uC720 \uAE30\uB85D\uC774 \uC5C6\uC5B4\uC694. ml\uC744 \uC9C0\uC815\uD574\uC8FC\uC138\uC694' : 'No previous bottle. Specify ml'), '#f0cd8a');
      }
    }
    else if (path === 'sleep') {
      if (!app.asleep) {
        app.setAsleep(true);
        app.setSS(now);
        app.setSleepEase('5to15');
        show('\uD83D\uDE34 ' + tr('home.sleeping'), COLORS.purpleLight);
      } else {
        show('\uD83D\uDE34 ' + (currentLang === 'ko' ? '\uC774\uBBF8 \uC790\uACE0 \uC788\uC5B4\uC694' : 'Already asleep'), COLORS.purpleLight);
      }
    }
    else if (path === 'wake') {
      if (app.asleep && app.sS) {
        var dur2 = now - app.sS;
        if (dur2 > 60000) {
          var entry = { id: uid(), start: app.sS, end: now, ease: app.sleepEase || '5to15' };
          // Fix V (v54n): 즉시 저장
          setSl(function(p) { return [entry].concat(p).slice(0, 300); });
          show('\u2600\uFE0F ' + fD(dur2), COLORS.purpleLight);
        }
        app.setAsleep(false);
        app.setSS(null);
        app.setSleepEase(null);
        setLW(now);
      } else {
        // 수면 상태가 아닐 때 "깼어" → 아무것도 안 함, 토스트만
        show('☀️ ' + (currentLang === 'ko' ? '이미 깨어있어요' : 'Already awake'), COLORS.purpleLight);
      }
    }
    else if (path === 'micro') {
      // Fix V (v54n): 즉시 저장
      setSl(function(p) { return [{ id: uid(), start: now - 15 * 60000, end: now, ease: 'micro', micro: true }].concat(p).slice(0, 300); });
      show('\uD83D\uDE97 15' + tr('c.min'), '#60a5fa');
    }
    else if (path === 'pump') {
      app.setFSide('both');
      app.setFStart(now);
      app.setFEl(0);
      app.setFTab('pump');
      setTab('feed');
      show('\uD83E\uDD5B ' + tr('feed.pumpingBoth'), '#8ad4f0');
    }
    else if (path === 'pump-stop') {
      if (app.fStart && app.fTab === 'pump') {
        var pDur = now - app.fStart;
        setFeeds(function(p) { return [{ id: uid(), ts: app.fStart, type: '\uC720\uCD95', dur: pDur, lml: 0, rml: 0 }].concat(p).slice(0, 500); });
        app.setFSide(null);
        app.setFStart(null);
        app.setFEl(0);
        show('\uD83E\uDD5B ' + fD(pDur), '#8ad4f0');
      } else {
        show('\u26A0\uFE0F ' + (currentLang === 'ko' ? '\uC720\uCD95 \uD0C0\uC774\uBA38\uAC00 \uC2DC\uC791\uB418\uC9C0 \uC54A\uC558\uC5B4\uC694' : 'No active pump timer'), '#f0cd8a');
      }
    }
  };

  useEffect(function() {
    // Handle URL that opened the app
    Linking.getInitialURL().then(function(url) { handleDeepLink(url); });
    // Handle URL while app is open
    var sub = Linking.addEventListener('url', function(event) { handleDeepLink(event.url); });
    return function() { if (sub && sub.remove) sub.remove(); };
  }, []);

  // TABS inside component so t() works — use `tb` not `t` in .map()
  var TABS = [
    { k: 'home', img: require('./assets/tab_home.png'), l: t('app.tabs.home') },
    { k: 'feed', img: require('./assets/tab_feed.png'), l: t('app.tabs.feed') },
    { k: 'today', img: require('./assets/tab_ai.png'), l: t('app.tabs.analysis') },
    { k: 'train', img: require('./assets/tab_train.png'), l: t('app.tabs.train') },
    { k: 'log', img: require('./assets/tab_log.png'), l: t('app.tabs.log') },
  ];

  var renderScreen = function() {
    switch (tab) {
      case 'home': return <HomeScreen />;
      case 'feed': return <FeedScreen />;
      case 'today': return <AnalysisScreen />;
      case 'train': return <TrainingScreen />;
      case 'log': return <LogScreen />;
      default: return <HomeScreen />;
    }
  };

  // Global Header
  var GlobalHeader = function() {
    var days = bday ? gD(bday) : 0;
    var prof = days ? gP(days) : null;
    if (!prof) return (
      <View style={styles.globalHeader}>
        <View style={styles.ghTop}>
          <View/>
          <View style={{flexDirection:'row',alignItems:'center',gap:4}}>
            <TouchableOpacity onPress={function() { setLang(lang === 'ko' ? 'en' : 'ko'); }} style={{padding:8}}>
              <Text style={{fontSize:16}}>{lang === 'ko' ? '🇺🇸' : '🇰🇷'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={function() { setShowSettings(true); }} style={{padding:8}}>
              <Text style={{fontSize:18}}>{'⚙️'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );

    // Fix Z (v54u): 정렬 후 선택
    // 어젯밤: end가 24시간 이내인 가장 최근 night sleep (start 기준이 아니라 end 기준)
    var endCutoff = Date.now() - 24 * 3600000;
    var nightSleep = sl.slice().sort(function(a,b){return b.start-a.start;}).find(function(l2) {
      if (!l2.end) return false;
      if (l2.end < endCutoff) return false;
      var h = new Date(l2.start).getHours();
      // 17시 이후 또는 6시 이전 시작이면 night으로 인정 (이른 취침 케이스 포함)
      return h >= 17 || h < 6;
    });

    var today2 = new Date();
    today2.setHours(0, 0, 0, 0);
    var todayNaps = sl.filter(function(l2) {
      return l2.end && l2.start >= today2.getTime() && !((new Date(l2.start).getHours() >= 18) || (new Date(l2.start).getHours() < 6));
    });
    var totDayNapMs = todayNaps.reduce(function(s2, l2) { return s2 + (l2.end - l2.start); }, 0);
    var oversleptDay = totDayNapMs > prof.maxDay * 60000;

    // Exact-month label: 200일 (6개월)
    var months = Math.floor(days / 30);
    var ageLabel = lang === 'ko' ? months + '개월' : months + 'mo';

    return (
      <View style={styles.globalHeader}>
        <View style={styles.ghTop}>
          <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
            <Text style={{fontSize:22}}>{'🌙'}</Text>
            <View>
              <Text style={styles.ghName}>{name || t('c.baby')}</Text>
              <Text style={styles.ghInfo}>{days + t('c.day') + ' (' + ageLabel + ')'}</Text>
            </View>
          </View>
          <View style={{flexDirection:'row',alignItems:'center',gap:4}}>
            <TouchableOpacity onPress={function() { setLang(lang === 'ko' ? 'en' : 'ko'); }} style={{padding:8}}>
              <Text style={{fontSize:16}}>{lang === 'ko' ? '🇺🇸' : '🇰🇷'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={function() { setShowSettings(true); }} style={{padding:8}}>
              <Text style={{fontSize:18}}>{'⚙️'}</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.ghStats}>
          <View style={[styles.ghStat,{backgroundColor:'rgba(154,140,240,0.08)'}]}>
            <Text style={styles.ghStatL}>{t('log.summary.lastNight')}</Text>
            <Text style={[styles.ghStatV,{color:'#c4b5fd'}]}>{nightSleep ? fD(nightSleep.end - nightSleep.start) : '\u2014'}</Text>
            <Text style={{color:'rgba(200,215,255,0.3)',fontSize:11,textAlign:'center',marginTop:2}}>{'\uD83C\uDFAF'+fM(prof.ts - prof.maxDay)}</Text>
          </View>
          <View style={[styles.ghStat,{backgroundColor:oversleptDay?'rgba(248,113,113,0.1)':'rgba(52,211,153,0.08)'}]}>
            <Text style={styles.ghStatL}>{t('log.summary.todayNaps')}</Text>
            <Text style={[styles.ghStatV,{color:oversleptDay?'#f87171':'#34d399'}]}>{totDayNapMs > 0 ? fD(totDayNapMs) : '\u2014'}</Text>
            <Text style={{color:'rgba(200,215,255,0.3)',fontSize:11,textAlign:'center',marginTop:2}}>{(lang==='ko'?'\uCD5C\uB300 ':'\u2264 ')+fM(prof.maxDay)}</Text>
          </View>
          <View style={[styles.ghStat,{backgroundColor:'rgba(96,165,250,0.08)'}]}>
            <Text style={styles.ghStatL}>{t('log.summary.dailyGoal')}</Text>
            <Text style={[styles.ghStatV,{color:'#60a5fa'}]}>{fM(prof.ts)}</Text>
            <Text style={{color:'rgba(200,215,255,0.35)',fontSize:11,textAlign:'center',marginTop:2}}>{'🌙'+fM(prof.ts - prof.maxDay)+'\n+☀️'+fM(prof.maxDay)}</Text>
          </View>
        </View>
      </View>
    );
  };

  // Onboarding
  var scrollRef = React.createRef();
  if (onboard >= 0 && onboard < 3) {
    var W = Dimensions.get('window').width;
    var slides = [
      { emoji: '🌙', title: t('app.onboard1'), desc: t('app.onboard1desc'), accent: '#9a8cf0' },
      { emoji: '☀️', title: t('app.onboard2'), desc: t('app.onboard2desc'), accent: '#f0cd8a' },
      { emoji: '✨', title: t('app.onboard3'), desc: t('app.onboard3desc'), accent: '#60a5fa' },
    ];
    var handleScroll = function(e) {
      var page = Math.round(e.nativeEvent.contentOffset.x / W);
      if (page !== onboard && page >= 0 && page <= 2) { setOnboard(page); }
    };
    var goNext = function() {
      if (onboard < 2) {
        scrollRef.current && scrollRef.current.scrollTo({ x: (onboard + 1) * W, animated: true });
      } else {
        setOnboard(-1); SV('nob', 'done');
      }
    };
    var skip = function() { setOnboard(-1); SV('nob', 'done'); };
    var accent = slides[onboard].accent;

    return (
      <View style={{ flex: 1, backgroundColor: '#07091c' }}>
        <StatusBar barStyle="light-content" />

        {/* Swipeable pages */}
        <ScrollView
          ref={scrollRef}
          horizontal={true}
          pagingEnabled={true}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          decelerationRate="fast"
          bounces={false}
          style={{ flex: 1 }}
        >
          {slides.map(function(sl, idx) {
            return (
              <View key={idx} style={{ width: W, flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>

                <View style={{ flex: 0.9 }} />

                <Text style={{ fontSize: 52, marginBottom: 36 }}>{sl.emoji}</Text>

                <Text style={{
                  color: '#fff', fontSize: 34, fontWeight: '800',
                  textAlign: 'center', lineHeight: 46, letterSpacing: -0.5,
                }}>{sl.title}</Text>

                <View style={{ width: 36, height: 3, borderRadius: 2, backgroundColor: sl.accent, marginVertical: 24, opacity: 0.5 }} />

                <Text style={{
                  color: 'rgba(200,215,255,0.4)', fontSize: 17, fontWeight: '500',
                  textAlign: 'center', lineHeight: 28, paddingHorizontal: 12,
                }}>{sl.desc}</Text>

                <View style={{ flex: 1.4 }} />

              </View>
            );
          })}
        </ScrollView>

        {/* Bottom controls — fixed */}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', paddingBottom: Platform.OS === 'ios' ? 50 : 32 }}>

          {/* Dots */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
            {[0, 1, 2].map(function(i) {
              return <View key={i} style={{
                width: i === onboard ? 24 : 6, height: 6, borderRadius: 3,
                backgroundColor: i === onboard ? accent : 'rgba(255,255,255,0.1)',
              }} />;
            })}
          </View>

          {/* Button */}
          <TouchableOpacity onPress={goNext} activeOpacity={0.7} style={{
            width: 260, paddingVertical: 18, borderRadius: 50,
            backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center',
            borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
          }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 17 }}>
              {onboard < 2 ? t('c.next') : t('app.startBtn')}
            </Text>
          </TouchableOpacity>

          {/* Skip */}
          {onboard < 2 && <TouchableOpacity onPress={skip} style={{ paddingVertical: 16 }}>
            <Text style={{ color: 'rgba(200,215,255,0.2)', fontSize: 14 }}>{t('app.skip')}</Text>
          </TouchableOpacity>}
          {onboard >= 2 && <View style={{ height: 44 }} />}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      {bday ? <GlobalHeader /> : <View style={{flexDirection:'row',justifyContent:'flex-end',paddingHorizontal:14,paddingTop:4}}>
        <TouchableOpacity onPress={function() { setLang(lang === 'ko' ? 'en' : 'ko'); }} style={{padding:8}}>
          <Text style={{fontSize:16}}>{lang === 'ko' ? '🇺🇸' : '🇰🇷'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={function() { setShowSettings(true); }} style={{padding:8}}>
          <Text style={{fontSize:18}}>{'⚙️'}</Text>
        </TouchableOpacity>
      </View>}

      <View style={styles.content}>
        {renderScreen()}
      </View>

      {/* Toast */}
      {toast && (
        <View style={[styles.toast, { borderColor: toast.c + '40', backgroundColor: toast.c + '20' }]}>
          <Text style={[styles.toastText, { color: toast.c }]}>{toast.msg}</Text>
        </View>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <Modal visible={true} transparent animationType="fade">
          <TouchableOpacity style={styles.settingsOverlay} activeOpacity={1} onPress={function() { Keyboard.dismiss(); setShowSettings(false); }}>
            <View style={styles.settingsCard} onStartShouldSetResponder={function() { Keyboard.dismiss(); return true; }}>
              <Text style={styles.settingsTitle}>{'⚙️ ' + t('app.settings')}</Text>

              <Text style={styles.settingsLabel}>{t('app.babyName')}</Text>
              <TextInput style={styles.settingsInput} value={name} onChangeText={setName} placeholder={t('app.namePH')} placeholderTextColor="rgba(200,215,255,0.25)" selectTextOnFocus={true}/>

              <Text style={styles.settingsLabel}>{t('app.birthday')}</Text>
              <TextInput style={styles.settingsInput} value={bday} onChangeText={function(v) {
                var digits = v.replace(/[^0-9]/g, '').slice(0, 8);
                var formatted = digits;
                if (digits.length > 4) formatted = digits.slice(0,4) + '-' + digits.slice(4);
                if (digits.length > 6) formatted = digits.slice(0,4) + '-' + digits.slice(4,6) + '-' + digits.slice(6);
                setBday(formatted);
                if (digits.length === 8) Keyboard.dismiss();
              }} placeholder={t('app.bdayPH')} placeholderTextColor="rgba(200,215,255,0.25)" keyboardType="number-pad" maxLength={10} selectTextOnFocus={true}/>

              <Text style={styles.settingsLabel}>{t('app.bedGoal')}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <TextInput
                  style={[styles.settingsInput, { flex: 1, textAlign: 'center' }]}
                  defaultValue={String(bH === 0 ? 12 : (bH > 12 ? bH - 12 : bH))}
                  placeholder="7"
                  placeholderTextColor="rgba(200,215,255,0.25)"
                  onEndEditing={function(e) {
                    var v = e.nativeEvent.text;
                    var n = parseInt(v, 10);
                    if (!isNaN(n) && n >= 1 && n <= 12) {
                      // Convert 12-hour PM to 24-hour: 12 PM → 0 (midnight), 1-11 PM → 13-23, keep noon→12
                      // For bedtime, PM hours (7-11) map to 19-23; "12" (midnight) maps to 0
                      setBH(n === 12 ? 0 : n + 12);
                    }
                  }}
                  keyboardType="number-pad" maxLength={2} selectTextOnFocus={true}
                />
                <Text style={{ color: 'rgba(200,215,255,0.5)', fontSize: 17, fontWeight: '900' }}>:</Text>
                <TextInput
                  style={[styles.settingsInput, { flex: 1, textAlign: 'center' }]}
                  defaultValue={String(bM2).padStart(2,'0')}
                  placeholder="30"
                  placeholderTextColor="rgba(200,215,255,0.25)"
                  onEndEditing={function(e) {
                    var v = e.nativeEvent.text;
                    var n = parseInt(v, 10);
                    if (!isNaN(n) && n >= 0 && n <= 59) setBM2(n);
                  }}
                  keyboardType="number-pad" maxLength={2} selectTextOnFocus={true}
                />
                <View style={{paddingHorizontal:12,paddingVertical:10,borderRadius:10,backgroundColor:'rgba(154,140,240,0.15)',borderWidth:1,borderColor:'rgba(154,140,240,0.3)'}}>
                  <Text style={{color:'#c4b5fd',fontSize:15,fontWeight:'800'}}>PM</Text>
                </View>
              </View>

              {/* Self-sleep toggle */}
              <Text style={styles.settingsLabel}>{t('app.selfSleep')}</Text>
              <View style={{flexDirection:'row',gap:10}}>
                <TouchableOpacity onPress={function() { setSelfSleep(true); SV('selfSleep', true); }} style={{flex:1,padding:14,borderRadius:14,borderWidth:1.5,borderColor:selfSleep?'rgba(52,211,153,0.4)':'rgba(255,255,255,0.08)',backgroundColor:selfSleep?'rgba(52,211,153,0.1)':'transparent',alignItems:'center'}}>
                  <Text style={{color:selfSleep?'#34d399':'rgba(200,215,255,0.5)',fontWeight:'800',fontSize:15}}>{t('app.selfSleepOn')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={function() { setSelfSleep(false); SV('selfSleep', false); }} style={{flex:1,padding:14,borderRadius:14,borderWidth:1.5,borderColor:!selfSleep?'rgba(248,113,113,0.4)':'rgba(255,255,255,0.08)',backgroundColor:!selfSleep?'rgba(248,113,113,0.1)':'transparent',alignItems:'center'}}>
                  <Text style={{color:!selfSleep?'#fca5a5':'rgba(200,215,255,0.5)',fontWeight:'800',fontSize:15}}>{t('app.selfSleepOff')}</Text>
                </TouchableOpacity>
              </View>

              {/* Language toggle */}
              <Text style={styles.settingsLabel}>{lang === 'ko' ? '언어' : 'Language'}</Text>
              <View style={{flexDirection:'row',gap:8}}>
                <TouchableOpacity onPress={function() { setLang('ko'); }} style={[styles.settingsExport,{flex:1,borderColor:lang==='ko'?'rgba(154,140,240,0.4)':'rgba(255,255,255,0.08)',backgroundColor:lang==='ko'?'rgba(154,140,240,0.1)':'transparent'}]}>
                  <Text style={{color:lang==='ko'?'#d4bbff':'rgba(200,215,255,0.6)',fontWeight:'700',fontSize:15}}>🇰🇷 한국어</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={function() { setLang('en'); }} style={[styles.settingsExport,{flex:1,borderColor:lang==='en'?'rgba(154,140,240,0.4)':'rgba(255,255,255,0.08)',backgroundColor:lang==='en'?'rgba(154,140,240,0.1)':'transparent'}]}>
                  <Text style={{color:lang==='en'?'#d4bbff':'rgba(200,215,255,0.6)',fontWeight:'700',fontSize:15}}>🇺🇸 English</Text>
                </TouchableOpacity>
              </View>

              <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', paddingTop: 12, marginTop: 8 }}>
                <TouchableOpacity onPress={function() {
                  Keyboard.dismiss();
                  var lines = [];
                  lines.push('Naptune Data Export');
                  lines.push('Date: ' + new Date().toLocaleDateString());
                  lines.push('');
                  lines.push('=== Sleep ===');
                  // Fix AA (v54v): 명시적 정렬 — 배열 순서에 의존 안 함
                  sl.slice().sort(function(a,b){return b.start-a.start;}).slice(0, 100).forEach(function(l) {
                    var s2 = new Date(l.start); var e2 = l.end ? new Date(l.end) : null;
                    var dur = e2 ? Math.round((l.end - l.start) / 60000) : 0;
                    lines.push(s2.toLocaleDateString() + ' ' + s2.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) + (e2 ? ' → ' + e2.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) + ' (' + dur + 'min)' : ' (in progress)') + (l.nightWakes != null ? ' wakes:' + l.nightWakes : '') + (l.ease ? ' ' + l.ease : ''));
                  });
                  lines.push('');
                  lines.push('=== Feeds ===');
                  // Fix AA (v54v): 명시적 정렬
                  feeds.slice().sort(function(a,b){return b.ts-a.ts;}).slice(0, 100).forEach(function(f) {
                    var d2 = new Date(f.ts);
                    var info = f.type + ' ' + d2.toLocaleDateString() + ' ' + d2.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
                    if (f.ml) info += ' ' + f.ml + 'ml';
                    if (f.dur) info += ' ' + Math.round(f.dur / 60000) + 'min';
                    if (f.side) info += ' ' + f.side;
                    lines.push(info);
                  });
                  Share.share({ message: lines.join('\n') });
                }} style={styles.settingsExport}>
                  <Text style={{ color: 'rgba(200,215,255,0.6)', fontWeight: '700', fontSize: 15 }}>{t('app.exportData')}</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={function() { setShowSettings(false); setSiriOpen(true); }} style={styles.settingsExport}>
                  <Text style={{ color: 'rgba(200,215,255,0.6)', fontWeight: '700', fontSize: 15 }}>{t('app.siriGuide')}</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={function() {
                  Linking.openURL('mailto:naptune.app@gmail.com?subject=Naptune%20%E2%80%94%20Support');
                }} style={styles.settingsExport}>
                  <Text style={{ color: 'rgba(200,215,255,0.6)', fontWeight: '700', fontSize: 15 }}>{t('app.contact')}</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={function() {
                  Alert.alert(t('app.deleteConfirm'), t('app.deleteWarn'), [
                    { text: t('app.deleteCancel'), style: 'cancel' },
                    { text: t('app.deleteOk'), style: 'destructive', onPress: function() { setSl([]); setFeeds([]); setLW(null); show(t('app.deleteDone'), '#f87171'); setShowSettings(false); } },
                  ]);
                }} style={styles.settingsDelete}>
                  <Text style={{ color: 'rgba(248,113,113,0.5)', fontWeight: '700', fontSize: 15 }}>{t('app.deleteAll')}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={function() { setShowSettings(false); }} style={styles.settingsClose}>
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 17 }}>{'✓ ' + t('c.close')}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Siri Guide Modal */}
      {siriOpen && (
        <Modal visible={true} transparent animationType="fade">
          <TouchableOpacity style={styles.settingsOverlay} activeOpacity={1} onPress={function() { setSiriOpen(false); setShowSettings(true); }}>
            <ScrollView style={{ maxHeight: '85%' }} contentContainerStyle={{ flexGrow: 0 }} keyboardShouldPersistTaps="handled">
              <View style={styles.settingsCard} onStartShouldSetResponder={function() { return true; }}>
                <Text style={{ color: '#e0d4ff', fontWeight: '900', fontSize: 22, marginBottom: 8 }}>{t('app.siriTitle')}</Text>
                <Text style={{ color: 'rgba(200,215,255,0.5)', fontSize: 15, lineHeight: 24, marginBottom: 16 }}>{t('app.siriDesc')}</Text>
                {(t('app.siriCommands') || []).map(function(cmd, i) {
                  return (
                    <View key={i} style={{ marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <Text style={{ color: '#c4b5fd', fontWeight: '800', fontSize: 17 }}>{cmd[0]}</Text>
                        <Text style={{ color: 'rgba(200,215,255,0.35)', fontSize: 13 }}>{cmd[2]}</Text>
                      </View>
                      <TouchableOpacity onPress={function() { Clipboard.setStringAsync(cmd[1]); show('\uD83D\uDCCB ' + t('app.siriCopied'), '#9a8cf0'); }} style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ color: '#f0cd8a', fontSize: 13, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', flex: 1 }}>{cmd[1]}</Text>
                        <Text style={{ fontSize: 17 }}>{'\uD83D\uDCCB'}</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
                <TouchableOpacity onPress={function() { setSiriOpen(false); setShowSettings(true); }} style={styles.settingsClose}>
                  <Text style={{ color: '#fff', fontWeight: '900', fontSize: 17 }}>{'\u2713 ' + t('c.close')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Tab Bar — tb not t to avoid shadowing */}
      <View style={styles.tabBar}>
        {TABS.map(function(tb) {
          var isActive = tab === tb.k;
          return (
            <TouchableOpacity
              key={tb.k}
              onPress={function() { setTab(tb.k); }}
              style={styles.tabItem}
            >
              <View style={{width:24,height:24,alignItems:'center',justifyContent:'center',marginBottom:6}}><Image source={tb.img} style={{width:tb.k==='home'?20:24,height:tb.k==='home'?20:24}} resizeMode='contain' /></View>
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tb.l}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function App() {
  return (
    <AppProvider>
      <LangProvider>
        <AppContent />
      </LangProvider>
    </AppProvider>
  );
}

var styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07091c',
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 0,
  },
  content: { flex: 1, paddingHorizontal: 14 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(10,10,30,0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingBottom: 20,
    paddingTop: 8,
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 6, height: 56 },
  tabLabel: { fontSize: 11, fontWeight: '700', color: '#c9a44c', lineHeight: 14 },
  tabLabelActive: {},
  toast: { position: 'absolute', bottom: 100, left: 20, right: 20, padding: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center', zIndex: 999 },
  settingsOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  settingsCard: { backgroundColor: '#1a1040', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 22, padding: 22, width: '100%', maxWidth: 360 },
  settingsTitle: { color: '#e0d4ff', fontWeight: '900', fontSize: 19, lineHeight: 28, marginBottom: 14 },
  settingsLabel: { color: 'rgba(200,215,255,0.5)', fontSize: 15, fontWeight: '700', marginBottom: 4, marginTop: 10 },
  settingsInput: { backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.13)', borderRadius: 12, padding: 12, color: '#fff', fontSize: 15, fontWeight: '700' },
  settingsExport: { padding: 11, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center', marginBottom: 8 },
  settingsDelete: { padding: 11, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(248,113,113,0.15)', alignItems: 'center', marginBottom: 8 },
  settingsClose: { padding: 12, borderRadius: 12, backgroundColor: '#9a8cf0', alignItems: 'center' },
  globalHeader: {paddingHorizontal:14,paddingTop:8,paddingBottom:4},
  ghTop: {flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:10},
  ghName: {color:'#fff',fontSize:22,fontWeight:'800',lineHeight:32},
  ghInfo: {color:'rgba(200,215,255,0.4)',fontSize:15,fontWeight:'600',lineHeight:24},
  ghStats: {flexDirection:'row',gap:8,marginBottom:6},
  ghStat: {flex:1,borderRadius:14,padding:10,alignItems:'center'},
  ghStatL: {color:'rgba(200,215,255,0.4)',fontSize:15,lineHeight:24,textAlign:'center'},
  ghStatV: {fontWeight:'900',fontSize:19,marginTop:3,lineHeight:28,textAlign:'center'},
  toastText: { fontSize: 15, fontWeight: '700' },
});
