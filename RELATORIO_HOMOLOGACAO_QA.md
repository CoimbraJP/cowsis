# Relatório de Homologação — COWSIS
**Analista de QA Sênior · Testes Funcionais / Aceitação**
**Data:** 04/07/2026
**Escopo:** 100% das telas, menus, formulários, botões, filtros e relatórios, simulando vários dias de uso real por um usuário experiente. Nenhuma análise de código, arquitetura ou performance foi considerada — apenas o comportamento percebido pelo usuário final.

---

## 1. Fluxos testados

| # | Fluxo |
|---|-------|
| F01 | Dashboard: cards, busca por brinco, gráfico de evolução, lista de pastos, últimas inseminações |
| F02 | Animais: listar, buscar, filtrar (status/categoria/prenhas), ordenar, criar, editar, excluir |
| F03 | Animal (detalhe): editar dados, prenhez, origem, vacinas (criar/apagar), inseminações, movimentações, nascimentos, exclusão |
| F04 | Pastos: listar, criar, renomear (2 telas), desativar/reativar, apagar, visão histórica por mês |
| F05 | Mover animal entre pastos (com data retroativa) |
| F06 | Inseminações: listar, filtrar por mês/status, registrar (2 telas), acompanhar ciclo |
| F07 | Partos/Nascimentos: tentativa de cadastro e consulta |
| F08 | Movimentações: listagem, cards por tipo, filtros de período, resumo financeiro |
| F09 | Relatório PDF: geral, por pasto, todos os pastos, impressão/exportação |
| F10 | Análise por Data: linha do tempo, saldo por pasto, transferências |
| F11 | Histórico Mensal por Pasto e Comparação entre Pastos |
| F12 | Validação cruzada: cada dado criado foi conferido em todas as telas onde deveria aparecer |

## 2. Funcionalidades testadas

Criação, edição e exclusão de registros; pesquisa e filtros; ordenação; campos obrigatórios e vazios; datas passadas/futuras; registros duplicados; textos longos e caracteres especiais; navegação e botões "voltar/cancelar"; contadores e totais; gráficos; consistência entre telas; impressão e exportação do relatório; comportamento com listas vazias e grandes volumes.

## 3. Casos de teste executados (resumo)

| CT | Descrição | Resultado |
|----|-----------|-----------|
| CT01 | Criar animal com pasto e origem | OK (com ressalvas P17, P20) |
| CT02 | Criar animal com brinco duplicado | **FALHA** (P17) |
| CT03 | Editar animal trocando o pasto pelo formulário | **FALHA** (P08) |
| CT04 | Marcar animal como Vendido/Morto | **FALHA** (P04, P09) |
| CT05 | Excluir animal | **FALHA** (P06, P07) |
| CT06 | Registrar inseminação "Aguardando" com data de ontem | **FALHA** (P02) |
| CT07 | Atualizar inseminação de "Aguardando" para "Prenha" | **FALHA** (P01) |
| CT08 | Registrar parto | **FALHA** (P03) |
| CT09 | Registrar venda com valor | **FALHA** (P04) |
| CT10 | Apagar pasto já utilizado | **FALHA** (P05) |
| CT11 | Mover animal (dropdown padrão) | **FALHA** (P15) |
| CT12 | Ordenar lista por brinco | **FALHA** (P14) |
| CT13 | Conferir contagens de pasto entre Dashboard, Pastos, Detalhe e Relatório | **FALHA** (P11) |
| CT14 | Card "Bezerros(as)" → lista correspondente | **FALHA** (P12) |
| CT15 | Relatório "Todos os pastos" com animais sem brinco | **FALHA** (P13) |
| CT16 | Mesmo mês em Histórico × Comparar | **FALHA** (P18) |
| CT17 | Filtrar Movimentações por período e conferir cards | **FALHA** (P16) |
| CT18 | Buscar brinco no Dashboard e na lista de Animais | OK |
| CT19 | Filtros de mês/status em Inseminações | OK |
| CT20 | Imprimir/Exportar Relatório PDF | OK (funciona via impressão do navegador) |
| CT21 | Renomear pasto (listagem e detalhe) | OK (ressalva P30) |
| CT22 | Desativar pasto e conferir relatórios históricos | **FALHA** (P19) |
| CT23 | Registrar e apagar vacina | OK (ressalva P33 — sem confirmação) |
| CT24 | Visão histórica do pasto por mês | OK (ressalva P09) |

## 4–8. Problemas encontrados

Formato: **Gravidade · Como reproduzir · Esperado · Encontrado**

### 🔴 CRÍTICOS

**P01 — Impossível confirmar prenhez de uma inseminação existente**
- **Reproduzir:** Registre uma inseminação como "Aguardando". Dias depois, tente alterá-la para "Prenha" — procure em Inseminações, no detalhe do animal e no Dashboard.
- **Esperado:** Alguma tela permitir editar o status da inseminação (fluxo central do controle reprodutivo).
- **Encontrado:** Não existe botão ou formulário de edição de inseminação em nenhuma tela. O registro nasce e morre com o mesmo status. O único contorno é criar uma segunda inseminação, o que duplica os totais e distorce a "Taxa de prenhez" do relatório.

**P02 — Inseminação com data passada é descartada em silêncio**
- **Reproduzir:** Menu Inseminações → "Registrar inseminação" → status "Aguardando", data de ontem → Registrar.
- **Esperado:** Salvar, ou exibir mensagem clara de erro impedindo o envio.
- **Encontrado:** O sistema volta para a lista como se tivesse salvo, mas nada é gravado. O usuário perde o registro sem nenhum aviso. O mesmo ocorre no formulário do detalhe do animal (a tela apenas "pisca").

**P03 — Não existe tela para cadastrar partos**
- **Reproduzir:** Procure em todos os menus e telas uma forma de registrar um parto/nascimento vinculado à mãe.
- **Esperado:** Formulário de cadastro de parto (o detalhe do animal exibe uma seção "🐣 Nascimentos" e os relatórios preveem esses dados).
- **Encontrado:** A seção só exibe dados pré-existentes (importados). Nenhuma tela cria registro de parto. Funcionalidade anunciada pela interface, porém inexistente.

**P04 — Impossível registrar venda ou morte com valor; financeiro sempre zerado**
- **Reproduzir:** Venda um animal: edite-o e mude o status para "Vendido". Vá em Movimentações.
- **Esperado:** Registro de "Venda" com data e valor (R$), alimentando os cards 💰 Venda, 💀 Morte e o resumo Receita/Despesas.
- **Encontrado:** Mudar o status não gera movimentação alguma. Não há nenhuma tela que registre venda/morte ou informe valor. Os cards Venda/Morte ficam eternamente em 0 e o resumo financeiro (Movimentações e Relatório PDF) nunca aparece — exceto para dados importados.

**P05 — Apagar pasto já utilizado derruba o sistema (tela de erro)**
- **Reproduzir:** Crie um pasto, mova qualquer animal para ele (ou para fora dele) e depois Detalhe do Pasto → "Apagar pasto" → confirmar.
- **Esperado:** Pasto excluído ou mensagem amigável explicando o bloqueio.
- **Encontrado:** Erro de servidor (violação de integridade: histórico e transferências continuam apontando para o pasto). Na prática, nenhum pasto que já teve movimentação pode ser excluído, e o usuário recebe uma tela de erro técnica.

**P06 — Excluir animal importado derruba o sistema**
- **Reproduzir:** Abra um animal que veio da importação da planilha (presente em inventário de pasto) → "Excluir animal".
- **Esperado:** Exclusão completa ou mensagem amigável.
- **Encontrado:** Erro de servidor (o vínculo com inventário de pasto não é removido). Exclusão falha com tela de erro.

**P07 — Excluir animal: um clique, sem confirmação, e termina em página 404**
- **Reproduzir:** Detalhe de um animal recém-criado → "Excluir animal" (um único clique).
- **Esperado:** Pedido de confirmação (é uma exclusão permanente de todos os registros) e, após excluir, retorno à lista de animais.
- **Encontrado:** Exclui imediatamente sem confirmar e o usuário permanece na página do animal excluído, que vira um erro 404 ("página não encontrada"). Impressão de sistema quebrado.

### 🟠 ALTOS

**P08 — Trocar o pasto pelo formulário de edição não registra a movimentação**
- **Reproduzir:** Detalhe do animal → campo "Pasto atual" → escolher outro pasto → "Salvar alterações". Conferir Movimentações, Análise por Data e Histórico.
- **Esperado:** Mesma consequência do botão "Mover" (transferência registrada e histórico atualizado).
- **Encontrado:** O animal muda de pasto, mas nenhuma transferência é registrada e o histórico continua apontando o pasto antigo. Dashboard (evolução), Análise por Data, Histórico Mensal e Comparar passam a divergir da realidade. Dois caminhos para a mesma ação com resultados diferentes.

**P09 — Animal vendido/morto continua "presente" no pasto para sempre**
- **Reproduzir:** Marque um animal como Morto. Abra o detalhe do pasto, o Histórico Mensal, a Comparação e o gráfico de evolução do Dashboard.
- **Esperado:** O animal sair das contagens de ocupação de pasto a partir da data da baixa.
- **Encontrado:** Ele permanece listado no pasto (tabela do detalhe), segue somando no Histórico Mensal, na Comparação e no gráfico "Evolução do Rebanho" indefinidamente.

**P10 — Prenhez fica dessincronizada das inseminações**
- **Reproduzir:** (a) Registre inseminação "Prenha" → animal ganha 🤰. Depois desmarque "Prenha" no formulário do animal: a inseminação continua "Prenha". (b) Não existe caminho que remova 🤰 automaticamente após parto ou falha.
- **Esperado:** Flag de prenhez coerente com o histórico reprodutivo.
- **Encontrado:** Contagem "prenhas" da lista de animais e o filtro 🤰 divergem dos números da tela de Inseminações e do relatório.

**P11 — Contagem de animais por pasto diferente em cada tela**
- **Reproduzir:** Tenha 1 animal vendido num pasto com 10 ativos. Compare: Dashboard (seção Pastos), tela Pastos (card), detalhe do pasto (cabeçalho × tabela) e Relatório PDF.
- **Esperado:** O mesmo número em todos os lugares (ou distinção explícita).
- **Encontrado:** Dashboard mostra 10 (só ativos); tela Pastos mostra 11 (todos os status); no detalhe o cabeçalho diz "10 animais ativos" mas a tabela lista 11; o Relatório mostra 10. O usuário não sabe em qual número confiar.

**P12 — Card "Bezerros(as)" do Dashboard abre a lista errada**
- **Reproduzir:** Dashboard → clicar no card "Bezerros(as)" (ex.: valor 12).
- **Esperado:** Lista filtrada de bezerros e bezerras (12 registros).
- **Encontrado:** Abre a lista de TODOS os animais ativos. O total exibido não bate com o card.

**P13 — Relatório "Todos os pastos": inseminações atribuídas ao pasto errado**
- **Reproduzir:** Tenha 2 animais "sem brinco" em pastos diferentes (ou 2 animais com o mesmo brinco), com inseminações. Relatório PDF → Pasto: "Todos os pastos".
- **Esperado:** Cada inseminação listada apenas sob o pasto do animal correspondente, respeitando o período do relatório.
- **Encontrado:** O cruzamento é feito pelo número do brinco: animais sem brinco "casam" entre si e a inseminação aparece duplicada em vários pastos. Além disso, essa seção ignora o período De/Até selecionado (lista inseminações de qualquer data).

### 🟡 MÉDIOS

**P14 — Ordenação por brinco é alfabética, não numérica**
- **Reproduzir:** Cadastre brincos 1, 2, 10, 100. Ordene por "Brinco" na lista de Animais (ou veja qualquer listagem).
- **Esperado:** 1, 2, 10, 100. **Encontrado:** 1, 10, 100, 2 — em todas as telas.

**P15 — Botão "Mover" gera transferência falsa para o mesmo pasto**
- **Reproduzir:** Detalhe do pasto → na linha de um animal, clicar "Mover" sem tocar no dropdown (que já vem pré-selecionado com o próprio pasto).
- **Esperado:** Nada acontecer ou aviso "escolha outro pasto".
- **Encontrado:** Registra transferência "Pasto X → Pasto X", sujando Movimentações, Análise por Data e o histórico do animal.

**P16 — Cards de Movimentações ignoram o filtro de período**
- **Reproduzir:** Movimentações → filtrar "7d". Compare os cards (Venda, Transferência…) com a lista.
- **Esperado:** Cards refletirem o período filtrado.
- **Encontrado:** Cards mostram o total geral de sempre; a lista mostra o período. Números não batem na mesma tela.

**P17 — Brinco duplicado aceito sem aviso**
- **Reproduzir:** Cadastre dois animais com brinco "123".
- **Esperado:** Bloqueio ou alerta de duplicidade.
- **Encontrado:** Aceita silenciosamente; buscas e relatórios passam a exibir dois "#123" indistinguíveis.

**P18 — Histórico e Comparar mostram totais diferentes para o mesmo mês**
- **Reproduzir:** Tenha animais cadastrados direto no pasto (sem movimentação). Compare o total do mês atual em "Histórico" e em "Comparar".
- **Esperado:** Mesmo total. **Encontrado:** Histórico soma os animais "sem histórico" no mês corrente; Comparar não — telas irmãs divergem.

**P19 — Desativar um pasto apaga seu passado dos relatórios**
- **Reproduzir:** Desative um pasto que teve animais em meses anteriores. Abra Histórico Mensal, Comparar e Análise por Data.
- **Esperado:** Meses passados continuarem mostrando o pasto.
- **Encontrado:** O pasto some de todas as visões históricas, alterando totais de meses já fechados.

**P20 — Pastos inativos aparecem nos cadastros como opções normais**
- **Reproduzir:** Desative um pasto → Novo Animal / Editar Animal / Mover.
- **Esperado:** Pasto inativo oculto ou marcado como "(inativo)".
- **Encontrado:** Aparece igual aos ativos; é possível alocar animais em pasto desativado.

**P21 — "Serviço pago" é registrado mas invisível**
- **Reproduzir:** Registre inseminação marcando "Serviço pago". Abra a lista de Inseminações.
- **Esperado:** Coluna/indicador de pagamento. **Encontrado:** A informação não aparece em lugar nenhum da tela (só no Relatório PDF), e não pode ser alterada depois (vide P01).

**P22 — Comparar: "Mostrar brincos" exibe a composição de hoje em meses passados**
- **Reproduzir:** Comparar → escolher um mês antigo → "Mostrar brincos".
- **Esperado:** Brincos daquele mês. **Encontrado:** Brincos atuais, contradizendo os números históricos da própria linha.

**P23 — Pill "🤰 prenhas" descarta os filtros ativos**
- **Reproduzir:** Animais → filtrar categoria "Vaca" → clicar na pill "prenhas".
- **Esperado:** Vacas prenhas. **Encontrado:** Todas as prenhas (filtro de categoria perdido sem aviso).

**P24 — Contadores da lista de Animais confundem quando há filtro**
- **Reproduzir:** Animais → filtrar status "Vendido".
- **Esperado:** Pills indicarem claramente que se referem ao resultado filtrado.
- **Encontrado:** "0 ativos · 15 vendidos · 0 mortos" — parece que o rebanho zerou.

### 🟢 BAIXOS

**P25 — Rótulo "Pronto"** para inseminação falhada é ambíguo (usuário não entende que significa "não prenhou / pronta para nova tentativa").
**P26 — Datas em formato ISO (2026-07-04)** em Dashboard, listas, Análise e Histórico, em vez de 04/07/2026 (o Relatório PDF formata corretamente — inconsistência entre telas).
**P27 — Sem paginação** nas listas de Animais, Inseminações e Movimentações; com o rebanho crescendo, as telas ficam quilométricas.
**P28 — Falha de conexão exibe Dashboard todo zerado** sem qualquer aviso de erro — usuário pode achar que perdeu o rebanho.
**P29 — Campos sem limite prático:** brincos e observações muito longos quebram o layout de tabelas e do relatório impresso.
**P30 — Renomear pasto na listagem:** após "Salvar", a tela permanece em modo de edição (URL mantém `?edit=`), sugerindo que não salvou.
**P31 — "Apagar" vacina não pede confirmação.**
**P32 — Histórico:** parâmetro "Meses exibidos" com valor manual inválido na URL zera a tela toda.
**P33 — Sem cadastro/consulta de inventários de pasto:** dados de inventário importados existem mas nenhuma tela os exibe.

## 9. O sistema está apto para entrega?

# ❌ NÃO

**Justificativa:** 7 problemas críticos impedem operações essenciais do dia a dia da fazenda: o ciclo reprodutivo não pode ser acompanhado (P01, P02, P03), o controle financeiro de vendas/mortes é inexistente (P04) e exclusões rotineiras terminam em telas de erro ou 404 (P05, P06, P07). Somam-se 6 problemas altos de inconsistência de dados entre telas e relatórios — o usuário não consegue confiar nos números exibidos.

**Recomendação de prioridade para nova rodada de homologação:**
1. P01, P02, P03, P04 (fluxos de negócio bloqueados)
2. P05, P06, P07 (erros graves em exclusões)
3. P08–P13 (consistência entre telas e relatórios)
4. Demais itens médios/baixos

---
*Relatório gerado exclusivamente sob a ótica do usuário final. Total: 33 problemas (7 críticos · 6 altos · 11 médios · 9 baixos).*
