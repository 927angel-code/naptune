import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Modal, Alert } from 'react-native';
import { useApp } from '../context/AppContext';
import { useLang } from '../context/LangContext';
import { fD, fT, uid } from '../utils/helpers';
import { SV } from '../utils/storage';

export default function LogScreen() {
  var ctx = useLang();
  var t = ctx.t;
  var lang = ctx.lang;
  var appCtx = useApp();
  var sl = appCtx.sl, setSl = appCtx.setSl, feeds = appCtx.feeds, setFeeds = appCtx.setFeeds;
  var lW = appCtx.lW, setLW = appCtx.setLW, show = appCtx.show;
  var stA = useState(false); var shA = stA[0]; var setShA = stA[1];
  var stE = useState(null); var edL = stE[0]; var setEdL = stE[1];

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
    if (sd === '빠른기록') return '';
    return sd || '';
  };

  var all = sl.map(function(l,idx) { return {
    id: 's'+(l.id||l.start)+'_'+idx, ts: l.start,
    icon: l.micro ? '🚗' : '😴',
    type: l.micro ? (lang==='ko'?'쪽잠':'Catnap') : (lang==='ko'?'수면':'Sleep'),
    col: l.micro ? '#60a5fa' : '#9a8cf0',
    val: l.end ? fD(l.end - l.start) + (l.nightWakes != null ? ' · '+t('log.nightWakes',{n:l.nightWakes}) : '') : '',
    time: fT(l.start) + (l.end ? ' → ' + fT(l.end) : ''),
    date: new Date(l.start).toLocaleDateString(lang==='ko'?'ko-KR':'en-US',{month:'short',day:'numeric'}),
    ease: l.ease, raw: l, isSleep: true,
  };}).concat(feeds.map(function(f,idx2) {
    var icon = f.type==='\uBAA8\uC720'?'\uD83E\uDD31':f.type==='\uBD84\uC720'?'\uD83C\uDF7C':f.type==='\uC720\uCD95'?'\uD83E\uDD5B':f.type==='\uC720\uCD95\uC218\uC720'?'\uD83C\uDF7C':'\uD83C\uDF7C';
    var col = f.type==='\uBAA8\uC720'?'#f0a8c9':f.type==='\uBD84\uC720'?'#f0cd8a':f.type==='\uC720\uCD95'?'#8ad4f0':f.type==='\uC720\uCD95\uC218\uC720'?'#a8e0a8':'#f0cd8a';
    var val = f.type==='모유' ? ((sideLabel(f.side))+(f.dur&&f.dur>0?' '+fD(f.dur):'')).trim() : f.ml?f.ml+'ml':f.type==='유축'?((f.lml||0)+(f.rml||0))+'ml':'';
    return {id:'f'+f.ts+'_'+idx2, ts:f.ts, icon:icon, type:typeLabel(f.type), col:col, val:val, time:fT(f.ts), date:new Date(f.ts).toLocaleDateString(lang==='ko'?'ko-KR':'en-US',{month:'short',day:'numeric'}), raw:f, isSleep:false};
  })).sort(function(a,b){return b.ts - a.ts;});

  // Fix V (v54n): log tab에서도 삭제/수정 즉시 저장.
  var onFailSl = function() { show(lang === 'ko' ? '⚠️ 저장 실패' : '⚠️ Save failed', '#f87171'); };
  var onFailFd = function() { show(lang === 'ko' ? '⚠️ 저장 실패' : '⚠️ Save failed', '#f87171'); };
  var deleteSleep = function(raw) { setSl(function(p){var newSl=p.filter(function(l){return raw.id ? l.id !== raw.id : (l.start !== raw.start || l.end !== raw.end);}); SV('sl',newSl,onFailSl); return newSl;}); show(t('c.deleted'), '#f87171'); };
  var deleteFeed = function(raw) { setFeeds(function(p){var newFd=p.filter(function(f){return raw.id ? f.id !== raw.id : (f.ts !== raw.ts || f.type !== raw.type);}); SV('feeds',newFd,onFailFd); return newFd;}); show(t('c.deleted'), '#f87171'); };
  var openEdit = function(r) {
    var ed = Object.assign({}, r.raw);
    if (!r.isSleep) ed._feedType = r.raw.type==='모유'?'breast':r.raw.type==='분유'?'bottle':r.raw.type==='유축'?'pump':'ebm';
    ed.start = ed.start || ed.ts;
    ed.time = ed.ts;
    ed._isEdit = true;
    ed._isSleep = r.isSleep;
    setEdL(ed); setShA(true);
  };

  return (
    <View style={{flex:1}}>
      <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:8,paddingHorizontal:2}}>
        <Text style={{color:'rgba(200,215,255,0.65)',fontSize:19,fontWeight:'900',lineHeight:28}}>{t('log.title')}</Text>
        <TouchableOpacity onPress={function(){setEdL(null);setShA(true);}} style={{padding:7,paddingHorizontal:14,borderRadius:14,backgroundColor:'#9a8cf0'}}>
          <Text style={{color:'#fff',fontWeight:'800',fontSize:15}}>{t('log.add')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {all.length === 0 && <View style={[s.card,{alignItems:'center',padding:28}]}>
          <Text style={{color:'rgba(200,215,255,0.45)',fontSize:15}}>{t('log.noRecords')}</Text>
        </View>}

        {all.slice(0,60).map(function(r) { return (
          <View key={r.id} style={[s.card,{padding:10,paddingHorizontal:14,borderLeftWidth:3,borderLeftColor:r.col,flexDirection:'row',justifyContent:'space-between',alignItems:'center'}]}>
            <View style={{flexDirection:'row',alignItems:'center',gap:10,flex:1}}>
              <Text style={{fontSize:19}}>{r.icon}</Text>
              <View style={{flex:1}}>
                <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
                  <Text style={{color:r.col,fontSize:15,fontWeight:'800'}}>{r.type}</Text>
                  {r.val ? <Text style={{color:'#ffd54f',fontSize:15,fontWeight:'700'}}>{r.val}</Text> : null}
                  {r.ease && r.ease !== 'micro' && r.ease !== 'normal' ? <Text style={{fontSize:13,fontWeight:'700',color:{under5:'#a0a0a0','5to15':'#34d399','15to30':'#f0cd8a',over30:'#f87171',easy:'#34d399',medium:'#f0cd8a',hard:'#f87171'}[r.ease]||'rgba(200,215,255,0.4)'}}>{({under5:'<5m','5to15':'5-15m','15to30':'15-30m',over30:'30m+',easy:'😊',medium:'😐',hard:'😫'})[r.ease]||''}</Text> : null}
                </View>
                <Text style={{color:'rgba(200,215,255,0.45)',fontSize:15,marginTop:1,lineHeight:24}}>{r.time+' · '+r.date}</Text>
              </View>
            </View>
            <View style={{flexDirection:'row',gap:4}}>
              <TouchableOpacity onPress={function(){openEdit(r);}} style={s.actionBtn}><Text style={{fontSize:15}}>✏️</Text></TouchableOpacity>
              <TouchableOpacity onPress={function(){r.isSleep?deleteSleep(r.raw):deleteFeed(r.raw);}} style={s.actionBtn}><Text style={{color:'rgba(200,215,255,0.65)',fontSize:15}}>✕</Text></TouchableOpacity>
            </View>
          </View>
        );})}
        <View style={{height:20}}/>
      </ScrollView>

      <MAdd visible={shA} eL={edL} t={t} lang={lang} onSave={function(entry) {
        var isEdit = edL && edL._isEdit;
        // Fix V (v54n): log 저장/수정 즉시 persist
        var onFailLog = function() { show(lang === 'ko' ? '⚠️ 저장 실패' : '⚠️ Save failed', '#f87171'); };
        if (entry._feed) {
          if (isEdit && !edL._isSleep) {
            var origId = edL.id;
            var origTs = edL.ts || edL.time;
            var origType = edL.type;
            // Fix Z (v54u): timestamp 변경 시 배열 재정렬 (ts desc) — lastBabyFeed 등이 [0] 가정에 의존
            setFeeds(function(p){var newFd=p.map(function(f){return (origId ? f.id===origId : (f.ts===origTs && f.type===origType)) ? Object.assign({},f,entry) : f;}).sort(function(a,b){return b.ts-a.ts;}); SV('feeds',newFd,onFailLog); return newFd;});
          } else {
            // Fix Z (v54u): ADD 시에도 sort (sl ADD와 대칭). 과거 시각으로 backfill해도 [0]에 최신 보장
            setFeeds(function(p){var newFd=[Object.assign({id:uid()},entry)].concat(p).sort(function(a,b){return b.ts-a.ts;}).slice(0,300); SV('feeds',newFd,onFailLog); return newFd;});
          }
        } else if (isEdit && edL._isSleep) {
          var origSlId = edL.id;
          // Fix Z (v54u): sleep edit도 start 변경 시 재정렬
          setSl(function(p){var newSl=p.map(function(l){return (origSlId ? l.id===origSlId : (l.start===edL.start && l.end===edL.end)) ? Object.assign({},l,entry) : l;}).sort(function(a,b){return b.start-a.start;}); SV('sl',newSl,onFailLog); return newSl;});
        } else {
          setSl(function(p){var newSl=[Object.assign({id:uid()},entry)].concat(p).sort(function(a,b){return b.start-a.start;}); SV('sl',newSl,onFailLog); return newSl;});
        }
        // lW is now auto-recomputed by HomeScreen's useEffect on sl change
        show(lang === 'ko' ? '✅ 저장됨' : '✅ Saved', '#34d399');
        setShA(false); setEdL(null);
      }} onClose={function(){setShA(false);setEdL(null);}} />
    </View>
  );
}

function TimeRow(p) {
  var label = p.label, ts = p.ts, setter = p.setter, rowId = p.rowId, lang = p.lang, t = p.t;
  var stEI = useState(null); var editId = stEI[0]; var setEditId = stEI[1];
  var stEV = useState(''); var editVal = stEV[0]; var setEditVal = stEV[1];

  var setTime = function(h, m) { var dd = new Date(ts); dd.setHours(h, m, 0, 0); setter(dd.getTime()); };
  var toggleAP = function() { var dd = new Date(ts); dd.setHours(dd.getHours() >= 12 ? dd.getHours()-12 : dd.getHours()+12); setter(dd.getTime()); };

  var dd = new Date(ts);
  var h24 = dd.getHours(), h12 = h24 % 12 || 12, mi = dd.getMinutes(), isAM = h24 < 12;
  var dateStr = dd.toLocaleDateString(lang==='ko'?'ko-KR':'en-US',{month:'short',day:'numeric',weekday:'short'});
  return (
    <View style={{marginBottom:10}}>
      <Text style={{color:'rgba(200,215,255,0.65)',fontSize:15,fontWeight:'700',marginBottom:6}}>{label}</Text>
      <View style={{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,marginBottom:6}}>
        <TextInput style={{backgroundColor:'rgba(255,255,255,0.08)',borderWidth:1.5,borderColor:'rgba(255,255,255,0.15)',borderRadius:14,padding:10,color:'#fff',fontSize:22,fontWeight:'900',textAlign:'center',minWidth:50}} value={editId==='hr' ? editVal : String(h12)} keyboardType="number-pad" maxLength={2} selectTextOnFocus={true}
          onFocus={function(){setEditId('hr');setEditVal(String(h12));}}
          onChangeText={function(v){setEditVal(v);var n=parseInt(v,10);if(!isNaN(n)&&n>=1&&n<=12)setTime(isAM?n%12:n%12+12,mi);}}
          onBlur={function(){setEditId(null);setEditVal('');}}/>
        <Text style={{color:'#fff',fontWeight:'900',fontSize:22}}>:</Text>
        <TextInput style={{backgroundColor:'rgba(255,255,255,0.08)',borderWidth:1.5,borderColor:'rgba(255,255,255,0.15)',borderRadius:14,padding:10,color:'#fff',fontSize:22,fontWeight:'900',textAlign:'center',minWidth:50}} value={editId==='min' ? editVal : String(mi).padStart(2,'0')} keyboardType="number-pad" maxLength={2} selectTextOnFocus={true}
          onFocus={function(){setEditId('min');setEditVal(String(mi));}}
          onChangeText={function(v){setEditVal(v);var n=parseInt(v,10);if(!isNaN(n)&&n>=0&&n<=59)setTime(h24,n);}}
          onBlur={function(){setEditId(null);setEditVal('');}}/>
        <TouchableOpacity onPress={toggleAP} style={{padding:10,paddingHorizontal:8,borderRadius:10,borderWidth:1.5,borderColor:'rgba(255,255,255,0.15)',backgroundColor:isAM?'rgba(96,165,250,0.15)':'rgba(154,140,240,0.15)',minWidth:40,alignItems:'center'}}>
          <Text style={{color:isAM?'#93c5fd':'#c4b5fd',fontWeight:'900',fontSize:15}}>{isAM?(t?t('c.am'):'AM'):(t?t('c.pm'):'PM')}</Text>
        </TouchableOpacity>
      </View>
      <View style={{flexDirection:'row',gap:4,marginBottom:4}}>
        {[['-1h',-60],['-5m',-5],['+5m',5],['+1h',60]].map(function(pair){return(
          <TouchableOpacity key={pair[0]} onPress={function(){setter(function(v2){return v2+pair[1]*60000;});}} style={{flex:1,padding:6,borderRadius:10,borderWidth:1,borderColor:'rgba(255,255,255,0.08)',alignItems:'center'}}>
            <Text style={{color:'rgba(200,215,255,0.5)',fontWeight:'800',fontSize:15}}>{pair[0]}</Text>
          </TouchableOpacity>
        );})}
      </View>
      <View style={{flexDirection:'row',justifyContent:'center',gap:6}}>
        <TouchableOpacity onPress={function(){setter(function(v2){return v2-86400000;});}} style={{padding:4,paddingHorizontal:10,borderRadius:8,borderWidth:1,borderColor:'rgba(255,255,255,0.06)'}}>
          <Text style={{color:'rgba(200,215,255,0.5)',fontWeight:'700',fontSize:15}}>{t?t('log.prevDay'):'◀ Prev'}</Text>
        </TouchableOpacity>
        <Text style={{color:'rgba(200,215,255,0.45)',fontSize:15,lineHeight:24,alignSelf:'center'}}>{dateStr}</Text>
        <TouchableOpacity onPress={function(){setter(function(v2){return v2+86400000;});}} style={{padding:4,paddingHorizontal:10,borderRadius:8,borderWidth:1,borderColor:'rgba(255,255,255,0.06)'}}>
          <Text style={{color:'rgba(200,215,255,0.5)',fontWeight:'700',fontSize:15}}>{t?t('log.nextDay'):'Next ▶'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function MAdd(props) {
  var visible = props.visible, eL = props.eL, onSave = props.onSave, onClose = props.onClose;
  var t = props.t, lang = props.lang;

  var stT = useState(eL ? eL._feedType || 'sleep' : 'sleep'); var addType = stT[0]; var setAddType = stT[1];
  var stS = useState(eL ? eL.start || eL.time || Date.now()-3600000 : Date.now()-3600000); var startTs = stS[0]; var setStartTs = stS[1];
  var stE = useState(eL && eL.end ? eL.end : Date.now()); var endTs = stE[0]; var setEndTs = stE[1];
  var stEa = useState(eL && eL.ease || null); var ease = stEa[0]; var setEase = stEa[1];
  var stNW = useState(eL && eL.nightWakes != null ? String(eL.nightWakes) : ''); var addNW = stNW[0]; var setAddNW = stNW[1];
  var stSi = useState(null); var addSide = stSi[0]; var setAddSide = stSi[1];
  var stMl = useState(''); var addMl = stMl[0]; var setAddMl = stMl[1];
  var stDu = useState(''); var addDur = stDu[0]; var setAddDur = stDu[1];
  var stRm = useState(''); var addRml = stRm[0]; var setAddRml = stRm[1];
  var stPD = useState(''); var addPumpDur = stPD[0]; var setAddPumpDur = stPD[1];

  React.useEffect(function() {
    setAddType(eL ? eL._feedType || 'sleep' : 'sleep');
    setStartTs(eL ? eL.start || eL.time || Date.now()-3600000 : Date.now()-3600000);
    setEndTs(eL && eL.end ? eL.end : Date.now());
    setEase(eL && eL.ease || null);
    setAddMl(''); setAddDur(''); setAddRml(''); setAddPumpDur('');
    setAddNW(eL && eL.nightWakes != null ? String(eL.nightWakes) : '');
  }, [eL, visible]);


  var doSave = function() {
    if (addType === 'sleep') {
      if (endTs <= startTs) return;
      var durMin = Math.round((endTs - startTs) / 60000);
      var sH = new Date(startTs).getHours();
      var isDay = sH >= 6 && sH < 18;
      if (isDay && durMin > 240) {
        var hh = Math.floor(durMin / 60);
        var mm = durMin % 60;
        var durStr = hh + (lang === 'ko' ? '시간 ' : 'h ') + mm + (lang === 'ko' ? '분' : 'm');
        Alert.alert(
          lang === 'ko' ? '확인' : 'Confirm',
          lang === 'ko' ? '이 낮잠이 ' + durStr + '인데 맞나요? AM/PM을 확인해주세요.' : 'This nap is ' + durStr + '. Is that correct? Please check AM/PM.',
          [
            { text: lang === 'ko' ? '취소' : 'Cancel', style: 'cancel' },
            { text: lang === 'ko' ? '맞아요' : 'Yes', onPress: function() { onSave({start:startTs,end:endTs,ease:ease||'normal',nightWakes:addNW!==''?+addNW:undefined}); } }
          ]
        );
        return;
      }
      onSave({start:startTs,end:endTs,ease:ease||'normal',nightWakes:addNW!==''?+addNW:undefined});
    }
    else if (addType === 'breast') { onSave({_feed:true,ts:startTs,type:'모유',side:addSide==='left'?'왼쪽':addSide==='right'?'오른쪽':addSide,dur:addDur?+addDur*60000:null}); }
    else if (addType === 'bottle') { onSave({_feed:true,ts:startTs,type:'분유',ml:+addMl||0}); }
    else if (addType === 'pump') { onSave({_feed:true,ts:startTs,type:'유축',dur:addPumpDur?+addPumpDur*60000:0,lml:+addMl||0,rml:+addRml||0}); }
    else if (addType === 'ebm') { onSave({_feed:true,ts:startTs,type:'유축수유',ml:+addMl||0}); }
  };

  if (!visible) return null;

  var types = [['sleep',t('log.types.sleep')],['breast',t('log.types.breast')],['bottle',t('log.types.bottle')],['pump',t('log.types.pump')],['ebm',t('log.types.ebm')]];

  return (
    <Modal visible={true} transparent animationType="fade">
      <View style={s.modalBg}>
        <ScrollView style={{maxHeight:'85%'}} contentContainerStyle={{flexGrow:0}} keyboardShouldPersistTaps="handled">
          <View style={s.modalCard}>
            <Text style={{color:'#e0d4ff',fontWeight:'900',fontSize:19,marginBottom:12,lineHeight:28}}>{eL ? t('log.editTitle') : t('log.addTitle')}</Text>

            <View style={{flexDirection:'row',flexWrap:'wrap',gap:4,marginBottom:12}}>
              {types.map(function(tp){return(
                <TouchableOpacity key={tp[0]} onPress={function(){setAddType(tp[0]);}} style={[s.typeBtn,addType===tp[0]&&s.typeBtnActive]}>
                  <Text style={[s.typeBtnText,addType===tp[0]&&s.typeBtnTextActive]}>{tp[1]}</Text>
                </TouchableOpacity>
              );})}
            </View>

            {addType === 'sleep' && (<View>
              <TimeRow label={t('log.sleepTime')} ts={startTs} setter={setStartTs} rowId='sleep' lang={lang} t={t}/>
              <TimeRow label={t('log.wakeTime')} ts={endTs} setter={setEndTs} rowId='wake' lang={lang} t={t}/>
              <Text style={{color:'rgba(200,215,255,0.65)',fontSize:15,fontWeight:'700',marginBottom:6}}>{t('log.easeLabel')}</Text>
              <View style={{flexDirection:'row',gap:6,marginBottom:10,flexWrap:'wrap'}}>
                {[['under5',t('home.ease.under5'),'#a0a0a0'],['5to15',t('home.ease.5to15'),'#34d399'],['15to30',t('home.ease.15to30'),'#f0cd8a'],['over30',t('home.ease.over30'),'#f87171']].map(function(ea){return(
                  <TouchableOpacity key={ea[0]} onPress={function(){setEase(ea[0]);}} style={{flex:1,minWidth:'22%',padding:10,borderRadius:12,borderWidth:1.5,borderColor:ease===ea[0]?ea[2]+'60':'rgba(255,255,255,0.08)',backgroundColor:ease===ea[0]?ea[2]+'15':'transparent',alignItems:'center'}}>
                    <Text style={{color:ease===ea[0]?ea[2]:'rgba(200,215,255,0.5)',fontSize:14,fontWeight:'800'}}>{ea[1]}</Text>
                  </TouchableOpacity>
                );})}
              </View>
              <Text style={{color:'rgba(200,215,255,0.65)',fontSize:15,fontWeight:'700',marginBottom:6}}>{lang==='ko'?'밤중 깬 횟수':'Night wakes'}</Text>
              <View style={{flexDirection:'row',gap:6,marginBottom:10}}>
                {[0,1,2,3,4,5].map(function(n){return(
                  <TouchableOpacity key={n} onPress={function(){setAddNW(String(n));}} style={{flex:1,padding:10,borderRadius:12,borderWidth:1.5,borderColor:addNW===String(n)?'#9a8cf060':'rgba(255,255,255,0.08)',backgroundColor:addNW===String(n)?'#9a8cf015':'transparent',alignItems:'center'}}>
                    <Text style={{color:addNW===String(n)?'#c4b5fd':'rgba(200,215,255,0.5)',fontSize:15,fontWeight:'800'}}>{n===5?'5+':String(n)}</Text>
                  </TouchableOpacity>
                );})}
              </View>
            </View>)}

            {addType === 'breast' && (<View>
              <TimeRow label={t('log.feedTime')} ts={startTs} setter={setStartTs} rowId='feed' lang={lang} t={t}/>
              <Text style={{color:'rgba(200,215,255,0.65)',fontSize:15,fontWeight:'700',marginBottom:6}}>{t('log.feedDurLabel')}</Text>
              <TextInput style={s.mlInput} value={addDur} onChangeText={setAddDur} placeholder={t('log.dur')} placeholderTextColor="rgba(200,215,255,0.25)" keyboardType="number-pad" selectTextOnFocus={true}/>
              <View style={{flexDirection:'row',gap:8,marginBottom:10}}>
                {['왼쪽','오른쪽'].map(function(side){var sl2=side==='왼쪽'?t('feed.leftSide'):t('feed.rightSide');return(
                  <TouchableOpacity key={side} onPress={function(){setAddSide(addSide===side?null:side);}} style={{flex:1,padding:12,borderRadius:12,borderWidth:1.5,borderColor:addSide===side?'#f0a8c960':'rgba(255,255,255,0.1)',backgroundColor:addSide===side?'#f0a8c915':'transparent',alignItems:'center'}}>
                    <Text style={{color:addSide===side?'#fbcfe8':'rgba(200,215,255,0.4)',fontWeight:'800',fontSize:15}}>{sl2}</Text>
                  </TouchableOpacity>
                );})}
              </View>
            </View>)}

            {addType==='bottle' && (<View>
              <TimeRow label={t('log.feedTime')} ts={startTs} setter={setStartTs} rowId='feed' lang={lang} t={t}/>
              <TextInput style={s.mlInput} value={addMl} onChangeText={setAddMl} placeholder={t('log.ml')} placeholderTextColor="rgba(200,215,255,0.25)" keyboardType="number-pad" selectTextOnFocus={true}/>
            </View>)}

            {addType==='pump' && (<View>
              <TimeRow label={t('log.pumpTime')} ts={startTs} setter={setStartTs} rowId='pump' lang={lang} t={t}/>
              <TextInput style={s.mlInput} value={addPumpDur} onChangeText={setAddPumpDur} placeholder={t('log.pumpDur')} placeholderTextColor="rgba(200,215,255,0.25)" keyboardType="number-pad" selectTextOnFocus={true}/>
              <Text style={{color:'rgba(200,215,255,0.65)',fontSize:15,fontWeight:'700',marginBottom:6}}>{t('log.pumpAmtLabel')}</Text>
              <View style={{flexDirection:'row',gap:8,marginBottom:8}}>
                <TextInput style={[s.mlInput,{flex:1}]} value={addMl} onChangeText={setAddMl} placeholder={t('log.leftMl')} placeholderTextColor="rgba(200,215,255,0.25)" keyboardType="number-pad" selectTextOnFocus={true}/>
                <TextInput style={[s.mlInput,{flex:1}]} value={addRml} onChangeText={setAddRml} placeholder={t('log.rightMl')} placeholderTextColor="rgba(200,215,255,0.25)" keyboardType="number-pad" selectTextOnFocus={true}/>
              </View>
            </View>)}

            {addType==='ebm' && (<View>
              <TimeRow label={t('log.feedTime')} ts={startTs} setter={setStartTs} rowId='feed' lang={lang} t={t}/>
              <TextInput style={s.mlInput} value={addMl} onChangeText={setAddMl} placeholder={t('log.ml')} placeholderTextColor="rgba(200,215,255,0.25)" keyboardType="number-pad" selectTextOnFocus={true}/>
            </View>)}

            <View style={{flexDirection:'row',gap:8,marginTop:8}}>
              <TouchableOpacity onPress={onClose} style={{flex:1,padding:12,borderRadius:14,borderWidth:1.5,borderColor:'rgba(255,255,255,0.1)',alignItems:'center'}}>
                <Text style={{color:'rgba(200,215,255,0.5)',fontWeight:'800',fontSize:15}}>{t('c.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={doSave} style={{flex:2,padding:12,borderRadius:14,backgroundColor:'#9a8cf0',alignItems:'center'}}>
                <Text style={{color:'#fff',fontWeight:'900',fontSize:17}}>{t('c.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

var s = StyleSheet.create({
  card:{backgroundColor:'rgba(255,255,255,0.05)',borderRadius:20,padding:22,marginBottom:10,borderWidth:1,borderColor:'rgba(255,255,255,0.06)'},
  actionBtn:{backgroundColor:'rgba(255,255,255,0.06)',borderWidth:1,borderColor:'rgba(255,255,255,0.1)',borderRadius:8,width:36,height:36,alignItems:'center',justifyContent:'center'},
  modalBg:{flex:1,backgroundColor:'rgba(0,0,0,0.75)',alignItems:'center',justifyContent:'center',padding:16},
  modalCard:{backgroundColor:'#1a1040',borderWidth:1.5,borderColor:'rgba(255,255,255,0.15)',borderRadius:20,padding:22,width:'100%',maxWidth:360},
  typeBtn:{padding:8,borderRadius:10,borderWidth:1,borderColor:'rgba(255,255,255,0.06)'},
  typeBtnActive:{borderColor:'#9a8cf060',backgroundColor:'#9a8cf015'},
  typeBtnText:{color:'rgba(200,215,255,0.4)',fontSize:15,fontWeight:'700'},
  typeBtnTextActive:{color:'#d4bbff'},
  timeInput:{width:62,textAlign:'center',backgroundColor:'rgba(255,255,255,0.08)',borderWidth:1.5,borderColor:'rgba(255,255,255,0.15)',borderRadius:14,padding:14,color:'#fff',fontSize:22,fontWeight:'900'},
  timeAdj:{flex:1,padding:12,borderRadius:10,borderWidth:1,borderColor:'rgba(255,255,255,0.12)',backgroundColor:'rgba(255,255,255,0.06)',alignItems:'center'},
  dayAdj:{padding:4,paddingHorizontal:10,borderRadius:8,borderWidth:1,borderColor:'rgba(255,255,255,0.1)'},
  dayAdjText:{color:'rgba(200,215,255,0.5)',fontWeight:'800',fontSize:15},
  mlInput:{backgroundColor:'rgba(255,255,255,0.07)',borderWidth:1.5,borderColor:'rgba(255,255,255,0.13)',borderRadius:14,padding:14,color:'#fff',fontSize:15,fontWeight:'700',marginBottom:8},
});

