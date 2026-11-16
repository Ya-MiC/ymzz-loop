import fs from 'fs'; import path from 'path';
const dir='public'; const files={};
const mime={html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',svg:'image/svg+xml',png:'image/png',txt:'text/plain; charset=utf-8'};
function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name); if(e.isDirectory())walk(p); else {const ext=path.extname(p).slice(1); files['/'+path.relative(dir,p)]=[mime[ext]||'application/octet-stream',fs.readFileSync(p).toString('base64')];}}}
walk(dir);
const worker=`const F=${JSON.stringify(files)};
const C={};
function bytes(b){const s=atob(b);const u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u;}
export default { async fetch(req){ const u=new URL(req.url); let p=u.pathname; if(p.endsWith('/')) p+='index.html'; const f=F[p]; const sec={'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Strict-Transport-Security':'max-age=31536000'};
 if(!f) return new Response('<!doctype html><meta charset=utf-8><title>404 稟冊</title><p style="font-family:system-ui;padding:40px">找不到這一頁 · Not found. <a href="/">回首頁 Home</a></p>',{status:404,headers:{'content-type':'text/html; charset=utf-8',...sec}});
 if(req.method!=='GET'&&req.method!=='HEAD') return new Response('Method not allowed',{status:405});
 const body=C[p]||(C[p]=bytes(f[1])); return new Response(req.method==='HEAD'?null:body,{headers:{'content-type':f[0],'cache-control':p.endsWith('.html')?'public, max-age=300':'public, max-age=86400',...sec}}); } };`;
fs.writeFileSync('worker.js',worker);
const code=`async () => {
const W=${JSON.stringify(worker)};
const meta={main_module:'worker.js',compatibility_date:'2026-11-01'};
const fd=new FormData(); fd.append('metadata',new Blob([JSON.stringify(meta)],{type:'application/json'})); fd.append('worker.js',new Blob([W],{type:'application/javascript+module'}),'worker.js');
const put=await cloudflare.request({method:'PUT',path:\`/accounts/\${accountId}/workers/scripts/ymzz-bingce-site\`,body:fd});
return {success:put.success,id:put.result&&put.result.id,etag:put.result&&put.result.etag};
}`;
fs.writeFileSync('deploy2.js',code); console.log(worker.length, code.length);
