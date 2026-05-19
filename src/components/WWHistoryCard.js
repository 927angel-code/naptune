// WWHistoryCard — 최근 3일 낮잠/밤잠 직전 깨시 + 입면 난이도 표시
// ES5/Hermes 호환
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { fM } from '../utils/helpers';
import { isNightSleep } from '../utils/sleep';
import { SV, LD } from '../utils/storage';

function easeEmoji(ease) {
  if (ease === 'under5') return '✨';
  if (ease === '5to15') return '🟢';
  if (ease === 'over15') return '🟡';
  if (ease === 'over30') return '🔴';
  return '';
}

// 어제·그저께·3일전 각각의 (낮잠1·낮잠2·낮잠3 ... · 밤잠) 깨시 + ease 계산
function buildHistory(sl) {
  if (!Array.isArray(sl) || sl.length === 0) return [];
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var todayMs = today.getTime();
  // 어제, 그저께, 3일전
  var dayLabels = [
    { label: '어제', en: 'Yesterday', start: todayMs - 1 * 86400000 },
    { label: '그저께', en: '2 days ago', start: todayMs - 2 * 86400000 },
    { label: '3일전', en: '3 days ago', start: todayMs - 3 * 86400000 },
  ];

  var sorted = sl.slice().sort(function(a, b) { return a.start - b.start; });

  var days = dayLabels.map(function(d) {
    var dStart = d.start;
    var dEnd = d.start + 86400000;
    // 그날 시작된 sleep entries (밤잠은 17시+ 또는 6시 미만)
    var dayEntries = sorted.filter(function(l) {
      return l.start >= dStart && l.start < dEnd && l.end;
    });
    // 정렬
    dayEntries.sort(function(a, b) { return a.start - b.start; });

    var rows = [];
    var napCount = 0;
    for (var j = 0; j < dayEntries.length; j++) {
      var e = dayEntries[j];
      if (e.micro) continue;
      var prevWake = null;
      for (var x = 0; x < sorted.length; x++) {
        var prev = sorted[x];
        if (!prev.end || prev.micro) continue;
        if (prev.end >= e.start) break;
        prevWake = prev.end;
      }
      if (!prevWake) continue;
      var ww = Math.round((e.start - prevWake) / 60000);
      if (ww < 30) continue;
      var isNight = isNightSleep(e);
      var label;
      if (isNight) {
        label = '밤잠';
      } else {
        napCount += 1;
        label = '낮잠' + napCount;
      }
      rows.push({ label: label, isNight: isNight, ww: ww, ease: e.ease });
    }
    return { dayLabel: d.label, dayLabelEn: d.en, rows: rows };
  });
  return days;
}

export default function WWHistoryCard(props) {
  var sl = props.sl || [];
  var lang = props.lang || 'ko';

  var stOpen = useState(true);
  var open = stOpen[0];
  var setOpen = stOpen[1];
  useEffect(function() { LD('wwHistoryOpen', true).then(function(v) { stOpen[1](v); }); }, []);

  var days = buildHistory(sl);
  if (days.every(function(d) { return d.rows.length === 0; })) return null;

  // 모든 일자의 row label 합치고 정렬: 낮잠1, 낮잠2, 낮잠3, ... , 밤잠
  var positionsSet = {};
  days.forEach(function(d) { d.rows.forEach(function(r) { positionsSet[r.label] = r.isNight; }); });
  var positions = Object.keys(positionsSet).sort(function(a, b) {
    if (a === '밤잠') return 1;
    if (b === '밤잠') return -1;
    return parseInt(a.replace(/\D/g, ''), 10) - parseInt(b.replace(/\D/g, ''), 10);
  });

  function findRow(day, label) {
    for (var i = 0; i < day.rows.length; i++) if (day.rows[i].label === label) return day.rows[i];
    return null;
  }

  return (
    <View style={s.card}>
      <TouchableOpacity onPress={function() { var next = !open; setOpen(next); SV('wwHistoryOpen', next); }} activeOpacity={0.7} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={s.title}>{lang === 'ko' ? '📊 깨시 기록' : '📊 Wake window history'}</Text>
        <Text style={s.toggle}>{open ? '−' : '+'}</Text>
      </TouchableOpacity>

      {open && <View style={{ marginTop: 14 }}>
        {/* 헤더 */}
        <View style={s.row}>
          <View style={s.cellLabel} />
          {days.map(function(d, i) {
            return <View key={'h' + i} style={s.cell}><Text style={s.head}>{lang === 'ko' ? d.dayLabel : d.dayLabelEn}</Text></View>;
          })}
        </View>
        {/* 본문 */}
        {positions.map(function(pos, i) {
          return (
            <View key={pos} style={[s.row, i < positions.length - 1 && s.rowSep]}>
              <View style={s.cellLabel}>
                <Text style={s.posLabel}>{lang === 'ko' ? pos : (pos === '밤잠' ? 'Bed' : 'Nap' + pos.replace(/\D/g, ''))}</Text>
              </View>
              {days.map(function(d, k) {
                var r = findRow(d, pos);
                return (
                  <View key={k} style={s.cell}>
                    {r ? (
                      <Text style={s.val}>{fM(r.ww)} <Text style={s.emoji}>{easeEmoji(r.ease)}</Text></Text>
                    ) : (
                      <Text style={s.miss}>—</Text>
                    )}
                  </View>
                );
              })}
            </View>
          );
        })}
        {/* 범례 */}
        <Text style={s.legend}>{lang === 'ko' ? '✨ 5분 이내   🟢 5-15분   🟡 15-30분   🔴 30분+' : '✨ <5 min   🟢 5-15   🟡 15-30   🔴 30+'}</Text>
      </View>}
    </View>
  );
}

var s = StyleSheet.create({
  card: { backgroundColor: 'rgba(154,140,240,0.06)', borderRadius: 20, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(154,140,240,0.2)' },
  title: { color: '#c4b5fd', fontSize: 15, fontWeight: '800' },
  toggle: { color: 'rgba(200,215,255,0.5)', fontSize: 17, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  rowSep: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  cellLabel: { width: 56 },
  cell: { flex: 1, alignItems: 'center' },
  head: { color: 'rgba(200,215,255,0.45)', fontSize: 12, fontWeight: '700' },
  posLabel: { color: 'rgba(200,215,255,0.7)', fontSize: 13, fontWeight: '800' },
  val: { color: '#e0d4ff', fontSize: 13, fontWeight: '700' },
  emoji: { fontSize: 12 },
  miss: { color: 'rgba(200,215,255,0.25)', fontSize: 13 },
  legend: { color: 'rgba(200,215,255,0.4)', fontSize: 11, marginTop: 10, textAlign: 'center' }
});
