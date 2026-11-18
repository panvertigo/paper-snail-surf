// COPY of verifier/bot.js with two extra options for map checks: noAir (no air strafing) and line (lateral riding line on the face, 0.5 = mid, small = near the ridge = high and slow).
// The simulated player used by sim.js and the golden-replay recorder. mk() returns a fresh sim (see harness.js).
module.exports=function(mk){
const wrap=a=>((a+Math.PI*3)%(Math.PI*2))-Math.PI;
function trial(aa,{hold=10,maxTurn=3,lift=0,seed=1,checkpoints=false,tmax=300,rec=null,onTick=null,init=null,noAir=false,line=0.5}={}){
  const G=mk(); const {P,ramps,fin,pos,vel,SLOPE,local,ridgeAt,rightOf}=G; P.airaccel=aa; G.spawnOn(0); if(init) init(G);
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
      if(G.inTube()){plan={on:null,s:0};} else if(cur>=0){
        const r=ramps[cur];const sd=Math.sign(Lc.v)||1,sv=Math.abs(Lc.v);
        plan={on:true, yd:Lc.h+sd*Math.max(-0.15,Math.min(0.15,0.6*(sv-line*r.W)/r.W))};
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
    else if(plan.on===false && noAir){G.setStrafe(0);}
    else if(plan.on===false && plan.s!==0){  const s=plan.s, stf=G.g().touchStrafe; let dx=-wrap(plan.yd-G.g().yaw)/P.sens; dx=Math.max(-cap,Math.min(cap,dx)); if(stf!==s) dx=s; else if(Math.sign(dx)!==s) dx=0; G.cmd.turn-=dx*P.sens; if(Math.abs(dx)>0.5) G.setStrafe(Math.sign(dx)); }
    else {  } // hold, no swipe
    if(onTick) onTick(G,t); if(rec) rec.push(G.cmd.turn,G.cmd.touch,G.cmd.key); G.step(); t+=P.dt; const sp=Math.hypot(vel.x,vel.z); vmax=Math.max(vmax,sp); speedSum+=sp; n++;
  }
  return {res:G.g().state==='done'?'done':'fail', t:+t.toFixed(1), falls, lt:G.g().lastTouched, of:ramps.length, vmax:vmax|0, vavg:(speedSum/n)|0};
}
return trial;};
