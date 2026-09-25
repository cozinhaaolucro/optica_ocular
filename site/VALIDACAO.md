# Validação — 23/09/2026

## Refinamento v2

- Inspeção visual da página inteira em desktop e da abertura em 390 px.
- Larguras 320, 390, 768 e 1024 px sem transbordamento horizontal.
- Fontes locais carregadas; imagens e âncoras internas verificadas sem falhas.
- Menu móvel abre e fecha; abas de lentes atualizam o painel; categoria solar seleciona corretamente o interesse no formulário.
- Console sem erros ou avisos durante a revisão.
- PNGs originais preservados; JPEGs para exibição somam menos de 1 MB, contra aproximadamente 7 MB dos originais.

## Versão inicial

- Servidor local respondendo em http://localhost:4173; HTML, CSS, JS e imagens utilizados retornam HTTP 200. Código do servidor não é exposto por HTTP (404).
- `node --check app.js` e `node --check server.cjs`: aprovados.
- Inspeção visual da abertura desktop e mobile (390 px); ajuste da tipografia móvel para duas linhas.
- Verificação de largura em 390 e 768 px sem rolagem horizontal; identificada e corrigida a largura do cabeçalho em 320 px.
- Todas as imagens carregadas e todas as âncoras internas resolvidas no DOM.
- Menu mobile abre e fecha ao selecionar uma seção; atributo de expansão atualizado.
- Abas de lentes alternam o conteúdo por clique e setas do teclado.
- Categoria de óculos de sol seleciona o interesse correspondente no formulário.
- Formulário produz URL do WhatsApp para 5541997502091 com interesse codificado corretamente. Link de continuação exibido para contornar bloqueadores de pop-up. Nenhuma mensagem enviada; atendimento externo não simulado.
- Perguntas frequentes expandem o conteúdo; diálogo de privacidade abre e fecha.
- Nenhum erro ou aviso registrado no console durante a inspeção funcional.
- Links de rotas, telefone, e-mail e redes conferidos no conteúdo; não foi realizado atendimento, ligação ou envio externo.
- Site atual em produção preservado. Sem instalação de pacotes ou dependências de execução além de Node opcional para servir via HTTP.

## Ajustes finos
Parallax leve limitado à foto, com requestAnimationFrame, listener passivo, pausa fora da tela e respeito a movimento reduzido. Removidos números decorativos, slogans sobre a foto, faixa superior e assinatura gigante. Marca centrada por compensação do espaço interno original (-3,3951% horizontal e -1,375% vertical). WhatsApp circular sem texto. Mapa Google integrado com carregamento tardio e informação de privacidade atualizada. Abas conferidas sem erro de console; revisão móvel incluiu correção do empilhamento de história e FAQ.
