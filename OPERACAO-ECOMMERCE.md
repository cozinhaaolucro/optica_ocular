# Operação e preparação da Óptica Ocular

Atualização: 8 de outubro de 2026.

## Escopo confirmado

Óculos de sol e armações; lentes de grau por atendimento separado. Retirada inicial na loja. Fotos e ficha comercial reais ainda serão fornecidas. A escolha do pagamento é a última etapa, após validação com o cliente.

O fluxo disponível é catálogo → variante → seleção → dados de contato → solicitação persistida → confirmação → equipe. Não há cobrança ou reserva ao enviar orçamento. A mensagem para WhatsApp precisa ser enviada pelo próprio visitante; o sistema não envia mensagens externas automaticamente.

## Supabase e Vercel

Configure no ambiente Production da Vercel e em `.env.local`: `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `OCULAR_ADMIN_PASSWORD` e `OCULAR_SITE_URL`. No domínio atual, o último valor é `https://optica-ocular.vercel.app`. Não coloque colchetes em torno da senha na URI; codifique os caracteres especiais da senha, como `@` → `%40`. Use a conexão do transaction pooler fornecida em **Connect** para funções da Vercel. Variáveis alteradas na Vercel exigem uma nova publicação.

`DATABASE_URL` ativa PostgreSQL. A aplicação usa uma conexão por pool de instância, sem prepared statements nomeados, e valida TLS com as autoridades padrão e a CA oficial do Supabase. Um erro de conexão não ativa SQLite ou um banco temporário. As sete tabelas são inicializadas no schema `ocular`: `products`, `orders`, `events`, `sessions`, `rate_limits`, `notifications` e `settings`. A migração é repetível, coordenada por advisory lock, com RLS e privilégios públicos removidos. Não é preciso expor essas tabelas na Data API ou criar policies para o navegador.

O bucket `ocular-products` é criado na primeira operação de mídia. Ele contém apenas fotografias públicas de produtos. O servidor usa a chave secreta para enviar arquivos; nenhum navegador recebe essa chave. O publishable key pode estar configurado, mas a operação atual passa pelas APIs autenticadas do Next.js e não consulta o banco diretamente pelo cliente. Não coloque contatos, receitas ou documentos no bucket público.

Sem `DATABASE_URL`, localhost conserva o SQLite e a pasta de mídia existentes. Na Vercel sem conexão, apenas a prévia do catálogo permanece disponível. O JSON inicial é usado somente quando o banco está vazio; mudanças administrativas não são substituídas no deploy. Cadastros anteriores no SQLite precisam de uma migração explícita se forem necessários no banco remoto.

## Configuração local e acesso

1. Use Node 24. O módulo `node:sqlite` deste runtime ainda emite aviso de API experimental; o projeto fixa a versão principal e verifica a persistência em testes.
2. Execute `npm ci` e `npm run admin:setup`. A senha aleatória fica em `.env.local`; o comando não imprime o segredo nem substitui uma senha existente. O campo `OCULAR_ADMIN_PASSWORD` precisa ter pelo menos 24 caracteres. Restrinja esse arquivo ao responsável pelo servidor. No Windows, revise as permissões NTFS: o parâmetro POSIX `mode` não define ACLs.
3. Configure as variáveis de [.env.example](.env.example) no ambiente escolhido. O domínio público deve estar em `OCULAR_SITE_URL`, incluindo HTTPS em produção, antes de gerar o build. A mesma origem é exigida nas alterações por API.
4. Execute build e servidor; acesse `/admin`. Sessão administrativa dura até oito horas. Orçamentos usam cookie de acesso com duração de 14 dias; conhecer o UUID da solicitação não permite ler os dados de contato.
5. Mantenha `OCULAR_INDEXING_ENABLED=false` durante validação. Robots bloqueia rastreamento, metadata indica noindex e sitemap fica vazio. Depois da aprovação, configure `true` e faça novo build; o sitemap inclui apenas produtos validados.
6. Métricas ficam desativadas por padrão. Para habilitar `OCULAR_TELEMETRY_ENABLED`, revise a descrição na privacidade, configure `true` e faça novo build. Registra somente eventos de jornada e LCP/CLS/INP, sem dados de contato, carrinho ou identificador pessoal. Eventos técnicos antigos são removidos no recebimento de novos eventos depois de 30 dias.
7. `OCULAR_TRUST_PROXY=true` somente atrás de proxy que substitui e valida `X-Forwarded-For`. Sem isso, limites são compartilhados pela instância, como proteção conservadora. Produção deve usar HTTPS, acesso restrito ao painel, segredos exclusivos e monitoramento do servidor.

## Cadastro real

No painel, abra um modelo ou escolha “Cadastrar modelo”. Preencha nome, marca, coleção, material e descrição. Para cada variante: identificação, SKU único, cor, largura da lente, ponte e haste em milímetros, preço em reais e estoque disponível. Preço é armazenado em centavos. O endereço permanece estável ao editar o nome.

O cadastro tem três estados separados: exibir no catálogo, preço confirmado e ficha conferida. Validar exige três fotos diferentes sem placeholder, material e variantes completas. Estoque zero de um modelo validado aparece como esgotado. Um orçamento pode continuar sendo usado para confirmar modelos ainda pendentes. Dados antigos abertos no painel não sobrescrevem um produto alterado por outra atualização: reabra para atualizar a revisão.

Modelos sem preço podem aparecer para consulta e solicitação de orçamento, com o valor exibido como “Consulte o valor”. A publicação não confirma preço, disponibilidade ou conferência da ficha. A venda direta continua exigindo cadastro validado, preço positivo confirmado e estoque da variante.

Fotos: frontal, lateral e detalhe, proporção **4:3**, recomendado **1600 × 1200 px**; fundo neutro, iluminação uniforme, produto completo e margens constantes. JPG, PNG ou WebP, até 8 MB, mínimo 600 × 450 px. O upload valida a imagem, remove metadados ao recodificar e prepara WebP no quadro 4:3. A posição é preservada mesmo enviando o detalhe antes da frontal. Uma imagem só entra na vitrine depois de salvar o cadastro. SVG não é aceito no upload.

Os placeholders em `public/assets/placeholders/` seguem esse formato. A fotografia editorial de categoria/home é uma imagem de marca, e não é apresentada como fotografia de um SKU. Revise também marcas, descrições e os preços herdados do catálogo antes de confirmá-los.

A vitrine não exibe avisos de preparação nem campos vazios. Descrições de rascunho aparecem no produto somente depois de a ficha ser conferida; preços ainda não confirmados são apresentados como estimativas. A faixa de marcas usa originais em `public/assets/brands/` e versões sem margens brancas em `public/assets/brands/strip/`.

O simulador usa a tabela existente em `public/assets/lentes-data.json`, com os preços administrados em **Lentes** no painel. As alterações ficam em `settings` e entram em `/api/lenses` sem cache; não é preciso republicar para mudar preços. É possível editar um valor ou aplicar percentual a até 1.000 resultados filtrados por lote. A revisão impede sobrescrever uma atualização simultânea. A interface filtra uso, marca, linha, material, tratamento e cor/tecnologia; cada consulta leva a configuração específica. Não recebe receita nem decide compatibilidade clínica. Novas linhas ou combinações técnicas exigem atualização da fonte de dados.

## Solicitações e estoque

O painel oferece busca, filtros, paginação e CSV de solicitações, além de contatos agrupados em **Clientes**. Cada atendimento tem etapa e observações internas, que não são retornadas à confirmação pública. Os estágios operacionais não alteram pagamento ou reservas. Confirme preço, fotos, variantes e disponibilidade no atendimento, e combine retirada. Nenhum e-mail, SMS ou WhatsApp automático está configurado. A tabela `notifications` registra eventos pendentes para um canal que será definido posteriormente; não significa que mensagens foram enviadas.

**Preços e estoque** permite ajuste por variante com motivo obrigatório e revisão concorrente. **Catálogo** permite duplicar como rascunho e exibir/ocultar em lote; uma revisão inválida desfaz o lote inteiro. O histórico exibe as últimas 50 ações, com valores anteriores e novos nos ajustes de estoque. CSVs neutralizam fórmulas de planilha, mas contêm dados de contato privados quando exportados de clientes e atendimentos.

O servidor aceita apenas identificadores e quantidades inteiras, máximo 10 de cada variante e 30 linhas diferentes. Preços vêm do banco; totais do navegador são rejeitados. Chave de idempotência impede duplicar um envio. Alterar a seleção exige nova chave. Os dados do pedido são uma fotografia do momento da solicitação, mesmo após editar o produto.

As funções de venda futura reservam estoque em transação e conciliam valores, moeda e identificador do pagamento. Cancelamento/falha/reembolso devolvem estoque uma vez. Notificações atrasadas não rebaixam um pagamento confirmado; pagamento tardio sem reserva exige revisão. Variante reservada não pode ser removida. **Essas funções não estão expostas para cobrar neste estágio.**

## Pagamento: próxima decisão do cliente

O contrato neutro está em `src/lib/payment-adapter.ts`. Após escolher o provedor, implementar criação de checkout com idempotência, consulta autoritativa de pagamento, validação de webhook, cancelamento e reembolso. Ligar as rotas públicas apenas depois de homologar sandbox e regras comerciais.

Ainda faltam, por decisão comercial: provedor, credenciais, Pix/cartão/parcelamento, janela de reserva e expiração, comportamento de pagamento tardio, eventual frete, canal de notificações e condições de venda. Endereço só será coletado quando houver envio contratado. Não ativar essas opções com valores demonstrativos.

## Persistência, backup e recuperação

Em produção, banco e mídia são remotos. Defina frequência, retenção e responsável pelo backup no Supabase, conforme os recursos disponíveis no plano contratado. O backup do PostgreSQL precisa incluir o schema `ocular`, dados e sequências. Exporte separadamente os objetos de `ocular-products`: um backup do banco não contém os arquivos do Storage. Proteja as cópias porque o banco contém contatos e sessões; CSVs do painel são relatórios, não backup completo.

Valide a restauração em outro projeto Supabase, sem apontar a aplicação de produção para ele. Confira modelos, fotos, preços de lentes e atendimentos antes de qualquer troca de ambiente. Revogue sessões restauradas quando necessário. O teste de conexão com rollback e upload temporário não comprova restauração de desastre.

No modo **SQLite local**, o banco usa WAL e a pasta `media` fica ao lado em volume durável. Esse modo exige uma única instância Node e não deve ser usado no disco efêmero da Vercel. O comando abaixo serve apenas para SQLite e se recusa a criar uma cópia local quando a aplicação usa PostgreSQL remoto.

```sh
npm run backup
```

O backup consistente do banco usa `VACUUM INTO` e inclui a pasta de mídia quando existente. A mídia é copiada em seguida: evite uploads durante essa cópia para manter o conjunto exato. Proteja os backups porque contêm dados de contato. Guarde cópia criptografada fora do servidor e defina frequência, retenção e responsável; o script não agenda nem envia backups externos.

Para recuperar, pare a instância, preserve o banco atual e sua mídia em outro diretório e coloque **a cópia** de `ocular.sqlite` e `media` em um diretório isolado. Configure `OCULAR_DB_PATH` para essa cópia e teste catálogo, acesso e solicitações. Não misture arquivos WAL/SHM antigos com o banco recuperado. Depois da conferência do responsável, aponte o serviço para o volume recuperado. Reinicialize sessões administrativas quando necessário.

## Verificações e lançamento

CI executa lint sem avisos, testes de regras comerciais, migração PostgreSQL em memória, build/TypeScript, testes HTTP com banco temporário, prévia sem disco gravável e auditoria de dependências de produção. `npm run test:supabase` verifica o projeto real configurado: as alterações comerciais são revertidas em transação e a imagem temporária é removida do bucket. Os testes não homologam pagamento ou recuperação de desastre. `/api/health` verifica conexão ao banco; definir alertas, retenção de logs e rotina de backup no ambiente contratado.

Políticas de entrega, trocas e privacidade descrevem a fase de orçamento. Devem ser revisadas pela loja e complementadas antes da venda direta, com responsáveis, prazos, retenção e condições comerciais reais. Dados e fotos devem ser aprovados. As metas de Web Vitals do roadmap dependem de medição em staging e de dados de campo; não há declaração de conformidade WCAG ou desempenho de produção baseada em testes locais.

Há um aviso de segurança na dependência de desenvolvimento `braces`, via lint, sem versão corrigida publicada no momento desta entrega. Não faz parte das dependências de produção. A correção sugerida automaticamente envolve downgrade incompatível do lint do Next; não foi aplicada. Acompanhar a [advisory GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) e atualizar quando houver correção suportada.

### Atualização dos valores Essilor

A loja escolheu em 07/10/2026 utilizar os valores da tabela fornecida Essilor 2026.1 no simulador até sua próxima atualização. Foram incluídas 1.142 configurações de Varilux, Eyezen, Essilor, Stellest e KODAK, com Crizal e Transitions nos filtros correspondentes. O PDF original está em lentes/tabela_essilor.pdf; scripts/import-essilor.py reconstrói essas configurações e qa/essilor-source-map.json registra as páginas e valores de origem. A planilha auditada original permanece intacta. Para a próxima atualização, substituir a fonte e ajustar as matrizes do importador se o layout mudar.
