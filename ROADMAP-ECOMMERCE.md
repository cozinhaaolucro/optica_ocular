# Óptica Ocular — auditoria e roadmap de e-commerce

Auditoria inicial e implementação: 7 de outubro de 2026. O diagnóstico abaixo preserva o estado auditado. A execução das etapas 1–5, com o escopo confirmado pelo cliente, está registrada a seguir.

## Execução das etapas 1–5

Decisões confirmadas: sol e armações; lentes por atendimento separado; retirada inicial; placeholders no formato das fotos enquanto faltam dados reais; pagamento na última perna após validação com o cliente.

| Etapa | Resultado implementado | Dependência de abertura comercial |
| --- | --- | --- |
| 1. Estabilizar | Layout React compartilhado sem scripts globais; imagens com fallback; vitrine em grade; componente de carrossel corrigido; carrinho validado/persistido com quantidades limitadas; menu com teclado/foco; preços BRL em Manrope; lint do app corrigido. | Nenhuma conta externa para validar a jornada local. |
| 2. Catálogo confiável | SQLite como fonte única; painel de cadastro; SKU/variantes/cor/medidas/material/preço/estoque; revisão concorrente; upload frontal/lateral/detalhe WebP 4:3; ficha e preço com validação explícita. | Loja entrega fotos, confirma os 33 modelos de referência, variantes, preços e estoque. Os placeholders não liberam validação. |
| 3. Experiência comercial | Home editorial com seleção visível, catálogo com busca/filtros/ordem na URL, estados vazios, galeria, ficha e CTA funcional; simulador de lentes em quatro etapas com busca e comparação por material, tratamento e tecnologia. | Loja confirma a tabela de lentes e o conteúdo comercial real. |
| 4. Operação | Checkout de orçamento sem conta, retirada, solicitação persistida e protegida, idempotência e cálculo pelo servidor; painel de solicitações; funções de reserva/conciliação/reembolso testadas; contrato neutro para o provedor. | **Pagamento deliberadamente adiado.** Integrar e homologar o provedor após escolha com o cliente; definir expiração, notificações externas e regras comerciais. Não existe venda paga ativada. |
| 5. Preparação | Metadata/canonical por rota, JSON-LD sem oferta não confirmada, robots/sitemap com chave de lançamento, páginas informativas, métricas opcionais, health check, backup e CI; validação em build e navegador. | Domínio/host e volume durável, revisão de políticas, staging, alertas externos e medição de campo antes de lançamento. |

Guia prático: [OPERACAO-ECOMMERCE.md](OPERACAO-ECOMMERCE.md). Verificação desta implementação: [qa/ecommerce-implementation-verification.md](qa/ecommerce-implementation-verification.md). O roteiro original abaixo continua útil para os critérios de homologação que dependem desses insumos.

Revisão final da apresentação: setas e avisos de preparação removidos, textos simplificados e faixa de marcas de óculos e lentes incluída na home. Evidências em [qa/final-visual-review.md](qa/final-visual-review.md).

## Diagnóstico

A identidade editorial, a história da loja e o atendimento consultivo são bons fundamentos. Hoje o site funciona como catálogo com carrinho, mas ainda não conclui uma venda: não existem checkout, pagamento, cálculo de entrega, pedido persistido ou gestão de estoque no código auditado. A prioridade é tornar a compra confiável e completar a operação, preservando a identidade visual.

Recomendação de escopo inicial: vender óculos de sol e armações com dados e estoque confirmados; conduzir lentes de grau pelo atendimento consultivo até existir um processo validado de receita, medidas, orçamento e produção. A loja deve confirmar esse escopo antes da integração comercial.

## Achados e evidências

P0 bloqueia uma jornada ou a abertura comercial; P1 compromete confiança, uso ou manutenção; P2 melhora descoberta e conversão.

| ID | Prioridade | Evidência atual | Impacto e ação |
| --- | --- | --- | --- |
| A01 | P0 | A página de produto chamava `useCart()` no servidor; navegação real resultou em erro de servidor apesar de o build passar. | **Corrigido nesta entrega:** botão movido para um Client Component. Manter cobertura de navegação real nas próximas entregas. |
| A02 | P0 | `src/app/carrinho/page.tsx`: botão “Finalizar Compra” sem ação; clicar mantém a mesma página. | Implementar checkout e pedido. Até isso existir, definir uma conclusão explícita de orçamento pelo atendimento, com itens e quantidades. |
| A03 | P0 | `src/data/products-data.json`: 33 produtos (16 grau, 17 sol), todos com a imagem `/assets/grau-isolado.png` e texto “Em estoque”. | A foto não identifica o modelo e o estoque é uma declaração estática. Validar preços, fichas e disponibilidade com a loja; cadastrar fotos reais por SKU antes de vender. |
| A04 | P0 | Não há API, banco, provedor de pagamento, frete ou backoffice no código atual. Preços e totais vêm do cliente/JSON. | Criar uma fonte comercial confiável. Recalcular preço e disponibilidade no servidor; jamais aceitar o total informado pelo navegador para cobrar. |
| A05 | P1 | Em página de produto, uma imagem já carregada (`complete=true`, largura natural 1200) permaneceu com classe `loading` e opacidade 0. `ProductImage.tsx` depende de `onLoad` para removê-la. | Corrigir o estado de imagens já carregadas durante a hidratação; testar cache quente/frio, falha, troca de `src` e navegação. |
| A06 | P1 | `styles.css`: componentes comerciais referenciam `--color-text-primary` e `--color-bg-light`, sem declaração dessas variáveis no CSS do projeto. | Unificar os tokens de texto, superfície, borda e foco. Valores receberam cor válida nesta entrega; outros componentes continuam pendentes. |
| A07 | P1 | `CartContext.tsx`: leitura de localStorage sem validação de esquema, gravação sem tratamento de erro, quantidades sem limites de estoque. A leitura e a primeira gravação ocorrem em efeitos separados. | Robustecer restauração e persistência, tratar armazenamento indisponível/dados inválidos e impor quantidades inteiras. Na amostra testada o carrinho persistiu após reload, mas mostrou brevemente o estado vazio. |
| A08 | P1 | Headers/footers repetidos; menus usam `#nav` ou `#site-nav`; quatro scripts globais manipulam o DOM fora do React. Links internos usam `<a>`. | Extrair layout compartilhado e migrar interações para componentes com ciclo de vida controlado. Migrar links com validação dos scripts após a navegação. |
| A09 | P1 | Ao selecionar o segundo produto, o slide ativo começa em x=1202, exatamente no limite direito do contêiner: sai da área visível. O flex horizontal é somado ao deslocamento individual. Slides inativos permanecem na árvore acessível; autoplay não pausa por foco. | Corrigir deslocamento, teclado, foco, pausa e movimento reduzido; preferir uma grade de produtos visível como principal vitrine. Validar visualmente cada slide. |
| A10 | P1 | Auditoria inicial de lint global: 138 erros/163 avisos, incluindo arquivos legados e vendor. Lint de `src` após as alterações: 103 erros/77 avisos; 102 erros de links e 1 de estado em efeito. | Delimitar o lint do produto ativo, corrigir a dívida e usar CI. Não desabilitar regras para esconder problemas. |
| A11 | P1 | Preços do catálogo/carrinho usavam `.toFixed(2)` e ponto decimal; preços do simulador usavam Cormorant. | **Corrigido nesta entrega:** formato BRL com duas casas; Manrope 600, números alinhados e sem itálico para valores. |
| A12 | P1 | Frete aparece como “A calcular”, mas o resumo já mostra “Total”; rodapé diz fotos ilustrativas; preços são de referência; indicador “Online” é fixo. | Explicitar escopo do preço (armação ou conjunto), frete e prazo antes da decisão. Usar informações de atendimento confirmadas, sem promessas automáticas. |
| A13 | P1 | Página de privacidade ainda descreve a versão de atendimento e não explica o carrinho em localStorage. Não há páginas comerciais de entrega, trocas ou garantias no app. | Atualizar os textos à operação real e validar as políticas comerciais com os responsáveis. Preparar tratamento de dados de receita antes de coletá-los. |
| A14 | P2 | Apenas metadata global; sem metadata por produto/categoria, canonical, sitemap, robots ou dados estruturados no código ativo. | Implementar descoberta e compartilhamento de produtos após validar o catálogo, usando preço e estoque da mesma fonte comercial. |
| A15 | P2 | Filtros têm teto fixo de R$ 2.000 e lista global de marcas; ausência de filtro persistido na URL. Sem instrumentação do funil no código auditado. | Derivar filtros do catálogo, preservar busca/ordem e medir as etapas da compra. Evitar filtros de marcas sem produtos naquela categoria. |

## Roadmap de execução

Sequência sugerida para uma pessoa de desenvolvimento com apoio de design e da loja. Esforços são estimativas de planejamento, em dias úteis, não compromissos de calendário. Fotos, fichas, contratos e credenciais podem aumentar os prazos. Responsáveis são papéis sugeridos.

| Etapa | Prioridade / esforço | Entregas | Dependências | Critério de conclusão |
| --- | --- | --- | --- | --- |
| 1. Estabilizar a jornada | P0/P1 · 3–5 dias | Resolver imagens, carrosséis, tokens, persistência do carrinho, menus e feedback de adição. Definir CTA funcional enquanto o checkout não existe. Corrigir lint do app ativo. | Desenvolvimento; confirmação do fluxo de atendimento pela loja. | Home → categoria → produto → carrinho sem erro; imagens visíveis com cache quente/frio; reload conserva itens; CTA tem resultado; build/lint passam; mobile e teclado validados. |
| 2. Tornar o catálogo confiável | P0 · 5–10 dias | Fonte única de produtos, SKU/variante, cor, medidas de lente/ponte/haste, material, fotos frontal/lateral/detalhe, conteúdo, preço e estoque confirmados. Galeria e disponibilidade real. | Loja fornece dados/fotos e define quem atualiza estoque; decidir arquitetura comercial. | Todos os itens do lançamento têm foto correspondente, SKU, variantes, preço e estoque aprovados. Sem imagem genérica apresentada como modelo real. |
| 3. Refinar a experiência comercial | P1 · 4–7 dias | Home com acesso rápido ao catálogo e seleção visível; grid consistente; imagem e nome clicáveis; busca, filtros úteis, ordenação, estados vazios; PDP com medidas, entrega, preço/parcelamento confirmado e CTA claro. Padronizar cabeçalho/rodapé. | Etapas 1–2; design. | Cliente encontra um item, entende o que compra e seu custo; navega por teclado; nenhuma ação essencial depende de hover; preços e CTAs legíveis no celular. |
| 4. Completar venda e operação | P0 · 10–20 dias | Checkout sem cadastro obrigatório, endereço, entrega/retirada, pagamento, cálculo autoritativo, pedido, estados de pagamento, notificações e painel de operação. Estoque reservado conforme regras comerciais. | Catálogo validado; contas/contratos do pagamento e frete; operação e políticas aprovadas. | Compra de teste chega ao painel; pagamento duplicado não duplica pedido; estoque impede venda indevida; rejeição, pendência, cancelamento e reembolso funcionam; custo final e prazo aparecem antes de pagar. |
| 5. Preparar lançamento | P1/P2 · 4–7 dias | Metadata por rota, sitemap/robots/canonical, dados estruturados coerentes, performance, acessibilidade, políticas comerciais e privacidade atualizadas, monitoramento de erros e eventos do funil. Homologação em staging. | Etapas 1–4; domínio de produção definido; revisão da loja. | Sem falhas críticas na homologação; produto, pedido e suporte conferidos; métricas e alertas testados; performance medida; checklist abaixo aprovado. |
| 6. Melhorar com dados | P2 · contínuo | Avaliações verificáveis, recomendação, recuperação de carrinho com consentimento adequado, favoritos e evolução da venda de lentes com acompanhamento técnico. | Pedidos reais, dados do funil e capacidade operacional. | Priorizar problemas observados de abandono, busca sem resultado e suporte; comparar melhorias com uma linha de base, sem metas inventadas de conversão. |

Etapas 2 e 3 podem avançar em paralelo à preparação de integrações; a cobrança só deve entrar após catálogo e operação validados. Não é necessário concluir funcionalidades da etapa 6 para lançar.

## Decisões comerciais que precisam ser resolvidas

- Quais produtos terão compra direta no lançamento: sol, armação, armação com lentes? O preço atual inclui quais componentes?
- Onde vivem preço, variante e estoque? Quem mantém esses dados e como sincroniza as vendas da loja física?
- Quais modalidades de entrega e retirada, regiões atendidas, prazos, pagamento e parcelamento a loja oferecerá?
- Como serão orçamento, receita, medidas, conferência técnica e produção dos óculos de grau? Quem pode acessar esses dados e por quanto tempo?
- Quem trata pedido, alteração de estoque, devolução, suporte e comunicação ao cliente?

Escolher uma solução comercial com catálogo, pedidos e painel integrados, ou implementar esses serviços com responsabilidades explícitas. A interface Next.js pode continuar sendo a vitrine; a escolha da operação precisa anteceder a implementação do checkout.

## Direção visual

Preservar Cormorant nos títulos editoriais, a paleta neutra, os espaços e as fotografias de marca. Aplicar Manrope na informação comercial: preços, quantidade, frete, prazo, filtros e botões. A estética deve facilitar comparar produtos e comprar.

- Cards com proporção de imagem consistente, nome, marca, preço e ação previsíveis. Evitar empilhar carrosséis enormes antes da listagem.
- Página de produto com fotos reais, medidas e variantes; distinguir preço da armação e custo de lentes. Exibir condições de pagamento somente quando confirmadas.
- Mobile com filtros recolhíveis e resumo de compra claro. O contato flutuante não deve cobrir preço, CTA ou foco.
- Carrinho com subtotal, entrega e total devidamente identificados; apresentar o total final após a entrega ser calculada.
- A recomendação consultiva para lentes deve dar continuidade ao atendimento da loja, com explicação compreensível para o cliente.

## Critérios para chamar a entrega de pronta

- Fluxo de produção: catálogo → variante → carrinho → entrega → pagamento → confirmação → pedido no painel.
- Cobrir preço/estoque alterado durante a compra, pedido duplicado, erro de pagamento, atualização atrasada, cancelamento e reembolso. Cobrar com valores recalculados no servidor.
- Verificar 360, 390, 768 e 1280 px; zoom de 200%; teclado; foco visível; rótulos; mensagens de erro; contraste e movimento reduzido. Usar [WCAG 2.2](https://www.w3.org/TR/WCAG22/) como referência de acessibilidade, sem declarar conformidade sem auditoria específica.
- Performance alvo: LCP ≤ 2,5 s, INP ≤ 200 ms e CLS ≤ 0,1 no percentil 75, separados por mobile/desktop, conforme [Web Vitals](https://web.dev/articles/vitals). São metas futuras; esta auditoria não mediu resultados de campo nem Lighthouse.
- Build, lint do app e cenários essenciais da compra no CI; alertas de erro e pagamento; backup e processo de recuperação testados.
- SEO com título/descrição por produto, canonical, sitemap e dados estruturados correspondentes aos dados exibidos. Carrinho/checkout fora da indexação.
- Conteúdo, fotos, estoque, entrega, pagamento, trocas, garantia e privacidade revisados pela loja. Não publicar oferta com dados de demonstração.

## Entrega deste pedido

Implementados: tipografia monetária consistente; formato brasileiro em home, catálogo, produto, carrinho e filtros; duas casas no simulador de lentes; botão de carrinho isolado no cliente para remover o erro de servidor. O filtro de preço recebeu rótulo associado e layout que acomoda os valores completos.

Na execução seguinte, os achados técnicos foram tratados conforme a tabela “Execução das etapas 1–5”. O checkout agora conclui uma solicitação de orçamento, e o painel mantém catálogo e solicitações. Fotos/dados reais, pagamentos, políticas finais e infraestrutura externa permanecem dependências explícitas para vender e lançar.

Evidências de verificação e limitações: [qa/ecommerce-audit-verification.md](qa/ecommerce-audit-verification.md). Resultado de lint: [qa/ecommerce-lint.json](qa/ecommerce-lint.json).
