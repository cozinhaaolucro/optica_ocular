const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const port = Number(process.env.PORT || 4173);
const pages = ['index','oculos','oculos-de-grau','oculos-de-sol','lentes','sobre','visite','duvidas','privacidade','404'];
const publicFiles = new Set([...pages.map(name=>`/${name}.html`),'/styles.css','/fonts.css','/app.js','/interiores.css','/interiores.js','/robots.txt','/sitemap.xml']);
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.txt':'text/plain; charset=utf-8','.xml':'application/xml; charset=utf-8'};
const headers = {'X-Content-Type-Options':'nosniff','Cache-Control':'no-cache','Referrer-Policy':'strict-origin-when-cross-origin'};
function notFound(req,res) {
  fs.readFile(path.join(root,'404.html'),'utf8',(err,data)=>{
    res.writeHead(404,{...headers,'Content-Type':'text/html; charset=utf-8'});
    res.end(req.method==='HEAD'?'':err?'Página não encontrada':data.replace('<head>','<head><base href="/">'));
  });
}
const server = http.createServer((req,res)=>{
  if (!['GET','HEAD'].includes(req.method)) {res.writeHead(405,{...headers,Allow:'GET, HEAD'}).end();return;}
  let pathname;
  try {
    pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if (pathname.includes('\0')||pathname.includes('\\')) throw new Error('Invalid path');
  } catch {res.writeHead(400,headers).end('Requisição inválida');return;}
  if(pathname==='/')pathname='/index.html';
  const slug=pathname.replace(/^\//,'').replace(/\/$/,'');
  if(slug.endsWith('.html') && pages.includes(slug.slice(0, -5)) && slug !== 'index.html') {
    res.writeHead(308,{...headers,Location:`/${slug.slice(0, -5)}`}).end();
    return;
  }
  if(pages.includes(slug)) {
    pathname = `/${slug}.html`;
  }
  const file=path.resolve(root,'.'+pathname);
  const ext=path.extname(file).toLowerCase();
  const asset=pathname.startsWith('/assets/')&&Object.hasOwn(types,ext)&&ext!=='.html';
  if(!file.startsWith(root+path.sep)||(!publicFiles.has(pathname)&&!asset)){notFound(req,res);return;}
  fs.readFile(file,(error,data)=>{
    if(error){notFound(req,res);return;}
    res.writeHead(200,{...headers,'Content-Type':types[ext]||'application/octet-stream','Content-Length':data.length});
    res.end(req.method==='HEAD'?'':data);
  });
});
if(require.main===module)server.listen(port,'127.0.0.1',()=>console.log(`Óptica Ocular: http://localhost:${port}`));
module.exports={server,publicFiles};
