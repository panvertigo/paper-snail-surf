const H=require('./harness.js').load(process.argv[2]||'index.html');const mk=()=>H();
const trial=require('./bot.js')(mk);
const G0=mk(); let len=0; for(const r of G0.ramps) len+=r.L; console.log('turns(deg):',G0.ramps.filter(r=>r.k).map(r=>Math.round(Math.abs(r.k*r.L)*57.3)).join(',')); console.log('ramps',G0.ramps.length,'checkpoints',G0.checkpoints.length,'ramp length',len|0);
for(const aa of [150,400,800]){
  const row=[]; for(const h of [1,10,20,30]){const r=trial(aa,{hold:h}); row.push(`${h*10}ms:${r.res}@${r.t}s(lt ${r.lt}/${r.of})`);}
  let clean=0, finished=0, fsum=0; for(let i=1;i<=30;i++){const r=trial(aa,{hold:10,lift:0.15,seed:i,checkpoints:true}); if(r.res==='done'){finished++; fsum+=r.falls; if(!r.falls) clean++;}}
  console.log('aa',aa,row.join(' '),`| noisy w/ checkpoints: finished ${finished}/30, clean ${clean}/30, avg falls ${(fsum/Math.max(1,finished)).toFixed(1)}`);
}
console.log('perfect-ish run:',JSON.stringify(trial(400,{hold:10})));
