# Revisão final de apresentação

7 de outubro de 2026. Servidor de produção local em `http://localhost:3000`.

- Removidas as setas decorativas de links, botões e escolhas do simulador. Controles de quantidade, menu, filtros e galeria mantêm seus sinais funcionais.
- Removidos os avisos de catálogo em atualização na home e nas coleções, o aviso de fotos em preparação e os selos repetidos nos cards.
- Placeholders continuam em 1600 × 1200, proporção 4:3, com ilustração neutra, sem textos de preparação ou dimensões impressas.
- Ficha de produto oculta campos sem dados. Descrições de rascunho só aparecem depois de a ficha ser conferida; o cadastro continua preservado no painel.
- Textos de navegação, orçamento e páginas informativas simplificados. Preços não confirmados continuam identificados discretamente como estimativas; lentes de grau ficam à parte.
- Home inclui os 22 logos do ZIP fornecido e seis marcas/tecnologias de lentes: HOYA, Rodenstock, ZEISS, Varilux, Crizal e Transitions.
- Arquivos do ZIP conferidos por SHA-256 contra os originais do projeto. Versões WebP da faixa removem margens brancas; originais preservados. Logos mantêm proporção, nomes acessíveis e links para coleções filtradas ou página de lentes.
- Após o ajuste solicitado, todos os 28 logos ficam em uma única linha, com um separador discreto para as lentes. No desktop, a posição do mouse controla o movimento horizontal; sair da faixa ou usar o teclado interrompe o movimento. No celular, a faixa mantém rolagem horizontal manual. Preferência por movimento reduzido impede a animação ao passar o mouse.

## Verificação

Build de produção e lint aprovados. Os 14 testes de domínio e as oito verificações HTTP passaram.

Navegador: home em 360, 390, 768 e 1280 px sem transbordamento da página; 28 logos carregados; clique em Vogue abre os dois modelos filtrados; produto, carrinho e orçamento sem avisos de atualização, campos pendentes ou setas decorativas. Menu móvel e escolhas de marcas no simulador funcionam. Item de teste removido do carrinho ao terminar; nenhuma mensagem externa enviada.

Evidências: `final-brands-desktop.png` e `final-brands-mobile.png` nesta pasta. A revisão não substitui a validação de fotos, ficha, estoque, tabela de preços e políticas pela loja, nem a homologação do pagamento, que continua adiada.

## Ajuste da faixa horizontal

Build de produção e lint dos componentes aprovados. No navegador, os 28 logos ocupam uma única linha em 1280 e 390 px, sem transbordamento da página. Movimento ao posicionar o mouse conferido pela mudança de `scrollLeft` de 3271 para 2673; sair da faixa interrompeu o movimento em 2667, que permaneceu estável na observação seguinte. A tecla de seta direita moveu a faixa no celular. A evidência atual está em `hover-brand-strip.png`; as duas imagens anteriores registram a primeira apresentação.

## Lapidação final — 07/10/2026

- Uma seção de lentes na home e em /lentes, mantendo o simulador e os seis logos de lentes já disponíveis no projeto.
- Painel do simulador com 520px de altura em todas as etapas; conteúdo maior tem rolagem interna. Trocar a etapa retorna a rolagem ao início sem deslocar a página.
- 1.142 configurações incluídas para Varilux, Eyezen, Essilor, Stellest e KODAK a partir da tabela Essilor fornecida. O usuário solicitou explicitamente os valores dessa edição para a loja, sem mensagens de vigência, até atualizar a tabela. A fonte original não foi alterada.
- Importação reproduzível em scripts/import-essilor.py e rastreabilidade por página em qa/essilor-source-map.json. Crizal é tratamento; Transitions é tecnologia nas configurações.
- Faixa de óculos com 22 marcas, imediatamente após a hero e com largura total; removida a faixa de informações anterior e o título visual da faixa.
- Movimento contínuo a 34px/s, com ajuste suave de sentido/velocidade pelo mouse. Cópia visual permite continuidade; é ocultada da árvore de acessibilidade e da navegação por Tab. Movimento pausa fora da área visível, em página oculta, ao usar teclado/toque e com preferência por movimento reduzido.
- Ray-Ban e Evoke preservam cores e fundo originais. Outros fundos claros são neutralizados por filtros SVG de renderização; arquivos originais preservados.
- CTAs da hero: Armações de grau e Óculos de sol, lado a lado. Removidos separadores decorativos e componente educativo de lentes duplicado.
- A pedido do usuário, não foi feita outra rodada de validação visual após estes últimos ajustes. Capturas anteriores documentam versões anteriores.
