# Verificação da auditoria e dos preços

Data: 7 de outubro de 2026. Ambiente: build local de produção, Next.js 16.4.0. Verificação funcional e visual por navegador; não constitui certificação de segurança, acessibilidade ou operação comercial.

## Comportamento validado

- Antes da correção, categoria → produto resultou em erro de servidor `2435613753`; log confirmou chamada de `useCart()` no servidor. O build original já passava, portanto a falha só apareceu na navegação real.
- Após separar `AddToCartButton.tsx` como Client Component, o produto Ray-Ban Aviator Classic abriu com preço R$ 899,00 e foi adicionado ao carrinho.
- Aumento para duas unidades recalculou subtotal/total para R$ 1.798,00. O mesmo valor permaneceu após reload.
- Clique em “Finalizar Compra” manteve a URL `/carrinho` e o resumo sem mudança. Não existe conclusão comercial implementada.
- Catálogo de sol exibiu 17 produtos com BRL, vírgula decimal e separador de milhares. Busca “Clubmaster” retornou um produto, com R$ 1.199,00.
- Filtro de preços exibe R$ 0,00 e R$ 2.000,00 em duas colunas, com slider abaixo e rótulo associado.
- Simulador: Visão Simples → HOYA → Hilux; valores do produto e das configurações foram exibidos com duas casas decimais.
- Estilo computado de produto e simulador: Manrope, peso 600, `lining-nums tabular-nums`.
- Inspeção visual desktop (viewport padrão, aproximadamente 1265 × 713) e mobile (390 × 844). Valores do simulador permaneceram legíveis; contato flutuante pode sobrepor as últimas linhas, registrado para revisão no roadmap.
- Filtro de preço verificado em desktop e mobile. A margem nativa do slider foi removida para não exceder a largura disponível.

## Verificação técnica

- `npm run build`: passou, incluindo TypeScript e geração de páginas, após a mudança de tipografia e extração do botão.
- `npx eslint src/components/AddToCartButton.tsx src/lib/currency.ts src/components/ProductFilters.tsx src/components/CategoryProducts.tsx`: zero erros, três avisos de variáveis/propriedades já não utilizadas em CategoryProducts.
- `node --check public/lentes-cfg.js`: passou.
- `npm run lint` inicial: falhou com 138 erros/163 avisos, incluindo legado/vendor. `npx eslint src --format json --output-file qa/ecommerce-lint.json`: 103 erros/77 avisos no app ativo; 102 erros de links internos e um de setState em efeito. Não corrigidos neste pedido; backlog detalhado no roadmap.
- O checkout, pagamento, estoque real, frete, envio de mensagens e produção não foram implementados nem executados.
- Não houve medição de Lighthouse, Core Web Vitals de campo, auditoria completa WCAG ou testes em dispositivos físicos. As metas do roadmap são critérios futuros.

## Falhas adicionais reproduzidas

- Imagem de produto com `complete=true`, `naturalWidth=1200`, classe `loading` e opacidade 0. Continua pendente em ProductImage.
- Segundo slide ativo do carrossel de sol com início em x=1202 e contêiner terminando em x=1202: fora da área visível. Continua pendente em ProductCarousel.
- Estado vazio do carrinho apareceu brevemente antes da restauração; persistência funcionou na amostra testada.

## Evidências visuais

- [Preços de lentes no desktop](precos-lentes-desktop.jpg)
- [Configurações e preços no celular](precos-lentes-mobile.jpg)
- [Resultado de lint do app](ecommerce-lint.json)

Os itens adicionados durante o teste foram removidos pelo botão da interface ao concluir a validação. Nenhum pedido ou pagamento foi gerado.
