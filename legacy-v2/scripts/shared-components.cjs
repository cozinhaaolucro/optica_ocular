/* As páginas internas reutilizam o HTML dos componentes da home. */
module.exports = ({home, generic}) => {
  const originalHeader=home.match(/<header class="header">[\s\S]*?<\/header>/)[0];
  const originalFooter=home.match(/<footer class="reveal">[\s\S]*?<\/footer>/)[0];
  const originalFloating=home.match(/<a class="floating-contact"[\s\S]*?<\/a>/)[0];
  const resolveHomeLinks=html=>html.replaceAll('href="#inicio"','href="/"');
  function header(active){
    let html=resolveHomeLinks(originalHeader).replace('id="nav"','id="site-nav"').replace('aria-controls="nav"','aria-controls="site-nav"');
    if(active)html=html.replace(`href="${active}"`,`href="${active}" aria-current="page"`);
    return '<a class="skip" href="#conteudo">Pular para o conteúdo</a>'+html;
  }
  function footer(){
    const links='<div class="inside-footer-links" role="navigation" aria-label="Mais informações"><a href="oculos-de-grau">Óculos de grau</a><a href="oculos-de-sol">Óculos de sol</a><a href="duvidas">Dúvidas frequentes</a><a href="privacidade">Privacidade</a><span>Fotografias ilustrativas.</span></div>';
    return resolveHomeLinks(originalFooter).replace('class="reveal"','class="inside-footer"').replace('</footer>',links+'</footer>')+originalFloating.replace('href="https://wa.me/5541997502091"',`href="${generic}"`);
  }
  return {header,footer};
};
