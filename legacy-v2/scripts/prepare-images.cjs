const fs = require('node:fs');
const path = require('node:path');
const sharp = require(process.env.SHARP_PATH || 'sharp');
const root = path.resolve(__dirname, '..');
const keys = ['grau-retrato','sol-retrato','lentes-detalhe','gesto-cuidado','olhares-geracoes'];
(async () => {
  const manifest = {};
  for (const key of keys) {
    const src=path.join(root,'ensaio-originais',key+'.png');
    const {width,height}=await sharp(src).metadata();
    const widths=[...new Set([640,1280,width].filter(w=>w<=width))].sort((a,b)=>a-b);
    const files=[];
    for(const w of widths){
      const name=`${key}-${w}.webp`;
      const info=await sharp(src).resize({width:w,withoutEnlargement:true}).webp({quality:83,effort:6}).toFile(path.join(root,'assets/ensaio',name));
      files.push({name,width:info.width,height:info.height,bytes:info.size});
    }
    await sharp(src).resize(1200,630,{fit:'cover',position:sharp.strategy.attention}).jpeg({quality:87,mozjpeg:true}).toFile(path.join(root,'assets/ensaio',`${key}-social.jpg`));
    manifest[key]={width,height,widths,files};
  }
  fs.writeFileSync(path.join(root,'assets/ensaio/manifest.json'),JSON.stringify(manifest,null,2));
  console.log(JSON.stringify(manifest,null,2));
})().catch(err=>{console.error(err);process.exitCode=1;});
