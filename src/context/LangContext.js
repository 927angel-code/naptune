import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform, NativeModules } from 'react-native';
import { ko } from '../i18n/ko';
import { en } from '../i18n/en';

var strings = { ko: ko, en: en };
var LangCtx = createContext(null);

// Inline storage for lang (avoid circular dep with storage.js)
var LANG_KEY = 'naptune_lang';
var saveLang;
var loadLang;
try {
  var AS = require('@react-native-async-storage/async-storage').default;
  saveLang = function(v) { try { AS.setItem(LANG_KEY, v); } catch(e) {} };
  loadLang = function() { return AS.getItem(LANG_KEY).catch(function() { return null; }); };
} catch(e) {
  saveLang = function() {};
  loadLang = function() { return Promise.resolve(null); };
}

function detectLang() {
  try {
    // Method 1: Expo-compatible — expo-localization getLocales
    try {
      var ExpoLoc = require('expo-localization');
      if (ExpoLoc && ExpoLoc.getLocales) {
        var locales = ExpoLoc.getLocales();
        if (locales && locales.length > 0 && locales[0].languageCode === 'ko') return 'ko';
        return 'en';
      }
    } catch(e) {}
    // Method 2: iOS NativeModules
    if (Platform.OS === 'ios') {
      var settings = NativeModules.SettingsManager && NativeModules.SettingsManager.settings;
      if (settings) {
        var langs = settings.AppleLanguages;
        if (langs && langs.length > 0 && langs[0].indexOf('ko') === 0) return 'ko';
        return 'en';
      }
    }
    // Method 3: Android
    if (Platform.OS === 'android') {
      var l = NativeModules.I18nManager && NativeModules.I18nManager.localeIdentifier;
      if (l && l.indexOf('ko') === 0) return 'ko';
      return 'en';
    }
    return 'ko';
  } catch(e) {
    return 'ko';
  }
}

function makeT(lang) {
  var s = strings[lang] || strings.ko;
  return function t(key, params) {
    var parts = key.split('.');
    var val = s;
    for (var i = 0; i < parts.length; i++) {
      if (val == null) return key;
      val = val[parts[i]];
    }
    if (val == null) return key;
    if (typeof val !== 'string') return val;
    if (params) {
      Object.keys(params).forEach(function(k) {
        val = val.split('{' + k + '}').join(String(params[k]));
      });
    }
    return val;
  };
}

export function LangProvider(props) {
  var detected = detectLang();
  var st = useState(detected);
  var lang = st[0];
  var setLangRaw = st[1];
  var setLang = function(l) { setLangRaw(l); saveLang(l); };
  // Load saved language on mount
  useEffect(function() {
    loadLang().then(function(saved) {
      if (saved && (saved === 'ko' || saved === 'en')) setLangRaw(saved);
    });
  }, []);
  var t = makeT(lang);
  return React.createElement(LangCtx.Provider, { value: { lang: lang, setLang: setLang, t: t } }, props.children);
}

export function useLang() {
  var ctx = useContext(LangCtx);
  if (!ctx) throw new Error('useLang must be inside LangProvider');
  return ctx;
}

