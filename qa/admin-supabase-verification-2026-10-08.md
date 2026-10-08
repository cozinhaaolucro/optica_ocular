# Painel administrativo e Supabase — 08/10/2026

## Entrega

- PostgreSQL remoto como persistência da Vercel, com schema privado `ocular`, sete tabelas, RLS e acesso negado às roles `anon` e `authenticated`.
- Migração repetível, início com 33 modelos de referência e transações coordenadas entre instâncias.
- Fotografias WebP no bucket público `ocular-products`; somente arquivos de produtos, sem dados de clientes.
- Painel dedicado: visão geral, catálogo, preços e estoque, atendimentos, clientes, lentes, histórico e operação.
- Pesquisa, filtros, paginação, CSV, duplicação como rascunho, exibição em lote, upload de fotos e variantes.
- Ajustes de preço/estoque com motivo e revisão; etapas de atendimento e notas internas privadas.
- Preços de lentes persistidos e retornados pelo simulador, com revisão e reajuste de resultados filtrados.
- Acesso local corrigido para aceitar a própria origem de localhost quando o ambiente contém o domínio público. Na Vercel, a origem pública configurada continua obrigatória.

## Verificações automatizadas

- Lint: sem avisos.
- Build Next.js 16.4 / TypeScript: aprovado.
- 25 testes: regras comerciais, estoque concorrente, revisão de cadastro, atendimento privado, reajuste de lentes, CSV e migração PostgreSQL com RLS.
- 13 verificações HTTP: catálogo, autenticação, proteção de origem, orçamento idempotente, privacidade, upload, rotas, dashboard, estoque, atendimento, operação em lote, preços de lentes e logout.
- Prévia sem disco gravável: rotas públicas e todas as 33 fichas renderizadas.
- Auditoria de dependências de produção: zero vulnerabilidades reportadas.
- Varredura dos arquivos da alteração: nenhum valor de credencial local encontrado.

## Conexão real

O comando `npm run test:supabase` conferiu catálogo, estoque, atendimento e preços de lentes em uma transação revertida. A quantidade de produtos permaneceu igual ao final. Uma imagem temporária foi enviada, lida pelo endpoint público do Storage e removida em seguida. Não foram deixados produtos, pedidos ou preços de teste no banco.

O login HTTP em localhost autenticou com a credencial de `.env.local`; o dashboard retornou 33 modelos e PostgreSQL. Nenhum segredo foi impresso na verificação.

## Limites

Não há integração de pagamento ou notificações externas. O catálogo ainda depende das fotos, variantes e valores comerciais fornecidos pela loja. A restauração de backup em outro projeto ainda precisa ser homologada. Os testes de funções e de conexão não substituem a aprovação do cliente ou a conferência clínica de lentes.

## Navegador autenticado

Revisão local na porta 4012, com acesso realizado pelo responsável. As oito seções abriram. Busca por Ray-Ban retornou três modelos; a ficha exibiu dados, três posições de foto e variantes. O ajuste de estoque abriu com preço, saldo e motivo. O filtro Varilux + XR encontrou 170 configurações com os valores editáveis. Atendimentos e Clientes apresentaram estados vazios; Histórico e Operação carregaram registros e serviços reais.

A sidebar foi alterada para mostrar apenas o símbolo original da Ocular. A página foi conferida em viewport desktop de 1365 × 900 e celular de 390 × 844. Não houve overflow horizontal do documento; navegação e tabelas mantêm rolagem interna. Nenhum dado comercial foi alterado pela revisão visual.
