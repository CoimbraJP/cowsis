# COWSIS — Relatório de Funcionalidades
*Versão atual · Julho 2026*

---

## O que é o COWSIS

Sistema web de gestão de fazenda. Roda no navegador, os dados ficam na nuvem (Supabase), e qualquer pessoa com o link acessa de qualquer dispositivo. Não precisa instalar nada.

---

## 1. Dashboard (tela inicial)

**O que faz:**
Resumo rápido do rebanho. Mostra quantos animais ativos existem, quantas vacas, quantos bezerros e quantos pastos estão ativos. Tem também uma barra de busca por número de brinco e um ranking dos pastos com mais animais.

**Minha opinião:**
Funcional, mas básico. O ranking de pastos é útil para ter uma visão geral rápida. O que falta é uma linha de tendência — saber se o rebanho cresceu ou diminuiu no último mês, por exemplo. Também seria bom ter alertas automáticos (ex: "3 vacas com inseminação pendente há mais de 90 dias").

---

## 2. Pastos

**O que faz:**
Lista todos os pastos cadastrados com a quantidade atual de animais em cada um. Clicando em um pasto, você vê quais animais estão lá, a distribuição por categoria, e pode mover um animal para outro pasto direto nessa tela.

**Como funciona a movimentação:**
Você seleciona o pasto de destino, escolhe a data da mudança, e clica em "Mover". O sistema registra isso em dois lugares: nas transações (fica no histórico de movimentações) e no histórico de pastos (fica na tabela que alimenta as análises históricas).

**Visão histórica:**
No topo da tela do pasto, aparecem botões com os meses em que houve movimentação. Clicando em qualquer mês, a lista de animais muda para mostrar quem estava naquele pasto naquela época — não quem está hoje. Isso permite saber exatamente a composição do pasto em qualquer momento passado.

**Minha opinião:**
Essa visão histórica é o diferencial do sistema. Funciona bem. O que poderia melhorar: mostrar um mini-gráfico de evolução do total de animais mês a mês dentro de cada pasto, e permitir cadastrar novos pastos direto na tela (hoje não tem botão de criar pasto — precisa ir pelo banco).

---

## 3. Animais

**O que faz:**
Lista todos os animais com filtros por categoria, status (ativo, vendido, morto) e busca por brinco. Também tem ordenação: você pode ordenar por número de brinco (crescente ou decrescente) ou por nome do pasto (A–Z ou Z–A).

**Ficha do animal:**
Clicando em qualquer animal, você vê e edita todos os dados dele: brinco, categoria, status, pasto. Na mesma tela aparecem as seções de vacinas, inseminações, nascimentos e movimentações. Cada seção tem formulário próprio para adicionar novos registros.

**Minha opinião:**
Bem completo. O que falta mais: foto do animal (útil em campo), campo de observações gerais, e a possibilidade de registrar peso/saúde. A ordenação por pasto é muito prática para trabalhar com um pasto por vez.

---

## 4. Movimentações (Transações)

**O que faz:**
Log completo de tudo que aconteceu na fazenda: compras, vendas, mortes, nascimentos, transferências entre pastos e vacinas. Filtra por tipo de evento e por mês. Mostra cards de resumo com a contagem de cada tipo.

**Transferências:**
Quando um animal é movido entre pastos, aparece aqui com "Pasto A → Pasto B" e a data. Você pode editar a data de uma transferência na ficha do animal caso tenha registrado errado.

**Minha opinião:**
Funciona como um diário da fazenda. O que melhoraria muito: filtro por período (de/até), exportação para Excel, e poder registrar valores (ex: preço de venda, custo da vacina). Hoje o campo de notas é o único lugar para guardar esse tipo de info.

---

## 5. Inseminações

**O que faz:**
Registro centralizado de todas as inseminações. Para cada registro: data, animal, touro/sêmen utilizado, resultado (Aguardando / Prenha / Vazia) e se o serviço foi pago. Filtra por mês e por resultado. O resultado pode ser atualizado inline direto na lista, sem abrir nada.

**Minha opinião:**
Bem pensado. O campo "pago/pendente" é prático para controle financeiro. O que falta: prazo esperado de resultado (ex: data da ultrassom), notificação de inseminações aguardando há mais de X dias, e taxa de prenhez automática (% de confirmadas sobre o total).

---

## 6. Análise por Data *(o relatório que você gostou)*

**O que faz:**
Esta é a tela mais analítica do sistema. Ela cruza o histórico de movimentação dos animais com um período de datas que você escolhe e mostra tudo que aconteceu naquele intervalo.

**Como usar:**
1. Defina o período (padrão: últimos 30 dias). Tem atalhos para 7, 30 e 90 dias.
2. Opcionalmente filtre por um pasto específico.
3. O sistema mostra 4 cards de resumo: total de movimentos, entradas, saídas e transferências.

**O que aparece:**

- **Saldo por Pasto:** tabela mostrando, para cada pasto, quantos animais entraram, quantos saíram, e o saldo líquido (positivo = cresceu, negativo = diminuiu). Ordenado pelos de maior variação primeiro.

- **Transferências no Período:** lista detalhada de qual animal foi de qual pasto para qual pasto, com data. Clicável direto para a ficha do animal.

- **Linha do Tempo:** agrupada por dia. Para cada dia com movimentação, mostra quais pastos foram afetados, quais animais entraram (↑) e quais saíram (↓). Cada brinco é clicável.

**Exemplo prático:**
Você quer saber o que aconteceu no mês de maio. Coloca "01/05" até "31/05", e o sistema mostra dia a dia: dia 3, Pasto Sul recebeu 5 vacas e perdeu 2 bezerros; dia 15, Pasto Norte recebeu 8 animais vindo do Pasto Leste, e assim por diante.

**Minha opinião:**
Esta é a tela mais poderosa do sistema e a que mais vai crescer em valor com o tempo, conforme o histórico acumula. O que eu adicionaria: exportação em PDF/Excel desta análise, e um modo "auditoria" que compara o que estava planejado com o que aconteceu.

---

## 7. Histórico Mensal

**O que faz:**
Tabela com fotografia do rebanho ao fim de cada mês. Mostra todos os pastos nas linhas e todas as categorias de animais nas colunas. Você escolhe quantos meses quer ver (1, 2, 3 ou 6).

**Como interpretar:**
Cada célula mostra quantos animais daquela categoria estavam naquele pasto ao final daquele mês. A linha TOTAL soma tudo. Clicar em "ver" leva para a visão histórica do pasto naquele mês específico.

**Minha opinião:**
Ótimo para reuniões e acompanhamento mensal. O que falta: poder exportar essa tabela, e uma linha de variação entre meses (mostrar +/- em relação ao mês anterior).

---

## 8. Comparar Pastos

**O que faz:**
Tabela lado a lado comparando o mês selecionado com o mês anterior. Para cada pasto e cada categoria, mostra o valor atual e o valor do mês anterior com o delta (+2, -3, etc). Há alertas automáticos em vermelho quando um pasto perde 20% ou mais dos animais.

**Recursos extras:**
- Botão "Mostrar brincos" lista todos os brincos atuais de cada pasto na tabela (útil para auditoria).
- Link "comparar →" na tela do Histórico leva direto aqui.

**Minha opinião:**
Muito útil para detectar anomalias — se um pasto perdeu muitos animais sem registro de venda ou morte, aparece em vermelho. O limiar de 20% pode ser configurável no futuro. Também seria útil mostrar a variação em percentual além do número absoluto.

---

## Resumo: O que melhorar (prioridades)

**Alta prioridade:**
- Exportação de qualquer tabela para Excel ou PDF
- Cadastro de pastos direto na interface (hoje precisa ir pelo banco)
- Filtro de período (de/até) em Movimentações
- Taxa de prenhez automática em Inseminações

**Média prioridade:**
- Campo de peso/saúde nos animais
- Alertas automáticos (inseminações vencidas, pastos com queda brusca)
- Gráfico de evolução do rebanho no Dashboard
- Valores financeiros (preço de venda, custo de vacina)

**Futuro:**
- Foto dos animais
- Aplicativo mobile (hoje já funciona no celular pelo navegador, mas um app nativo seria melhor para uso em campo)
- Multi-fazenda (para gerenciar mais de uma propriedade com o mesmo login)
- Relatório gerencial em PDF com logo da fazenda para enviar ao proprietário

---

*Gerado em 02/07/2026 · Sistema COWSIS*
