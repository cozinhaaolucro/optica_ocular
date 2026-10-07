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

Direção e andamento: [ROADMAP-ECOMMERCE.md](ROADMAP-ECOMMERCE.md). Evidências: [qa/ecommerce-implementation-verification.md](qa/ecommerce-implementation-verification.md). Os arquivos `legacy-v2`, `versao-1` e `research` preservam referências anteriores e ficam fora do lint do produto ativo.
