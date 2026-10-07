const fs=require('fs');
(async()=>{const html=await(await fetch('https://www.opticaocular.com.br/')).text();fs.writeFileSync('site/research/original.html',html);const urls=[...new Set(html.match(/https:\/\/static\.wixstatic\.com\/media\/[^\s"<>]+/g))]; console.log(urls.map(u=>u.replace(/&amp;/g,'&')).join('\n'));})();
