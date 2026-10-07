# Verificação da implementação — etapas 1–5

7 de outubro de 2026. Workspace local; Next.js 16.4.0, React 19.3.0, Node 24.11.1. Build e servidor de produção local, sem publicar site ou integrar cobrança externa.

## Escopo

Sol e armações; lentes por atendimento; retirada inicial. Catálogo de 33 referências sem fotos/ficha/estoque/preço confirmados. Pagamento adiado pelo usuário até validar com o cliente. O fluxo concluído é uma solicitação de orçamento, sem cobrança ou reserva.

## Verificações automatizadas

| Verificação | Resultado |
| --- | --- |
| `npm run build` | Compilação e TypeScript aprovados. Sem o aviso de tracing de todo o projeto; resta o aviso do runtime sobre `node:sqlite` experimental. |
| `npm run lint` | Sem erros ou avisos no app, testes e scripts operacionais ativos. |
| `npm test` | 14 cenários aprovados em banco temporário. |
| `npm run test:http` | 8 grupos de verificações aprovados com servidor, banco e senha temporários na porta 4010. |
| `npm audit --omit=dev` | Nenhuma vulnerabilidade nas dependências de produção no relatório desta entrega. |
| `git diff --check` | Sem erros de whitespace nos arquivos rastreados. O workspace mantém a migração e as alterações anteriores do usuário. |

Testes comerciais cobrem: seed pendente, preço autoritativo, rejeição de quantidade fracionada/duplicada/manipulação de total, orçamento sem reserva, idempotência mesmo após editar preço, reserva e falta de estoque, rollback de múltiplos itens, revisão concorrente do cadastro, devolução de estoque uma vez, eventos tardios, moeda/valor/identificador de pagamento, impossibilidade de pagar orçamento, SKU e fotos incompletos, variante reservada, acesso por senha, limite de tentativas, origem/tamanho do JSON e métricas opcionais sem campos pessoais.

HTTP cobre: catálogo/configuração, origem e schema, criação e leitura protegida de orçamento, cookie HttpOnly, repetição sem novo pedido, total pelo banco, sessão administrativa e logout, leitura de solicitações, cadastro incompleto, upload válido/inválido e SVG disfarçado de JPEG, formato 4:3, otimização da mídia pelo Next em 640 px, caminho de mídia inválido, páginas públicas, JSON-LD sem oferta demonstrativa, robots de staging, rota inexistente sem indexação e telemetria desativada.

Em Next 16.4, `notFound()` após o início do streaming pode devolver HTTP 200 com tela de erro e meta noindex. O teste observa o comportamento documentado; não aceita catálogo vazio em lugar da tela de erro.

## Navegação real no navegador

- Home → categoria → produto → carrinho → formulário → confirmação de orçamento executado com dados fictícios locais. Uma solicitação identificada como “Validação local Ocular” ficou no banco local para conferência; não foi enviada mensagem externa.
- Busca “Vogue” retornou dois produtos. Ordenação decrescente colocou VO5324 antes de VO5295. Busca e ordem persistiram na URL e após reload. Busca sem resultado exibiu orientação e permitiu limpar filtros.
- Fotos frontal/lateral/detalhe trocaram corretamente; nenhum estado de opacidade condicionado a carregamento. Placeholders carregados e visíveis. Imagem e nome do card abrem o modelo.
- Depois de selecionar detalhe no modelo Ana Hickmann, a navegação para Aramis A501 carregou o título correto e reiniciou a galeria na frontal, sem erros de console.
- Carrinho conservou quantidade 2 após reload e exibiu R$ 1.198,00 para o modelo de referência de R$ 599,00. Preços foram inspecionados como Manrope, sem itálico, com números alinhados; 17–18 px no carrinho móvel.
- Menu móvel moveu foco para o primeiro link, bloqueou scroll enquanto aberto, fechou com Escape e permitiu navegar para lentes. Abas de lentes responderam a ArrowRight.
- Simulador: visão simples → HOYA → busca Hilux → 29 configurações. PNX + Hi-Vision Meiryo retornou R$ 1.099,00. Na versão final, Orgânico + UVControl + Sensity 2 também retornou uma configuração de R$ 1.099,00; preço por par, índice com vírgula, mensagem específica e aviso de confirmação pelo atendimento. Limpeza e retorno de etapa funcionaram.
- Tela de acesso administrativo verificada visualmente; catálogo, sessão, upload e solicitações autenticadas verificados por API. A interação visual de edição após login ainda requer conferência do responsável no painel.
- Não foram capturados erros/warnings de console na amostra de navegação consultada.

## Responsividade

Simulador inspecionado em viewports 360, 390, 768 e 1280 px. Larguras do documento/scroll foram, respectivamente, 345/345, 375/375, 753/753 e 1265/1265, descontada a barra de rolagem. Carrinho e formulário usados em 390 px; home inspecionada em 360 e 1280 px. Catálogo móvel usado em 360 px: abrir filtros, buscar Vogue e recolher os controles funcionou; largura/scroll 345/345. A quebra do título e a separação entre frases da home foram corrigidas e conferidas no fechamento.

Não foi executada uma auditoria formal de contraste/WCAG, leitor de tela ou zoom nativo de 200%. Não há relatório Lighthouse nem percentil 75 de métricas de campo. A instrumentação está preparada e desligada por padrão; os objetivos de desempenho do roadmap continuam critérios de homologação em staging/produção.

## Backup

`npm run backup` criou `backups/2026-10-07T04-14-06-600Z/ocular.sqlite`. Leitura isolada confirmou `PRAGMA integrity_check = ok`, 33 produtos e uma solicitação local. A rotina copia mídia quando houver; os uploads de teste HTTP ficaram apenas no banco/diretório temporários. O procedimento completo de recuperação e alertas no host de produção ainda precisa ser homologado no ambiente escolhido.

## Evidências visuais

- [Home desktop](ecommerce-home-desktop.jpg)
- [Produto e valores](ecommerce-product-desktop.jpg)
- [Comparação de lentes](ecommerce-lenses-desktop.jpg)
- [Confirmação móvel de orçamento](ecommerce-quote-mobile.jpg)

## Pendências para vender e publicar

Fotos e dados reais aprovados; vigência da tabela de lentes; provedor e integração de pagamento; regras de reserva/expiração; canais de notificações; domínio e volume durável; políticas comerciais finais; staging e monitoramento externo. Não há pagamento, frete contratado ou notificações externas ativados.

A auditoria completa de dependências ainda aponta cinco entradas de alta severidade na cadeia de desenvolvimento do lint, originadas em `braces` e sem versão corrigida publicada. A produção está limpa no relatório separado. O downgrade incompatível sugerido pelo npm não foi aplicado; detalhes e fonte primária estão no guia de operação.
