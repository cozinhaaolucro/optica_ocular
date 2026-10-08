# Ativação de lentes e promoções — 08/10/2026

## Alterações

- Preço normal e promocional por variante de produto; normal riscado na loja quando a oferta é válida. Catálogo, filtros, carrinho e orçamento usam o mesmo preço efetivo. Encerrar uma oferta não altera solicitações anteriores.
- Lentes com ativação, preço normal e promocional por configuração. Marcas, tipos, linhas e opções sem configurações ativas saem da seleção do simulador.
- Filtros de marca, tipo, linha, busca e situação no painel de lentes. Ações atômicas em lote: ativar, ocultar, descontar, encerrar ofertas e reajustar preço normal, inclusive para marcas com mais de 1.000 configurações.
- Revisões protegem contra edições concorrentes. Valores promocionais iguais ou superiores ao normal, preços inválidos e contagens divergentes são rejeitados sem alterações parciais.
- CSVs incluem preços promocionais e ativação; guia da equipe atualizado. Promoções são encerradas manualmente, sem expiração automática.

## Verificações concluídas

- `npm run lint`: passou.
- `npm test`: 30 testes passaram.
- `npm run build`: compilação e TypeScript passaram.
- `npm run test:http`: 15 grupos passaram; preço riscado em produto/coleção, orçamento com valor promocional, histórico preservado, promoções e ativação de marcas no simulador, autenticação e proteção de origem.
- `npm run test:preview`: todas as 33 fichas e rotas públicas passaram em modo Vercel sem armazenamento local.
- `npm run test:supabase`: promoção de produto e orçamento, promoção e ativação de lentes, retirada de marca vazia da API pública e reativação conferidas em uma transação revertida. Upload temporário conferido e removido.
- Navegador local autenticado: filtros de lentes, preço inválido sinalizado, prévia de desconto, ativação e descarte conferidos sem salvar ofertas em dados reais. Campos de promoção presentes na ficha e no ajuste de estoque.
- Tela de computador (1365 × 900) e celular (390 × 844): sem transbordamento lateral da página; tabela mantém rolagem interna. Override de viewport removido ao terminar.

Dados de referência, fotos e estoque continuam aguardando a conferência da loja. Nenhuma promoção demonstrativa foi deixada ativa no banco do cliente.
