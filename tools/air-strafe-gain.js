const fs=require('fs');const src=fs.readFileSync(process.argv[2]||'index.html','utf8');
const phys=src.slice(src.indexOf('// ==PHYSICS START=='),src.indexOf('// ==PHYSICS END=='));
class V{constructor(){this.x=this.y=this.z=0}set(a,b,c){this.x=a;this.y=b;this.z=c;return this}}
const mk=()=>new Function('V',`
const pos=new V(),vel=new V();let contactN=null,contactTicks=0,fingerDown=false,lastTouched=0,nextCp=0,cpRamp=0,squash=0;
let yaw=0,touchStrafe=0,keyStrafe=0,state='run',falls=0;
function onCheckpoint(){} function finish(){state='done'} function fail(){state='fail'}
`+phys+`
return {P,pos,vel,step,ramps,g:()=>({yaw,contactN,state}),setYaw:v=>yaw=v,setStrafe:v=>touchStrafe=v,setFinger:v=>fingerDown=v};`)(V);
// Isolated air test: 1 s in free air at speed v0, turning right at constant rate w (rad/s), strafe right.
function air(v0,w,secs=1){const G=mk();G.pos.set(0,1e6,0);G.vel.set(0,0,-v0);G.setYaw(0);G.setFinger(true);
 for(let t=0;t<secs*100;t++){ if(w>0){G.setStrafe(1);G.setYaw(G.g().yaw-w*0.01);} else G.setStrafe(0); G.step(); }
 return Math.hypot(G.vel.x,G.vel.z)-v0;}
// ideal: yaw locked to velocity heading each tick (wishdir perpendicular)
function ideal(v0,secs=1){const G=mk();G.pos.set(0,1e6,0);G.vel.set(0,0,-v0);G.setFinger(true);G.setStrafe(1);let turned=0;
 for(let t=0;t<secs*100;t++){const y=Math.atan2(-G.vel.x,-G.vel.z);G.setYaw(y);G.step();}
 const yEnd=Math.atan2(-G.vel.x,-G.vel.z);return [Math.hypot(G.vel.x,G.vel.z)-v0, Math.abs(yEnd)];}
for(const v of [600,1000,1500,2000]){
 const [gi,turn]=ideal(v); const rate=turn; // rad over 1s
 const row=[0.5,1,1.5,2].map(m=>{const w=rate*m;return `${m}x:${air(v,w).toFixed(1)}`});
 console.log(`v=${v} ideal gain ${gi.toFixed(1)} u/s per s (turns ${(turn*57.3).toFixed(0)} deg/s, ${(turn/0.011).toFixed(0)} px/s) | const-rate as multiple of ideal: ${row.join(' ')}`);
}
