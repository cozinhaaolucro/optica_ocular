# Óptica Ocular — site completo

Entrega de 25/09/2026. A landing page continua como home. Seus textos, imagens, estilos e animações foram preservados; somente quatro destinos do menu foram conectados às páginas internas.

## Abrir

- Home: http://localhost:4173/
- Coleções: http://localhost:4173/oculos.html
- Grau: http://localhost:4173/oculos-de-grau.html
- Sol: http://localhost:4173/oculos-de-sol.html
- Lentes: http://localhost:4173/lentes.html
- História: http://localhost:4173/sobre.html
- Visita e contato: http://localhost:4173/visite.html
- Dúvidas: http://localhost:4173/duvidas.html
- Privacidade: http://localhost:4173/privacidade.html

Na pasta `site`, execute `npm start` para iniciar o servidor em 127.0.0.1:4173. Se já estiver ativo, use o endereço existente. Os HTMLs também podem ser abertos diretamente. WhatsApp, redes sociais e rotas dependem de internet.

## Estrutura

A home usa `index.html`, `styles.css`, `app.js` e seus recursos originais. As páginas internas carregam o mesmo `styles.css` e reutilizam o HTML do cabeçalho, do rodapé e do botão flutuante da home. `interiores.css` cuida apenas do conteúdo interno e do encaixe do cabeçalho em telas menores que 380 px. Nenhum arquivo da home foi alterado nesta revisão.

O gerador `scripts/build-pages.cjs` reúne o conteúdo de `scripts/page-content.cjs` e os componentes de `scripts/shared-components.cjs`. Execute `npm run pages` após editar esses arquivos. O gerador não reescreve a home.

As internas têm títulos diretos e conteúdo específico: Óculos apresenta as duas categorias; Grau e Sol detalham cada escolha; Lentes reúne as opções em abas; História apresenta a trajetória; Visita concentra endereço, horários e contato. Foram removidos os grandes blocos promocionais, chamadas repetidas, numerações decorativas, legendas verticais e a colagem de retratos de `/oculos`.

- `npm run check`: sintaxe, links, imagens, âncoras, integridade da home e comportamento HTTP.
- `npm run build`: pacote estático na pasta `dist`, somente com os recursos públicos necessários.
- `scripts/connect-home.cjs`: aplica exclusivamente os quatro destinos de navegação, com verificação contra a cópia original.

## Funcionalidades

Navegação entre páginas, menu responsivo com Escape e controle de foco, abas de lentes por teclado, FAQ com busca sem acentos e filtros, contato com prévia de mensagem e acesso direto à rota no Google Maps. Nenhuma mensagem é enviada automaticamente.

O conteúdo, as dúvidas e os contatos permanecem disponíveis sem JavaScript nas páginas internas. Não há checkout, inventário de estoque ou backend de coleta. Preços, condições e disponibilidade são consultados no atendimento.

## Ensaio fotográfico

Cinco fotografias coesas em preto e branco, geradas pela ferramenta integrada ImageGen. Modelos e produtos são ilustrativos.

- Originais: `ensaio-originais/`.
- Imagens responsivas WebP e compartilhamento JPEG: `assets/ensaio/`.
- Prompts completos e procedência: `ENSAIO-OCULAR.md`.
- Retratos: 1122 × 1402 px; fotografias horizontais: 1536 × 1024 px.
- Variantes responsivas preservam o conteúdo e não ampliam os originais.

A preparação opcional das imagens usa `scripts/prepare-images.cjs` com Sharp. As imagens prontas já estão incluídas; não é preciso instalar essa dependência para executar ou publicar o site.

## Verificação

Nesta revisão, foram verificadas as oito páginas internas em larguras de 320, 390, 820 e 1440 pixels: 32 combinações sem transbordamento horizontal ou imagens com erro. Abas, navegação por teclado, menu, busca, filtros e composição das mensagens foram conferidos. O ícone e as propriedades visuais do botão flutuante foram comparados com a home em 390 e 1440 pixels e são idênticos.

Relatórios atuais: `qa/verification.json`, `qa/responsive-refined.json` e `qa/functional-refined.json`. Os relatórios anteriores, a cópia original da home e os hashes dos recursos estão em `qa/` e não entram na distribuição.

## Distribuição

### GitHub e Vercel

Use esta pasta `site` como raiz do repositório GitHub. O `.gitignore` exclui pacotes gerados, logs, fotografias originais, pesquisa e relatórios locais. Os HTMLs, recursos de `assets`, scripts e configurações devem acompanhar o repositório.

Na Vercel, importe o repositório. Se o conteúdo de `site` estiver na raiz do repositório, mantenha **Root Directory** em `.`; se o repositório contiver a pasta `site`, selecione `site`. O `vercel.json` já define **Framework: Other**, **Build Command: npm run build** e **Output Directory: dist**. Não são necessárias variáveis de ambiente nem um servidor Node em produção.

O build utiliza os HTMLs versionados. Ao alterar os templates das internas, rode `npm run pages` antes de enviar o commit. `npm run check` inclui uma auditoria local da home que depende dos registros originais em `qa/`; não é uma etapa de build da Vercel.

Depois do primeiro deploy, confira a URL de prévia e conecte o domínio `www.opticaocular.com.br`, já usado nos canônicos e no sitemap. Se o domínio final for outro, essas referências precisam ser atualizadas. A criação do repositório, o envio ao GitHub, o deploy e a conexão do domínio ainda dependem da conta e do projeto de destino.

O pacote `dist` contém o site pronto para hospedagem estática. Configure o domínio, HTTPS e a página `404.html` no provedor escolhido. Os canônicos e o sitemap usam `https://www.opticaocular.com.br`. A entrega é local; o site atual em produção não foi publicado ou alterado.

Os fontes, arquivos de pesquisa, relatórios, logs e fotografias originais ficam fora de `dist`. Licenças das fontes acompanham a distribuição.

## Referências factuais conferidas em 25/09/2026

- Dados comerciais, endereço, horários e marcas: https://www.opticaocular.com.br/
- História de Laércio: https://www.opticaocular.com.br/nosso-fundador
- Tipos de lentes: https://www.zeiss.com.br/vision-care/fatores-da-lente.html
- Lentes progressivas: https://www.zeiss.com.br/vision-care/precisa-de-lentes-novas/lentes-progressivas.html

Os textos não prometem prazos, adaptação garantida, estoque, descontos ou condições comerciais não confirmadas.
