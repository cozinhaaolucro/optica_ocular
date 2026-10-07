/* Páginas estáticas independentes. A home e seus recursos não são gerados aqui. */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const imageManifest = JSON.parse(fs.readFileSync(path.join(root,'assets/ensaio/manifest.json'),'utf8'));
const base = 'https://www.opticaocular.com.br';
const wa = message => `https://wa.me/5541997502091?text=${encodeURIComponent(message)}`;
const generic = wa('Olá! Vim pelo site da Óptica Ocular e gostaria de conversar com a equipe.');
const route = 'https://www.google.com/maps/dir/?api=1&destination=Rua+Bispo+Dom+Jos%C3%A9+2655+Curitiba+PR';
const arrow = '<svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14"/></svg>';
const link = (href, text, cls = 'text-link') => `<a class="${cls}" href="${href}"${href.startsWith('https:') ? ' target="_blank" rel="noopener noreferrer"' : ''}>${text}${arrow}</a>`;
function photo(key, alt, { eager = false, cls = '', sizes = '(max-width: 760px) 100vw, 55vw', portrait = false } = {}) {
  const meta=imageManifest[key];
  const srcset=meta.widths.map(width=>`assets/ensaio/${key}-${width}.webp ${width}w`).join(', ');
  return `<img class="${cls}" src="assets/ensaio/${key}-${meta.widths.at(-1)}.webp" srcset="${srcset}" sizes="${sizes}" width="${meta.width}" height="${meta.height}" alt="${alt}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
}
const {header,footer}=require('./shared-components.cjs')({home:fs.readFileSync(path.join(root,'index.html'),'utf8'),generic});
const faqs = [
  ['Escolha','Preciso agendar para visitar a loja?','Você pode vir durante o horário de atendimento. Se preferir combinar sua visita ou esclarecer algo antes, converse com nossa equipe pelo WhatsApp.'],
  ['Escolha','O que levar para escolher óculos de grau?','Traga sua receita oftalmológica e, se tiver, os óculos que usa hoje. Conte como é sua rotina e o que gostaria de mudar na sua próxima escolha.'],
  ['Escolha','Posso consultar modelos pelo WhatsApp?','Sim. Diga se procura grau ou sol e descreva seu estilo. A equipe poderá informar os modelos, os valores e a disponibilidade atual em loja.'],
  ['Lentes','Qual é a diferença entre monofocais e multifocais?','Monofocais têm uma correção para uma distância de visão. Multifocais progressivas reúnem campos para perto, intermediário e longe. A escolha considera sua receita e suas atividades.'],
  ['Lentes','Vocês trabalham com lentes fotocromáticas?','Sim. Consulte as opções e a compatibilidade com sua receita. Essas lentes mudam de tonalidade conforme as condições de luz; o comportamento depende da tecnologia e do ambiente.'],
  ['Lentes','Posso trocar as lentes e manter minha armação?','A equipe precisa avaliar o estado e a compatibilidade da armação com as novas lentes. Traga seus óculos à loja para conversarmos sobre as possibilidades.'],
  ['Compra','Como consultar preços e formas de pagamento?','Converse com a equipe ou visite a loja. O orçamento depende da armação, da receita, da tecnologia das lentes e dos tratamentos escolhidos. As condições são informadas no atendimento.'],
  ['Compra','Qual é o prazo para meus óculos ficarem prontos?','O prazo varia conforme as lentes e a disponibilidade. Nossa equipe informa a previsão para o seu pedido no momento do orçamento.'],
  ['Visita','Onde fica a Óptica Ocular?','Na Rua Bispo Dom José, 2655, Seminário, Curitiba, PR. O CEP é 80440-080. Na página Visite a loja você encontra o link para traçar sua rota.'],
  ['Visita','Quais são os horários de atendimento?','Segunda a sexta, das 9h às 18h30. Aos sábados, das 9h às 13h. Domingo fechado. Em feriados, consulte a equipe antes da visita.']
];
function faqRows(items = faqs, searchable = false) {
  return items.map(([group,q,a],index)=>`<details class="question"${searchable?` data-faq data-category="${group}"`:''}><summary><span>${q}</span></summary><div class="answer"><p>${a}</p>${q.startsWith('Onde')?link('visite','Ver localização'):''}</div></details>`).join('');
}
const pages = [];
function page(slug,title,description,active,body,{og='olhares-geracoes',cls=''}={}) {
  const filename=slug+'.html';
  const cleanUrl=slug==='index'?base:`${base}/${slug}`;
  const html=`<!doctype html>
<html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} | Óptica Ocular</title><meta name="description" content="${description}"><meta name="theme-color" content="#231f20"><link rel="canonical" href="${cleanUrl}"><meta property="og:type" content="website"><meta property="og:locale" content="pt_BR"><meta property="og:site_name" content="Óptica Ocular"><meta property="og:title" content="${title} | Óptica Ocular"><meta property="og:description" content="${description}"><meta property="og:url" content="${cleanUrl}"><meta property="og:image" content="${base}/assets/ensaio/${og}-social.jpg"><meta property="og:image:alt" content="Ensaio editorial em preto e branco da Óptica Ocular"><meta name="twitter:card" content="summary_large_image"><link rel="icon" href="assets/logo-dark.png"><link rel="preload" href="assets/fonts/cormorant-garamond-normal-latin.woff2" as="font" type="font/woff2" crossorigin><link rel="preload" href="assets/fonts/manrope-normal-latin.woff2" as="font" type="font/woff2" crossorigin><link rel="stylesheet" href="fonts.css"><link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="interiores.css"><script src="interiores.js" defer></script></head><body class="interior ${cls}">${header(active)}<main id="conteudo">${body}</main>${footer()}</body></html>`;
  fs.writeFileSync(path.join(root,filename),slug==='404'?html.replace('<head>','<head><meta name="robots" content="noindex">'):html,'utf8');
  if(slug!=='404')pages.push(slug);
}

require('./page-content.cjs')({page,photo,link,wa,route,generic,arrow,faqRows});

fs.writeFileSync(path.join(root,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${base}/</loc></url>${pages.map(slug=>`<url><loc>${base}/${slug}</loc></url>`).join('')}</urlset>\n`);
fs.writeFileSync(path.join(root,'robots.txt'),`User-agent: *\nAllow: /\nSitemap: ${base}/sitemap.xml\n`);
console.log(`Geradas ${pages.length} páginas internas, página 404 e sitemap. Home preservada.`);
