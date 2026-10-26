(()=>{
  'use strict';
  const M=CountModel,$=id=>document.getElementById(id),fmt=n=>n.toLocaleString('ko-KR');
  let minute=0,playing=false,speed=1,lastTick=0,accumulator=0,previousIndex=-1;
  let graphics=null,app=null,fallback=null,resizePending=false;
  const host=$('trend');
  function setText(id,text){const el=$(id);if(el.textContent!==text)el.textContent=text}
  function stop(message){playing=false;accumulator=0;$('play').textContent=minute===M.DURATION?'다시 재생 ↺':'재생 ▶';setText('clockStatus',message||(minute===M.DURATION?'개표 종료':'일시정지'))}
  function seek(value){stop();minute=Math.max(0,Math.min(M.DURATION,Math.floor(Number(value)||0)));render(true);setText('clockStatus',minute===M.DURATION?'개표 종료':'일시정지')}
  function render(force=false){
    const s=M.at(minute);setText('clock',M.clock(minute));setText('day',M.START+minute>=1440?'다음 날':'개표 당일');$('scrub').value=minute;
    $('next').disabled=s.next===null;
    if(!force&&previousIndex===s.index)return;
    const old=previousIndex>=0?M.at(M.batches[previousIndex].minute):null;previousIndex=s.index;
    $('progressFill').style.width=s.countPct+'%';$('countPct').innerHTML=s.countPct.toFixed(1)+'<small>%</small>';
    setText('counted',fmt(s.counted)+' / '+fmt(M.TOTAL)+'표');
    setText('lastBatch',s.counted?'최근 집계 '+M.clock(s.batchMinute)+' · '+(s.anchor?'관측점 기반':'중간 추정'):'첫 투표함을 기다립니다');
    setText('nextBatch',s.next!==null?'다음 집계 '+M.clock(s.next):'모든 투표함 집계 완료');
    for(const key of ['dem','ppp']){
      const percentage=s[key+'Pct'];setText(key+'Pct',percentage===null?'—':percentage.toFixed(1));setText(key+'Votes',fmt(s[key])+'표');
      const prior=M.batches[Math.max(0,s.index-1)][key];setText(key+'Change',s.index?'이번 집계 +'+fmt(s[key]-prior)+'표':'집계 대기');
      $(''+key+'Bar').style.transform='scaleX('+(percentage===null?0:percentage/100)+')';
      const leading=s.counted>0&&s.lead===key;$(key+'Card').classList.toggle('leading',leading);
      setText(key+'Rank',!s.counted?'집계 전':s.lead==='tie'?'동률':leading?(s.called?'당선 확정':'1위'):'2위');
    }
    const name=s.lead==='dem'?'김민석':'박용찬';
    const reversal=old&&old.counted>0&&old.lead!=='tie'&&s.lead!=='tie'&&old.lead!==s.lead&&!force;
    setText('newsTag',!s.counted?'개표 대기':s.complete?'개표 완료':s.called?'당선 확정':reversal?'순위 역전':s.margin/s.counted<.02?'초접전':'개표 속보');
    setText('news',!s.counted?'20:17, 영등포구을의 가상 개표를 시작합니다.':s.called?name+' 후보, 남은 표로 역전 불가'+(s.complete?' · 최종 결과':' · 가상 시나리오 기준'):s.lead==='tie'?'두 후보 득표수가 같습니다.':name+' 후보 '+fmt(s.margin)+'표 앞서 · '+(s.anchor?'관측점 기반 집계':'보간 추정 집계'));
    setText('gap',s.counted?Math.abs(s.demPct-s.pppPct).toFixed(1)+'%p 차':'—');
    host.setAttribute('aria-label','득표율 추이. '+M.clock(minute)+' 현재 '+(s.counted?'김민석 '+s.demPct.toFixed(1)+'%, 박용찬 '+s.pppPct.toFixed(1)+'%.':'집계 전.'));
    drawTrend(s);
  }
  function paths(s,width,height){
    const x=t=>8+t/M.DURATION*(width-16),y=p=>8+(60-p)/20*(height-16);
    return ['dem','ppp'].map(key=>{
      const points=[];let last=null;
      for(const b of M.batches){if(b.minute>s.batchMinute)break;if(!b.counted)continue;const value=b[key]/b.counted*100;
        if(last!==null)points.push([x(b.minute),y(last)]);points.push([x(b.minute),y(value)]);last=value;
      }
      return {color:key==='dem'?0x003b96:0xe61e2b,points};
    });
  }
  function drawTrend(s=M.at(minute)){
    const width=Math.max(120,host.clientWidth),height=Math.max(100,host.clientHeight),lines=paths(s,width,height);
    if(graphics&&app){
      graphics.clear();
      for(let i=0;i<=4;i++){const y=8+i*(height-16)/4;graphics.moveTo(8,y).lineTo(width-8,y).stroke({color:0x63758e,alpha:i===2?.6:.22,width:1})}
      for(const line of lines){
        if(!line.points.length)continue;
        const draw=()=>{line.points.forEach(([x,y],i)=>i?graphics.lineTo(x,y):graphics.moveTo(x,y))};
        if(line.color===0x003b96){draw();graphics.stroke({color:0xa6c6ff,alpha:.36,width:5})}
        draw();graphics.stroke({color:line.color,width:3});
        const end=line.points.at(-1);graphics.circle(end[0],end[1],4).fill(line.color);
      }
      app.renderer.render({container:app.stage});
    }else if(fallback){
      const ratio=Math.min(window.devicePixelRatio||1,1.5),ctx=fallback.getContext('2d');if(!ctx)return;
      fallback.width=Math.round(width*ratio);fallback.height=Math.round(height*ratio);ctx.scale(ratio,ratio);ctx.clearRect(0,0,width,height);
      for(let i=0;i<=4;i++){ctx.beginPath();ctx.moveTo(8,8+i*(height-16)/4);ctx.lineTo(width-8,8+i*(height-16)/4);ctx.strokeStyle=i===2?'#63758e99':'#63758e38';ctx.lineWidth=1;ctx.stroke()}
      for(const line of lines){if(!line.points.length)continue;ctx.beginPath();line.points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));if(line.color===0x003b96){ctx.strokeStyle='#a6c6ff66';ctx.lineWidth=5;ctx.stroke()}ctx.strokeStyle='#'+line.color.toString(16).padStart(6,'0');ctx.lineWidth=3;ctx.stroke();const end=line.points.at(-1);ctx.beginPath();ctx.arc(end[0],end[1],4,0,Math.PI*2);ctx.fillStyle=ctx.strokeStyle;ctx.fill()}
    }
  }
  async function initializeChart(){
    try{
      if(!window.PIXI)throw new Error('PixiJS unavailable');
      const candidate=new PIXI.Application();
      await candidate.init({width:Math.max(120,host.clientWidth),height:Math.max(100,host.clientHeight),backgroundAlpha:0,antialias:true,resolution:Math.min(window.devicePixelRatio||1,1.5),autoDensity:true,preference:'webgl',autoStart:false,sharedTicker:false});
      app=candidate;app.stop();graphics=new PIXI.Graphics();app.stage.addChild(graphics);host.replaceChildren(app.canvas);setText('rendererStatus','PixiJS · 집계 변경 시에만 그래프 갱신');
    }catch(error){
      app=null;graphics=null;fallback=document.createElement('canvas');host.replaceChildren(fallback);setText('rendererStatus','Canvas 2D 호환 모드 · 집계 변경 시에만 갱신');
    }
    drawTrend();
    if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>{if(resizePending)return;resizePending=true;requestAnimationFrame(()=>{resizePending=false;if(app)app.renderer.resize(Math.max(120,host.clientWidth),Math.max(100,host.clientHeight));drawTrend()})}).observe(host);
  }
  $('play').addEventListener('click',()=>{
    if(playing){stop();return}if(minute===M.DURATION){minute=0;previousIndex=-1;render(true)}
    playing=true;accumulator=0;lastTick=performance.now();$('play').textContent='일시정지 Ⅱ';setText('clockStatus','가상 생중계');
  });
  $('reset').addEventListener('click',()=>seek(0));$('next').addEventListener('click',()=>{const next=M.at(minute).next;if(next!==null)seek(next)});
  $('scrub').addEventListener('input',e=>seek(e.target.value));$('speed').addEventListener('change',e=>{speed=Number(e.target.value);accumulator=0;lastTick=performance.now()});
  document.querySelectorAll('[data-minute]').forEach(button=>button.addEventListener('click',()=>seek(button.dataset.minute)));
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing)stop('다른 탭으로 이동하여 일시정지')});
  window.addEventListener('pagehide',()=>stop());
  setInterval(()=>{
    if(!playing)return;const now=performance.now(),elapsed=now-lastTick;lastTick=now;
    // Avoid skipping a long stretch after a suspended mobile browser resumes.
    if(elapsed>3000){stop('기기 대기 후 일시정지');return}
    accumulator+=elapsed*speed;const steps=Math.floor(accumulator/1000);if(!steps)return;accumulator-=steps*1000;
    for(let i=0;i<steps&&minute<M.DURATION;i++){minute++;render()}
    if(minute===M.DURATION)stop('개표 종료');
  },100);
  render(true);initializeChart();
})();
