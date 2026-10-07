const fs = require('node:fs');
const file = 'site/index.html';
let html = fs.readFileSync(file, 'utf8');
html = html.replace('Um novo olhar para o seu dia. Curitiba desde 1990.', 'Seu jeito de ver o mundo. Curitiba desde 1990.');
html = html.replace('<body>', '<body class="edition-two">');
const hero = `<section class="hero" id="inicio">
  <div class="hero-copy"><p class="eyebrow"><span class="line"></span> ÓPTICA OCULAR · DESDE 1990</p><h1>Seu jeito<br>de ver<br><em>o mundo.</em></h1><p class="intro">Enxergar bem. Se reconhecer.<br>Sentir que a escolha foi sua.</p><p class="hero-description">Armações, lentes e um olhar atento a você.<br>Encontre seus próximos óculos com a gente.</p><div class="actions"><a class="button" href="#colecoes">Descubra seu próximo óculos <span aria-hidden="true">↗</span></a><a class="text-link" href="#visite">Visite nossa loja <span aria-hidden="true">↗</span></a></div><div class="hero-foot"><span>CURITIBA, PARANÁ</span><a href="#colecoes">UM NOVO OLHAR COMEÇA AQUI <span aria-hidden="true">↓</span></a></div></div>
  <div class="hero-image"><img src="assets/retrato-editorial-v2.png" alt="Retrato editorial de uma mulher com armação preta e camisa branca" width="1122" height="1402" fetchpriority="high"><div class="image-label"><span>O essencial é<br><strong>se sentir você.</strong></span><a class="circle-arrow" href="#colecoes" aria-label="Conheça as categorias de óculos">↗</a></div><span class="vertical-label">OLHARES QUE CONTAM HISTÓRIAS.</span><span class="photo-credit">IMAGEM ILUSTRATIVA</span></div>
</section>`;
html = html.replace(/<section class="hero"[\s\S]*?<\/section>/, hero);
html = html.replace(/<div class="values">[\s\S]*?<\/div>/, `<div class="values"><span><b>Desde 1990.</b> Experiência que acompanha gerações.</span><span><b>Do seu jeito.</b> Orientação para a sua escolha.</span><span><b>Aqui em Curitiba.</b> Rua Bispo Dom José, 2655.</span></div>`);
const categories = `<section class="section collections" id="colecoes"><div class="section-heading"><div><p class="eyebrow">01 — ENCONTRE O SEU</p><h2>Mais do que um óculos.<br><em>Uma forma de se expressar.</em></h2></div><p>O que combina com o seu rosto,<br>com a sua rotina, com você.</p></div>
  <div class="category-grid">
    <a class="category" href="#escolha" data-interest="Óculos de grau"><div class="category-photo"><img src="assets/grau-editorial-v2.png" alt="Imagem ilustrativa de armação preta com lentes transparentes sobre pedra clara" loading="lazy" width="1536" height="1024"><span class="tag">PARA TODOS OS SEUS DIAS</span><span class="photo-action" aria-hidden="true">Encontrar meu óculos de grau ↗</span></div><div class="category-title"><div><span>01 /</span><h3>Seu olhar, de perto.</h3></div><span class="circle-arrow" aria-hidden="true">↗</span></div><p>ÓCULOS DE GRAU <span>Leve sua personalidade para a rotina.</span></p></a>
    <a class="category" href="#escolha" data-interest="Óculos de sol"><div class="category-photo"><img src="assets/solar-editorial-v2.png" alt="Imagem ilustrativa de óculos de sol pretos sobre um bloco de pedra" loading="lazy" width="1536" height="1024"><span class="tag">PARA A VIDA LÁ FORA</span><span class="photo-action" aria-hidden="true">Encontrar meu óculos de sol ↗</span></div><div class="category-title"><div><span>02 /</span><h3>O sol pede presença.</h3></div><span class="circle-arrow" aria-hidden="true">↗</span></div><p>ÓCULOS DE SOL <span>Um novo ponto de vista para sair por aí.</span></p></a>
  </div><div class="collection-bottom"><p class="caption">Imagens ilustrativas. Consulte modelos e disponibilidade com a equipe.</p><a class="text-link" href="#lentes">Já tem a armação? Vamos falar de lentes <span aria-hidden="true">↗</span></a></div>
</section>`;
html = html.replace(/<section class="section collections"[\s\S]*?<\/section>/, categories);
html = html.replace('ALÉM DA ARMAÇÃO', '02 — O QUE FAZ A DIFERENÇA');
html = html.replace('O que você vê<br><em>faz a diferença.</em>', 'A vida acontece<br><em>nos detalhes.</em>');
html = html.replace('Cada rotina pede um olhar. Entenda as opções e converse com nossa equipe para escolher suas lentes.', 'Um livro. Uma conversa. O caminho de volta para casa. Conte como você usa seus óculos e conheça as opções de lentes para a sua rotina.');
html = html.replace('<div class="lens-content">', '<div class="lens-content"><div class="optical-orbit" aria-hidden="true"><i></i><i></i><i></i></div>');
html = html.replace('<p class="eyebrow">VAMOS COMEÇAR?</p><h2>Seu próximo óculos<br>começa com uma <em>conversa.</em></h2><p>Conte o que você procura. A gente ajuda com o próximo passo.</p>', '<p class="eyebrow">03 — UMA ESCOLHA COM CALMA</p><h2>Você não precisa<br>escolher <em>sozinho.</em></h2><p>Entre tantas armações e tipos de lentes, uma boa conversa faz diferença. Comece por aqui.</p><ol class="care-steps"><li><span>01</span> Conte o que você procura.</li><li><span>02</span> Converse sobre as possibilidades.</li><li><span>03</span> Venha experimentar na Ocular.</li></ol>');
html = html.replace('<fieldset><legend>O que você procura hoje?</legend>', '<fieldset><legend>Vamos encontrar o seu próximo olhar.</legend><p class="form-subtitle">O que você procura hoje?</p>');
html = html.replace('<div class="story-art"><span class="eyebrow">NOSSA HISTÓRIA TEM UM OLHAR</span><img src="assets/logo-original.jpg" alt="Símbolo original da Óptica Ocular" width="486" height="400" loading="lazy"><span class="story-year">Desde 1990.</span><span class="story-location">CURITIBA, PARANÁ</span></div>', '<div class="story-art"><img class="story-portrait" src="assets/portrait.jpg" alt="Mulher sorrindo com óculos, imagem do acervo do site da Ocular" width="1800" height="1200" loading="lazy"><div class="story-plaque"><img src="assets/logo-original.jpg" alt="" width="55" height="46"><span>Olhares mudam.<br><em>O cuidado permanece.</em></span><b>1990</b></div></div>');
html = html.replace('MUITO ALÉM DOS ÓCULOS', '04 — NOSSA HISTÓRIA');
html = html.replace('O tempo passa.<br>O cuidado <em>fica.</em>', 'Uma vida de histórias.<br><em>Muitos novos olhares.</em>');
html = html.replace('PODEMOS AJUDAR', 'SUAS DÚVIDAS, COM CLAREZA');
html = html.replace('Um pouco mais<br>de <em>clareza.</em>', 'Antes da<br><em>sua visita.</em>');
html = html.replace('<footer>', '<footer><div class="footer-signature" aria-hidden="true">ocular<span>UM OLHAR ATENTO A VOCÊ.</span></div>');
html = html.replace('Fale com a gente</span></a>', 'Vamos conversar</span></a>');
fs.writeFileSync(file, html);
let previous = fs.readFileSync('site/versao-1/index.html', 'utf8');
previous = previous.replaceAll('src="assets/', 'src="../assets/').replaceAll('href="assets/', 'href="../assets/');
fs.writeFileSync('site/versao-1/index.html', previous);
const css = fs.readFileSync('site/styles.css', 'utf8');
fs.writeFileSync('site/styles.css', fs.readFileSync('site/fonts.css','utf8')+'\n'+css);
console.log('Conteúdo editorial v2 aplicado.');
