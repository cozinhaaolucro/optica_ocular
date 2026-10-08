# Óptica Ocular — próximos passos

Atualizado em 8 de outubro de 2026.

O site conta com catálogo, carrinho, solicitações e simulador de lentes. Nesta entrega, a operação foi conectada ao PostgreSQL e ao Storage do Supabase para funcionar na Vercel. O painel reúne visão geral, catálogo, variantes, fotos, preços e estoque, atendimentos, clientes, lentes, histórico e operação.

## Situação das etapas 1 a 5

| Etapa                        | Situação                                                                                                                                                                         | O que falta para a operação comercial                                                                                                              |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Publicação e persistência | Implementado PostgreSQL remoto, fotos no Storage e migração automática protegida. SQLite mantido somente como alternativa local.                                                 | Definir backup e retenção no plano Supabase; comprovar restauração em ambiente separado.                                                           |
| 2. Interface e jornada       | Home, marcas, simulador com altura estável, preços legíveis, coleções por teclado/toque e confirmação recuperável. Painel dedicado com navegação e estados de carregamento/erro. | Validação de apresentação e jornada pelo cliente, incluindo seus dispositivos habituais.                                                           |
| 3. Catálogo real e lentes    | Cadastro completo, fotos 4:3, SKU único, revisão simultânea, preços e estoque. Preços de lentes editáveis no painel e aplicados no simulador.                                    | Receber e conferir fotos, modelos, variantes, medidas, valores e estoque reais. Aprovar as linhas de lentes oferecidas.                            |
| 4. Operação consultiva       | Solicitações persistidas, etapas de atendimento, notas internas privadas, clientes, busca, filtros, paginação, CSV e histórico.                                                  | Nomear responsável, combinar prazo de resposta e revisar políticas com a loja. Canal automático de notificações depende de escolha e configuração. |
| 5. Pagamento                 | Estrutura e regras comerciais preparadas; cobrança desativada conforme combinado.                                                                                                | Cliente escolher provedor. Integrar checkout, webhooks, cancelamentos, reembolsos e homologar antes de cobrar.                                     |

## Apresentação ao cliente

1. Mostrar a jornada pública de modelo até solicitação e o simulador de lentes.
2. Apresentar a visão geral e abrir a ficha de um modelo no painel.
3. Demonstrar estoque, filtros, atendimento e histórico, usando dados de homologação identificados em ambiente separado.
4. Mostrar os preços de lentes e explicar que a equipe poderá atualizá-los sem novo deploy.
5. Fechar a coleta do catálogo real, a rotina de resposta e a decisão futura de pagamento.

Os 33 cadastros iniciais são referências, sem fotografias comerciais aprovadas, ficha conferida ou estoque real. Não há receita de vendas inventada no painel. Lentes continuam por atendimento separado; a entrega inicial é retirada na loja.

## Depois da aprovação

Cadastre primeiro um conjunto pequeno de modelos reais, complete as fotografias e confira cada variante. Receba uma solicitação de homologação pela jornada pública, acompanhe-a até a conclusão e confirme o procedimento da equipe. Defina backup, restauração e responsabilidade pelos dados. Só então avance para a integração de pagamento escolhida pelo cliente.

Guia da equipe: [GUIA-PAINEL.md](GUIA-PAINEL.md). Configuração e recuperação: [OPERACAO-ECOMMERCE.md](OPERACAO-ECOMMERCE.md). Auditoria anterior: [qa/ecommerce-reaudit-2026-10-07.md](qa/ecommerce-reaudit-2026-10-07.md); ela registra o estado anterior à integração Supabase e não representa o painel atual.
