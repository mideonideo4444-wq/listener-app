// Anonymous listener prototype. No deps. In-memory only: restart wipes everything (by design).
const http=require('http'),fs=require('fs'),crypto=require('crypto');
const LISTENER_KEY=process.env.LISTENER_KEY||'change-me';
const sessions={}; // id -> {msgs:[], created, paid:false, crisis:false}
const CRISIS=/(انتحر|أنتحر|اموت نفسي|أموت نفسي|اقتل نفسي|أقتل نفسي|مش عايز اعيش|مش عايز أعيش|أذي نفسي|اذي نفسي|suicide|kill myself)/i;
const send=(r,c,o)=>{r.writeHead(c,{'content-type':'application/json'});r.end(JSON.stringify(o))};
const body=q=>new Promise(r=>{let b='';q.on('data',d=>{b+=d;if(b.length>5000)q.destroy()});q.on('end',()=>{try{r(JSON.parse(b))}catch{r({})}})});
http.createServer(async(q,r)=>{
 const u=new URL(q.url,'http://x');
 if(q.method==='GET'&&(u.pathname==='/'||u.pathname==='/listener')){
  return r.writeHead(200,{'content-type':'text/html; charset=utf-8'}),r.end(fs.readFileSync(__dirname+'/'+(u.pathname==='/'?'index':'listener')+'.html'));}
 if(q.method==='GET'&&u.pathname==='/style.css'){return r.writeHead(200,{'content-type':'text/css; charset=utf-8'}),r.end(fs.readFileSync(__dirname+'/style.css'));}
 const ST={'/manifest.webmanifest':['application/manifest+json; charset=utf-8','manifest.webmanifest'],'/sw.js':['text/javascript; charset=utf-8','sw.js']};
 if(q.method==='GET'&&ST[u.pathname]){return r.writeHead(200,{'content-type':ST[u.pathname][0],'cache-control':'no-cache'}),r.end(fs.readFileSync(__dirname+'/'+ST[u.pathname][1]));}
 if(q.method==='GET'&&(u.pathname==='/icon-192.png'||u.pathname==='/icon-512.png')){const k=u.pathname.slice(6,9);return r.writeHead(200,{'content-type':'image/png','cache-control':'public, max-age=86400'}),r.end(Buffer.from(JSON.parse(fs.readFileSync(__dirname+'/icons.json'))[k],'base64'));}
 if(u.pathname==='/api/new'){const id=crypto.randomBytes(8).toString('hex');sessions[id]={msgs:[],created:Date.now(),paid:false,crisis:false};return send(r,200,{id});}
 if(u.pathname==='/api/say'){const b=await body(q),s=sessions[b.id];if(!s)return send(r,404,{});
  const t=String(b.text||'').slice(0,1000);s.msgs.push({from:'user',t,ts:Date.now()});
  if(CRISIS.test(t)){s.crisis=true;s.msgs.push({from:'system',t:'ملاحظة مهمة: اللي بتمر بيه ده يستاهل مساعدة متخصصة فورًا. كلّم دكتور نفسي أو خط الصحة النفسية، ولو في خطر حالًا اتصل بالإسعاف 123. المستمع هنا مش بديل عن دكتور.',ts:Date.now()});}
  return send(r,200,{ok:1,crisis:s.crisis});}
 if(u.pathname==='/api/poll'){const s=sessions[u.searchParams.get('id')];if(!s)return send(r,404,{});return send(r,200,{msgs:s.msgs});}
 // listener side
 if(u.searchParams.get('key')!==LISTENER_KEY)return send(r,403,{});
 if(u.pathname==='/api/inbox')return send(r,200,Object.entries(sessions).map(([id,s])=>({id,n:s.msgs.length,crisis:s.crisis,paid:s.paid,last:s.msgs.at(-1)?.t||''})));
 if(u.pathname==='/api/reply'){const b=await body(q),s=sessions[b.id];if(!s)return send(r,404,{});s.msgs.push({from:'listener',t:String(b.text||'').slice(0,1000),ts:Date.now()});return send(r,200,{ok:1});}
 if(u.pathname==='/api/thread'){const s=sessions[u.searchParams.get('id')];return send(r,200,s?s.msgs:[]);}
 send(r,404,{});
}).listen(process.env.PORT||3000,()=>console.log('up'));
