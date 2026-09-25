const fs=require('node:fs');
const path=require('node:path');
const replacements=[
  ['<a href="#colecoes">Óculos</a>','<a href="oculos.html">Óculos</a>'],
  ['<a href="#lentes">Lentes</a>','<a href="lentes.html">Lentes</a>'],
  ['<a href="#historia">Nossa história</a>','<a href="sobre.html">Nossa história</a>'],
  ['<a href="#visite">Visite a loja</a>','<a href="visite.html">Visite a loja</a>']
];
function connect(source){return replacements.reduce((html,[from,to])=>html.replace(from,to),source);}
if(require.main===module){
  const file=path.resolve(__dirname,'../index.html');
  const current=fs.readFileSync(file,'utf8');
  const expected=connect(fs.readFileSync(path.resolve(__dirname,'../qa/home-original.html'),'utf8'));
  const next=connect(current);
  if(next!==expected)throw new Error('A home sofreu alterações adicionais. Nenhum arquivo foi escrito.');
  fs.writeFileSync(file,next,'utf8');
  console.log('Home conectada. Somente quatro destinos de navegação alterados; restante preservado byte a byte.');
}
module.exports={connect,replacements};
