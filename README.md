# Óptica Ocular

Vitrine e operação consultiva em Next.js 16.4 / React 19.3. Armações e óculos de sol têm catálogo, variantes, galeria e carrinho. A seleção gera uma solicitação persistida e protegida. Lentes usam um simulador separado, com preços administráveis. Pagamento online será integrado após a escolha do cliente.

## Executar

Use Node 24. Configure as variáveis de [.env.example](.env.example) em `.env.local`; esse arquivo não é versionado.

```sh
npm ci
npm run admin:setup
npm run dev
```

Site: `http://localhost:3000`. Painel: `/admin`. O comando de configuração preserva a senha existente e não imprime segredos. A senha precisa ter ao menos 24 caracteres.

## Persistência e publicação

Com `DATABASE_URL`, a aplicação usa PostgreSQL do Supabase, inclusive na Vercel. As sete tabelas operacionais são criadas no schema privado `ocular`, com RLS e acesso negado às roles públicas da Data API. A primeira inicialização inclui 33 modelos de referência, sem estoque real ou conferência comercial. Sessões, atendimentos, histórico e preços de lentes também ficam no banco.

As fotos enviadas pelo painel usam Supabase Storage, no bucket público `ocular-products`, com `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SECRET_KEY` no servidor. Somente fotografias de produtos são públicas. Chaves secretas e a conexão PostgreSQL nunca entram no navegador.

Sem conexão PostgreSQL, o desenvolvimento local usa SQLite e mídia local. Na Vercel sem conexão, somente o catálogo de referência é disponibilizado; a operação exige persistência. Uma conexão configurada que falha retorna erro, sem substituir os dados por outra base. Dados antigos do SQLite não são transferidos automaticamente ao Supabase.

Configure as variáveis também no ambiente **Production** da Vercel e faça novo deploy. `OCULAR_SITE_URL` deve ser `https://optica-ocular.vercel.app` no domínio atual. Em localhost, a própria origem local é aceita, mesmo quando esse arquivo contém o endereço público.

## Painel

Visão geral, catálogo, preços e estoque, atendimentos, clientes, lentes, histórico e operação. Busca, filtros, paginação, exportação CSV, fotos, variantes, duplicação de modelos, exibição em lote e proteção contra edições simultâneas. As observações da equipe são privadas. Consulte o [guia da equipe](GUIA-PAINEL.md).

## Verificação

```sh
npm run lint
npm test
npm run build
npm run test:http
npm run test:preview
```

Os testes comerciais, PostgreSQL em memória e HTTP usam bases isoladas. Os testes HTTP e de prévia iniciam suas próprias instâncias nas portas 4010 e 4011. Não precisam das credenciais do cliente.

```sh
npm run test:supabase
```

Esse comando opcional verifica a conexão real configurada em `.env.local`: executa alterações dentro de uma transação revertida e envia uma imagem temporária, removida ao final. Não imprime segredos. Não é executado no CI.

Configuração, cadastro, fotos e recuperação: [OPERACAO-ECOMMERCE.md](OPERACAO-ECOMMERCE.md). Próximas etapas: [ROADMAP-ECOMMERCE.md](ROADMAP-ECOMMERCE.md). Os diretórios `legacy-v2`, `versao-1` e `research` preservam referências anteriores e ficam fora do lint do produto ativo.
