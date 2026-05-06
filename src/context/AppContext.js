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
    Promise.all([
      LD('name', ''),
      LD('bday', ''),
      LD('bH', 19),
      LD('bM2', 30),
      LD('sl', []),
      LD('feeds', []),
      LD('lW', null),
      LD('onboard', 0),
      LD('tOn', false),
      LD('tMe', null),
      LD('tMeNap', null),
      LD('tDy', 1),
      LD('tLg', []),
      LD('tStartDate', null),
      LD('savedMethod', null),
      LD('rdyCh', {}),
      LD('tDyNap', 1),
      LD('tStartDateNap', null),
      LD('asleep', false),
      LD('sS', null),
      LD('nob', null),
      LD('selfSleep', false),
      LD('reviewed', false),
    ]).then(function(results) {
      stName[1](results[0]);
      stBday[1](results[1]);
      stBH[1](results[2]);
      stBM2[1](results[3]);
      // Fix CC (v54w): sl/feeds 로드 시 정렬 강제 (구버전 비정렬 데이터 호환)
      // Invariant: sl always sorted by start desc, feeds always sorted by ts desc
      var loadedSl = Array.isArray(results[4]) ? results[4].slice().sort(function(a,b){return b.start-a.start;}) : [];
      var loadedFeeds = Array.isArray(results[5]) ? results[5].slice().sort(function(a,b){return b.ts-a.ts;}) : [];
      stSl[1](loadedSl);
      stFeeds[1](loadedFeeds);
      stLW[1](results[6]);
      var nob = results[20];
      stOnboard[1](nob === 'done' ? -1 : results[7]);
      stTOn[1](results[8]);
      stTMe[1](results[9]);
      stTMeNap[1](results[10]);
      stTDy[1](results[11]);
      stTLg[1](results[12]);
      stTStartDate[1](results[13]);
      stSavedMethod[1](results[14]);
      stRdyCh[1](results[15]);
      stTDyNap[1](results[16]);
      stTStartDateNap[1](results[17]);
      stAsleep[1](results[18]);
      stSS[1](results[19]);
      stSelfSleep[1](results[21]);
      stReviewed[1](results[22]);
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

