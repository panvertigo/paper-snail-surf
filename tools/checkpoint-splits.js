const fs=require('fs');const src=fs.readFileSync(process.argv[2]||'index.html','utf8');
const phys=src.slice(src.indexOf('// ==PHYSICS START=='),src.indexOf('// ==PHYSICS END=='));
class V{constructor(){this.x=this.y=this.z=0}set(a,b,c){this.x=a;this.y=b;this.z=c;return this}}
const mk=new Function('V',`
const pos=new V(),vel=new V();let contactN=null,contactTicks=0,fingerDown=false,lastTouched=0,nextCp=0,cpRamp=0,squash=0;
let yaw=0,touchStrafe=0,keyStrafe=0,state='run',falls=0;
function onCheckpoint(){} function finish(){state='done'} function fail(){falls++; state='fail'}
`+phys+`
return {P,ramps,checkpoints,fin,pos,vel,step,spawnOn,SLOPE,local,ridgeAt,rightOf,
 g:()=>({yaw,touchStrafe,state,contactN,lastTouched,cpRamp}), setYaw:v=>yaw=v, setStrafe:v=>touchStrafe=v, setFinger:v=>fingerDown=v, setState:v=>state=v};`);
const wrap=a=>((a+Math.PI*3)%(Math.PI*2))-Math.PI;
function trial(aa,{hold=10,maxTurn=3,lift=0,seed=1,checkpoints=false,tmax=300}={}){
  const G=mk(V); const {P,ramps,fin,pos,vel,SLOPE,local,ridgeAt,rightOf}=G; P.airaccel=aa; G.spawnOn(0);
  let rnd=seed; const rand=()=>(rnd=(rnd*16807)%2147483647)/2147483647;
  const seen=new Set(),marks=[];let t=0, plan={s:0}, falls=0, vmax=0, speedSum=0, n=0;
  while(t<tmax){
    const st=G.g();
    if(st.state==='done') break;
    if(st.state==='fail'){ if(!checkpoints) break; falls++; G.spawnOn(st.cpRamp); G.setState('run'); continue; }
    const tick=Math.round(t/P.dt);
    if(tick%hold===0){
      const lt=st.lastTouched;
      let cur=-1, Lc=null;
      for(let i=Math.max(0,lt-1);i<=Math.min(ramps.length-1,lt+2);i++){const r=ramps[i];const L=local(r,pos.x,pos.z); if(L.u>=0&&L.u<=r.L&&Math.abs(L.v)<r.W+40){cur=i;Lc={u:L.u,v:L.v,h:L.h};break;}}
      const yv=Math.atan2(-vel.x,-vel.z);
      if(cur>=0){
        const r=ramps[cur];const sd=Math.sign(Lc.v)||1,sv=Math.abs(Lc.v);
        plan={on:true, yd:Lc.h+sd*Math.max(-0.15,Math.min(0.15,0.6*(sv-0.5*r.W)/r.W))};
      } else {
        let tgt;
        const nr=ramps[lt+1];
        if(nr){ const v=(pos.x-nr.sx)*nr.r0[0]+(pos.z-nr.sz)*nr.r0[2]; const sd=Math.sign(v)||1; const c=ridgeAt(nr,200), rt=rightOf(nr.h0+nr.k*200); tgt=[c[0]+rt[0]*sd*0.5*nr.W, c[1]+rt[2]*sd*0.5*nr.W]; }
        else tgt=[fin.x+fin.dir[0]*1500,fin.z+fin.dir[2]*1500];
        const rx=Math.cos(yv), rz=-Math.sin(yv); const latE=(tgt[0]-pos.x)*rx+(tgt[1]-pos.z)*rz;
        plan={on:false, s:Math.abs(latE)<12?0:Math.sign(latE), yd:yv};
      }
    }
    const lifted=lift&&rand()<lift; const cap=maxTurn*P.dt/P.sens;
    if(lifted){G.setFinger(false);G.setStrafe(0);}
    else if(plan.on){ G.setFinger(true); let dx=-wrap(plan.yd-G.g().yaw)/P.sens; dx=Math.max(-cap,Math.min(cap,dx)); G.setYaw(G.g().yaw-dx*P.sens); if(Math.abs(dx)>0.5) G.setStrafe(Math.sign(dx)); }
    else if(plan.on===false && plan.s!==0){ G.setFinger(true); const s=plan.s, stf=G.g().touchStrafe; let dx=-wrap(plan.yd-G.g().yaw)/P.sens; dx=Math.max(-cap,Math.min(cap,dx)); if(stf!==s) dx=s; else if(Math.sign(dx)!==s) dx=0; G.setYaw(G.g().yaw-dx*P.sens); if(Math.abs(dx)>0.5) G.setStrafe(Math.sign(dx)); }
    else { G.setFinger(true); } // hold, no swipe
    G.step(); if(G.checkpoints.includes(G.g().lastTouched)&&!seen.has(G.g().lastTouched)){seen.add(G.g().lastTouched);marks.push(G.g().lastTouched+'@'+t.toFixed(1));} t+=P.dt; const sp=Math.hypot(vel.x,vel.z); vmax=Math.max(vmax,sp); speedSum+=sp; n++;
  }
  return {res:G.g().state==='done'?'done':'fail', t:+t.toFixed(1), falls, lt:G.g().lastTouched, of:ramps.length, vmax:vmax|0, vavg:(speedSum/n)|0,marks};
}
for(const h of [10,30]) console.log(h*10+'ms bot',JSON.stringify(trial(400,{hold:h})));