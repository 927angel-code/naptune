// ScheduleArc — 단일 Q-bezier 포물선 (wake → bed).
// 점들은 시간 비율(t)에 따라 곡선 위에 정확히 올라감: y(t) = BASE_Y - amp·4·t·(1-t).
// WW 라벨은 각 구간의 곡선 자체 위 (midT의 curve y) 약간 위.
//
// ES5/Hermes 호환: ?. ?? 미사용.

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { fM } from '../utils/helpers';

function clock(ts) {
  var d = new Date(ts);
  var h = d.getHours() % 12 || 12;
  var m = d.getMinutes();
  return h + ':' + (m < 10 ? '0' + m : '' + m);
}

export default function ScheduleArc(props) {
  var slots = Array.isArray(props.slots) ? props.slots : [];
  var wakeTs = props.wakeTs;
  var bedTs = props.bedTs;
  var name = props.name || '';
  var ageLabel = props.ageLabel || '';
  var lang = props.lang || 'ko';

  if (!wakeTs || !bedTs || bedTs <= wakeTs) return null;

  // ─── Dimensions ───
  var screenW = Dimensions.get('window').width;
  var W = Math.max(260, screenW - 72);
  var PAD_X = 26;
  var BASE_Y = 110;
  var PEAK_Y = 35;
  var SVG_H = 215;
  var TIME_Y = 150;
  var LABEL_Y = 172;
  var DUR_Y = 192;

  var totalMs = bedTs - wakeTs;
  var amp = BASE_Y - PEAK_Y;

  function yOnCurve(t) {
    if (t < 0) t = 0;
    if (t > 1) t = 1;
    return BASE_Y - amp * 4 * t * (1 - t);
  }
  function xAt(t) {
    return PAD_X + t * (W - 2 * PAD_X);
  }

  // ─── Build points: wake → naps → bed ───
  var pts = [];
  pts.push({
    ts: wakeTs,
    endTs: wakeTs,
    timeLabel: clock(wakeTs),
    label: lang === 'ko' ? '기상' : 'Wake',
    color: '#f5c025',
    r: 7,
    kind: 'wake'
  });
  for (var i = 0; i < slots.length; i++) {
    var sl = slots[i];
    var dur = sl.predDur;
    if (!dur && sl.end) dur = Math.round((sl.end - sl.start) / 60000);
    var isCat = !!(sl.isCatnap || sl.lastNap);
    pts.push({
      ts: sl.start,
      endTs: sl.end || sl.start,
      timeLabel: clock(sl.start),
      label: (lang === 'ko' ? '낮잠' : 'Nap') + (i + 1) + (isCat ? ' ⭐' : ''),
      durMin: dur > 0 ? dur : null,
      color: isCat ? '#a78bfa' : '#f4a865',
      r: 8,
      kind: 'nap',
      predicted: !!sl.predicted
    });
  }
  pts.push({
    ts: bedTs,
    endTs: bedTs,
    timeLabel: clock(bedTs),
    label: '🌙',
    color: '#1a1f4a',
    stroke: '#a78bfa',
    r: 8,
    kind: 'bed',
    predicted: !!props.bedPredicted
  });

  // ─── 점들의 (x, y): 단일 포물선 위 ───
  for (var j = 0; j < pts.length; j++) {
    var t = (pts[j].ts - wakeTs) / totalMs;
    if (t < 0) t = 0;
    if (t > 1) t = 1;
    pts[j].t = t;
    pts[j].x = xAt(t);
    pts[j].y = yOnCurve(t);
  }

  // ─── 단일 Q-bezier path: wake에서 bed까지 한 번에 ───
  var startX = PAD_X;
  var endX = W - PAD_X;
  var midParabolaX = (startX + endX) / 2;
  var ctrlY = BASE_Y - 2 * amp; // apex가 t=0.5에서 PEAK_Y에 닿도록
  var strokeD = 'M' + startX + ' ' + BASE_Y + ' Q' + midParabolaX + ' ' + ctrlY + ' ' + endX + ' ' + BASE_Y;
  var fillD = strokeD + ' Z';

  // ─── WW 라벨: 두 점 중 더 높은 점(작은 y) 기준 위로 18px ───
  var wwLabels = [];
  for (var k = 0; k < pts.length - 1; k++) {
    var a = pts[k];
    var b = pts[k + 1];
    var centerX = (a.x + b.x) / 2;
    var higherDotY = Math.min(a.y, b.y);
    var labelY = higherDotY - 18;
    var wwMin = Math.round((b.ts - a.endTs) / 60000);
    if (wwMin <= 0) continue;
    var col;
    if (k === 0) col = '#f5c025';
    else if (k === pts.length - 2) col = '#c4b5fd';
    else col = '#f4a865';
    wwLabels.push({ x: centerX, y: labelY, text: fM(wwMin), color: col });
  }

  return (
    <View style={s.card}>
      <View style={s.headerRow}>
        <Text style={s.title}>{lang === 'ko' ? '오늘의 스케줄 (예측)' : "Today's schedule (estimated)"}</Text>
        <Text style={s.sub}>{name + (ageLabel ? ' · ' + ageLabel : '')}</Text>
      </View>

      <Svg width={W} height={SVG_H} viewBox={'0 0 ' + W + ' ' + SVG_H}>
        <Defs>
          <LinearGradient id="napStroke" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#f5c025" />
            <Stop offset="0.4" stopColor="#f4a865" />
            <Stop offset="0.78" stopColor="#c4b5fd" />
            <Stop offset="1" stopColor="#4a3a8a" />
          </LinearGradient>
          <LinearGradient id="napFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#f4a865" stopOpacity="0.35" />
            <Stop offset="0.55" stopColor="#a78bfa" stopOpacity="0.18" />
            <Stop offset="1" stopColor="#1a1f4a" stopOpacity="0.04" />
          </LinearGradient>
        </Defs>

        <Path d={fillD} fill="url(#napFill)" />
        <Path d={strokeD} stroke="url(#napStroke)" strokeWidth="2.5" fill="none" />

        {wwLabels.map(function(l, ix) {
          return (
            <SvgText key={'w' + ix} x={l.x} y={l.y} textAnchor="middle"
              fontSize="11" fontWeight="700" fill={l.color}>
              {l.text}
            </SvgText>
          );
        })}

        {pts.map(function(p, ix) {
          return (
            <Circle key={'c' + ix} cx={p.x} cy={p.y} r={p.r}
              fill={p.color}
              fillOpacity={p.predicted ? 0.35 : 1}
              stroke={p.stroke ? p.stroke : 'transparent'}
              strokeWidth={p.stroke ? 2.5 : 0}
              strokeOpacity={p.predicted ? 0.45 : 1} />
          );
        })}

        {pts.map(function(p, ix) {
          return (
            <SvgText key={'t' + ix} x={p.x} y={TIME_Y} textAnchor="middle"
              fontSize="12" fontWeight="700"
              fill={p.predicted ? 'rgba(255,255,255,0.45)' : '#ffffff'}>
              {p.timeLabel}
            </SvgText>
          );
        })}

        {pts.map(function(p, ix) {
          return (
            <SvgText key={'l' + ix} x={p.x} y={LABEL_Y} textAnchor="middle"
              fontSize="10"
              fill={p.predicted ? 'rgba(200,215,255,0.35)' : 'rgba(200,215,255,0.65)'}>
              {p.label}
            </SvgText>
          );
        })}

        {pts.map(function(p, ix) {
          if (!p.durMin) return null;
          return (
            <SvgText key={'d' + ix} x={p.x} y={DUR_Y} textAnchor="middle"
              fontSize="9"
              fill={p.predicted ? 'rgba(200,215,255,0.25)' : 'rgba(200,215,255,0.4)'}>
              {fM(p.durMin)}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}

var s = StyleSheet.create({
  card: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: 22, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { color: '#e0d4ff', fontSize: 17, fontWeight: '900' },
  sub: { color: 'rgba(200,215,255,0.45)', fontSize: 13, fontWeight: '700' }
});
