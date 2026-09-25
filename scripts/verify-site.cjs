/* Verificações de integração sem dependências externas. */
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const {server,publicFiles}=require('../server.cjs');
const root=path.resolve(__dirname,'..');
const pages=[...publicFiles].filter(file=>file.endsWith('.html'));
const html=new Map(pages.map(file=>[file,fs.readFileSync(path.join(root,file),'utf8')]));
const summary={pages:pages.length,localReferences:0,checks:[],homeVisualAndContentUnchanged:true,homeNavigationLinks:4};
function hash(file){return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();}
function validateRef(from,ref){
  if(!ref||/^(https?:|mailto:|tel:|data:)/.test(ref))return;
  const url=new URL(ref,'http://local'+from);
  const local=path.join(root,decodeURIComponent(url.pathname));
  assert.ok(fs.existsSync(local),`Recurso ausente em ${from}: ${ref}`);
  if(url.hash&&url.pathname.endsWith('.html')){
    const dest=fs.readFileSync(local,'utf8');
    assert.ok(dest.includes(`id="${decodeURIComponent(url.hash.slice(1))}"`),`Âncora inválida em ${from}: ${ref}`);
  }
  summary.localReferences++;
}
for(const [file,source] of html){
  assert.equal((source.match(/<h1[\s>]/g)||[]).length,1,`${file}: h1 único`);
  assert.match(source,/<html lang="pt-BR">/);
  assert.match(source,/<meta name="description" content="[^"]+"/);
  const ids=[...source.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
  assert.equal(new Set(ids).size,ids.length,`${file}: IDs duplicados`);
  for(const match of source.matchAll(/(?:href|src)="([^"]*)"/g))validateRef(file,match[1]);
  for(const match of source.matchAll(/srcset="([^"]+)"/g))for(const item of match[1].split(','))validateRef(file,item.trim().split(/\s+/)[0]);
  for(const match of source.matchAll(/<img\b[^>]*>/g))assert.match(match[0],/\balt="[^"]*"/,`${file}: imagem sem alt`);
  for(const match of source.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g))assert.match(match[0],/\brel="[^"]*noopener/,`${file}: link sem noopener`);
}
for(const css of ['styles.css','fonts.css','interiores.css']){
  const source=fs.readFileSync(path.join(root,css),'utf8');
  for(const match of source.matchAll(/url\(['"]?([^'"\)]+)['"]?\)/g))validateRef('/'+css,match[1]);
}
summary.checks.push('HTML, imagens, recursos locais, âncoras, IDs, títulos e links externos');
const baseline=JSON.parse(fs.readFileSync(path.join(root,'qa/home-baseline.json'),'utf8').replace(/^\uFEFF/,''));
for(const item of baseline){
  if(path.basename(item.Path)==='index.html'){
    const {connect}=require('./connect-home.cjs');
    const original=fs.readFileSync(path.join(root,'qa/home-original.html'),'utf8');
    assert.equal(fs.readFileSync(path.join(root,'index.html'),'utf8'),connect(original),'Home: mudanças além dos quatro links de menu');
    continue;
  }
  assert.equal(hash(item.Path),item.Hash,`Recurso da home alterado: ${item.Path}`);
}
summary.checks.push(`Home idêntica à original exceto quatro href do menu; ${baseline.length-1} recursos originais idênticos ao registro SHA-256`);
server.listen(0,'127.0.0.1',async()=>{
  try{
    const base=`http://127.0.0.1:${server.address().port}`;
    for(const file of publicFiles){
      const response=await fetch(base+file);
      assert.equal(response.status,200,file);
      await response.arrayBuffer();
    }
    for(const file of ['/scripts/build-pages.cjs','/research/original.html','/ensaio-originais/grau-retrato.png','/qa/home-baseline.json','/server.cjs','/nao-existe','/pasta/nao-existe']){
      const response=await fetch(base+file);
      assert.equal(response.status,404,file);
      assert.match(await response.text(),/<base href="\/">/);
    }
    const redirect=await fetch(base+'/lentes',{redirect:'manual'});
    assert.equal(redirect.status,308);assert.equal(redirect.headers.get('location'),'/lentes.html');
    const head=await fetch(base+'/oculos.html',{method:'HEAD'});
    assert.equal(head.status,200);assert.equal(await head.text(),'');
    assert.equal((await fetch(base+'/oculos.html',{method:'POST'})).status,405);
    const webp=await fetch(base+'/assets/ensaio/grau-retrato-640.webp');
    assert.equal(webp.status,200);assert.equal(webp.headers.get('content-type'),'image/webp');await webp.arrayBuffer();
    assert.equal((await fetch(base+'/%00')).status,400);
    summary.checks.push('HTTP: páginas, HEAD, 404, recursos privados, redirect, MIME WebP, métodos e caminho inválido');
    fs.writeFileSync(path.join(root,'qa/verification.json'),JSON.stringify(summary,null,2));
    console.log(JSON.stringify(summary,null,2));
  }catch(error){console.error(error);process.exitCode=1;}
  finally{server.close();}
});
