(function(root){
  'use strict';
  const TOTAL=98945,START=20*60+17,DURATION=343;
  // Approximate checkpoints supplied by the user. Middle shares below are a
  // two-candidate scenario shift, not reconstructed official counting records.
  const anchors=[
    {minute:0,countPct:0,demPct:null,source:'20:17 개표 시작'},
    {minute:13,countPct:4,demPct:45.6,source:'20:30경 · 개표 4% · 박용찬 50.4% → 가상 54.4%'},
    {minute:103,countPct:35,demPct:50.7,source:'22:00경 · 개표 35% · 김민석 54.7% → 가상 50.7%'},
    {minute:273,countPct:87,demPct:45.6,source:'00:50경 · 개표 87% · 박용찬 50.4% → 가상 54.4%'},
    {minute:343,countPct:100,demPct:46.2,source:'02:00경 · 개표 완료 · 김민석 50.2% → 가상 46.2%'}
  ].map(a=>{const counted=Math.round(TOTAL*a.countPct/100),dem=Math.round(counted*(a.demPct||0)/100);return {...a,counted,dem,ppp:counted-dem}});
  const batches=[{...anchors[0],anchor:true}];
  for(let i=1;i<anchors.length;i++){
    const a=anchors[i-1],b=anchors[i],steps=Math.max(1,Math.round((b.minute-a.minute)/15));
    for(let j=1;j<=steps;j++){
      const u=j/steps,t=u*u*(3-2*u),minute=Math.round(a.minute+(b.minute-a.minute)*u);
      const counted=Math.round(a.counted+(b.counted-a.counted)*t),dem=Math.round(a.dem+(b.dem-a.dem)*t);
      batches.push({minute,counted,dem,ppp:counted-dem,anchor:j===steps,source:j===steps?b.source:'누적표 보간 추정'});
    }
  }
  function clock(minute){const t=START+Math.floor(minute);return String(Math.floor(t/60)%24).padStart(2,'0')+':'+String(t%60).padStart(2,'0')}
  function at(minute){
    minute=Math.max(0,Math.min(DURATION,Math.floor(minute)));
    let index=0;for(let i=1;i<batches.length&&batches[i].minute<=minute;i++)index=i;
    const b=batches[index],remaining=TOTAL-b.counted,lead=b.dem===b.ppp?'tie':b.dem>b.ppp?'dem':'ppp';
    return {...b,minute,batchMinute:b.minute,index,next:batches[index+1]?.minute??null,remaining,
      countPct:b.counted/TOTAL*100,demPct:b.counted?b.dem/b.counted*100:null,pppPct:b.counted?b.ppp/b.counted*100:null,
      lead,margin:Math.abs(b.dem-b.ppp),called:lead!=='tie'&&Math.abs(b.dem-b.ppp)>remaining,complete:b.counted===TOTAL};
  }
  root.CountModel=Object.freeze({TOTAL,START,DURATION,anchors,batches,at,clock});
  if(typeof module!=='undefined')module.exports=root.CountModel;
})(typeof globalThis!=='undefined'?globalThis:this);
