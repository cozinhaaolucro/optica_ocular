# Óptica Ocular — nova auditoria do e-commerce

Data: 7 de outubro de 2026. Código auditado: commit `f7ebdd3`. Este relatório descreve o estado local atual; não certifica um ambiente publicado.

Atualização posterior ao diagnóstico: o responsável esclareceu que as telas de produtos não abriam no domínio da Vercel e que a fase atual é a validação pelo cliente. Foi implementado um catálogo público sem dependência de SQLite nessa hospedagem, mantendo o banco local. Veja a [verificação da correção](vercel-catalog-validation.md). Os achados de persistência definitiva continuam relevantes para a operação após validação; o relatório abaixo preserva o diagnóstico anterior à correção.

## Onde estamos

O projeto tem uma base funcional de catálogo, carrinho, solicitação de orçamento e administração. A jornada consultiva existe e os testes automatizados passaram. A venda com cobrança ainda não está implementada com um provedor real, conforme a decisão de deixá-la para a última etapa.

Os dois maiores impedimentos para o lançamento comercial são a persistência na hospedagem pretendida e a ausência de um catálogo real aprovado. A nova apresentação da home não elimina essas dependências.

| Área | Estado observado | O que falta |
| --- | --- | --- |
| Home e navegação | Hero com CTAs “Coleções” e “Lentes”; categorias com imagens de óculos isolados em círculos; menu Coleções com submenu. | Corrigir o acesso ao submenu pelo teclado; conferir a apresentação em navegador. |
| Catálogo | 33 produtos publicados no banco local; busca, filtros, variantes, ficha e painel presentes. | Nenhum dos 33 está verificado, com preço confirmado ou fotos cadastradas; estoque positivo ausente. Não há produtos prontos para venda paga. |
| Carrinho e orçamento | Persistência do carrinho, quantidades validadas, totais calculados no servidor, orçamento persistido, confirmação protegida e idempotência. | Recuperação da confirmação quando a primeira resposta é perdida; acompanhamento operacional das solicitações. |
| Administração | Autenticação, cadastro, revisão concorrente, uploads WebP em proporção 4:3 e consulta de solicitações. | Fluxo de atendimento, busca/paginação de solicitações e operação de mídia em hospedagem compatível. |
| Lentes | Simulador em quatro etapas; 4.347 configurações em oito grupos; altura definida de 520 px com rolagem interna e espaço para o foco. | Conferência visual das etapas e filtros mais úteis para a equipe, incluindo índice de refração. Aprovação comercial interna dos valores. |
| Pagamento e entrega | Retirada inicial; pagamento e frete desativados em `storeConfig()`. Funções internas de reserva, conciliação e reembolso têm testes. | Integração com o provedor escolhido, webhooks, expiração, homologação e atendimento de pedidos pagos. O contrato interno não representa uma integração concluída. |
| Publicação e operação | Build, metadata, sitemap/robots, políticas, CI, health check, script de backup e telemetria opcional presentes. | Hospedagem com persistência, domínio configurado, restauração comprovada, alertas e homologação do ambiente publicado. |

Dados do simulador: HOYA 377; Rodenstock 956; ZEISS 1.872; Varilux 461; Eyezen 179; Stellest 3; Essilor 101; KODAK 398. Varilux, Eyezen, Stellest, Essilor e KODAK representam 1.142 configurações importadas. A quantidade de configurações não equivale à quantidade de modelos físicos disponíveis na loja.

Foram mantidas as decisões anteriores: óculos de sol e armações; lentes por atendimento separado; retirada inicial; placeholders até o cadastro real; pagamento na última etapa. Os valores fornecidos da Essilor continuam sendo tratados como referência atual da loja, conforme a orientação do responsável, sem acrescentar avisos sobre a data ao site.

## Mudanças observáveis no histórico

Os commits da madrugada incluem ajustes de home e navbar, a base comercial em Next.js e alterações repetidas de configuração para Vercel. No estado final há `vercel.json` e um favicon ICO. Entre `12d3de7` e o HEAD, o diff se limita ao favicon, layout e configuração da Vercel; a maior parte da implementação comercial já está no commit `12d3de7`.

O histórico identifica alterações, mas não permite atribuir cada decisão a uma IA específica. Não foi encontrada alteração local pendente antes desta auditoria.

## Achados priorizados

P0 impede a abertura correspondente; P1 exige ajuste antes da homologação; P2 é evolução após estabilizar o fluxo. “Confirmado no código” não significa reprodução visual em navegador.

### R01 — P0: a configuração de publicação não resolve a persistência

**Evidência:** `vercel.json` declara Next.js na Vercel. `src/lib/db.ts:13` abre um arquivo SQLite local, cria sua pasta e usa WAL; `src/app/api/admin/media/route.ts:51` grava uploads no disco ao lado do banco. Catálogo, painel e solicitações dependem desse armazenamento.

**Consequência:** o backend atual requer disco durável e compartilhado pela instância que atende as requisições. A configuração adicionada não fornece isso. A documentação oficial explica que funções da Vercel não oferecem o armazenamento local permanente e compartilhado necessário ao SQLite. [Fonte: Vercel — SQLite e armazenamento local](https://vercel.com/kb/guide/is-sqlite-supported-in-vercel).

**Ação:** escolher entre hospedar a arquitetura atual em uma instância Node com volume persistente ou adaptar o projeto para banco externo e armazenamento de objetos se Vercel for o destino. Não basta mover o banco para uma pasta temporária. O build local aprovado não demonstra durabilidade em produção. Não foram consultados logs de um deploy existente, portanto não se afirma que um site publicado esteja fora do ar.

**Conclusão:** orçamento e foto continuam acessíveis após reiniciar/republicar; backup e restauração funcionam em uma instância isolada.

### R02 — P0 para venda paga: cadastro comercial ainda é demonstrativo

**Evidência:** consulta agregada e somente leitura ao banco local: 33 produtos, 33 publicados, zero verificados, zero preços confirmados, zero produtos com fotos e zero produtos com estoque positivo. Fontes e validações estão em `src/lib/catalog.ts` e `src/lib/product.ts`.

**Consequência:** há infraestrutura de cadastro, mas nenhum item está aprovado para cobrança. As imagens isoladas de categoria são conteúdo editorial; não substituem fotos de cada SKU.

**Ação:** cadastrar um primeiro conjunto real de modelos com fotos, variantes, medidas, preço e estoque aprovados pela loja. Expandir depois. A revisão interna não exige inserir os avisos genéricos de preparação que o responsável já pediu para remover da apresentação.

**Conclusão:** cada item oferecido como disponível tem dados e imagem correspondentes; o servidor continua bloqueando venda de itens não aprovados.

### R03 — P1: submenu Coleções depende de hover acima de 560 px

**Evidência confirmada no código:** `SiteHeader.tsx:129` altera `dropdownOpen` por clique/teclado. Entretanto, `commerce.css:111` oculta o submenu em larguras a partir de 561 px e o mostra somente com `.nav-dropdown:hover`. Abrir o estado pelo teclado não torna o submenu visível sem hover. O intervalo também abrange tablets com o menu móvel.

O foco inicial do menu móvel procura apenas o primeiro link (`SiteHeader.tsx:25`), pulando o novo botão Coleções. O tratamento de Escape está associado ao menu móvel, e não ao submenu desktop. Não foi comprovada uma fuga de foco em navegador.

**Ação:** controlar a visibilidade pelo estado aberto, suportar teclado e toque, definir fechamento e retorno de foco, e encerrar o submenu ao navegar. Preservar o desenho atual.

**Conclusão:** chegar às duas categorias usando Tab/Enter/Escape, mouse e toque em celular, tablet e desktop, sem depender de hover.

### R04 — P1: retry pode perder o acesso à confirmação

**Evidência confirmada no código:** uma solicitação repetida retorna `accessToken: null` em `src/lib/orders.ts:71`; a API só define o cookie de acesso quando recebe esse token (`src/app/api/orders/route.ts:15`). O checkout limpa o carrinho antes de navegar para a confirmação (`Checkout.tsx:55`).

**Cenário inferido:** se a primeira tentativa é gravada, mas sua resposta e o cookie não chegam ao cliente, o retry encontra o mesmo orçamento sem recuperar o cookie. A tela privada pode ficar inacessível mesmo com orçamento registrado. Os testes atuais de idempotência não certificam esse cenário de recuperação sem cookie.

**Ação:** implementar uma recuperação vinculada ao cliente original, sem liberar dados privados apenas por conhecer um identificador. Confirmar o acesso antes de descartar a seleção e cobrir perda de resposta em teste isolado.

**Conclusão:** resposta perdida seguida de retry gera um único orçamento e uma confirmação acessível ao solicitante.

### R05 — P1: o painel recebe solicitações, mas não acompanha o atendimento

**Evidência:** `AdminPanel.tsx:552` lista contatos, itens e valores. `src/lib/orders.ts:34` limita o retorno aos 200 registros mais recentes, sem paginação. Não há fluxo exposto de triagem, responsável, observações de atendimento e conclusão do orçamento. A atualização de fulfillment existente exige pedido pago e não resolve o atendimento consultivo atual.

**Ação:** criar estados de atendimento, anotações e filtros/paginação; definir quem acompanha a fila e em quanto tempo. A tabela de notificações é um registro interno, não prova de envio ao cliente ou à equipe.

**Conclusão:** a equipe acompanha uma solicitação do recebimento até sua conclusão, sem perder registros antigos.

### R06 — P1 antes de abrir ao público: falta homologação do ambiente e da interface

**Evidência:** os testes automatizados passaram, mas não houve acesso a navegador nesta sessão. Existem CI e script de backup; não foi verificada uma execução remota do CI, uma restauração nem monitoramento externo ativo. Não há medição atual de Lighthouse ou Core Web Vitals de produção.

**Ação:** testar o fluxo no ambiente de homologação, com teclado, toque, imagens carregadas/falhas, carrinho restaurado e envio de orçamento. Configurar domínio, descoberta em buscadores e monitoramento de acordo com a abertura. Executar restauração de banco e mídia em ambiente separado.

**Conclusão:** a jornada funciona na hospedagem final e a equipe consegue recuperar dados e detectar falhas.

### R07 — P2: simulador e faixa de marcas precisam de ajustes pontuais

**Simulador:** o tamanho fixo e a margem de foco estão presentes no CSS; sua aparência não foi novamente certificada em navegador. Os filtros atuais não incluem índice de refração, apesar das milhares de combinações de material/tratamento/tecnologia. Conferir a utilidade desses filtros com a equipe e impedir combinações sem resultado quando possível. Os PDFs e a planilha de origem estão versionados; o mapa de importação permite rastrear valores da Essilor. A aprovação dos valores e compatibilidades pela loja continua necessária antes de fechar um orçamento real.

**Faixa de marcas:** `BrandRail.tsx` mantém movimento automático, ajuste de velocidade pelo mouse e respeito a movimento reduzido. Pointer down pausa, mas pointer up não define uma retomada; no toque, a retomada fica dependente de outros eventos. Falta uma ação explícita de pausar/retomar para quem não usa a preferência do sistema. Definir esse comportamento sem adicionar excesso de setas.

**Responsividade:** as categorias novas usam círculos de tamanho fixo; conferir telas estreitas antes de alterar medidas. Isso é uma pendência visual, não um overflow comprovado nesta auditoria.

### R08 — P2: documentação misturava diagnóstico antigo e estado implementado

O roadmap anterior afirmava, em sua seção histórica, que não havia API, banco, checkout ou painel, apesar de listar essas implementações acima. Isso prejudica a continuidade do trabalho. Esta entrega substitui o roadmap por uma versão atual e preserva a anterior em `qa/roadmap-anterior-2026-10-07.md`.

## Verificação executada nesta auditoria

| Verificação | Resultado | Limite |
| --- | --- | --- |
| `npm run lint` | Passou, sem avisos | Código abrangido pela configuração do projeto. |
| `npm test` | 14/14 passaram | Regras comerciais em banco isolado; não valida um provedor real. |
| `npm run build` | Passou, incluindo TypeScript | Não certifica persistência em Vercel nem aparência visual. |
| `npm run test:http` | 8/8 passaram | Servidor e dados isolados; catálogo, orçamento, sessão/admin, uploads e estados privados. |
| `npm audit --omit=dev --json` | Zero vulnerabilidades reportadas | Dependências de produção e base disponível no momento; não é auditoria completa de segurança. |
| Banco local | Agregados consultados somente para leitura | Não foram exportados contatos nem examinados dados pessoais de solicitações. |
| Navegador e produção | Não verificados | O navegador da sessão estava indisponível; não foi fornecido ambiente publicado para esta revisão. |

O aviso experimental de `node:sqlite` apareceu nas verificações; não impediu os testes ou o build. Node 24 é a versão exigida pelo projeto e usada no CI.

## Encaminhamento

Executar o [roadmap atualizado](../ROADMAP-ECOMMERCE.md) em cinco etapas: persistência, correções de uso, catálogo real, operação consultiva e pagamento. As etapas anteriores geraram uma base aproveitável; os próximos trabalhos devem fechar dependências e corrigir regressões específicas, preservando as decisões visuais já aprovadas.

Esta auditoria alterou apenas documentação. Não modificou a interface, o banco comercial, produtos ou integrações.
