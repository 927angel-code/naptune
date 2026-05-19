// ═══ AppContext.js — Global app state with AsyncStorage persistence ═══
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { SV, LD } from '../utils/storage';

var AppCtx = createContext(null);

export function AppProvider(props) {
  var stTab = useState('home');
  var stToast = useState(null);
  var stSettings = useState(false);
  var stName = useState('');
  var stBday = useState('');
  var stBH = useState(19);
  var stBM2 = useState(30);
  var stSl = useState([]);
  var stFeeds = useState([]);
  var stAsleep = useState(false);
  var stSS = useState(null);
  var stSleepEase = useState(null);
  var stLW = useState(null);
  var stOnboard = useState(-1);
  var stFSide = useState(null);
  var stFStart = useState(null);
  var stFEl = useState(0);
  var stFTab = useState('breast');
  var stTOn = useState(false);
  var stTMe = useState(null);
  var stTMeNap = useState(null);
  var stTDy = useState(1);
  var stTLg = useState([]);
  var stTStartDate = useState(null);
  var stSavedMethod = useState(null);
  var stTDyNap = useState(1);
  var stTStartDateNap = useState(null);
  var stRdyCh = useState({});
  var stSleepMsg = useState(null);
  var stSelfSleep = useState(false);
  var stReviewed = useState(false);

  // ═══ Persistence ═══
  var loadedRef = useRef(false);
  var stLoaded = useState(false);

  // Load all data on mount
  useEffect(function() {
    var loadList = [
      ['name', ''],
      ['bday', ''],
      ['bH', 19],
      ['bM2', 30],
      ['sl', []],
      ['feeds', []],
      ['lW', null],
      ['onboard', 0],
      ['tOn', false],
      ['tMe', null],
      ['tMeNap', null],
      ['tDy', 1],
      ['tLg', []],
      ['tStartDate', null],
      ['savedMethod', null],
      ['rdyCh', {}],
      ['tDyNap', 1],
      ['tStartDateNap', null],
      ['asleep', false],
      ['sS', null],
      ['sleepEase', null],
      ['nob', null],
      ['selfSleep', false],
      ['reviewed', false],
    ];
    Promise.all(loadList.map(function(pair) {
      return LD(pair[0], pair[1]);
    })).then(function(results) {
      var data = {};
      for (var i = 0; i < loadList.length; i++) {
        data[loadList[i][0]] = results[i];
      }
      stName[1](data.name);
      stBday[1](data.bday);
      stBH[1](data.bH);
      stBM2[1](data.bM2);
      // Fix CC (v54w): sl/feeds 로드 시 정렬 강제 (구버전 비정렬 데이터 호환)
      // Invariant: sl always sorted by start desc, feeds always sorted by ts desc
      var loadedSl = Array.isArray(data.sl) ? data.sl.slice().sort(function(a,b){return b.start-a.start;}) : [];
      var loadedFeeds = Array.isArray(data.feeds) ? data.feeds.slice().sort(function(a,b){return b.ts-a.ts;}) : [];
      stSl[1](loadedSl);
      stFeeds[1](loadedFeeds);
      stLW[1](data.lW);
      stSleepEase[1](data.sleepEase);
      stOnboard[1](data.nob === 'done' ? -1 : data.onboard);
      stTOn[1](data.tOn);
      stTMe[1](data.tMe);
      stTMeNap[1](data.tMeNap);
      stTDy[1](data.tDy);
      stTLg[1](data.tLg);
      stTStartDate[1](data.tStartDate);
      stSavedMethod[1](data.savedMethod);
      stRdyCh[1](data.rdyCh);
      stTDyNap[1](data.tDyNap);
      stTStartDateNap[1](data.tStartDateNap);
      stAsleep[1](data.asleep);
      stSS[1](data.sS);
      stSelfSleep[1](data.selfSleep);
      stReviewed[1](data.reviewed);
      loadedRef.current = true;
      stLoaded[1](true);
    });
  }, []);

  // Save helpers — ref for closure safety, only after load
  var save = function(key, val) { if (loadedRef.current) SV(key, val); };

  useEffect(function() { save('name', stName[0]); }, [stName[0]]);
  useEffect(function() { save('bday', stBday[0]); }, [stBday[0]]);
  useEffect(function() { save('bH', stBH[0]); }, [stBH[0]]);
  useEffect(function() { save('bM2', stBM2[0]); }, [stBM2[0]]);
  useEffect(function() { save('sl', stSl[0]); }, [stSl[0]]);
  useEffect(function() { save('feeds', stFeeds[0]); }, [stFeeds[0]]);
  useEffect(function() { save('lW', stLW[0]); }, [stLW[0]]);
  useEffect(function() { save('onboard', stOnboard[0]); }, [stOnboard[0]]);
  useEffect(function() { save('tOn', stTOn[0]); }, [stTOn[0]]);
  useEffect(function() { save('tMe', stTMe[0]); }, [stTMe[0]]);
  useEffect(function() { save('tMeNap', stTMeNap[0]); }, [stTMeNap[0]]);
  useEffect(function() { save('tDy', stTDy[0]); }, [stTDy[0]]);
  useEffect(function() { save('tLg', stTLg[0]); }, [stTLg[0]]);
  useEffect(function() { save('tStartDate', stTStartDate[0]); }, [stTStartDate[0]]);
  useEffect(function() { save('savedMethod', stSavedMethod[0]); }, [stSavedMethod[0]]);
  useEffect(function() { save('rdyCh', stRdyCh[0]); }, [stRdyCh[0]]);
  useEffect(function() { save('tDyNap', stTDyNap[0]); }, [stTDyNap[0]]);
  useEffect(function() { save('tStartDateNap', stTStartDateNap[0]); }, [stTStartDateNap[0]]);
  useEffect(function() { save('asleep', stAsleep[0]); }, [stAsleep[0]]);
  useEffect(function() { save('sS', stSS[0]); }, [stSS[0]]);
  useEffect(function() { save('sleepEase', stSleepEase[0]); }, [stSleepEase[0]]);
  useEffect(function() { save('selfSleep', stSelfSleep[0]); }, [stSelfSleep[0]]);
  useEffect(function() { save('reviewed', stReviewed[0]); }, [stReviewed[0]]);

  // Toast helper
  var showToast = function(msg, c) {
    stToast[1]({ msg: msg, c: c || '#9a8cf0' });
    setTimeout(function() { stToast[1](null); }, 2500);
  };

  // ═══ Fix CC (v54w): Invariant-preserving setters ═══
  // CONTRACT (used throughout the app):
  //   - sl is ALWAYS sorted by `start` descending → sl[0] = most recent sleep
  //   - feeds is ALWAYS sorted by `ts` descending → feeds[0] = most recent feed
  //
  // These wrappers enforce the invariant on every mutation, regardless of how the
  // caller writes the update. Callers (LogScreen, FeedScreen, HomeScreen, etc.)
  // can safely use `feeds[0]` / `sl.find(...)` knowing the array is in canonical order.
  //
  // Without this, edits via LogScreen could leave the array in non-canonical order,
  // causing "마지막 수유 N분 전" type bugs to silently appear in any consumer site.
  var sortSlDesc = function(a, b) { return b.start - a.start; };
  var sortFeedsDesc = function(a, b) { return b.ts - a.ts; };
  var setSlSorted = function(arg) {
    if (typeof arg === 'function') {
      stSl[1](function(prev) {
        var next = arg(prev);
        return Array.isArray(next) ? next.slice().sort(sortSlDesc) : next;
      });
    } else {
      stSl[1](Array.isArray(arg) ? arg.slice().sort(sortSlDesc) : arg);
    }
  };
  var setFeedsSorted = function(arg) {
    if (typeof arg === 'function') {
      stFeeds[1](function(prev) {
        var next = arg(prev);
        return Array.isArray(next) ? next.slice().sort(sortFeedsDesc) : next;
      });
    } else {
      stFeeds[1](Array.isArray(arg) ? arg.slice().sort(sortFeedsDesc) : arg);
    }
  };

  var value = {
    tab: stTab[0], setTab: stTab[1],
    toast: stToast[0],
    showSettings: stSettings[0], setShowSettings: stSettings[1],
    name: stName[0], setName: stName[1],
    bday: stBday[0], setBday: stBday[1],
    bH: stBH[0], setBH: stBH[1],
    bM2: stBM2[0], setBM2: stBM2[1],
    sl: stSl[0], setSl: setSlSorted,
    feeds: stFeeds[0], setFeeds: setFeedsSorted,
    asleep: stAsleep[0], setAsleep: stAsleep[1],
    sS: stSS[0], setSS: stSS[1],
    sleepEase: stSleepEase[0], setSleepEase: stSleepEase[1],
    lW: stLW[0], setLW: stLW[1],
    onboard: stOnboard[0], setOnboard: stOnboard[1],
    show: showToast,
    fSide: stFSide[0], setFSide: stFSide[1],
    fStart: stFStart[0], setFStart: stFStart[1],
    fEl: stFEl[0], setFEl: stFEl[1],
    fTab: stFTab[0], setFTab: stFTab[1],
    tOn: stTOn[0], setTOn: stTOn[1],
    tMe: stTMe[0], setTMe: stTMe[1],
    tMeNap: stTMeNap[0], setTMeNap: stTMeNap[1],
    tDy: stTDy[0], setTDy: stTDy[1],
    tDyNap: stTDyNap[0], setTDyNap: stTDyNap[1],
    tLg: stTLg[0], setTLg: stTLg[1],
    tStartDate: stTStartDate[0], setTStartDate: stTStartDate[1],
    tStartDateNap: stTStartDateNap[0], setTStartDateNap: stTStartDateNap[1],
    savedMethod: stSavedMethod[0], setSavedMethod: stSavedMethod[1],
    rdyCh: stRdyCh[0], setRdyCh: stRdyCh[1],
    sleepMsg: stSleepMsg[0], setSleepMsg: stSleepMsg[1],
    selfSleep: stSelfSleep[0], setSelfSleep: stSelfSleep[1],
    reviewed: stReviewed[0], setReviewed: stReviewed[1],
    loaded: stLoaded[0],
  };

  return React.createElement(AppCtx.Provider, { value: value }, props.children);
}

export function useApp() {
  var ctx = useContext(AppCtx);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
