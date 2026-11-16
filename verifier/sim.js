const H=require('./harness.js').load(process.argv[2]||'index.html');const mk=()=>H();
const wrap=a=>((a+Math.PI*3)%(Math.PI*2))-Math.PI;
function trial(aa,{hold=10,maxTurn=3,lift=0,seed=1,checkpoints=false,tmax=300}={}){
  const G=mk(); const {P,ramps,fin,pos,vel,SLOPE,local,ridgeAt,rightOf}=G; P.airaccel=aa; G.spawnOn(0);
  let rnd=seed; const rand=()=>(rnd=(rnd*16807)%2147483647)/2147483647;
  let t=0, plan={s:0}, falls=0, vmax=0, speedSum=0, n=0;
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
    if(lifted){G.setStrafe(0);}
    else if(plan.on){  let dx=-wrap(plan.yd-G.g().yaw)/P.sens; dx=Math.max(-cap,Math.min(cap,dx)); G.cmd.turn-=dx*P.sens; if(Math.abs(dx)>0.5) G.setStrafe(Math.sign(dx)); }
    else if(plan.on===false && plan.s!==0){  const s=plan.s, stf=G.g().touchStrafe; let dx=-wrap(plan.yd-G.g().yaw)/P.sens; dx=Math.max(-cap,Math.min(cap,dx)); if(stf!==s) dx=s; else if(Math.sign(dx)!==s) dx=0; G.cmd.turn-=dx*P.sens; if(Math.abs(dx)>0.5) G.setStrafe(Math.sign(dx)); }
    else {  } // hold, no swipe
    G.step(); t+=P.dt; const sp=Math.hypot(vel.x,vel.z); vmax=Math.max(vmax,sp); speedSum+=sp; n++;
  }
  return {res:G.g().state==='done'?'done':'fail', t:+t.toFixed(1), falls, lt:G.g().lastTouched, of:ramps.length, vmax:vmax|0, vavg:(speedSum/n)|0};
}
const G0=mk(); let len=0; for(const r of G0.ramps) len+=r.L; console.log('turns(deg):',G0.ramps.filter(r=>r.k).map(r=>Math.round(Math.abs(r.k*r.L)*57.3)).join(',')); console.log('ramps',G0.ramps.length,'checkpoints',G0.checkpoints.length,'ramp length',len|0);
for(const aa of [150,400,800]){
  const row=[]; for(const h of [1,10,20,30]){const r=trial(aa,{hold:h}); row.push(`${h*10}ms:${r.res}@${r.t}s(lt ${r.lt}/${r.of})`);}
  let clean=0, finished=0, fsum=0; for(let i=1;i<=30;i++){const r=trial(aa,{hold:10,lift:0.15,seed:i,checkpoints:true}); if(r.res==='done'){finished++; fsum+=r.falls; if(!r.falls) clean++;}}
  console.log('aa',aa,row.join(' '),`| noisy w/ checkpoints: finished ${finished}/30, clean ${clean}/30, avg falls ${(fsum/Math.max(1,finished)).toFixed(1)}`);
}
console.log('perfect-ish run:',JSON.stringify(trial(400,{hold:10})));
