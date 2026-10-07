# Óptica Ocular

Vitrine e operação consultiva em Next.js 16.4 / React 19.3. Armações e óculos de sol têm catálogo, variantes, galeria e carrinho. A seleção gera um orçamento persistido, consultável pela equipe no painel. Lentes usam um simulador separado. Pagamento online será integrado depois da escolha do cliente.

## Executar

Node 24 e npm são necessários.

```sh
npm ci
npm run admin:setup
npm run dev
```

Site: `http://localhost:3000`. Painel: `/admin`. A senha local fica em `.env.local`, criado pelo comando de configuração, e nunca deve ser versionada. A configuração existente é preservada.

```sh
npm run lint
npm test
npm run build
npm run test:http
npm run start
```

O teste HTTP inicia e encerra sua própria instância na porta 4010, com banco e credencial temporários. Os testes comerciais usam outro banco temporário; não alteram os dados da loja.

## Dados e operação

Leia [OPERACAO-ECOMMERCE.md](OPERACAO-ECOMMERCE.md) para configuração, cadastro, fotos, segurança, backup e preparação da integração. A fonte comercial é SQLite em `data/ocular.sqlite`; o JSON original só inicia os 33 cadastros de referência quando o banco está vazio. Esses produtos têm preço não confirmado, ficha pendente, estoque zero e placeholders.

Esta versão requer uma instância Node com volume durável para banco e mídia. Hospedagem com disco efêmero ou múltiplas réplicas exige adaptar a persistência antes de usar a operação. Não é um site exportável somente como HTML estático.

### Validação do catálogo na Vercel

Na Vercel (`VERCEL=1`), home, listagens, fichas e o catálogo usado pelo carrinho leem os 33 produtos de referência incluídos no projeto, sem tentar criar SQLite no disco da função. Isso permite validar as telas publicadas antes de definir a persistência definitiva. As fotos continuam usando os placeholders previstos para os modelos sem cadastro real.

O banco e o painel locais continuam disponíveis normalmente. Alterações feitas no banco local não são sincronizadas com esse catálogo publicado. Na Vercel, solicitações persistidas, edição administrativa e mídia enviada pelo painel precisam de armazenamento definitivo; esta versão não grava dados em memória ou `/tmp` nem simula confirmação de orçamento. `/api/health` retorna 503 enquanto a persistência não estiver disponível, mesmo com o catálogo público funcionando.

Para reproduzir esse modo localmente, configure `OCULAR_CATALOG_PREVIEW=true` e reinicie o servidor. `npm run test:preview`, após o build, verifica as rotas públicas e as 33 fichas com um caminho de banco propositalmente impossível de escrever.

Direção e andamento: [ROADMAP-ECOMMERCE.md](ROADMAP-ECOMMERCE.md). Evidências: [qa/ecommerce-implementation-verification.md](qa/ecommerce-implementation-verification.md). Os arquivos `legacy-v2`, `versao-1` e `research` preservam referências anteriores e ficam fora do lint do produto ativo.
