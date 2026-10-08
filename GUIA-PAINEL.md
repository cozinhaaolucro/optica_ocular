# Guia da equipe — Painel Ocular

Acesse `/admin` no endereço da loja e entre com a senha da equipe. A sessão dura até oito horas. Use **Sair** ao terminar em um computador compartilhado. Não envie a senha por WhatsApp ou inclua credenciais em fotografias do painel.

## Catálogo

Busque por nome, marca ou SKU. Os filtros mostram coleção, marca e situação do cadastro. **Novo modelo** abre uma ficha; **Duplicar** cria um rascunho com SKU vazio e estoque zero para preencher.

Preencha nome, marca, coleção, material, descrição e variantes. Cada variante precisa de SKU único, cor, largura da lente, ponte, haste, preço e estoque. Inclua três fotos distintas: frontal, lateral e detalhe. O painel aceita JPG, PNG ou WebP, até 8 MB, mínimo 600 × 450 px, e prepara as imagens no quadro 4:3.

**Exibir no catálogo**, **Preço confirmado** e **Ficha conferida** são controles separados. A ficha só pode ser conferida depois de completar os dados. Selecione modelos na lista para exibir ou ocultar vários de uma vez. Ocultar preserva o cadastro e seu histórico.

Salve antes de sair da ficha. Se outra pessoa atualizar o mesmo modelo, o painel pede que você atualize os dados antes de salvar novamente.

## Preços e estoque

Encontre a variante e escolha **Ajustar**. Informe preço em reais, estoque inteiro e o motivo da mudança. O histórico guarda o saldo anterior e o novo. Estoque zero continua sendo zero; valores demonstrativos não significam disponibilidade real.

## Atendimentos e clientes

As solicitações do site aparecem em **Atendimentos**. Abra o número para ver itens, contato, total de referência e retirada. A equipe pode mudar a etapa: novo, em atendimento, orçamento enviado, concluído ou encerrado. As observações ficam somente no painel.

Os links de WhatsApp, telefone e e-mail abrem o contato para a equipe. Nenhuma mensagem é enviada automaticamente. Concluir um atendimento não cobra o cliente e não registra um pagamento online.

**Clientes** reúne contatos e histórico das solicitações recebidas. Os CSVs contêm dados privados: guarde-os em uma pasta restrita e compartilhe apenas com pessoas autorizadas.

## Lentes

Filtre por marca ou procure linha, material, índice e tratamento. Edite os valores desejados e escolha **Salvar alterações**. Os preços salvos entram no simulador nas próximas consultas.

Para reajustar uma marca ou linha, filtre primeiro e aplique o percentual aos resultados. Confira os valores antes de salvar. O limite é de 1.000 configurações por lote. **Descartar** remove somente alterações ainda não salvas. As linhas e combinações técnicas continuam seguindo a tabela do projeto; novos produtos de lentes exigem atualização dessa fonte.

## Histórico e operação

**Histórico** mostra as últimas 50 ações. **Operação** informa banco, fotos, retirada, rastreamento e pagamento. O painel trabalha com dados persistidos no Supabase. As exportações CSV são relatórios; a recuperação completa exige backup do banco e das fotos, conforme [o guia técnico](OPERACAO-ECOMMERCE.md).

Antes de apresentar: entre no painel, abra um modelo, confira estoque, filtre uma marca em Lentes e abra um atendimento se houver solicitações. O pagamento será habilitado depois da decisão do cliente.
