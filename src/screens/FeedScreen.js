import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useApp } from '../context/AppContext';
import { useLang } from '../context/LangContext';
import { fD, fT, fSec, uid } from '../utils/helpers';
import { COLORS } from '../utils/constants';

export default function FeedScreen() {
  var ctx = useLang();
  var t = ctx.t;
  var lang = ctx.lang;
  var appCtx = useApp();
  var feeds = appCtx.feeds, setFeeds = appCtx.setFeeds;
  var sl = appCtx.sl;
  var fSide = appCtx.fSide, setFSide = appCtx.setFSide;
  var fStart = appCtx.fStart, setFStart = appCtx.setFStart;
  var fEl = appCtx.fEl, setFEl = appCtx.setFEl;
  var fTab = appCtx.fTab, setFTab = appCtx.setFTab;
  var show = appCtx.show;

  var stBo = useState(''); var boAmt = stBo[0]; var setBoAmt = stBo[1];
  var stEb = useState(''); var ebAmt = stEb[0]; var setEbAmt = stEb[1];
  var stPW = useState(0); var patternWeek = stPW[0]; var setPatternWeek = stPW[1];
  var stPE = useState(0); var pumpEl = stPE[0]; var setPumpEl = stPE[1];
  var stPS = useState(null); var pumpStart = stPS[0]; var setPumpStart = stPS[1];
  var stPM = useState(null); var pumpMode = stPM[0]; var setPumpMode = stPM[1];
  var stPL = useState(''); var pumpLml = stPL[0]; var setPumpLml = stPL[1];
  var stPR = useState(''); var pumpRml = stPR[0]; var setPumpRml = stPR[1];

  // ═══ Type/side label helpers ═══
  var typeLabel = function(tp) {
    if (tp === '모유') return t('feed.breast');
    if (tp === '분유') return t('feed.bottle');
    if (tp === '유축') return t('feed.pump');
    if (tp === '유축수유') return t('feed.ebm');
    return tp;
  };
  var sideLabel = function(sd) {
    if (sd === '왼쪽') return t('c.left');
    if (sd === '오른쪽') return t('c.right');
    if (sd === '양쪽') return t('c.both');
    if (sd === '빠른기록') return '';
    return sd || '';
  };

  useEffect(function() {
    var iv = setInterval(function() {
      if (fStart) setFEl(Date.now() - fStart);
      if (pumpStart) setPumpEl(Date.now() - pumpStart);
    }, 1000);
    return function() { clearInterval(iv); };
  }, [fStart, pumpStart]);

  // 1-min tick — forces "X분 전" text to refresh when no feeding is in progress
  var stTick = useState(0); var setTick = stTick[1];
  useEffect(function() {
    var iv2 = setInterval(function() { setTick(function(v){return v+1;}); }, 60000);
    return function() { clearInterval(iv2); };
  }, []);

  // Fix Z (v54u): 배열 [0] 가정 대신 ts 기준 정렬 후 선택 (LogScreen 편집/추가 후에도 안전)
  var lastBabyFeed = feeds.filter(function(f){return f.type !== '유축';}).sort(function(a,b){return b.ts-a.ts;})[0];
  var today = new Date(); today.setHours(0,0,0,0);
  var todayFeeds = feeds.filter(function(f){return f.ts >= today.getTime();}).sort(function(a,b){return a.ts - b.ts;});
  var totalMl = todayFeeds.filter(function(f){return f.type === '분유';}).reduce(function(s2,f){return s2 + (f.ml||0);}, 0);
  var bfToday = todayFeeds.filter(function(f){return f.type === '모유';});
  var bfCount = bfToday.length;
  var bfMin = Math.round(bfToday.reduce(function(s2,f){return s2 + (f.dur||0);}, 0) / 60000);
  var pumpToday = todayFeeds.filter(function(f){return f.type === '유축';});
  var pumpMl = pumpToday.reduce(function(s2,f){return s2 + (f.lml||0) + (f.rml||0);}, 0);
  var pumpDur = Math.round(pumpToday.reduce(function(s2,f){return s2 + (f.dur||0);}, 0) / 60000);
  var ebmToday = todayFeeds.filter(function(f){return f.type === '유축수유';});
  var ebmMl = ebmToday.reduce(function(s2,f){return s2 + (f.ml||0);}, 0);
  // Fix Z (v54u): find 대신 sort + [0]
  var lastBo = feeds.filter(function(f){return f.type === '분유' && f.ml;}).sort(function(a,b){return b.ts-a.ts;})[0];
  var lastEbm = feeds.filter(function(f){return f.type === '유축수유' && f.ml;}).sort(function(a,b){return b.ts-a.ts;})[0];

  // ═══ 7-day analysis ═══
  var days7 = [];
  for (var d = 6; d >= 0; d--) {
    var dayStart = new Date(); dayStart.setHours(0,0,0,0); dayStart.setDate(dayStart.getDate() - d);
    var dayEnd = dayStart.getTime() + 86400000;
    var dayFeeds = feeds.filter(function(f){return f.ts >= dayStart.getTime() && f.ts < dayEnd;});
    var bf = dayFeeds.filter(function(f){return f.type === '모유';});
    var bfM = Math.round(bf.reduce(function(s2,f){return s2+(f.dur||0);},0)/60000);
    var bfC = bf.length;
    var formulaMl = dayFeeds.filter(function(f){return f.type === '분유';}).reduce(function(s2,f){return s2+(f.ml||0);},0);
    var pM = dayFeeds.filter(function(f){return f.type === '유축';}).reduce(function(s2,f){return s2+(f.lml||0)+(f.rml||0);},0);
    // Night feeds: [dayStart 20:00 ~ next day 06:00] — feeds after midnight belong to the PRIOR night
    var nightStart = dayStart.getTime() + 20*3600000;
    var nightEnd = dayStart.getTime() + 30*3600000;
    var nightCount = feeds.filter(function(f){return f.ts >= nightStart && f.ts < nightEnd;}).length;
    var sorted = dayFeeds.sort(function(a,b){return a.ts-b.ts;});
    // Fix X (v54p): 간격 평균은 낮 수유(6:00-20:00)만 계산. 밤중 수유(20:00-06:00)는 별도 카테고리.
    // 전문가 합의: KellyMom/LLL — night sleep stretch는 낮 수유 간격과 섞으면 안 됨.
    // 6:00 이전 또는 20:00 이후 시작한 수유는 제외.
    var daytimeFeeds = sorted.filter(function(f){
      var h = new Date(f.ts).getHours();
      return h >= 6 && h < 20;
    });
    var intervals = [];
    for (var i2=1;i2<daytimeFeeds.length;i2++) intervals.push(Math.round((daytimeFeeds[i2].ts-daytimeFeeds[i2-1].ts)/60000));
    var avgInterval = intervals.length > 0 ? Math.round(intervals.reduce(function(a,b){return a+b;},0)/intervals.length) : 0;
    var dayNames = t('c.days').split(',');
    var bottleC = dayFeeds.filter(function(f){return f.type === '분유';}).length;
    var pumpC = dayFeeds.filter(function(f){return f.type === '유축';}).length;
    var ebmC = dayFeeds.filter(function(f){return f.type === '유축수유';}).length;
    days7.push({dayLabel:dayNames[dayStart.getDay()],d:d,bfMin:bfM,bfCount:bfC,bottleCount:bottleC,pumpCount:pumpC,ebmCount:ebmC,formulaMl:formulaMl,pumpMl:pM,totalCount:dayFeeds.length,nightCount:nightCount,avgInterval:avgInterval});
  }
  var thisWeek = days7.reduce(function(a,dd){return a+dd.totalCount;},0);
  var avgIntervalWeek = (function(){var vals=days7.filter(function(dd){return dd.avgInterval>0;}).map(function(dd){return dd.avgInterval;});return vals.length?Math.round(vals.reduce(function(a,b){return a+b;},0)/vals.length):0;})();
  // Trends: compare completed days only (exclude today d=0, which is still in progress)
  var completed6 = days7.filter(function(dd){return dd.d > 0;}); // d=1..6 = yesterday to 6 days ago
  var first3 = completed6.slice(0,3);  // oldest 3 (d=6,5,4)
  var last3 = completed6.slice(-3);    // recent 3 completed (d=3,2,1)
  var first3Night = first3.reduce(function(a,dd){return a+dd.nightCount;},0);
  var last3Night = last3.reduce(function(a,dd){return a+dd.nightCount;},0);
  var first3I = first3.filter(function(dd){return dd.avgInterval>0;}).map(function(dd){return dd.avgInterval;});
  var last3I = last3.filter(function(dd){return dd.avgInterval>0;}).map(function(dd){return dd.avgInterval;});
  var avgFirst = first3I.length?Math.round(first3I.reduce(function(a,b){return a+b;},0)/first3I.length):0;
  var avgLast = last3I.length?Math.round(last3I.reduce(function(a,b){return a+b;},0)/last3I.length):0;
  // Fix R (v54j): 간격 트렌드를 횟수 트렌드와 일관성 체크. 밤중 수유 감소로 span 줄어 interval이 artifact로 감소하는 경우 배제.
  var countFirst = first3.reduce(function(a,dd){return a+dd.totalCount;},0);
  var countLast = last3.reduce(function(a,dd){return a+dd.totalCount;},0);

  var startFeed = function(side) { setFSide(side); setFStart(Date.now()); setFEl(0); };
  var switchSide = function() { var next = fSide === '왼쪽' ? '오른쪽' : '왼쪽'; stopFeed(); startFeed(next); };
  var stopFeed = function() {
    if (!fSide) return;
    var dur = Date.now() - fStart;
    var nextSide = fSide === '왼쪽' ? '오른쪽' : '왼쪽';
    setFeeds(function(p){return [{id:uid(),ts:fStart,type:'모유',side:fSide,dur:dur}].concat(p).slice(0,300);});
    show('🤱 '+sideLabel(fSide)+' '+fD(dur)+' → '+sideLabel(nextSide), COLORS.pink);
    setFSide(null); setFStart(null); setFEl(0);
  };
  var quickBreast = function() { setFeeds(function(p){return [{id:uid(),ts:Date.now(),type:'모유',side:'빠른기록',dur:null}].concat(p).slice(0,300);}); show(t('feed.quickRecord'), COLORS.pink); };
  var recBottle = function(ml) { if(!ml)return; setFeeds(function(p){return [{id:uid(),ts:Date.now(),type:'분유',ml:+ml}].concat(p).slice(0,300);}); show('🍼 '+ml+'ml', COLORS.yellow); setBoAmt(''); };
  var recEBM = function(ml) { if(!ml)return; setFeeds(function(p){return [{id:uid(),ts:Date.now(),type:'유축수유',ml:+ml}].concat(p).slice(0,300);}); show('🍼 '+ml+'ml', COLORS.purple); setEbAmt(''); };
  var startPump = function(mode) { setPumpMode(mode); setPumpStart(Date.now()); setPumpEl(0); setPumpLml(''); setPumpRml(''); };
  var switchPump = function() {
    if (!pumpStart || pumpMode === '양쪽') return;
    var dur = Date.now() - pumpStart;
    var next = pumpMode === '왼쪽' ? '오른쪽' : '왼쪽';
    var lml = pumpMode === '왼쪽' ? +pumpLml || 0 : 0;
    var rml = pumpMode === '오른쪽' ? +pumpRml || 0 : 0;
    setFeeds(function(p){return [{id:uid(),ts:pumpStart,type:'유축',dur:dur,lml:lml,rml:rml,mode:pumpMode}].concat(p).slice(0,300);});
    show('🥛 '+sideLabel(pumpMode)+' '+fD(dur)+' → '+sideLabel(next), '#8ad4f0');
    setPumpMode(next); setPumpStart(Date.now()); setPumpEl(0); setPumpLml(''); setPumpRml('');
  };
  var stopPump = function() {
    if (!pumpStart) return;
    var dur = Date.now() - pumpStart;
    setFeeds(function(p){return [{id:uid(),ts:pumpStart,type:'유축',dur:dur,lml:+pumpLml||0,rml:+pumpRml||0,mode:pumpMode}].concat(p).slice(0,300);});
    show('🥛 '+fD(dur), '#8ad4f0');
    setPumpStart(null); setPumpEl(0); setPumpMode(null); setPumpLml(''); setPumpRml('');
  };

  var TABS = [['breast',t('feed.breast')],['bottle',t('feed.bottle')],['pump',t('feed.pump')],['ebm',t('feed.ebm')]];

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Last feed */}
        {lastBabyFeed && <View style={s.lastFeed}>
          <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
            <Text style={{color:'rgba(200,215,255,0.8)',fontSize:15,fontWeight:'700'}}>{typeLabel(lastBabyFeed.type)}</Text>
          </View>
          <Text style={{color:COLORS.pink,fontSize:15,fontWeight:'800'}}>{(function(){var ago=Math.max(0,Math.floor((Date.now()-lastBabyFeed.ts)/60000));return ago<60?ago+t('feed.lastFeed'):Math.floor(ago/60)+t('feed.lastFeedHour')+(ago%60)+t('feed.lastFeed');})()}</Text>
        </View>}

        {/* Sub tabs */}
        <View style={{flexDirection:'row',gap:4,marginBottom:10}}>
          {TABS.map(function(tb){return(
            <TouchableOpacity key={tb[0]} onPress={function(){setFTab(tb[0]);}} style={[s.subTab,fTab===tb[0]&&{borderColor:'rgba(240,168,201,0.4)',backgroundColor:'rgba(240,168,201,0.15)'}]}>
              <Text style={{color:fTab===tb[0]?'#fbcfe8':'rgba(200,215,255,0.65)',fontWeight:'700',fontSize:15}}>{tb[1]}</Text>
            </TouchableOpacity>
          );})}
        </View>

        {/* ═══ Breast ═══ */}
        {fTab==='breast' && (fSide
          ? <View style={[s.card,{borderColor:COLORS.pink+'50',backgroundColor:'rgba(240,168,201,0.08)',alignItems:'center'}]}>
              <Text style={{color:'#fbcfe8',fontWeight:'900',fontSize:19,lineHeight:28}}>{t('feed.feeding',{side:sideLabel(fSide)})}</Text>
              <Text style={{color:'#fff',fontSize:60,fontWeight:'900',letterSpacing:-2,marginVertical:8}}>{fSec(fEl)}</Text>
              <View style={{flexDirection:'row',gap:8,width:'100%'}}>
                <TouchableOpacity onPress={switchSide} style={{flex:1,padding:12,borderRadius:14,borderWidth:1.5,borderColor:'rgba(240,168,201,0.3)',backgroundColor:'rgba(240,168,201,0.1)',alignItems:'center'}}>
                  <Text style={{color:'#fbcfe8',fontWeight:'800',fontSize:15}}>{t('feed.switchTo',{side:sideLabel(fSide==='왼쪽'?'오른쪽':'왼쪽')})}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={stopFeed} style={{flex:1,padding:12,borderRadius:14,backgroundColor:'#dc2626',alignItems:'center'}}>
                  <Text style={{color:'#fff',fontWeight:'800',fontSize:15}}>{t('feed.stop')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          : <View style={s.card}>
              <View style={{flexDirection:'row',gap:8,marginBottom:8}}>
                <TouchableOpacity onPress={function(){startFeed('왼쪽');}} style={{flex:1,padding:14,borderRadius:14,backgroundColor:'#f0a8c9',alignItems:'center'}}>
                  <Text style={{color:'#2a1530',fontWeight:'800',fontSize:17}}>{t('feed.leftSide')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={function(){startFeed('오른쪽');}} style={{flex:1,padding:14,borderRadius:14,backgroundColor:'#d98bb0',alignItems:'center'}}>
                  <Text style={{color:'#2a1530',fontWeight:'800',fontSize:17}}>{t('feed.rightSide')}</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={quickBreast} style={{padding:12,borderRadius:14,borderWidth:1.5,borderColor:'rgba(240,168,201,0.25)',alignItems:'center'}}>
                <Text style={{color:'#f0a8c9',fontWeight:'700',fontSize:15}}>{t('feed.quickRecord')}</Text>
              </TouchableOpacity>
            </View>
        )}

        {/* ═══ Bottle ═══ */}
        {fTab==='bottle' && <View style={s.card}>
          <Text style={{color:'rgba(200,215,255,0.6)',fontWeight:'800',fontSize:15,marginBottom:8}}>{t('feed.bottle')}</Text>
          {lastBo && <TouchableOpacity onPress={function(){recBottle(lastBo.ml);}} style={{padding:12,borderRadius:14,borderWidth:1.5,borderColor:'rgba(240,205,138,0.3)',backgroundColor:'rgba(240,205,138,0.08)',alignItems:'center',marginBottom:8}}>
            <Text style={{color:'#f0cd8a',fontWeight:'800',fontSize:15}}>{t('feed.quickBottle',{ml:lastBo.ml})}</Text>
          </TouchableOpacity>}
          <View style={{flexDirection:'row',gap:8,alignItems:'center'}}>
            <TextInput style={[s.mlInput,{flex:1}]} value={boAmt} onChangeText={setBoAmt} placeholder="ml" placeholderTextColor="rgba(200,215,255,0.25)" keyboardType="number-pad" selectTextOnFocus={true}/>
            <TouchableOpacity onPress={function(){if(boAmt)recBottle(boAmt);}} style={[s.saveBtn,!boAmt&&{opacity:0.4}]}>
              <Text style={{color:'#3a2a0a',fontWeight:'800',fontSize:17}}>{t('c.save')}</Text>
            </TouchableOpacity>
          </View>
        </View>}

        {/* ═══ Pump ═══ */}
        {fTab==='pump' && (pumpStart
          ? <View style={[s.card,{borderColor:'#8ad4f050',backgroundColor:'rgba(138,212,240,0.08)'}]}>
              <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
                <Text style={{color:'#8ad4f0',fontWeight:'900',fontSize:19,lineHeight:28}}>{pumpMode==='양쪽'?t('feed.pumpingBoth'):t('feed.pumping',{side:sideLabel(pumpMode)})}</Text>
                <Text style={{color:'#fff',fontSize:28,fontWeight:'900'}}>{fSec(pumpEl)}</Text>
              </View>
              {(pumpMode==='왼쪽'||pumpMode==='양쪽') && <View style={{flexDirection:'row',gap:8,alignItems:'center',marginTop:8}}>
                <Text style={{color:'rgba(138,212,240,0.7)',fontSize:15,fontWeight:'700',minWidth:40}}>{t('c.left')}</Text>
                <TextInput style={[s.mlInput,{flex:1,textAlign:'center'}]} value={pumpLml} onChangeText={setPumpLml} placeholder="ml" placeholderTextColor="rgba(200,215,255,0.25)" keyboardType="number-pad" selectTextOnFocus={true}/>
              </View>}
              {(pumpMode==='오른쪽'||pumpMode==='양쪽') && <View style={{flexDirection:'row',gap:8,alignItems:'center',marginTop:8}}>
                <Text style={{color:'rgba(138,212,240,0.7)',fontSize:15,fontWeight:'700',minWidth:40}}>{t('c.right')}</Text>
                <TextInput style={[s.mlInput,{flex:1,textAlign:'center'}]} value={pumpRml} onChangeText={setPumpRml} placeholder="ml" placeholderTextColor="rgba(200,215,255,0.25)" keyboardType="number-pad" selectTextOnFocus={true}/>
              </View>}
              {pumpMode !== '양쪽' && <TouchableOpacity onPress={switchPump} style={{padding:12,borderRadius:14,borderWidth:1.5,borderColor:'rgba(138,212,240,0.3)',backgroundColor:'rgba(138,212,240,0.1)',alignItems:'center',marginTop:8}}>
                <Text style={{color:'#8ad4f0',fontWeight:'800',fontSize:15}}>{t('feed.switchPump',{side:sideLabel(pumpMode==='왼쪽'?'오른쪽':'왼쪽')})}</Text>
              </TouchableOpacity>}
              <TouchableOpacity onPress={stopPump} style={{padding:12,borderRadius:14,backgroundColor:'#dc2626',alignItems:'center',marginTop:10}}>
                <Text style={{color:'#fff',fontWeight:'800',fontSize:17}}>{t('feed.pumpStop')}</Text>
              </TouchableOpacity>
            </View>
          : <View style={s.card}>
              <View style={{flexDirection:'row',gap:8,marginBottom:8}}>
                <TouchableOpacity onPress={function(){startPump('왼쪽');}} style={{flex:1,padding:14,borderRadius:14,backgroundColor:'#8ad4f0',alignItems:'center'}}>
                  <Text style={{color:'#0a2a3a',fontWeight:'800',fontSize:17}}>{'🥛 '+t('c.left')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={function(){startPump('오른쪽');}} style={{flex:1,padding:14,borderRadius:14,backgroundColor:'#6bb8d6',alignItems:'center'}}>
                  <Text style={{color:'#0a2a3a',fontWeight:'800',fontSize:17}}>{'🥛 '+t('c.right')}</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={function(){startPump('양쪽');}} style={{padding:14,borderRadius:14,backgroundColor:'#8ad4f0',alignItems:'center'}}>
                <Text style={{color:'#0a2a3a',fontWeight:'800',fontSize:17}}>{'🥛 '+t('c.both')}</Text>
              </TouchableOpacity>
            </View>
        )}

        {/* ═══ EBM ═══ */}
        {fTab==='ebm' && <View style={s.card}>
          <Text style={{color:'rgba(200,215,255,0.6)',fontWeight:'800',fontSize:15,marginBottom:8}}>{t('feed.ebm')}</Text>
          {lastEbm && <TouchableOpacity onPress={function(){recEBM(lastEbm.ml);}} style={{padding:12,borderRadius:14,borderWidth:1.5,borderColor:'rgba(154,140,240,0.3)',backgroundColor:'rgba(154,140,240,0.08)',alignItems:'center',marginBottom:8}}>
            <Text style={{color:'#a8e0a8',fontWeight:'800',fontSize:15}}>{t('feed.quickBottle',{ml:lastEbm.ml})}</Text>
          </TouchableOpacity>}
          <View style={{flexDirection:'row',gap:8,alignItems:'center'}}>
            <TextInput style={[s.mlInput,{flex:1}]} value={ebAmt} onChangeText={setEbAmt} placeholder="ml" placeholderTextColor="rgba(200,215,255,0.25)" keyboardType="number-pad" selectTextOnFocus={true}/>
            <TouchableOpacity onPress={function(){if(ebAmt)recEBM(ebAmt);}} style={[{padding:12,paddingHorizontal:20,borderRadius:14,backgroundColor:'#a8e0a8',alignItems:'center'},!ebAmt&&{opacity:0.4}]}>
              <Text style={{color:'#1a3a1a',fontWeight:'800',fontSize:17}}>{t('c.save')}</Text>
            </TouchableOpacity>
          </View>
        </View>}

        {/* ═══ Today summary ═══ */}
        {bfCount > 0 && <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:8,paddingHorizontal:0,borderTopWidth:1,borderTopColor:'rgba(154,140,240,0.12)'}}>
          <Text style={{color:'rgba(200,215,255,0.5)',fontSize:15,fontWeight:'700'}}>{t('feed.todayBreast')}</Text>
          <Text style={{color:'#f0a8c9',fontSize:17,fontWeight:'900'}}>{bfCount+t('c.count')+(bfMin>0?' · '+bfMin+t('c.min'):'')}</Text>
        </View>}
        {totalMl > 0 && <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:8,paddingHorizontal:0,borderTopWidth:1,borderTopColor:'rgba(154,140,240,0.12)'}}>
          <Text style={{color:'rgba(200,215,255,0.5)',fontSize:15,fontWeight:'700'}}>{t('feed.todayBottle')}</Text>
          <Text style={{color:'#f0cd8a',fontSize:17,fontWeight:'900'}}>{totalMl+'ml'}</Text>
        </View>}
        {pumpMl > 0 && <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:8,paddingHorizontal:0,borderTopWidth:1,borderTopColor:'rgba(154,140,240,0.12)'}}>
          <Text style={{color:'rgba(200,215,255,0.5)',fontSize:15,fontWeight:'700'}}>{t('feed.todayPump')}</Text>
          <Text style={{color:'#8ad4f0',fontSize:17,fontWeight:'900'}}>{pumpToday.length+t('c.count')+(pumpDur>0?' · '+pumpDur+t('c.min'):'')+(pumpMl>0?' · '+pumpMl+'ml':'')}</Text>
        </View>}
        {ebmMl > 0 && <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:8,paddingHorizontal:0,borderTopWidth:1,borderTopColor:'rgba(154,140,240,0.12)',marginBottom:8}}>
          <Text style={{color:'rgba(200,215,255,0.5)',fontSize:15,fontWeight:'700'}}>{t('feed.todayEBM')}</Text>
          <Text style={{color:'#a8e0a8',fontSize:17,fontWeight:'900'}}>{ebmToday.length+t('c.count')+(ebmMl>0?' · '+ebmMl+'ml':'')}</Text>
        </View>}

        {/* ═══ Timeline ═══ */}
        <View style={[s.card,{alignItems:'center',marginTop:8}]}>
          <Text style={{color:'#e0d4ff',fontWeight:'900',fontSize:19,lineHeight:28,marginBottom:8,textAlign:'center'}}>{t('feed.timeline')}</Text>
          {todayFeeds.length === 0
            ? <Text style={{color:'rgba(200,215,255,0.3)',fontSize:15,textAlign:'center',padding:16}}>{t('feed.noFeeds')}</Text>
            : todayFeeds.slice().reverse().map(function(f,i) {
                var dd = new Date(f.ts);
                var timeStr = String(dd.getHours()).padStart(2,'0')+':'+String(dd.getMinutes()).padStart(2,'0');
                var durMin = f.dur && f.dur > 0 ? Math.round(f.dur/60000) : 0;
                var icon = f.type==='모유'?'🤱':f.type==='분유'?'🍼':f.type==='유축'?'🥛':'🍼';
                var col = f.type==='모유'?'#f0a8c9':f.type==='분유'?'#f0cd8a':f.type==='유축'?'#8ad4f0':'#a8e0a8';
                var detail = f.type==='모유' ? (sideLabel(f.side)+(durMin>0?' '+durMin+t('c.min'):'')).trim() : f.ml?f.ml+'ml' : f.type==='유축'?((f.lml||0)+(f.rml||0))+'ml':'';
                var num = todayFeeds.length - i; // 최신이 위로, 회차 번호 의미 유지
                return (
                  <View key={i} style={{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:14,paddingHorizontal:12,borderBottomWidth:0,width:'100%',backgroundColor:'rgba(255,255,255,0.03)',borderRadius:12,marginBottom:8}}>
                    <Text style={{color:col,fontSize:15,fontWeight:'900',minWidth:28}}>{num+t('c.count')}</Text>
                    <Text style={{color:'rgba(200,215,255,0.35)',fontSize:15,fontWeight:'700',minWidth:42,textAlign:'right'}}>{timeStr}</Text>
                    <View style={{width:4,height:28,borderRadius:2,backgroundColor:col}}/>
                    <View style={{flex:1,flexDirection:'row',alignItems:'center',gap:6}}>
                      <Text style={{color:'rgba(200,215,255,0.75)',fontSize:15,fontWeight:'700'}}>{typeLabel(f.type)}</Text>
                      <Text style={{color:col,fontSize:15,fontWeight:'800'}}>{detail}</Text>
                    </View>
                  </View>
                );
              })
          }
        </View>
        {/* ═══ Weekly Pattern Chart ═══ */}
        {(feeds.length > 0 || sl.length > 0) && <View style={s.card}>
          <Text style={{color:'#e0d4ff',fontWeight:'900',fontSize:19,lineHeight:28,marginBottom:6,textAlign:'center'}}>{t('feed.analysis.pattern')}</Text>
          {/* Week navigation */}
          <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
            <TouchableOpacity onPress={function(){setPatternWeek(patternWeek+1);}} style={{padding:8,paddingHorizontal:12,borderRadius:10,borderWidth:1,borderColor:'rgba(255,255,255,0.1)'}}>
              <Text style={{color:'rgba(200,215,255,0.5)',fontWeight:'800',fontSize:15}}>◀</Text>
            </TouchableOpacity>
            <Text style={{color:patternWeek===0?'#9a8cf0':'rgba(200,215,255,0.5)',fontSize:15,fontWeight:'700'}}>
              {(function(){
                var ws = new Date(); ws.setHours(0,0,0,0); ws.setDate(ws.getDate()-6-patternWeek*7);
                var we = new Date(); we.setHours(0,0,0,0); we.setDate(we.getDate()-patternWeek*7);
                return (ws.getMonth()+1)+'/'+ws.getDate()+' ~ '+(we.getMonth()+1)+'/'+we.getDate();
              })()}
            </Text>
            <TouchableOpacity onPress={function(){if(patternWeek>0)setPatternWeek(patternWeek-1);}} style={{padding:8,paddingHorizontal:12,borderRadius:10,borderWidth:1,borderColor:patternWeek>0?'rgba(255,255,255,0.1)':'rgba(255,255,255,0.03)'}}>
              <Text style={{color:patternWeek>0?'rgba(200,215,255,0.5)':'rgba(200,215,255,0.15)',fontWeight:'800',fontSize:15}}>▶</Text>
            </TouchableOpacity>
          </View>
          <View style={{flexDirection:'row',alignItems:'center',gap:10,marginBottom:10,justifyContent:'center',flexWrap:'wrap'}}>
            <View style={{flexDirection:'row',alignItems:'center',gap:4}}><View style={{width:10,height:10,borderRadius:3,backgroundColor:'#9a8cf0'}}/><Text style={{color:'rgba(200,215,255,0.5)',fontSize:13}}>{t('feed.analysis.patternSleep')}</Text></View>
            <View style={{flexDirection:'row',alignItems:'center',gap:4}}><View style={{width:10,height:10,borderRadius:3,backgroundColor:'#f0a8c9'}}/><Text style={{color:'rgba(200,215,255,0.5)',fontSize:13}}>{t('feed.breast')}</Text></View>
            <View style={{flexDirection:'row',alignItems:'center',gap:4}}><View style={{width:10,height:10,borderRadius:3,backgroundColor:'#f0cd8a'}}/><Text style={{color:'rgba(200,215,255,0.5)',fontSize:13}}>{t('feed.bottle')}</Text></View>
            <View style={{flexDirection:'row',alignItems:'center',gap:4}}><View style={{width:10,height:10,borderRadius:3,backgroundColor:'#a8e0a8'}}/><Text style={{color:'rgba(200,215,255,0.5)',fontSize:13}}>{t('feed.ebm')}</Text></View>
            <View style={{flexDirection:'row',alignItems:'center',gap:4}}><View style={{width:10,height:10,borderRadius:3,backgroundColor:'#8ad4f0'}}/><Text style={{color:'rgba(200,215,255,0.5)',fontSize:13}}>{t('feed.pump')}</Text></View>
          </View>
          {(function() {
            var HOUR_H = 10;
            var TOTAL_H = 24 * HOUR_H;
            var dayNames = t('c.days').split(',');
            var offset = patternWeek * 7;
            var cols = [];
            for (var d2 = 6; d2 >= 0; d2--) {
              var dayS2 = new Date(); dayS2.setHours(0,0,0,0); dayS2.setDate(dayS2.getDate() - d2 - offset);
              var dayE2 = dayS2.getTime() + 86400000;
              var daySleeps = sl.filter(function(l) {
                return l.end && ((l.start >= dayS2.getTime() && l.start < dayE2) || (l.end > dayS2.getTime() && l.end <= dayE2) || (l.start < dayS2.getTime() && l.end > dayE2));
              });
              var dayFeeds2 = feeds.filter(function(f) { return f.ts >= dayS2.getTime() && f.ts < dayE2; });
              var isToday2 = patternWeek === 0 && d2 === 0;
              cols.push({ d: d2, dayStart: dayS2.getTime(), dayLabel: dayNames[dayS2.getDay()], dateLabel: (dayS2.getMonth()+1)+'/'+dayS2.getDate(), sleeps: daySleeps, feeds: dayFeeds2, isToday: isToday2 });
            }
            return (
              <View style={{flexDirection:'row'}}>
                {/* Time labels */}
                <View style={{width:28,height:TOTAL_H,justifyContent:'space-between',marginRight:4}}>
                  {[0,3,6,9,12,15,18,21].map(function(h) {
                    return <Text key={h} style={{color:'rgba(200,215,255,0.3)',fontSize:9,fontWeight:'700',position:'absolute',top:h*HOUR_H-4}}>{h===0?'00':h<10?'0'+h:String(h)}</Text>;
                  })}
                </View>
                {/* Day columns */}
                {cols.map(function(col, ci) {
                  return (
                    <View key={ci} style={{flex:1,marginHorizontal:1}}>
                      <View style={{height:TOTAL_H,backgroundColor:'rgba(255,255,255,0.02)',borderRadius:4,overflow:'hidden',borderWidth:0,borderColor:'transparent',position:'relative'}}>
                        {/* Hour grid lines */}
                        {[6,12,18].map(function(h) {
                          return <View key={h} style={{position:'absolute',top:h*HOUR_H,left:0,right:0,height:0.5,backgroundColor:'rgba(255,255,255,0.06)'}}/>;
                        })}
                        {/* Sleep blocks */}
                        {col.sleeps.map(function(slp, si) {
                          var sMs = Math.max(slp.start, col.dayStart);
                          var eMs = Math.min(slp.end, col.dayStart + 86400000);
                          var sMin = (sMs - col.dayStart) / 60000;
                          var eMin = (eMs - col.dayStart) / 60000;
                          var top2 = sMin / 60 * HOUR_H;
                          var h2 = Math.max(2, (eMin - sMin) / 60 * HOUR_H);
                          return <View key={'s'+si} style={{position:'absolute',top:top2,left:0,right:0,height:h2,backgroundColor:'#9a8cf0',borderRadius:1.5}}/>;
                        })}
                        {/* Feed dots */}
                        {col.feeds.map(function(fd, fi) {
                          var fMin = (fd.ts - col.dayStart) / 60000;
                          var top3 = fMin / 60 * HOUR_H;
                          var fCol = fd.type === '모유' ? '#f0a8c9' : fd.type === '분유' ? '#f0cd8a' : fd.type === '유축수유' ? '#a8e0a8' : fd.type === '유축' ? '#8ad4f0' : '#f0cd8a';
                          return <View key={'f'+fi} style={{position:'absolute',top:Math.max(0,top3-1.5),left:0,right:0,height:3,backgroundColor:fCol,borderRadius:1.5}}/>;
                        })}
                        {col.sleeps.length===0&&col.feeds.length===0 && <View style={{flex:1,alignItems:'center',justifyContent:'center'}}><Text style={{color:'rgba(200,215,255,0.1)',fontSize:8}}>—</Text></View>}
                      </View>
                      <Text style={{color:'rgba(200,215,255,0.35)',fontSize:10,fontWeight:'400',textAlign:'center',marginTop:3}}>{col.dateLabel}</Text>
                      <Text style={{color:col.isToday?'#9a8cf0':'rgba(200,215,255,0.25)',fontSize:9,textAlign:'center'}}>{col.dayLabel}</Text>
                    </View>
                  );
                })}
              </View>
            );
          })()}
        </View>}


        {/* ═══ Analysis ═══ */}
        {feeds.length >= 3 && <View style={s.card}>
          <Text style={{color:'#e0d4ff',fontWeight:'900',fontSize:19,lineHeight:28,marginBottom:14,textAlign:'center'}}>{t('feed.analysis.title')}</Text>

          {/* Streak */}
          {(function() {
            var streak = 0;
            for (var dd2 = 0; dd2 < 30; dd2++) {
              var ds = new Date(); ds.setHours(0,0,0,0); ds.setDate(ds.getDate() - dd2);
              if (feeds.some(function(f){return f.ts >= ds.getTime() && f.ts < ds.getTime() + 86400000;})) streak++;
              else break;
            }
            return streak >= 2 ? (
              <View style={{flexDirection:'row',gap:10,marginBottom:14}}>
                <View style={{flex:1,backgroundColor:'rgba(154,140,240,0.1)',borderRadius:14,padding:14,alignItems:'center'}}>
                  <Text style={{color:'#c4b5fd',fontWeight:'900',fontSize:22}}>{streak+t('c.day')}</Text>
                  <Text style={{color:'rgba(200,215,255,0.45)',fontSize:15}}>{t('feed.analysis.streak')}</Text>
                </View>
                <View style={{flex:1,backgroundColor:'rgba(240,168,201,0.1)',borderRadius:14,padding:14,alignItems:'center'}}>
                  <Text style={{color:'#f0a8c9',fontWeight:'900',fontSize:22}}>{thisWeek+t('c.count')}</Text>
                  <Text style={{color:'rgba(200,215,255,0.45)',fontSize:15}}>{t('feed.analysis.weekCount')}</Text>
                </View>
              </View>
            ) : null;
          })()}


          <View style={{height:1,backgroundColor:'rgba(154,140,240,0.15)',marginVertical:10}}/>
          {/* Interval */}
          {avgIntervalWeek > 0 && <View style={{marginBottom:0,paddingVertical:14}}>
            <Text style={{color:'rgba(200,215,255,0.7)',fontWeight:'800',fontSize:17,marginBottom:16,textAlign:'center'}}>{t('feed.analysis.interval')}</Text>
            <View style={{flexDirection:'row',alignItems:'baseline',gap:6}}>
              <Text style={{color:'#fff',fontWeight:'900',fontSize:22}}>{Math.floor(avgIntervalWeek/60)+t('c.hour')+' '+avgIntervalWeek%60+t('c.min')}</Text>
              <Text style={{color:'rgba(200,215,255,0.4)',fontSize:15}}>{t('feed.analysis.average')}</Text>
            </View>
            {/* Fix R (v54j): 간격 트렌드는 횟수 트렌드와 일관할 때만 표시.
                간격↑+횟수↓ = 성숙, 간격↓+횟수↑ = 급성장기. 그 외 (밤중 수유 감소 artifact 등)는 숨김. */}
            {avgFirst > 0 && avgLast > 0 && avgLast !== avgFirst &&
             ((avgLast > avgFirst && countLast < countFirst) ||
              (avgLast < avgFirst && countLast > countFirst)) &&
             <Text style={{color:avgLast>avgFirst?'#34d399':'#f0cd8a',fontSize:15,fontWeight:'700',marginTop:4}}>{avgLast > avgFirst ? t('feed.analysis.intervalUp',{min:Math.round(avgLast-avgFirst)}) : t('feed.analysis.intervalDown',{min:Math.round(avgFirst-avgLast)})}</Text>}
          </View>}


          <View style={{height:1,backgroundColor:'rgba(154,140,240,0.15)',marginVertical:10}}/>
          {/* 7-day chart */}
          <View style={{marginBottom:14}}>
            <Text style={{color:'rgba(200,215,255,0.7)',fontWeight:'800',fontSize:17,marginBottom:16,textAlign:'center'}}>{t('feed.analysis.weekChart')}</Text>
            <View style={{flexDirection:'row',gap:4,alignItems:'flex-end',height:70,marginBottom:4}}>
              {days7.map(function(dd,i) {
                var maxC = Math.max.apply(null,days7.map(function(x){return x.totalCount;}).concat([1]));
                var bfH = dd.bfCount/maxC*55;
                var boH = dd.bottleCount/maxC*55;
                var ebmH = dd.ebmCount/maxC*55;
                var pmH = dd.pumpCount/maxC*55;
                return (
                  <View key={i} style={{flex:1,alignItems:'center',height:'100%'}}>
                    <View style={{width:'80%',flex:1,justifyContent:'flex-end'}}>
                      {dd.pumpCount>0 && <View style={{height:Math.max(2,pmH),backgroundColor:'#8ad4f0',borderTopLeftRadius:4,borderTopRightRadius:4}}/>}
                      {dd.ebmCount>0 && <View style={{height:Math.max(2,ebmH),backgroundColor:'#a8e0a8',borderTopLeftRadius:dd.pumpCount===0?4:0,borderTopRightRadius:dd.pumpCount===0?4:0}}/>}
                      {dd.bottleCount>0 && <View style={{height:Math.max(2,boH),backgroundColor:'#f0cd8a',borderTopLeftRadius:dd.pumpCount===0&&dd.ebmCount===0?4:0,borderTopRightRadius:dd.pumpCount===0&&dd.ebmCount===0?4:0}}/>}
                      {dd.bfCount>0 && <View style={{height:Math.max(2,bfH),backgroundColor:'#f0a8c9',borderTopLeftRadius:dd.pumpCount===0&&dd.ebmCount===0&&dd.bottleCount===0?4:0,borderTopRightRadius:dd.pumpCount===0&&dd.ebmCount===0&&dd.bottleCount===0?4:0,borderBottomLeftRadius:4,borderBottomRightRadius:4}}/>}
                      {dd.totalCount===0 && <View style={{height:3,backgroundColor:'rgba(255,255,255,0.06)',borderRadius:2}}/>}
                    </View>
                    {dd.totalCount>0 && <Text style={{color:'rgba(200,215,255,0.45)',fontSize:11,marginTop:2}}>{dd.totalCount}</Text>}
                    <Text style={{color:'rgba(200,215,255,0.4)',fontSize:11,fontWeight:'400'}}>{dd.dayLabel}</Text>
                  </View>
                );
              })}
            </View>
            <View style={{flexDirection:'row',gap:10,justifyContent:'center',flexWrap:'wrap'}}>
              <View style={{flexDirection:'row',alignItems:'center',gap:4}}><View style={{width:8,height:8,borderRadius:4,backgroundColor:'#f0a8c9'}}/><Text style={{color:'rgba(200,215,255,0.4)',fontSize:13}}>{t('feed.analysis.legendBreast')}</Text></View>
              <View style={{flexDirection:'row',alignItems:'center',gap:4}}><View style={{width:8,height:8,borderRadius:4,backgroundColor:'#f0cd8a'}}/><Text style={{color:'rgba(200,215,255,0.4)',fontSize:13}}>{t('feed.bottle')}</Text></View>
              <View style={{flexDirection:'row',alignItems:'center',gap:4}}><View style={{width:8,height:8,borderRadius:4,backgroundColor:'#a8e0a8'}}/><Text style={{color:'rgba(200,215,255,0.4)',fontSize:13}}>{t('feed.ebm')}</Text></View>
              <View style={{flexDirection:'row',alignItems:'center',gap:4}}><View style={{width:8,height:8,borderRadius:4,backgroundColor:'#8ad4f0'}}/><Text style={{color:'rgba(200,215,255,0.4)',fontSize:13}}>{t('feed.pump')}</Text></View>
            </View>
          </View>


          <View style={{height:1,backgroundColor:'rgba(154,140,240,0.15)',marginVertical:10}}/>
          {/* Breast chart */}
          {days7.some(function(dd){return dd.bfCount>0;}) && <View style={{marginBottom:14}}>
            <Text style={{color:'rgba(200,215,255,0.7)',fontWeight:'800',fontSize:17,marginBottom:16,textAlign:'center'}}>{t('feed.analysis.breastTitle')}</Text>
            <View style={{flexDirection:'row',gap:4,alignItems:'flex-end',height:60,marginBottom:4}}>
              {days7.map(function(dd,i) {
                var maxBf = Math.max.apply(null,days7.map(function(x){return x.bfCount;}).concat([1]));
                return (
                  <View key={i} style={{flex:1,alignItems:'center'}}>
                    <View style={{width:'80%',height:Math.max(3,dd.bfCount/maxBf*45),backgroundColor:'#f0a8c9',borderRadius:4}}/>
                    {dd.bfCount>0 && <Text style={{color:'rgba(200,215,255,0.45)',fontSize:11,marginTop:2}}>{dd.bfCount+t('c.count')+(dd.bfMin>0?' '+dd.bfMin+t('c.min'):'')}</Text>}
                    <Text style={{color:'rgba(200,215,255,0.4)',fontSize:11,fontWeight:'400'}}>{dd.dayLabel}</Text>
                  </View>
                );
              })}
            </View>
          </View>}


          <View style={{height:1,backgroundColor:'rgba(154,140,240,0.15)',marginVertical:10}}/>
          {/* Night feeds */}
          {days7.some(function(dd){return dd.nightCount>0;}) && <View style={{marginBottom:14}}>
            <Text style={{color:'rgba(200,215,255,0.7)',fontWeight:'800',fontSize:17,marginBottom:16,textAlign:'center'}}>{t('feed.analysis.nightTitle')}</Text>
            <View style={{flexDirection:'row',gap:4,alignItems:'flex-end',height:50,marginBottom:4}}>
              {days7.map(function(dd,i) {
                var maxN = Math.max.apply(null,days7.map(function(x){return x.nightCount;}).concat([1]));
                return (
                  <View key={i} style={{flex:1,alignItems:'center'}}>
                    <View style={{width:'80%',height:Math.max(3,dd.nightCount/maxN*35),backgroundColor:'#9a8cf0',borderRadius:4}}/>
                    {dd.nightCount>0 && <Text style={{color:'rgba(200,215,255,0.45)',fontSize:11,marginTop:2}}>{dd.nightCount+t('c.count')}</Text>}
                    <Text style={{color:'rgba(200,215,255,0.4)',fontSize:11,fontWeight:'400'}}>{dd.dayLabel}</Text>
                  </View>
                );
              })}
            </View>
            {last3Night < first3Night && <Text style={{color:'#34d399',fontSize:15,fontWeight:'700'}}>{t('feed.analysis.nightDown')}</Text>}
            {last3Night === 0 && first3Night > 0 && <Text style={{color:'#34d399',fontSize:15,fontWeight:'700'}}>{t('feed.analysis.nightGrad')}</Text>}
          </View>}


          <View style={{height:1,backgroundColor:'rgba(154,140,240,0.15)',marginVertical:10}}/>
          {/* Pump output */}
          {days7.some(function(dd){return dd.pumpMl>0;}) && <View style={{marginTop:14}}>
            <Text style={{color:'rgba(200,215,255,0.7)',fontWeight:'800',fontSize:17,marginBottom:8,textAlign:'center'}}>{t('feed.analysis.pumpTitle')}</Text>
            <View style={{flexDirection:'row',gap:4,alignItems:'flex-end',height:55,marginBottom:4}}>
              {days7.map(function(dd,i) {
                var maxP = Math.max.apply(null,days7.map(function(x){return x.pumpMl;}).concat([1]));
                return (
                  <View key={i} style={{flex:1,alignItems:'center'}}>
                    <View style={{width:'80%',height:Math.max(3,dd.pumpMl/maxP*40),backgroundColor:'#8ad4f0',borderRadius:4}}/>
                    {dd.pumpMl>0 && <Text style={{color:'rgba(200,215,255,0.45)',fontSize:11,marginTop:2}}>{dd.pumpMl+'ml'}</Text>}
                    <Text style={{color:'rgba(200,215,255,0.4)',fontSize:11,fontWeight:'400'}}>{dd.dayLabel}</Text>
                  </View>
                );
              })}
            </View>
          </View>}
        </View>}

        <View style={{height:100}}/>
      </ScrollView>
    </TouchableWithoutFeedback>
  );
}

var s = StyleSheet.create({
  card:{backgroundColor:'rgba(255,255,255,0.05)',borderRadius:20,padding:22,marginBottom:20,borderWidth:1,borderColor:'rgba(255,255,255,0.06)',shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.12,shadowRadius:6},
  lastFeed:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',backgroundColor:'rgba(255,255,255,0.05)',borderRadius:20,padding:16,marginBottom:20,borderWidth:1,borderColor:'rgba(255,255,255,0.06)'},
  subTab:{flex:1,padding:8,borderRadius:10,borderWidth:1.5,borderColor:'rgba(255,255,255,0.06)',alignItems:'center'},
  mlInput:{backgroundColor:'rgba(255,255,255,0.07)',borderWidth:1.5,borderColor:'rgba(255,255,255,0.13)',borderRadius:14,padding:14,color:'#fff',fontSize:15,fontWeight:'700'},
  saveBtn:{padding:12,paddingHorizontal:20,borderRadius:14,backgroundColor:'#f0cd8a',alignItems:'center'},
});
