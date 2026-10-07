# Óptica Ocular — roadmap atual do e-commerce

Atualizado em 7 de outubro de 2026, a partir do commit `f7ebdd3`.

A fase atual é a validação das telas pelo cliente. O catálogo público na Vercel agora usa os produtos de referência do projeto sem abrir SQLite, permitindo navegar por home, categorias, fichas e carrinho. O banco e a operação locais continuam presentes. Persistência publicada, dados comerciais aprovados e pagamento são etapas posteriores à validação.

A correção foi verificada com 17 testes, 8 verificações HTTP da operação local e renderização das 33 fichas sem disco gravável. Detalhes em [verificação da Vercel](qa/vercel-catalog-validation.md). Ainda não há cobrança real, e a mudança precisa de novo deploy para chegar ao domínio.

A checagem final também corrigiu o submenu Coleções por estado aberto, toque e teclado, além de acrescentar o espaço lateral nas linhas do simulador. A homologação visual do domínio publicado continua sendo o próximo passo após o deploy.

Diagnóstico e evidências: [nova auditoria](qa/ecommerce-reaudit-2026-10-07.md). O [roadmap anterior](qa/roadmap-anterior-2026-10-07.md) foi preservado como histórico; suas pendências não devem ser tratadas automaticamente como atuais.

## Escopo mantido

- Óculos de sol e armações como catálogo comercial inicial.
- Lentes por atendimento separado, com o simulador como apoio ao orçamento.
- Retirada na loja como entrega inicial.
- Fotos de produtos em proporção 4:3, correspondentes a cada modelo; placeholders enquanto o cadastro real não chega.
- Pagamento na última etapa, após escolha com o cliente.
- Valores fornecidos da Essilor usados como referência atual conforme orientação recebida; atualização posterior pela loja, sem acrescentar avisos de preparação à interface.
- Preservar a apresentação limpa, preços legíveis e decisões visuais já aprovadas.

## O que já está entregue

| Frente | Base existente |
| --- | --- |
| Experiência | Home, imagens isoladas nas categorias, faixa de marcas, catálogo com busca/filtros/ordem, ficha/galeria, carrinho e preços BRL. |
| Cadastro | Banco SQLite, painel, variantes/SKU/medidas/preço/estoque, revisão concorrente e upload WebP 4:3. |
| Orçamento | Contato sem criação de conta, retirada, total calculado no servidor, registro persistido, idempotência e confirmação protegida. |
| Lentes | Uma seção com simulador de quatro etapas e 4.347 configurações em oito grupos de marcas. |
| Base de operação | Testes de estoque e conciliação, contrato para futuro provedor, CI, health check, backup, metadata e políticas. |

Os 33 produtos locais continuam sem fotos cadastradas, verificação, preço confirmado e estoque positivo. Funções testadas de pagamento e arquivos de publicação não equivalem a operação comercial homologada.

## Após a validação do cliente — etapas 1 a 5

Os bloqueios comerciais abaixo se referem à abertura da operação. Não impedem a validação visual do catálogo de referência publicado. Durante essa validação, a prioridade é publicar a correção e revisar os fluxos de navegação e apresentação; persistência de orçamento e edição pelo painel não estão disponíveis no modo de catálogo da Vercel.

| Etapa | Prioridade / responsável sugerido | Entregas | Critério de conclusão |
| --- | --- | --- | --- |
| **1. Resolver a publicação e a persistência** | **P0** · desenvolvimento + responsável pela hospedagem | Definir destino. Para manter SQLite e mídia local, usar instância Node 24 com volume durável. Se a Vercel for mantida, adaptar banco e uploads para serviços externos. Configurar ambiente de homologação e domínio. | Um produto, uma foto e um orçamento sobrevivem a reinício e republicação. Banco e mídia têm backup e restauração comprovados em ambiente isolado. |
| **2. Corrigir o uso e homologar a interface** | **P1** · desenvolvimento + design | Corrigir Coleções por teclado/toque; fechamento e foco do submenu; recuperação segura da confirmação após perda de resposta. Conferir home estreita, faixa de marcas e as quatro etapas do simulador. Ajustar pausa/retomada sem poluir a apresentação. | Home → categoria → produto → carrinho → orçamento funciona com mouse, teclado e toque na hospedagem escolhida. Retry preserva um único orçamento e acesso à confirmação. Simulador mantém o tamanho e foco visível. |
| **3. Cadastrar o catálogo real e aprovar lentes** | **P0 para cobrança** · loja + cadastro/desenvolvimento | Receber fotos, SKU, variantes, medidas, preço e estoque de um primeiro conjunto real. Validar e publicar os itens prontos. Conferir internamente valores e linhas de lentes oferecidas; melhorar seleção por índice e combinações disponíveis. | Todos os itens do lançamento correspondem a modelos reais, com fotos e dados aprovados. O painel permite atualizações, e o servidor bloqueia venda de itens não aprovados. A equipe consegue reproduzir os orçamentos de lentes escolhidos para homologação. |
| **4. Preparar a operação consultiva** | **P1** · loja + desenvolvimento | Adicionar estados de atendimento, observações e busca/paginação de solicitações. Definir responsável e rotina de resposta; notificações conforme o canal acordado. Revisar políticas, configurar alertas e validar descoberta/metadata no domínio final. | A equipe recebe, encontra, acompanha e conclui um orçamento real de homologação. Contatos privados seguem protegidos; registros antigos continuam acessíveis; falhas e restauração têm procedimento conhecido. |
| **5. Integrar pagamento e abrir venda paga** | **P0 para cobrança** · cliente + loja + desenvolvimento | Escolher provedor na etapa final. Implementar criação de pagamento, webhooks autenticados, expiração de reserva, confirmação, falha/cancelamento/reembolso e notificações. Homologar sandbox e retirada. Habilitar cobrança apenas com catálogo e operação prontos. | Testes de pagamento aprovado, recusado, pendente, duplicado e atrasado; estoque/reserva coerentes; pedido visível à equipe; custo final claro; retirada e reembolso conferidos. Nenhuma cobrança duplicada ou venda indevida na homologação. |

A coleta de fotos e dados pode começar junto da etapa 1. A implementação visual da etapa 2 não precisa esperar todo o catálogo. A jornada consultiva pode abrir após as etapas 1–4; a venda paga depende da etapa 5. Não há necessidade de antecipar a escolha do provedor de pagamento.

## Ordem imediata de trabalho

1. Resolver a incompatibilidade entre Vercel e o armazenamento local atual.
2. Corrigir o submenu Coleções e o cenário de retry sem cookie de confirmação.
3. Homologar a interface em navegador e iniciar o cadastro real com a loja.
4. Fechar a rotina de atendimento e a recuperação dos dados.
5. Escolher e integrar pagamento, como combinado.

Não há motivo, neste diagnóstico, para iniciar um redesenho amplo. Melhorias adicionais de filtros, performance, recomendações e conversão devem seguir os problemas observados na homologação e depois no uso real.

## Evidências e limites

Nesta revisão: lint e build passaram, 14 testes comerciais e 8 verificações HTTP passaram, e a auditoria de dependências de produção não reportou vulnerabilidades. As verificações HTTP usaram ambiente isolado. O navegador da sessão estava indisponível; aparência, responsividade e interações reais continuam pendentes de homologação. Não foi auditado um deploy externo.

O guia [OPERACAO-ECOMMERCE.md](OPERACAO-ECOMMERCE.md) descreve a arquitetura atual com disco persistente. A adição de `vercel.json` não a torna compatível automaticamente com armazenamento efêmero. [Referência oficial da Vercel](https://vercel.com/kb/guide/is-sqlite-supported-in-vercel).
