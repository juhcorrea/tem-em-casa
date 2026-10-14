const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const out=path.join(__dirname,'..','outputs');
const publicFiles=new Map([
['/',{file:'index.html',type:'text/html; charset=utf-8'}],
['/index.html',{file:'index.html',type:'text/html; charset=utf-8'}],
['/manifest.webmanifest',{file:'manifest.webmanifest',type:'application/manifest+json; charset=utf-8'}],
['/apple-touch-icon.png',{file:'apple-touch-icon.png',type:'image/png'}],
['/icon-192.png',{file:'icon-192.png',type:'image/png'}],
['/icon-512.png',{file:'icon-512.png',type:'image/png'}],
['/favicon.ico',{file:'favicon.ico',type:'image/x-icon'}],
['/favicon.svg',{file:'favicon.svg',type:'image/svg+xml; charset=utf-8'}]
]);
function createPreviewServer(){return http.createServer(async(req,res)=>{
res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'});return res.end('Method not allowed');}
let pathname;try{pathname=new URL(req.url,'http://localhost').pathname;}catch{res.writeHead(400);return res.end('Bad request');}
const asset=publicFiles.get(pathname);if(!asset){res.writeHead(404);return res.end('Not found');}
try{const content=await fs.promises.readFile(path.join(out,asset.file));res.writeHead(200,{'Content-Type':asset.type,'Content-Length':content.length});res.end(req.method==='HEAD'?undefined:content);}catch(error){res.writeHead(error.code==='ENOENT'?404:500);res.end('File unavailable');}
});}
module.exports={createPreviewServer};
if(require.main===module)createPreviewServer().listen(4176,'127.0.0.1',()=>console.log('Tem em Casa preview ready http://127.0.0.1:4176'));
