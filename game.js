(() => {
const canvas=document.getElementById('game'), renderer=new THREE.WebGLRenderer({canvas,antialias:false});
renderer.setPixelRatio(1); renderer.setSize(innerWidth,innerHeight); renderer.shadowMap.enabled=true;
const scene=new THREE.Scene(); scene.background=new THREE.Color(0x87ceeb); scene.fog=new THREE.Fog(0x87ceeb,18,55);
const camera=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,.05,100); camera.rotation.order='YXZ';
const light=new THREE.HemisphereLight(0xbfe9ff,0x6b5538,1.5); scene.add(light);
const sun=new THREE.DirectionalLight(0xffffff,1.1); sun.position.set(20,35,10); scene.add(sun);
const clock=new THREE.Clock(), blocks=new Map(), meshes=new Map(), keys={}; let yaw=0,pitch=0,locked=false,day=1,time=0;
const inv={grass:0,dirt:0,stone:0,wood:8,leaves:0,coal:0,iron:0,crystal:0,planks:0,torch:0}; let selected=0;
const hot=[['grass','🟩'],['dirt','🟫'],['stone','⬜'],['wood','🪵'],['planks','🟨'],['coal','⚫'],['iron','⛓️'],['crystal','💎'],['torch','🔥']];
const colors={grass:0x62a84f,dirt:0x8b5a2b,stone:0x777777,wood:0x754c29,leaves:0x3e8c3e,coal:0x333333,iron:0xb77b5b,crystal:0x8e65e8,planks:0xb9824b,torch:0xffaa33};
const solid=new Set(Object.keys(colors).filter(k=>k!=='torch'));
const geo=new THREE.BoxGeometry(1,1,1);
function key(x,y,z){return x+','+y+','+z}
function setBlock(x,y,z,type){const k=key(x,y,z); if(!type){blocks.delete(k); const old=meshes.get(k);if(old){scene.remove(old);meshes.delete(k)}return} blocks.set(k,type); if(meshes.has(k))scene.remove(meshes.get(k)); const m=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({color:colors[type]}));m.position.set(x+.5,y+.5,z+.5);scene.add(m);meshes.set(k,m)}
function get(x,y,z){return blocks.get(key(x,y,z))}
function height(x,z){return Math.floor(3+Math.sin(x*.45)*.8+Math.cos(z*.35)*.8)}
function tree(x,y,z){for(let i=0;i<4;i++)setBlock(x,y+i,z,'wood');for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)for(let dy=2;dy<=4;dy++)if(Math.abs(dx)+Math.abs(dz)+(dy===4?1:0)<4)setBlock(x+dx,y+dy,z+dz,'leaves')}
const CHUNK=12,RENDER_DISTANCE=3,loadedChunks=new Set();
function chunkKey(cx,cz){return cx+','+cz}
function generateChunk(cx,cz){const ck=chunkKey(cx,cz);if(loadedChunks.has(ck))return;loadedChunks.add(ck);for(let x=cx*CHUNK;x<(cx+1)*CHUNK;x++)for(let z=cz*CHUNK;z<(cz+1)*CHUNK;z++){const h=height(x,z);for(let y=0;y<=h;y++)setBlock(x,y,z,y===h?'grass':y>h-3?'dirt':'stone');if(Math.random()<.045&&h>2)tree(x,h+1,z)}}
function updateChunks(){const cx=Math.floor(camera.position.x/CHUNK),cz=Math.floor(camera.position.z/CHUNK);for(let dx=-RENDER_DISTANCE;dx<=RENDER_DISTANCE;dx++)for(let dz=-RENDER_DISTANCE;dz<=RENDER_DISTANCE;dz++)generateChunk(cx+dx,cz+dz)}
function ui(){document.getElementById('health').textContent=10;document.getElementById('day').textContent=day;document.getElementById('hotbar').innerHTML=hot.map((s,i)=>'<div class="slot '+(i===selected?'sel':'')+'"><b>'+s[1]+'</b><br><span class="count">'+(inv[s[0]]||0)+'</span>'+(i+1)+'</div>').join('');document.getElementById('invgrid').innerHTML=Object.entries(inv).map(([k,v])=>'<div class="invslot" title="'+k+'">'+(hot.find(h=>h[0]===k)?.[1]||'')+'<br>'+v+'</div>').join('')}
function save(){localStorage.setItem('realmcraft-3d',JSON.stringify({inv,selected,x:camera.position.x,y:camera.position.y,z:camera.position.z,yaw,pitch,day,time}))}
function load(){try{const d=JSON.parse(localStorage.getItem('realmcraft-3d'));if(!d)return false;Object.assign(inv,d.inv||{});selected=d.selected||0;camera.position.set(d.x??0,d.y??8,d.z??8);yaw=d.yaw||0;pitch=d.pitch||0;day=d.day||1;time=d.time||0;return true}catch(e){return false}}
if(!load()) {camera.position.set(0,7,8)} updateChunks(); camera.rotation.set(pitch,yaw,0); 
function topBlock(x,z){for(let y=20;y>=0;y--)if(get(x,y,z))return y;return 0}
function canStand(x,z,y){return !get(Math.floor(x),Math.floor(y),Math.floor(z))&&!get(Math.floor(x),Math.floor(y+1),Math.floor(z))}
function ray(){const r=new THREE.Raycaster();r.setFromCamera({x:0,y:0},camera);return r.intersectObjects([...meshes.values()])}
function mine(){const hit=ray()[0];if(!hit)return;const p=hit.object.position.clone().subScalar(.5);const x=Math.floor(p.x),y=Math.floor(p.y),z=Math.floor(p.z),type=get(x,y,z);if(!type)return;inv[type]=(inv[type]||0)+1;setBlock(x,y,z,null);ui();save()}
function place(){const hit=ray()[0];if(!hit)return;const n=hit.face.normal;const p=hit.object.position.clone().subScalar(.5);const x=Math.floor(p.x+n.x),y=Math.floor(p.y+n.y),z=Math.floor(p.z+n.z),type=hot[selected][0];if((inv[type]||0)<=0||get(x,y,z))return;if(Math.floor(camera.position.x)===x&&Math.floor(camera.position.z)===z&&Math.floor(camera.position.y)===y)return;inv[type]--;setBlock(x,y,z,type);ui();save()}
function toggleInv(){const el=document.getElementById('inventory');el.style.display=el.style.display==='block'?'none':'block';if(el.style.display==='block')document.exitPointerLock?.()}
document.getElementById('startBtn').onclick=()=>{canvas.requestPointerLock();document.getElementById('start').style.display='none'};
document.addEventListener('pointerlockchange',()=>locked=document.pointerLockElement===canvas);
document.addEventListener('mousemove',e=>{if(!locked)return;yaw-=e.movementX*.0025;pitch-=e.movementY*.0025;pitch=Math.max(-1.45,Math.min(1.45,pitch));camera.rotation.set(pitch,yaw,0)});
addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;if(e.key>='1'&&e.key<='9'){selected=+e.key-1;ui()}if(e.key.toLowerCase()==='e')toggleInv();if(e.code==='Space')e.preventDefault()});
addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
canvas.addEventListener('mousedown',e=>{if(!locked){canvas.requestPointerLock();return}if(e.button===0)mine();if(e.button===2)place()});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
function move(dt){const speed=5;let strafe=(keys.d?1:0)-(keys.a?1:0),forward=(keys.w?1:0)-(keys.s?1:0);const len=Math.hypot(strafe,forward)||1;strafe/=len;forward/=len;const sin=Math.sin(yaw),cos=Math.cos(yaw);const vx=(strafe*cos-forward*sin)*speed*dt,vz=(-strafe*sin-forward*cos)*speed*dt;let nx=camera.position.x+vx,nz=camera.position.z+vz;const feet=camera.position.y-1.6;if(canStand(nx,nz,Math.floor(feet)))camera.position.x=nx;if(canStand(camera.position.x,nz,Math.floor(feet)))camera.position.z=nz}
let vy=0,onGround=false;
function physics(dt){const x=Math.floor(camera.position.x),z=Math.floor(camera.position.z),feet=camera.position.y-1.6;let groundY=-1;for(let y=20;y>=0;y--){if(get(x,y,z)){groundY=y;break}}const targetY=groundY+2.6;if(groundY>=0&&feet<=groundY+1.05&&vy<=0){camera.position.y=targetY;vy=0;onGround=true}else{vy-=18*dt;camera.position.y+=vy*dt;onGround=false}if(keys[' ']&&onGround){vy=7;onGround=false;keys[' ']=false}}
function loop(){const dt=Math.min(clock.getDelta(),.05);if(locked&&document.getElementById('inventory').style.display!=='block'){move(dt);physics(dt);updateChunks()}time+=dt;if(time>30){time=0;day++;scene.background.set(day%2?0x87ceeb:0x25365c);scene.fog.color.copy(scene.background);save()}renderer.render(scene,camera);requestAnimationFrame(loop)}
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});ui();loop();
})();