/* Copia somente a árvore de recursos públicos efetivamente referenciados. */
const fs=require('node:fs');
const path=require('node:path');
const {publicFiles}=require('../server.cjs');
const root=path.resolve(__dirname,'..');
const dist=path.join(root,'dist');
const seen=new Set();
function copy(relative){
  relative=relative.replace(/^\//,'').split(/[?#]/)[0];
  if(!relative||/^[a-z]+:/i.test(relative)||seen.has(relative))return;
  const source=path.resolve(root,relative);
  if(!source.startsWith(root+path.sep)||!fs.existsSync(source))throw new Error('Recurso não encontrado: '+relative);
  seen.add(relative);
  const destination=path.join(dist,relative);
  fs.mkdirSync(path.dirname(destination),{recursive:true});
  fs.copyFileSync(source,destination);
  // A página de erro também é exibida em caminhos inexistentes com subpastas.
  if(relative==='404.html'){
    const html=fs.readFileSync(destination,'utf8');
    fs.writeFileSync(destination,html.replace('<head>','<head><base href="/">'));
  }
  if(/\.(html|css)$/.test(relative)){
    const text=fs.readFileSync(source,'utf8');
    const refs=[...text.matchAll(/(?:src|href)="([^"]+)"/g)].map(m=>m[1]);
    for(const m of text.matchAll(/<meta property="og:image" content="([^"]+)"/g))refs.push(m[1]);
    for(const m of text.matchAll(/srcset="([^"]+)"/g))for(const item of m[1].split(','))refs.push(item.trim().split(/\s+/)[0]);
    for(const m of text.matchAll(/url\(['"]?([^'"\)]+)['"]?\)/g))refs.push(m[1]);
    for(let ref of refs){
      if(ref.startsWith('https://www.opticaocular.com.br/assets/ensaio/'))ref=ref.replace('https://www.opticaocular.com.br/','');
      if(/^(?:[a-z]+:|#)/i.test(ref))continue;
      copy(path.posix.join(path.posix.dirname(relative),ref));
    }
  }
}
fs.mkdirSync(dist,{recursive:true});
for(const file of publicFiles)copy(file);
for(const license of ['manrope-LICENSE.txt','cormorantgaramond-LICENSE.txt'])copy('assets/fonts/'+license);
const bytes=[...seen].reduce((n,file)=>n+fs.statSync(path.join(dist,file)).size,0);
console.log(`Pacote em ${dist}: ${seen.size} arquivos, ${(bytes/1024/1024).toFixed(2)} MB. Pesquisa, logs e originais fora do pacote.`);
