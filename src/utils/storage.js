import AsyncStorage from '@react-native-async-storage/async-storage';

var PREFIX = 'naptune_';

// Fix V (v54n): Promise 반환으로 변경. async 에러 실제로 잡힘.
// failCallback 있으면 실패 시 호출됨 (UI에서 토스트 표시 가능).
export var SV = function(key, value, failCallback) {
  return AsyncStorage.setItem(PREFIX + key, JSON.stringify(value))
    .catch(function(e) {
      console.warn('Storage save error:', key, e);
      if (typeof failCallback === 'function') {
        failCallback(e);
      }
    });
};

export var LD = function(key, fallback) {
  return AsyncStorage.getItem(PREFIX + key).then(function(raw) {
    return raw ? JSON.parse(raw) : fallback;
  }).catch(function() { return fallback; });
};

export var DEL = function(key) {
  try { AsyncStorage.removeItem(PREFIX + key); } catch(e) {}
};

