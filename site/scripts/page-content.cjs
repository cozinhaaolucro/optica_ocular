/* Conteúdo das páginas internas: informação direta, sem aberturas de campanha. */
module.exports = ({page,photo,link,wa,route,generic,arrow,faqRows}) => {
  const heading=(title,description='')=>`<div class="inside-heading"><h1>${title}</h1>${description?`<p>${description}</p>`:''}</div>`;
  const back='<a class="inside-back" href="oculos.html"><span aria-hidden="true">←</span> Todos os óculos</a>';
  const related=links=>`<div class="inside-related">${links.map(([url,text])=>link(url,text)).join('')}</div>`;

  page('oculos','Óculos de grau e de sol em Curitiba','Explore óculos de grau e de sol com a orientação da Óptica Ocular, em Curitiba desde 1990.','oculos',`
    <div class="inside-wrap">
      ${heading('Óculos.','Grau ou sol. Escolha por onde começar.')}
      <div class="inside-collections">
        <a class="inside-category" href="oculos-de-grau.html"><div class="inside-category-photo"><img src="assets/grau-editorial-v2.jpg" width="1536" height="1024" fetchpriority="high" alt="Armação de grau preta sobre pedra clara."></div><div class="inside-category-title"><h2>Óculos de <em>grau.</em></h2>${arrow}</div></a>
        <a class="inside-category" href="oculos-de-sol.html"><div class="inside-category-photo"><img src="assets/solar-editorial-v2.jpg" width="1536" height="1024" alt="Óculos de sol pretos em uma composição de luz e sombra."></div><div class="inside-category-title"><h2>Óculos de <em>sol.</em></h2>${arrow}</div></a>
      </div>
      <p class="inside-note">Consulte modelos e disponibilidade com nossa equipe.</p>
      ${related([['lentes.html','Conheça também as lentes'],['visite.html','Visite a Ocular']])}
    </div>`,{og:'lentes-detalhe'});

  page('oculos-de-grau','Óculos de grau em Curitiba','Armações de grau, conforto e personalidade. Encontre seus próximos óculos com a orientação da Óptica Ocular.','oculos',`
    <div class="inside-wrap">${back}${heading('Óculos de <em>grau.</em>','Armações para acompanhar o seu rosto e a sua rotina.')}
      <div class="inside-detail">
        <figure class="inside-detail-photo">${photo('grau-retrato','Modelo usando armação de grau preta em ensaio editorial.',{eager:true,portrait:true,sizes:'(max-width: 820px) 100vw, 42vw'})}</figure>
        <div class="inside-detail-copy"><h2>Uma escolha<br><em>feita de perto.</em></h2><p>Experimente diferentes armações na loja. Nossa equipe orienta a escolha considerando o que você procura e a sua receita.</p><dl class="inside-features"><div><dt>Encaixe</dt><dd>Apoio no nariz e posição das hastes para o seu conforto.</dd></div><div><dt>Proporção</dt><dd>Um desenho que combina com seu rosto e com seu estilo.</dd></div><div><dt>Lentes</dt><dd>Armação e lentes consideradas juntas, conforme sua receita.</dd></div></dl>${link(wa('Olá! Quero conhecer as armações de grau disponíveis na Óptica Ocular.'),'Consultar armações','button')}</div>
      </div>${related([['lentes.html','Escolha suas lentes'],['oculos-de-sol.html','Conheça os óculos de sol']])}
    </div>`,{og:'grau-retrato'});

  page('oculos-de-sol','Óculos de sol em Curitiba','Óculos de sol com personalidade e orientação para escolher. Conheça a Óptica Ocular em Curitiba.','oculos',`
    <div class="inside-wrap">${back}${heading('Óculos de <em>sol.</em>','Seu estilo, nos dias ao ar livre.')}
      <div class="inside-detail">
        <figure class="inside-detail-photo">${photo('sol-retrato','Modelo com óculos de sol pretos sob a luz natural.',{eager:true,portrait:true,sizes:'(max-width: 820px) 100vw, 42vw'})}</figure>
        <div class="inside-detail-copy"><h2>Experimente.<br><em>Encontre o seu.</em></h2><p>Linhas discretas ou formas marcantes. Veja de perto as opções e escolha com a orientação da nossa equipe.</p><dl class="inside-features"><div><dt>Desenho</dt><dd>Proporções e formas que expressam sua personalidade.</dd></div><div><dt>Conforto</dt><dd>Um apoio estável, com atenção ao encaixe da armação.</dd></div><div><dt>Lentes</dt><dd>Converse sobre as características e as opções para o seu uso.</dd></div></dl>${link(wa('Olá! Quero conhecer os óculos de sol disponíveis na Óptica Ocular.'),'Consultar óculos de sol','button')}</div>
      </div>${related([['oculos-de-grau.html','Conheça os óculos de grau'],['visite.html','Visite a loja']])}
    </div>`,{og:'sol-retrato'});

  const lenses=[
    ['monofocais','Monofocais','Uma distância de visão.','Uma correção para uma distância de visão, conforme sua receita. Uma possibilidade para atividades de perto ou para enxergar de longe.','A equipe orienta sobre materiais, espessuras e tratamentos disponíveis.'],
    ['multifocais','Multifocais','Perto, intermediário e longe.','Lentes progressivas reúnem campos de visão para diferentes distâncias, com transição entre eles.','Armação, medidas e rotina entram na conversa. Conheça as opções e esclareça suas dúvidas sobre a adaptação.'],
    ['fotocromaticas','Fotocromáticas','Para as mudanças de luz.','Lentes que mudam de tonalidade conforme as condições de luz. A resposta varia com a tecnologia, a temperatura e o ambiente.','Converse sobre seu uso em espaços internos e externos e a compatibilidade com sua receita.']
  ];
  page('lentes','Lentes para sua rotina','Conheça lentes monofocais, multifocais e fotocromáticas. Orientação para sua receita e rotina na Óptica Ocular.','lentes',`
    <div class="inside-wrap">${heading('Lentes.','Sua receita, suas atividades e a armação orientam a escolha.')}
      <div class="inside-lenses"><figure class="inside-lens-photo">${photo('lentes-detalhe','Lentes transparentes em uma armação preta sobre pedra clara.',{eager:true,sizes:'(max-width: 820px) 100vw, 42vw'})}</figure><div class="inside-lens-options">
        <div class="lens-tablist" role="tablist" aria-label="Tipos de lentes" hidden>${lenses.map(([id,title],i)=>`<button type="button" id="tab-${id}" role="tab" aria-selected="${i===0}" aria-controls="${id}" tabindex="${i===0?0:-1}">${title}</button>`).join('')}</div>
        ${lenses.map(([id,title,h,p,note])=>`<article class="lens-panel" id="${id}"><h2>${h}</h2><p>${p}</p><p>${note}</p>${link(wa(`Olá! Gostaria de orientação sobre lentes ${title.toLowerCase()}.`),'Conversar sobre estas lentes')}</article>`).join('')}
      </div></div>
      <div class="inside-brands" aria-label="Marcas de lentes">${[['hoya-clean','HOYA'],['zeiss-clean','ZEISS'],['varilux-clean','Varilux'],['rodenstock','Rodenstock'],['crizal-clean','Crizal'],['transitions-clean','Transitions']].map(([src,alt])=>`<img src="assets/brands/${src}.png" alt="${alt}" width="160" height="70" loading="lazy">`).join('')}</div>
      <p class="inside-note">Consulte linhas, tratamentos e disponibilidade com nossa equipe.</p>
      ${related([['duvidas.html','Dúvidas sobre lentes'],['visite.html','Traga sua receita à loja']])}
    </div>`,{og:'lentes-detalhe'});

  page('sobre','Nossa história, desde 1990','Conheça a história da Óptica Ocular. Experiência óptica e atenção a cada escolha em Curitiba desde 1990.','sobre',`
    <div class="inside-wrap">${heading('Nossa <em>história.</em>','Desde 1990, em Curitiba.')}
      <div class="inside-about"><figure>${photo('olhares-geracoes','Duas modelos de gerações diferentes usando óculos de grau, em ensaio ilustrativo.',{eager:true,sizes:'(max-width: 820px) 100vw, 50vw'})}</figure><div><h2>A experiência <br>de quem sempre <br><em>olhou de perto.</em></h2><p>Em 1990, Laércio deu início à Óptica Ocular, no bairro Portão, em Curitiba.</p><p>Sua experiência como técnico de laboratório estava na origem de um cuidado que ia além da armação: entender o que fazia diferença para cada pessoa.</p><p>Com o tempo, a história ganhou um novo endereço na Rua Bispo Dom José. A atenção à escolha e o vínculo com os clientes continuam fazendo parte do nosso jeito de trabalhar.</p>${link('visite.html','Venha conhecer a Ocular')}</div></div>
    </div>`);

  page('visite','Visite nossa loja em Curitiba','Encontre a Óptica Ocular na Rua Bispo Dom José, 2655, Seminário, Curitiba. Horários e contato pelo WhatsApp.','visite',`
    <div class="inside-wrap">${heading('Visite a <em>loja.</em>','Estamos na Rua Bispo Dom José, em Curitiba.')}
      <div class="inside-visit"><div><h2>Como chegar.</h2><address>Rua Bispo Dom José, 2655<br>Seminário · Curitiba, PR<br><span>CEP 80440-080</span></address>${link(route,'Abrir rota no Google Maps')}</div><div><h2>Horários.</h2><dl class="inside-hours"><div><dt>Segunda a sexta</dt><dd>9h às 18h30</dd></div><div><dt>Sábado</dt><dd>9h às 13h</dd></div><div><dt>Domingo</dt><dd>Fechado</dd></div></dl><p class="inside-note">Em feriados, consulte nossa equipe.</p></div><div><h2>Contato.</h2><a class="inside-phone" href="${generic}" target="_blank" rel="noopener noreferrer">(41) 99750-2091</a><p class="inside-note">WhatsApp</p><a class="inside-contact-line" href="tel:+554130169654">Telefone · (41) 3016-9654</a><a class="inside-contact-line" href="mailto:optica-ocular@hotmail.com">optica-ocular@hotmail.com</a></div></div>
      <section class="inside-conversation" id="conversa"><div><h2>Como podemos<br><em>ajudar?</em></h2><p>Prepare sua mensagem.<br>A conversa continua no WhatsApp.</p></div><form id="conversation-form"><label class="field-label" for="contact-name">Seu nome <span>(opcional)</span></label><input id="contact-name" name="nome" type="text" autocomplete="given-name" maxlength="60" placeholder="Como podemos chamar você?"><fieldset><legend>Quero conversar sobre</legend><div class="interest-options">${['Óculos de grau','Óculos de sol','Lentes','Minha visita'].map((s,i)=>`<label><input type="radio" name="interesse" value="${s}" ${i===0?'checked':''}><span>${s}</span></label>`).join('')}</div></fieldset><label class="field-label" for="contact-note">Sua mensagem <span>(opcional)</span></label><textarea id="contact-note" name="mensagem" rows="3" maxlength="500" placeholder="Uma preferência ou uma dúvida."></textarea><div class="message-preview" hidden><p id="message-preview"></p></div><a class="button" id="conversation-link" href="${generic}" target="_blank" rel="noopener noreferrer">Continuar no WhatsApp ${arrow}</a><p class="inside-note">Você revisa e envia a mensagem no WhatsApp. <a href="privacidade.html">Privacidade</a>.</p><noscript><p class="inside-note">Conte suas preferências diretamente à equipe no WhatsApp.</p></noscript></form></section>
    </div>`,{og:'gesto-cuidado'});

  page('duvidas','Dúvidas frequentes','Respostas sobre armações, lentes, disponibilidade, atendimento e visita à Óptica Ocular em Curitiba.','',`
    <div class="inside-wrap">${heading('Dúvidas <em>frequentes.</em>')}
      <div class="inside-faq"><aside><div class="faq-tools" hidden><label for="faq-search">Busque por um assunto</label><input id="faq-search" type="search" placeholder="Ex.: receita, prazo, visita" autocomplete="off"><div class="faq-filters" role="group" aria-label="Filtrar perguntas por assunto">${['Todas','Escolha','Lentes','Compra','Visita'].map((s,i)=>`<button type="button" data-filter="${s}" aria-pressed="${i===0}">${s}</button>`).join('')}</div></div>${link(generic,'Fale com a equipe')}</aside><div><p class="faq-count inside-note" aria-live="polite" hidden></p><div id="faq-results">${faqRows(undefined,true)}</div><div class="faq-empty" hidden><h2>Nenhuma resposta encontrada.</h2><p>Tente outra palavra ou converse com a equipe.</p><button type="button" class="text-link" id="clear-search">Limpar busca ${arrow}</button></div></div></div>
    </div>`);

  page('privacidade','Privacidade','Saiba como funcionam os contatos, os links externos e o mapa no site da Óptica Ocular.','',`
    <div class="inside-wrap inside-privacy">${heading('Privacidade.')}
      <section><h2>Contato pelo WhatsApp</h2><p>As preferências selecionadas e os textos digitados na página de visita são usados no seu navegador para preparar uma mensagem. O site não mantém um cadastro nem envia esses campos a um servidor da Ocular.</p><p>Ao abrir o WhatsApp, o texto preparado é incluído no link para esse serviço. Você pode revisar a mensagem e decide se deseja enviá-la. O WhatsApp tem suas próprias regras de privacidade.</p></section>
      <section><h2>Mapa e links externos</h2><p>A página de visita oferece um link para abrir a localização no Google Maps. A home contém um mapa integrado. Esses serviços podem processar informações de navegação, como o endereço IP, conforme suas próprias políticas.</p><p>Os links para Google Maps, Instagram, Facebook e WhatsApp levam a serviços de terceiros.</p></section>
      <section><h2>Navegação neste site</h2><p>Esta versão não inclui ferramentas de publicidade ou medição de audiência, nem grava as preferências do formulário em cookies ou no armazenamento local. O serviço usado para hospedar o site pode manter registros técnicos de acesso.</p></section>
      <section><h2>Fale com a Ocular</h2><p>Para dúvidas sobre os dados compartilhados durante o atendimento, entre em contato pelo e-mail <a href="mailto:optica-ocular@hotmail.com">optica-ocular@hotmail.com</a> ou pelo telefone <a href="tel:+554130169654">(41) 3016-9654</a>.</p></section><p class="inside-note">Atualizado em 25 de setembro de 2026.</p>
    </div>`);

  page('404','Página não encontrada','Encontre óculos, lentes e informações de contato da Óptica Ocular.','',`<div class="inside-wrap inside-error">${heading('Página não encontrada.','O endereço pode ter mudado. Escolha por onde continuar.')}<div class="inside-related">${link('index.html','Voltar ao início','button')}${link('oculos.html','Explorar óculos')}</div></div>`);
};
