# Catálogo publicado para validação — Vercel

7 de outubro de 2026.

## Problema e mudança

O responsável informou que as telas com produtos não abriam no domínio da Vercel. As páginas públicas chamavam `getProducts()`, que inicializava um SQLite local, incluindo criação de pasta/tabelas e WAL. Essa dependência não é adequada ao disco da função.

Na Vercel (`VERCEL=1`), a leitura pública passa a usar os produtos de referência empacotados no projeto. A transformação é compartilhada com a inicialização do banco local, para preservar preços, IDs de variantes e placeholders sem herdar as declarações antigas de estoque do JSON.

Home, categorias, fichas e `/api/catalog` não abrem SQLite nesse modo. O carrinho continua recebendo catálogo e valores. Localmente, o cadastro e os orçamentos continuam usando o banco existente. Não foram alterados dados da loja ou a apresentação das páginas.

O modo publicado não grava orçamentos nem alterações administrativas em armazenamento efêmero. Essas ações retornam uma resposta controlada de indisponibilidade; não geram confirmação fictícia. `/api/health` continua retornando 503 sem persistência, para não declarar a operação pronta. Alterações de cadastro feitas no SQLite local não aparecem automaticamente no catálogo de referência publicado.

## Evidência

- Lint passou.
- Build passou tanto no ambiente local normal quanto com `VERCEL=1`; os testes HTTP foram repetidos sobre o build em modo Vercel.
- 17 testes passaram, incluindo leitura sem disco gravável, isolamento dos dados de referência e recusa de escritas efêmeras.
- 8 verificações HTTP da operação local passaram, incluindo cadastro, upload, autenticação e orçamento persistido.
- `npm run test:preview` iniciou um servidor de produção com `VERCEL=1` e `OCULAR_DB_PATH` apontando para um caminho impossível de gravar (`package.json/preview.sqlite`). Home, coleções, duas categorias, carrinho, checkout, lentes e sitemap retornaram 200.
- As 33 fichas retornaram 200 com o conteúdo de detalhe do produto presente. O teste não se limitou ao status de uma resposta de erro transmitida por streaming.
- Tentativa de registrar orçamento nesse modo retornou 503, sem pedido na resposta e sem cookie de confirmação.

## Publicação

### Checagem final antes do push

O menu Coleções passou a usar seu estado aberto para exibir o submenu, com acionamento por clique/toque/teclado, Escape com retorno de foco, fechamento ao navegar e inclusão dos botões no controle de foco móvel. As linhas e configurações do simulador receberam 16 px de espaço em cada lateral e quebra de nomes longos.

Após esses ajustes, lint, build com `VERCEL=1`, 17 testes, 8 verificações HTTP locais e a renderização das 33 fichas sem disco gravável passaram novamente. A auditoria de dependências de produção reportou zero vulnerabilidades.

A tentativa de conferência pelo navegador foi bloqueada pela política de URL da ferramenta. Não foi contornada. Esses resultados certificam as verificações automatizadas descritas, sem afirmar uma conferência visual ou de teclado em navegador.

O primeiro push (`43c6842`) teve deploy de produção concluído com sucesso pela Vercel. A URL pública informada pelo repositório é [optica-ocular.vercel.app](https://optica-ocular.vercel.app). A conferência HTTP nesse domínio retornou 200 para home, duas categorias, carrinho, lentes e uma ficha de cada categoria com conteúdo de detalhe presente. `/api/catalog` respondeu com os 33 produtos e pagamento desativado. Isso verifica respostas e conteúdo do servidor publicado, sem afirmar inspeção visual do navegador.

A checagem remota do GitHub encontrou uma inconsistência preexistente do lockfile no `npm ci` com npm 11.19.0: faltavam as entradas raiz de `@emnapi/core` e `@emnapi/runtime`. O lockfile foi reparado em diretório isolado com essa versão do npm, sem mudar versões já fixadas. A simulação de instalação limpa para Linux passou, e a auditoria de dependências de produção continuou reportando zero vulnerabilidades. A correção segue em um segundo push para executar novamente o CI e o deploy.

Depois da aprovação do cliente, adaptar a persistência definitiva para liberar painel, uploads e solicitação de orçamento na hospedagem escolhida. A escolha do provedor de pagamento continua na última etapa.
