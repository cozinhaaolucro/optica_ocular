# Guia da equipe — Painel Ocular

Acesse `/admin` no endereço da loja e entre com a senha da equipe. A sessão dura até oito horas. Use **Sair** ao terminar em um computador compartilhado. Não envie a senha por WhatsApp ou inclua credenciais em fotografias do painel.

## Catálogo

Busque por nome, marca, SKU ou tag. Os filtros mostram coleção, marca e situação do cadastro. **Novo modelo** abre uma ficha; **Duplicar** cria um rascunho com SKU vazio e estoque zero para preencher.

Preencha nome, marca, coleção, material, descrição e variantes. Cada variante precisa de SKU único, cor, largura da lente, ponte, haste, preço e estoque. Inclua três fotos distintas: frontal, lateral e detalhe. O painel aceita JPG, PNG ou WebP, até 8 MB, mínimo 600 × 450 px, e prepara as imagens no quadro 4:3.

**Exibir no catálogo**, **Preço confirmado** e **Ficha conferida** são controles separados. A ficha só pode ser conferida depois de completar os dados. Selecione modelos na lista para exibir ou ocultar vários de uma vez. Ocultar preserva o cadastro e seu histórico.

É possível salvar um modelo com o preço em branco e exibi-lo para consulta. A lista mostra **Sem preço** e as exportações deixam o valor vazio. Antes de confirmar preço ou conferir a ficha, preencha um preço positivo em todas as variantes. Para encontrar os 50 modelos publicados da primeira leva, busque a tag **videos-20261008**; confira as peças com o [plano da primeira leva](PRIMEIRA-LEVA-PRODUTOS.md).

Salve antes de sair da ficha. Se outra pessoa atualizar o mesmo modelo, o painel pede que você atualize os dados antes de salvar novamente.

## Preços e estoque

Encontre a variante e escolha **Ajustar**. Informe preço normal em reais, estoque inteiro e o motivo da mudança. Para uma oferta, preencha **Preço promocional** com um valor menor que o normal. Deixe esse campo vazio para encerrar a promoção. Esse controle também aparece em cada variante da ficha do Catálogo. O filtro **Em promoção** ajuda a revisar as ofertas.

A loja mostra o preço normal riscado e o promocional. Carrinho, ordenação por preço e novas solicitações usam o valor promocional; solicitações anteriores preservam seus valores. As promoções ficam ativas até serem encerradas pela equipe, sem prazo automático. O histórico guarda ajustes de preço, promoção e estoque. Estoque zero continua sendo zero; valores demonstrativos não significam disponibilidade real.

## Atendimentos e clientes

As solicitações do site aparecem em **Atendimentos**. Abra o número para ver itens, contato, total de referência e retirada. A equipe pode mudar a etapa: novo, em atendimento, orçamento enviado, concluído ou encerrado. As observações ficam somente no painel.

Os links de WhatsApp, telefone e e-mail abrem o contato para a equipe. Nenhuma mensagem é enviada automaticamente. Concluir um atendimento não cobra o cliente e não registra um pagamento online.

**Clientes** reúne contatos e histórico das solicitações recebidas. Os CSVs contêm dados privados: guarde-os em uma pasta restrita e compartilhe apenas com pessoas autorizadas.

## Lentes

Filtre por marca, tipo, linha e situação, ou procure material, índice e tratamento. Cada configuração tem **Preço normal**, **Promocional** e a caixa **Ativa**. Desmarque para ocultar a opção no simulador, preservando preços e cadastro. Edite e escolha **Salvar alterações**. **Descartar** remove somente alterações ainda não salvas.

Para mudar uma marca ou linha inteira, filtre primeiro e use **Ações nos resultados filtrados**: ativar, ocultar, aplicar desconto, encerrar promoções ou reajustar preço normal. **Aplicar ao filtro** mostra a confirmação com a quantidade e o escopo; ao confirmar, publica o lote inteiro. O lote pode abranger todas as configurações de uma marca. Salve ou descarte edições individuais antes de usar esse controle.

O desconto percentual usa o preço normal e substitui promoções do filtro. Não ativa configurações ocultas. O simulador mostra o valor normal riscado e o promocional por par; marcas, linhas e opções sem configurações ativas desaparecem da seleção. Os dados são renovados ao iniciar uma simulação. Para encerrar uma oferta individual, deixe **Promocional** vazio. O painel impede promoções iguais ou superiores ao preço normal e preserva o lote inteiro se houver conflito ou valor inválido.

As linhas e combinações técnicas continuam seguindo a tabela do projeto; novos produtos de lentes exigem atualização dessa fonte.

## Canais de venda

Copie os links do Google Merchant Center e da Meta Commerce Manager para importar o catálogo por URL. A tela mostra as variantes exportadas, os bloqueios de cada canal e os campos a conferir por modelo. **Revisar cadastro** abre a ficha correspondente. Complete preços, fotos, variantes e os códigos reais do fabricante antes de confirmar o cadastro. Para modelos com cores diferentes, associe uma foto a cada variante. Veja o [guia dos canais](CANAIS-DE-VENDA.md) para conectar as contas e acompanhar a aprovação.

## Histórico e operação

**Histórico** mostra as últimas 50 ações. **Operação** informa banco, fotos, retirada, rastreamento e pagamento. O painel trabalha com dados persistidos no Supabase. As exportações CSV são relatórios; a recuperação completa exige backup do banco e das fotos, conforme [o guia técnico](OPERACAO-ECOMMERCE.md).

Antes de apresentar: entre no painel, abra um modelo, confira estoque, filtre uma marca em Lentes e abra um atendimento se houver solicitações. O pagamento será habilitado depois da decisão do cliente.
