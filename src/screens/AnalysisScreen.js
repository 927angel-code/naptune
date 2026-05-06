import React from 'react';
import { View, Text, StyleSheet, ScrollView, Share } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import { useLang } from '../context/LangContext';
import { gD, pp } from '../utils/helpers';
import { gP, isNightSleep } from '../utils/sleep';

// Fix CC (v54r): ErrorBoundary catches any AnalysisScreen crash.
// Shows friendly fallback UI + logs error so we can find the cause.
class AnalysisErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMsg: '', errorStack: '' };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, errorMsg: String(error && error.message || error), errorStack: String(error && error.stack || '') };
  }
  componentDidCatch(error, info) {
    console.warn('AnalysisScreen crash:', error, info);
  }
  render() {
    if (this.state.hasError) {
      var lang = this.props.lang || 'ko';
      return (
        <ScrollView style={{flex:1, backgroundColor:'#0a0a0a'}} contentContainerStyle={{padding:22}}>
          <View style={{backgroundColor:'rgba(248,113,113,0.08)',borderWidth:1,borderColor:'rgba(248,113,113,0.3)',borderRadius:20,padding:22,marginTop:60}}>
            <Text style={{color:'#fca5a5',fontSize:22,fontWeight:'900',marginBottom:14,textAlign:'center'}}>{lang==='ko'?'⚠️ 화면을 불러올 수 없어요':'⚠️ Could not load this screen'}</Text>
            <Text style={{color:'rgba(200,215,255,0.7)',fontSize:15,lineHeight:25,textAlign:'center',marginBottom:18}}>{lang==='ko'?'분석 화면에서 오류가 발생했어요. 다른 탭은 정상 작동해요.\n\n홈/기록/수면교육 탭으로 이동해주세요.':'An error occurred on the analysis screen. Other tabs work normally.\n\nPlease use Home / Log / Training tabs.'}</Text>
            <View style={{backgroundColor:'rgba(0,0,0,0.3)',borderRadius:14,padding:14}}>
              <Text style={{color:'rgba(248,113,113,0.7)',fontSize:13,fontWeight:'700',marginBottom:6}}>{lang==='ko'?'오류 정보 (개발자용)':'Error info (for dev)'}</Text>
              <Text style={{color:'rgba(200,215,255,0.5)',fontSize:13,lineHeight:20}} selectable={true}>{this.state.errorMsg}</Text>
            </View>
          </View>
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

function AnalysisScreenInner() {
  var ctx = useLang();
  var t = ctx.t;
  var lang = ctx.lang;
  var appCtx = useApp();
  var name = appCtx.name, bday = appCtx.bday, sl = appCtx.sl, feeds = appCtx.feeds;
  var tOn = appCtx.tOn, tDy = appCtx.tDy;

  var days = bday ? gD(bday) : 0;
  var prof = days ? gP(days) : null;
  if (!prof) return <View style={s.center}><Text style={s.dim}>{t('app.noBday')}</Text></View>;

  var n = name || t('c.baby');
  // ═══ Name particle params (Korean only) ═══
  var np = lang === 'ko' ? {
    ns: pp(n,'이의','의'), ne: pp(n,'이에게','에게'), ng: pp(n,'이가','가'),
    nd: pp(n,'이도','도'), nr: pp(n,'이를','를'), nw: pp(n,'이와','와'),
    nonly: pp(n,'이만의','만의'), n: n
  } : { ns:n, ne:n, ng:n, nd:n, nr:n, nw:n, nonly:n, n:n, name:n };

  var now = Date.now();
  var today = new Date(); today.setHours(0,0,0,0);

  // ═══ Weekly report ═══
  var days7 = [];
  for (var d2=0;d2<7;d2++) {
    var ds = new Date(now-d2*86400000); ds.setHours(0,0,0,0);
    var dts = ds.getTime();
    var dayNaps = sl.filter(function(l){return l.end && l.start>=dts && l.start<dts+86400000 && !l.micro && !isNightSleep(l);});
    var nightS = sl.filter(function(l){if(!l.end)return false;var h=new Date(l.start).getHours();var dur2=(l.end-l.start)/60000;return(h>=18||h<6)&&dur2>180&&l.end>=dts&&l.end<dts+14*3600000;}).sort(function(a,b){return b.end-a.end;})[0];
    var easyN = dayNaps.filter(function(l){return l.ease==='easy'||l.ease==='under5'||l.ease==='5to15';}).length;
    var hardN = dayNaps.filter(function(l){return l.ease==='hard'||l.ease==='over30';}).length;
    var dayNames = t('c.days').split(',');
    days7.push({d:d2,naps:dayNaps.length,easy:easyN,hard:hardN,nightDur:nightS?Math.floor((nightS.end-nightS.start)/60000):0,nightWakes:nightS&&nightS.nightWakes!=null?nightS.nightWakes:null,dayLabel:dayNames[ds.getDay()]});
  }
  // Exclude today (d2=0) from stats/trends — it's still in progress and skews averages.
  // Chart rendering uses full days7 so today still shows, but all averages/trends use completed days only.
  var daysWithData = days7.filter(function(x){return (x.naps>0||x.nightDur>0) && x.d > 0;});
  var totalEasy = daysWithData.reduce(function(a,x){return a+x.easy;},0);
  var totalHard = daysWithData.reduce(function(a,x){return a+x.hard;},0);
  var totalNaps2 = daysWithData.reduce(function(a,x){return a+x.naps;},0);
  var easyPct = totalNaps2>0?Math.round(totalEasy/totalNaps2*100):0;
  var first3 = daysWithData.slice(Math.floor(daysWithData.length/2));
  var last3 = daysWithData.slice(0,Math.floor(daysWithData.length/2));
  var easyTrend = 0;
  if (first3.length>0&&last3.length>0) { var e1=first3.reduce(function(a,x){return a+x.easy;},0)/first3.length; var e2=last3.reduce(function(a,x){return a+x.easy;},0)/last3.length; easyTrend=e2-e1; }
  var enc = t('feed.analysis.enc');
  var encourage = easyTrend>0?enc.up:easyPct>=50?enc.good:totalNaps2<10?enc.building:enc.adjust;

  // ═══ Emotional weekly comment (19 scenarios) ═══
  var weekAgo = new Date(now-7*86400000);
  var weekSleep = sl.filter(function(l){return l.end&&l.start>=weekAgo.getTime();});
  var nightSleeps = weekSleep.filter(function(l){return isNightSleep(l);});
  var avgNight = nightSleeps.length>0?Math.round(nightSleeps.reduce(function(s2,l){return s2+(l.end-l.start);},0)/nightSleeps.length/60000):0;
  var easyCount = weekSleep.filter(function(l){return l.ease==='easy'||l.ease==='under5'||l.ease==='5to15';}).length;
  var hardCount = weekSleep.filter(function(l){return l.ease==='hard'||l.ease==='over30';}).length;
  var weekFeeds = feeds.filter(function(f){return f.ts>=weekAgo.getTime();});
  var dailyFeeds = Math.round(weekFeeds.length/7*10)/10;
  var prevWeekStart = new Date(weekAgo.getTime()-7*86400000);
  var prevWeek = sl.filter(function(l){return l.end&&l.start>=prevWeekStart.getTime()&&l.start<weekAgo.getTime();});
  var prevNights = prevWeek.filter(function(l){return isNightSleep(l);});
  var prevAvgNight = prevNights.length>0?Math.round(prevNights.reduce(function(s2,l){return s2+(l.end-l.start);},0)/prevNights.length/60000):0;
  var prevEasy = prevWeek.filter(function(l){return l.ease==='easy'||l.ease==='under5'||l.ease==='5to15';}).length;
  var prevHard = prevWeek.filter(function(l){return l.ease==='hard'||l.ease==='over30';}).length;
  var nightDiff = avgNight-prevAvgNight;
  var prevFeeds = feeds.filter(function(f){return f.ts>=prevWeekStart.getTime()&&f.ts<weekAgo.getTime();});
  var prevDailyFeeds = prevFeeds.length>0?Math.round(prevFeeds.length/7*10)/10:0;

  var comments = [];
  var reportEmoji = '📊';
  var cm = t('analysis.comments');

  if (nightDiff>15&&prevAvgNight>0) { comments.push(t('analysis.comments.nightUp',Object.assign({},np,{diff:nightDiff}))); reportEmoji='🌟'; }
  if (nightDiff<-15&&prevAvgNight>0) comments.push(cm.nightDown);
  if (easyCount>=4&&easyCount>hardCount) { comments.push(t('analysis.comments.easyMany',Object.assign({},np,{count:easyCount}))); reportEmoji='🌟'; }
  if (easyCount>prevEasy&&prevEasy>0&&easyCount>hardCount) comments.push(t('analysis.comments.easyUp',np));
  if (hardCount>=4&&hardCount>easyCount) { comments.push(cm.hardMany); reportEmoji='🫂'; }
  if (hardCount>prevHard&&prevHard>0&&hardCount>easyCount) { comments.push(cm.hardUp); reportEmoji='🫂'; }
  if (tOn) { var td=tDy||1; if(td<=3) comments.push(t('analysis.comments.trainEarly',Object.assign({},np,{day:td}))); else if(td<=7) comments.push(t('analysis.comments.trainLater',Object.assign({},np,{day:td}))); }

  var bfThisWeek = weekFeeds.filter(function(f){return f.type==='모유';}).length;
  var ffThisWeek = weekFeeds.filter(function(f){return f.type==='분유';}).length;
  var bfPrevWeek = prevFeeds.filter(function(f){return f.type==='모유';}).length;
  if (bfPrevWeek>0&&bfThisWeek===0&&ffThisWeek>0) comments.push(t('analysis.comments.weaning',np));
  if (prevDailyFeeds>0&&dailyFeeds<prevDailyFeeds-1.5) comments.push(t('analysis.comments.feedDown',np));
  if (prevDailyFeeds>0&&dailyFeeds>prevDailyFeeds+2) comments.push(t('analysis.comments.feedUp',np));
  var nightFeeds2 = weekFeeds.filter(function(f){var h=new Date(f.ts).getHours();return h>=20||h<6;}).length;
  var prevNightFeeds = prevFeeds.filter(function(f){var h=new Date(f.ts).getHours();return h>=20||h<6;}).length;
  if (prevNightFeeds>0&&nightFeeds2===0) { comments.push(t('analysis.comments.nightFeedGone',np)); reportEmoji='🌟'; }
  // Fix S (v54j): 지난 주 데이터가 충분할 때만 (≥3회) 증가 판정. 신규 사용자가 지난 주 기록 거의 없을 때 tautology로 뜨는 것 방지.
  if (prevNightFeeds>=3&&nightFeeds2>prevNightFeeds+2) comments.push(cm.nightFeedUp);
  if (weekSleep.length<=4&&weekSleep.length>=3) { comments.push(t('analysis.comments.fewRecords',np)); reportEmoji='🤍'; }
  if (weekSleep.length>=10) comments.push(t('analysis.comments.manyRecords',Object.assign({},np,{count:weekSleep.length})));
  if (prevWeek.length<3) { comments.push(t('analysis.comments.newUser',np)); reportEmoji='✨'; }
  if (comments.length===0) { comments.push(t('analysis.comments.default',np)); reportEmoji='💜'; }
  var comment = comments.join('\n\n');
  var wkWithWakes = daysWithData.filter(function(x){return x.nightWakes!==null;});
  var avgWakes = wkWithWakes.length>0?Math.round(wkWithWakes.reduce(function(a,x){return a+x.nightWakes;},0)/wkWithWakes.length*10)/10:null;

  // ═══ Heatmap slot labels ═══
  var slotLabels = [t('analysis.morning'),t('analysis.midday'),t('analysis.afternoon')];
  var slotKeys = ['morning','midday','afternoon'];

  return (
    <ScrollView showsVerticalScrollIndicator={false}>

      {/* ═══ Before vs After Card ═══ */}
      {(function() {
        try {
        if (sl.length < 10) return null;
        var sorted = sl.filter(function(l){return l.end;}).sort(function(a,b){return a.start-b.start;});
        if (sorted.length < 5) return null;
        var firstDay = new Date(sorted[0].start); firstDay.setHours(0,0,0,0);
        var now2 = new Date(); now2.setHours(0,0,0,0);
        var daysSinceFirst = Math.floor((now2 - firstDay) / 86400000);
        if (daysSinceFirst < 14) return null;

        var dayNames = t('c.days').split(',');
        var HOUR_H = 6;
        var TOTAL_H = 24 * HOUR_H;

        var buildWeek = function(startDate) {
          var cols = [];
          for (var d2 = 0; d2 < 7; d2++) {
            var ds = new Date(startDate.getTime() + d2 * 86400000);
            var de = ds.getTime() + 86400000;
            var dSleeps = sl.filter(function(l){return l.end && ((l.start >= ds.getTime() && l.start < de) || (l.end > ds.getTime() && l.end <= de) || (l.start < ds.getTime() && l.end > de));});
            cols.push({dayStart: ds.getTime(), sleeps: dSleeps, label: dayNames[ds.getDay()]});
          }
          var nights = sl.filter(function(l){return l.end && isNightSleep(l) && l.start >= startDate.getTime() && l.start < startDate.getTime()+7*86400000;});
          var avgNightMin = nights.length > 0 ? Math.round(nights.reduce(function(a,l){return a+(l.end-l.start);},0)/nights.length/60000) : 0;
          var wakes = nights.filter(function(l){return l.nightWakes != null;});
          var avgWakes = wakes.length > 0 ? Math.round(wakes.reduce(function(a,l){return a+l.nightWakes;},0)/wakes.length*10)/10 : null;
          return {cols: cols, avgNightMin: avgNightMin, avgWakes: avgWakes};
        };

        var week1 = buildWeek(firstDay);
        var week2Start = new Date(now2.getTime() - 6*86400000);
        var week2 = buildWeek(week2Start);

        // Guard: week1 and week2 must not overlap
        var week1EndMs = firstDay.getTime() + 7*86400000;
        if (week1EndMs > week2Start.getTime()) return null;

        // Guard: only show card when there's a real improvement
        // (night sleep +15 min OR night wakes decreased)
        var nightImproved = week1.avgNightMin > 0 && week2.avgNightMin > 0 && (week2.avgNightMin - week1.avgNightMin) >= 15;
        var wakesImproved = week1.avgWakes !== null && week2.avgWakes !== null && week2.avgWakes < week1.avgWakes;
        if (!nightImproved && !wakesImproved) return null;

        var renderMini = function(week) {
          return React.createElement(View, {style:{flexDirection:'row',flex:1}},
            week.cols.map(function(col, ci) {
              return React.createElement(View, {key:ci, style:{flex:1,marginHorizontal:0.5}},
                React.createElement(View, {style:{height:TOTAL_H,backgroundColor:'rgba(255,255,255,0.06)',borderRadius:3,overflow:'hidden',position:'relative'}},
                  col.sleeps.map(function(slp, si) {
                    var sMs = Math.max(slp.start, col.dayStart);
                    var eMs = Math.min(slp.end, col.dayStart + 86400000);
                    var sMin = (sMs - col.dayStart) / 60000;
                    var eMin = (eMs - col.dayStart) / 60000;
                    var top2 = sMin / 60 * HOUR_H;
                    var h2 = Math.max(1.5, (eMin - sMin) / 60 * HOUR_H);
                    var isNight2 = new Date(slp.start).getHours() >= 18 || new Date(slp.start).getHours() < 6;
                    return React.createElement(View, {key:'s'+si, style:{position:'absolute',top:top2,left:0,right:0,height:h2,backgroundColor:'rgba(154,140,240,0.7)',borderRadius:1}});
                  })
                )
              );
            })
          );
        };

        var nightDiff = week2.avgNightMin - week1.avgNightMin;
        var fHM = function(min) { var h=Math.floor(min/60); var m=min%60; return h>0?h+(lang==='ko'?'시간 ':'h ')+m+(lang==='ko'?'분':'m'):m+(lang==='ko'?'분':'m'); };
        var w1Label = (firstDay.getMonth()+1)+'/'+ firstDay.getDate();
        var w2Label = (week2Start.getMonth()+1)+'/'+week2Start.getDate();

        return React.createElement(LinearGradient, {
          colors: ['#1a0533', '#0c1445', '#0a1628'],
          start: {x:0,y:0}, end: {x:1,y:1},
          style: {borderRadius:20,padding:22,marginBottom:20,borderWidth:1,borderColor:'rgba(154,140,240,0.3)'}
        },
          React.createElement(Text, {style:{color:'rgba(200,215,255,0.4)',fontSize:13,fontWeight:'700',textAlign:'center',letterSpacing:2,marginBottom:12}}, '🌙 NAPTUNE'),
          React.createElement(Text, {style:{color:'#fff',fontSize:19,fontWeight:'900',textAlign:'center',marginBottom:16,lineHeight:28}}, lang==='ko'?'수면이 바뀌었어요 ✨':'Sleep transformed ✨'),
          React.createElement(View, {style:{flexDirection:'row',gap:12,marginBottom:12}},
            React.createElement(View, {style:{flex:1}},
              React.createElement(Text, {style:{color:'rgba(200,215,255,0.5)',fontSize:13,fontWeight:'700',textAlign:'center',marginBottom:6}}, (lang==='ko'?'처음':'Before')+' ('+w1Label+')'),
              renderMini(week1)
            ),
            React.createElement(View, {style:{width:1,backgroundColor:'rgba(255,255,255,0.1)'}}),
            React.createElement(View, {style:{flex:1}},
              React.createElement(Text, {style:{color:'#9a8cf0',fontSize:13,fontWeight:'700',textAlign:'center',marginBottom:6}}, (lang==='ko'?'지금':'Now')+' ('+w2Label+')'),
              renderMini(week2)
            )
          ),
          React.createElement(View, {style:{flexDirection:'row',gap:12,marginTop:8}},
            React.createElement(View, {style:{flex:1,backgroundColor:'rgba(255,255,255,0.04)',borderRadius:12,padding:10,alignItems:'center'}},
              React.createElement(Text, {style:{color:'rgba(200,215,255,0.4)',fontSize:13}}, lang==='ko'?'밤잠 평균':'Avg night'),
              React.createElement(Text, {style:{color:'#c4b5fd',fontSize:15,fontWeight:'900',marginTop:2}}, week1.avgNightMin>0?fHM(week1.avgNightMin):'—')
            ),
            React.createElement(View, {style:{flex:1,backgroundColor:'rgba(154,140,240,0.1)',borderRadius:12,padding:10,alignItems:'center',borderWidth:1,borderColor:'rgba(154,140,240,0.2)'}},
              React.createElement(Text, {style:{color:'rgba(200,215,255,0.4)',fontSize:13}}, lang==='ko'?'밤잠 평균':'Avg night'),
              React.createElement(Text, {style:{color:'#9a8cf0',fontSize:15,fontWeight:'900',marginTop:2}}, week2.avgNightMin>0?fHM(week2.avgNightMin):'—'),
              nightDiff>0 ? React.createElement(Text, {style:{color:'#34d399',fontSize:13,fontWeight:'800',marginTop:2}}, '+'+Math.round(nightDiff)+(lang==='ko'?'분':'m')+' ↑') : null
            )
          ),
          week1.avgWakes !== null || week2.avgWakes !== null ? React.createElement(View, {style:{flexDirection:'row',gap:12,marginTop:6}},
            React.createElement(View, {style:{flex:1,backgroundColor:'rgba(255,255,255,0.04)',borderRadius:12,padding:10,alignItems:'center'}},
              React.createElement(Text, {style:{color:'rgba(200,215,255,0.4)',fontSize:13}}, lang==='ko'?'밤중 기상':'Night wakes'),
              React.createElement(Text, {style:{color:'#f0cd8a',fontSize:15,fontWeight:'900',marginTop:2}}, week1.avgWakes!==null?week1.avgWakes+(lang==='ko'?'회':'x'):'—')
            ),
            React.createElement(View, {style:{flex:1,backgroundColor:'rgba(154,140,240,0.1)',borderRadius:12,padding:10,alignItems:'center',borderWidth:1,borderColor:'rgba(154,140,240,0.2)'}},
              React.createElement(Text, {style:{color:'rgba(200,215,255,0.4)',fontSize:13}}, lang==='ko'?'밤중 기상':'Night wakes'),
              React.createElement(Text, {style:{color:week2.avgWakes===0?'#34d399':'#f0cd8a',fontSize:15,fontWeight:'900',marginTop:2}}, week2.avgWakes!==null?week2.avgWakes+(lang==='ko'?'회':'x'):'—')
            )
          ) : null,
          React.createElement(Text, {style:{color:'rgba(200,215,255,0.25)',fontSize:11,textAlign:'center',marginTop:14,letterSpacing:1}}, '#Naptune')
        );
        } catch (err) {
          console.warn('Before/After card error:', err);
          return null;
        }
      })()}

      {(function() {
        var tips = t('analysis.expertTips');
        if (!Array.isArray(tips) || tips.length === 0) return null;
        var dayIdx = Math.floor(Date.now() / 86400000) % tips.length;
        return (
          <View style={{backgroundColor:'rgba(154,140,240,0.06)',borderWidth:1,borderColor:'rgba(154,140,240,0.15)',borderRadius:20,padding:22,marginBottom:20}}>
            <Text style={{color:'#c4b5fd',fontWeight:'800',fontSize:15,marginBottom:8}}>{lang==='ko'?'\uD83D\uDCA1 \uC624\uB298\uC758 \uC218\uBA74 \uD301':'\uD83D\uDCA1 Today\'s sleep tip'}</Text>
            <Text style={{color:'rgba(200,215,255,0.7)',fontSize:15,lineHeight:26}}>{tips[dayIdx]}</Text>
          </View>
        );
      })()}

      {/* ═══ Weekly report ═══ */}
      {daysWithData.length>=2 && <View style={s.card}>
        <Text style={s.sectionTitle}>{t('analysis.weekReport')+' ('+daysWithData.length+t('c.day')+')'}</Text>
        <View style={{flexDirection:'row',gap:3,alignItems:'flex-end',height:60,marginBottom:8}}>
          {days7.slice().reverse().map(function(x,i){return(
            <View key={i} style={{flex:1,alignItems:'center',gap:2}}>
              <View style={{width:'100%',height:50,justifyContent:'flex-end'}}>
                {x.easy>0 && <View style={{width:'100%',height:x.easy*12,backgroundColor:'rgba(95,189,120,0.85)',borderTopLeftRadius:3,borderTopRightRadius:3}}/>}
                {(x.naps-x.easy-x.hard)>0 && <View style={{width:'100%',height:(x.naps-x.easy-x.hard)*12,backgroundColor:'rgba(232,201,96,0.85)'}}/>}
                {x.hard>0 && <View style={{width:'100%',height:x.hard*12,backgroundColor:'rgba(232,120,114,0.85)',borderBottomLeftRadius:3,borderBottomRightRadius:3}}/>}
                {x.naps===0 && <View style={{width:'100%',height:4,backgroundColor:'rgba(255,255,255,0.08)',borderRadius:2}}/>}
              </View>
              <Text style={{color:'rgba(200,215,255,0.45)',fontSize:15}}>{x.dayLabel}</Text>
            </View>
          );})}
        </View>

        <View style={{flexDirection:'row',gap:6,marginBottom:8}}>
          <View style={[s.statBox,{backgroundColor:'rgba(52,211,153,0.06)'}]}>
            <Text style={[s.statValue,{color:'#34d399'}]}>{easyPct+'%'}</Text>
            <Text style={s.statLabel}>{t('analysis.easyPct')}</Text>
          </View>
          <View style={s.statBox}>
            <Text style={[s.statValue,{color:'#c4b5fd'}]}>{totalNaps2}</Text>
            <Text style={s.statLabel}>{t('analysis.totalRecords')}</Text>
          </View>
          {avgWakes!==null && <View style={s.statBox}>
            <Text style={[s.statValue,{color:avgWakes<=1?'#34d399':'#f0cd8a'}]}>{avgWakes}</Text>
            <Text style={s.statLabel}>{t('analysis.avgWakes')}</Text>
          </View>}
        </View>

        <Text style={{color:'rgba(200,215,255,0.6)',fontSize:15,lineHeight:25}}>{encourage}</Text>

        {comment && <View style={{backgroundColor:'rgba(255,255,255,0.03)',borderRadius:14,padding:14,marginTop:10}}>
          <Text style={{color:'rgba(200,215,255,0.65)',fontSize:19,fontWeight:'900',marginBottom:8,textAlign:'center'}}>{reportEmoji+' '+t('analysis.weekComment')}</Text>
          <Text style={{color:'rgba(200,215,255,0.6)',fontSize:15,lineHeight:25}}>{comment}</Text>
        </View>}
      </View>}

      {/* ═══ Heatmap ═══ */}
      {<View style={s.card}>
        <Text style={s.sectionTitle}>{t('analysis.heatmap')}</Text>
        <Text style={{color:'rgba(200,215,255,0.4)',fontSize:15,marginBottom:10,lineHeight:24}}>{t('analysis.heatmapDesc')}</Text>
        {(function() {
          var grid = {};
          sl.filter(function(l){return l.end&&!l.micro&&l.ease;}).forEach(function(l) {
            var dd=new Date(l.start);var dow=dd.getDay();var h=dd.getHours();
            var slot=h<10?'morning':h<14?'midday':'afternoon';
            var k=dow+'-'+slot;
            if(!grid[k])grid[k]={easy:0,hard:0,total:0};
            grid[k].total++;
            if(l.ease==='easy'||l.ease==='under5'||l.ease==='5to15')grid[k].easy++;
            if(l.ease==='hard'||l.ease==='over30')grid[k].hard++;
          });
          var dayNames = t('c.days').split(',');
          return (
            <View>
              <View style={{flexDirection:'row',gap:4,marginBottom:4}}>
                <View style={{width:28}}/>
                {slotLabels.map(function(sl2){return <View key={sl2} style={{flex:1,alignItems:'center'}}><Text style={{color:'rgba(200,215,255,0.4)',fontSize:15}}>{sl2}</Text></View>;})}
              </View>
              {dayNames.map(function(dn,di){return(
                <View key={di} style={{flexDirection:'row',gap:4,marginBottom:4}}>
                  <View style={{width:28,justifyContent:'center'}}><Text style={{color:'rgba(200,215,255,0.4)',fontSize:15}}>{dn}</Text></View>
                  {slotKeys.map(function(sk) {
                    var d3=grid[di+'-'+sk];
                    var ratio=d3&&d3.total>0?d3.easy/d3.total:-1;
                    var bg=ratio<0?'rgba(255,255,255,0.03)':ratio>=0.6?'rgba(95,189,120,0.5)':ratio>=0.3?'rgba(232,201,96,0.5)':'rgba(232,120,114,0.5)';
                    return <View key={sk} style={{flex:1,height:32,borderRadius:8,backgroundColor:bg,alignItems:'center',justifyContent:'center'}}>
                      {d3&&d3.total>0 && <Text style={{color:'#fff',fontSize:15,fontWeight:'700'}}>{d3.easy+'/'+d3.total}</Text>}
                    </View>;
                  })}
                </View>
              );})}
              <View style={{flexDirection:'row',gap:8,justifyContent:'center',marginTop:8}}>
                <View style={{flexDirection:'row',alignItems:'center',gap:4}}><View style={{width:12,height:12,borderRadius:4,backgroundColor:'rgba(95,189,120,0.5)'}}/><Text style={{color:'rgba(200,215,255,0.4)',fontSize:15}}>{t('analysis.easyLegend')}</Text></View>
                <View style={{flexDirection:'row',alignItems:'center',gap:4}}><View style={{width:12,height:12,borderRadius:4,backgroundColor:'rgba(232,201,96,0.5)'}}/><Text style={{color:'rgba(200,215,255,0.4)',fontSize:15}}>{t('analysis.mixedLegend')}</Text></View>
                <View style={{flexDirection:'row',alignItems:'center',gap:4}}><View style={{width:12,height:12,borderRadius:4,backgroundColor:'rgba(232,120,114,0.5)'}}/><Text style={{color:'rgba(200,215,255,0.4)',fontSize:15}}>{t('analysis.toughLegend')}</Text></View>
              </View>
            </View>
          );
        })()}
      </View>}

      {/* ═══ Night trend ═══ */}
      {(function() {
        var nightData = [];
        var dayNames = t('c.days').split(',');
        for (var i3=6;i3>=0;i3--) {
          var ds2=new Date(now-i3*86400000);
          var dk=ds2.toDateString();
          // Fix AA (v54v): 같은 날 여러 밤잠 있을 때 가장 긴 것 선택 (정상 케이스에선 1개라 무영향, edge case 보호)
          var ns2=sl.filter(function(l){return l.end&&new Date(l.start).toDateString()===dk;}).filter(function(l){var hh=new Date(l.start).getHours();return(hh>=18||hh<6)&&l.end-l.start>120*60000;}).sort(function(a,b){return (b.end-b.start)-(a.end-a.start);});
          var dur2=ns2.length>0?Math.round((ns2[0].end-ns2[0].start)/60000):0;
          var wk=ns2.length>0&&ns2[0].nightWakes!=null?ns2[0].nightWakes:null;
          nightData.push({day:dayNames[ds2.getDay()],dur:dur2,wakes:wk});
        }
        var maxDur=Math.max.apply(null,nightData.map(function(dd){return dd.dur;}).concat([1]));
        var hasData=nightData.some(function(dd){return dd.dur>0;});
        if(!hasData)return null;
        return (
          <View style={s.card}>
            <Text style={[s.sectionTitle,{marginBottom:10}]}>{t('analysis.nightTrend')}</Text>
            <View style={{flexDirection:'row',gap:4,alignItems:'flex-end',height:80,marginBottom:6}}>
              {nightData.map(function(dd,i4){return(
                <View key={'b'+i4} style={{flex:1,alignItems:'center',justifyContent:'flex-end'}}>
                  {dd.dur>0 && <View style={{width:'80%',height:Math.max(8,Math.round(dd.dur/maxDur*75)),backgroundColor:dd.dur>=540?'#34d399':dd.dur>=420?'#60a5fa':'#f0cd8a',borderRadius:6}}/>}
                  {dd.dur===0 && <View style={{width:'80%',height:4,backgroundColor:'rgba(255,255,255,0.08)',borderRadius:2}}/>}
                </View>
              );})}
            </View>
            <View style={{flexDirection:'row',gap:4,marginBottom:10}}>
              {nightData.map(function(dd,i4){return(
                <View key={'l'+i4} style={{flex:1,alignItems:'center'}}>
                  {dd.dur>0 && <Text style={{color:'rgba(200,215,255,0.6)',fontSize:15,fontWeight:'700'}}>{Math.round(dd.dur/60)+'h'}</Text>}
                  <Text style={{color:'rgba(200,215,255,0.4)',fontSize:15}}>{dd.day}</Text>
                  {dd.wakes!==null ? <Text style={{color:dd.wakes<=1?'#34d399':'#f0cd8a',fontSize:13,fontWeight:'700',marginTop:1}}>{dd.wakes+t('c.count')}</Text> : dd.dur>0 ? <Text style={{color:'rgba(200,215,255,0.2)',fontSize:13,marginTop:1}}>{'–'}</Text> : null}
                </View>
              );})}
            </View>
            {(function() {
              var valid=nightData.filter(function(dd){return dd.dur>0;});
              if(valid.length<2)return null;
              var avg2=Math.round(valid.reduce(function(a,dd){return a+dd.dur;},0)/valid.length);
              // Fix U (v54m): growing/shrinking/stable 트렌드 제거. 5일 표본으로 10분 차이 판정은 노이즈. 숫자 변수 누락으로 "분씩 늘고 있어요" 깨진 문장 표시 버그도 함께 해결.
              return <View style={{backgroundColor:'rgba(255,255,255,0.04)',borderRadius:14,padding:12}}>
                <Text style={{color:'rgba(200,215,255,0.6)',fontSize:15,lineHeight:25}}>{t('analysis.avgNight')+' '+Math.round(avg2/60)+t('c.hour')+' '+avg2%60+t('c.min')}</Text>
              </View>;
            })()}
          </View>
        );
      })()}

      <View style={{height:20}}/>
    </ScrollView>
  );
}

// Fix CC (v54r): default export wraps inner component in ErrorBoundary
export default function AnalysisScreen() {
  var ctx = useLang();
  return (
    <AnalysisErrorBoundary lang={ctx.lang}>
      <AnalysisScreenInner />
    </AnalysisErrorBoundary>
  );
}

var s = StyleSheet.create({
  center:{flex:1,alignItems:'center',justifyContent:'center'},
  dim:{color:'rgba(200,215,255,0.5)',fontSize:15,lineHeight:24},
  card:{backgroundColor:'rgba(255,255,255,0.05)',borderRadius:20,padding:22,marginBottom:20,borderWidth:1,borderColor:'rgba(255,255,255,0.06)',shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.12,shadowRadius:6},
  sectionTitle:{color:'#e0d4ff',fontSize:19,fontWeight:'900',marginBottom:12,lineHeight:28,textAlign:'center'},
  statBox:{flex:1,backgroundColor:'rgba(255,255,255,0.04)',borderRadius:14,padding:10,alignItems:'center'},
  statLabel:{color:'rgba(200,215,255,0.45)',fontSize:15,lineHeight:24},
  statValue:{fontWeight:'900',fontSize:19,marginTop:2,lineHeight:28},
});

