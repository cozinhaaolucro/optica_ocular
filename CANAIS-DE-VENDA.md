# Google Shopping e catálogo da Meta

O painel tem uma área **Canais de venda** com os links de importação, instruções de conexão, busca e diagnóstico por modelo. Os arquivos consultam o catálogo persistido a cada requisição; alterações salvas no painel entram na próxima coleta da plataforma, sem novo deploy.

| Canal | Fonte pública |
| --- | --- |
| Google Merchant Center | https://optica-ocular.vercel.app/feeds/google.xml |
| Meta Commerce Manager | https://optica-ocular.vercel.app/feeds/meta.xml |

O sitemap ajuda a descobrir páginas; estes feeds fornecem os dados comerciais para importar produtos. A criação da conta, a verificação do domínio, a programação da coleta e a aprovação acontecem na plataforma escolhida. A presença de um link no painel não significa que a conta está conectada ou aprovada.

## Preparar os produtos

1. Abra **Canais de venda → Preparação dos produtos → Revisar cadastro**.
2. Confira marca, modelo, descrição, material e três fotografias distintas. Para cores diferentes, selecione a **Foto desta variante** em cada opção.
3. Preencha SKU, cor, medidas, preço normal e estoque de cada variante. Estoque zero é exportado como indisponível. Uma promoção válida usa preço normal e promocional separados.
4. Informe o **GTIN / EAN** da embalagem, preservando zeros à esquerda. O painel valida comprimento, dígito verificador e duplicidade. Se não houver GTIN, informe a **referência do fabricante (MPN)** real, incluindo a cor. Não use o SKU interno como substituto de um código do fabricante.
5. Marque **Preço confirmado**, **Ficha conferida** e **Exibir no catálogo**, depois salve. O painel indica o que falta e atualiza a contagem de variantes elegíveis.

Cada variante tem um identificador estável e um link que abre a opção correspondente na loja. Fotos para anúncios são servidas em JPEG, 1200 × 1200 px, com fundo branco e proporções preservadas. As fotografias da vitrine continuam no formato original. Fotos adicionais são incluídas para modelos com uma única variante, evitando associar imagens de cores diferentes.

As descrições da primeira leva foram redigidas com assistência de IA; a origem é mantida no cadastro e enviada ao Google no campo técnico próprio. Esse campo fica no admin e no feed. Ao substituir o texto por uma descrição original da loja, atualize **Origem da descrição**.

## Conectar as contas

No **Merchant Center**, abra as fontes de dados e adicione produtos por um arquivo em URL. Cole o link do Google e configure uma coleta diária. No **Commerce Manager**, abra o catálogo, suas fontes de dados e escolha importar um feed por URL. Cole o link da Meta e configure a atualização. Confira os diagnósticos após a coleta; a plataforma controla processamento, aprovação e veiculação.

Para Google Shopping, a loja precisa oferecer compra online e permitir indexação. A área Canais de venda mostra esses bloqueios separadamente da preparação dos produtos. O código atual mantém a cobrança desativada enquanto o cliente escolhe o provedor; essa etapa exige uma integração de pagamento homologada, não apenas uma variável de ambiente.

## Situação em 9 de outubro de 2026

Há **50 modelos publicados para consulta**, ainda sem preços comerciais confirmados e sem validação completa. Por isso, os feeds estão disponíveis e exportam **zero variantes** neste momento. Cada produto entra automaticamente após completar e confirmar o cadastro; o Google também aguarda compra online e indexação. Lentes de grau continuam pelo simulador e atendimento separado.

Os arquivos contêm somente campos comerciais dos produtos elegíveis. Pedidos, clientes, observações internas, credenciais e produtos ocultos não são exportados. Se o banco estiver indisponível, a rota retorna erro temporário em vez de simular um catálogo vazio. As instruções e pendências ficam na área privada.

Referências: [especificação do Google](https://support.google.com/merchants/answer/7052112?hl=pt-BR), [importação por arquivo](https://support.google.com/merchants/answer/14991445?hl=pt-BR), [links das variantes](https://support.google.com/merchants/answer/6324416?hl=pt-BR).
