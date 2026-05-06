// ═══ Korean particle helpers ═══
export var hasBat = function(s) {
  if (!s) return false;
  var l = s.charCodeAt(s.length - 1);
  return l >= 0xAC00 && l <= 0xD7A3 && (l - 0xAC00) % 28 !== 0;
};

export var pp = function(n, withB, withoutB) { return n + (hasBat(n) ? withB : withoutB); };

// ═══ i18n lang switch ═══
var _lang = 'ko';
export function setHelperLang(l) { _lang = l; }

// ═══ Time formatting (i18n) ═══
export var fD = function(ms) {
  if (!ms || ms <= 0) return '0' + (_lang === 'ko' ? '분' : 'm');
  var h = Math.floor(ms / 3600000);
  var m = Math.floor((ms % 3600000) / 60000);
  if (_lang === 'ko') {
    return h > 0 ? h + '시간 ' + m + '분' : m + '분';
  }
  return h > 0 ? h + 'h ' + m + 'm' : m + 'm';
};

export var fT = function(ts) {
  var d = new Date(ts);
  var h = d.getHours();
  var m = String(d.getMinutes()).padStart(2, '0');
  if (_lang === 'ko') {
    return (h < 12 ? '오전 ' : '오후 ') + (h % 12 || 12) + ':' + m;
  }
  return (h % 12 || 12) + ':' + m + ' ' + (h < 12 ? 'AM' : 'PM');
};

export var fM = function(mins) {
  if (!mins && mins !== 0) return '0' + (_lang === 'ko' ? '분' : 'm');
  var abs = Math.abs(Math.round(mins));
  var sign = mins < 0 ? '-' : '';
  var h = Math.floor(abs / 60);
  var m = abs % 60;
  if (_lang === 'ko') {
    return sign + (h > 0 ? h + '시간' + (m > 0 ? ' ' + m + '분' : '') : m + '분');
  }
  return sign + (h > 0 ? h + 'h' + (m > 0 ? ' ' + m + 'm' : '') : m + 'm');
};

export var fSec = function(ms) {
  var m2 = Math.floor(ms / 60000);
  var s = Math.floor((ms % 60000) / 1000);
  return String(m2).padStart(2, '0') + ':' + String(s).padStart(2, '0');
};

// ═══ Age calculation ═══
export var gD = function(bd) {
  if (!bd) return 0;
  var d = new Date(bd);
  if (isNaN(d.getTime())) return 0;
  var diff = Math.floor((Date.now() - d) / 86400000) + 1;
  return diff > 0 ? diff : 0;
};

// ═══ Unique ID ═══
export var uid = function() { return Date.now() + '_' + Math.random().toString(36).substr(2, 5); };

