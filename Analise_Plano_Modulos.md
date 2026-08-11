# Análise do Plano de Módulos — Pecuária RS

Avaliação técnica e comercial do plano de expansão, com base no estado real do código em produção.

---

## 1. Veredito geral

**O plano é bom e a sequência de dependência está tecnicamente correta.** Módulo 1 gera o dado, Módulo 2 conecta o dado, Módulo 3 lê o dado. Não dá para inverter.

Mas há **três problemas sérios** que precisam ser resolvidos antes de virar proposta comercial:

1. **A sequência é comercialmente ruim.** O cliente paga os Módulos 1 e 2 (que *aumentam* o trabalho de digitação dela) e só sente o valor no Módulo 3. É pedir fé por dois pagamentos seguidos.
2. **O Módulo 3 vai nascer vazio.** Todo o BI depende de dados históricos que não existem. Ranking de mortalidade, taxa de sucesso por sêmen, evolução anual — nada disso terá substância nos primeiros meses.
3. **Faltam pré-requisitos de banco que não estão no escopo de nenhum módulo.** Se não forem orçados, viram trabalho não pago.

Além disso, existe **um bug de modelagem já em produção** que corrompe a contagem de nascimentos (detalhado na seção 3).

---

## 2. O que o sistema JÁ tem hoje

Importante para não vender o que já está entregue — e para usar como prova de capacidade.

### Já pronto e funcionando

| Recurso | Situação |
|---|---|
| Cadastro de animais, pastos, movimentações | Completo |
| Inseminações com status, sêmen, pagamento | Completo |
| Registro de venda e morte com valor | Completo |
| Composições (snapshots) de pasto por data | Completo |
| Relatórios: Geral, Mortes, Nascimentos, Vendas, Inseminações, Por Pasto | Completo |
| Export Excel completo (9 abas) | Completo |
| Impressão / PDF de todos os relatórios | Completo |
| Auditoria de pasto | Front pronto, gravação desativada |
| Carga inicial por planilha + reset do banco | Completo |

### Partes do Módulo 3 que JÁ ESTÃO ENTREGUES

Isso é crítico para a proposta — parte do que está sendo vendido como novidade já existe:

- **Taxa de prenhez geral** (total, prenhas, falhas, aguardando, %) — pronto
- **Indicadores de sêmen** — o relatório de Inseminações já tem ranking por touro/sêmen com prenhas, falhas e taxa de sucesso colorida. **Isso é exatamente o "Indicadores de Sêmen" do Módulo 3.**
- **Evolução mensal** de inseminações, mortes, nascimentos e vendas — pronto
- **Mortalidade por categoria e por pasto** — pronto
- **Nascimentos por sexo** (machos/fêmeas) — pronto
- **Distribuição de rebanho por categoria e pasto** — pronto
- **Receita, despesa, saldo, ticket médio** — pronto

**Consequência comercial:** vender o Módulo 3 inteiro como novo é arriscado. Se a cliente abrir os relatórios atuais e reconhecer metade do que pagou, queima confiança. Melhor posicionar o Módulo 3 como *"aprofundamento do que já existe"* e cobrar pelo que é realmente novo (nível animal, alertas, causas de morte, veterinários, faixa etária).

---

## 3. Bloqueadores técnicos — precisam entrar no orçamento

Estes itens **não estão descritos em nenhum módulo** mas são obrigatórios. Se não forem orçados, viram trabalho de graça.

### 3.1 O banco não tem data de nascimento

O campo `birthDate` **não existe** na tabela de animais. Hoje ela guarda apenas: brinco, categoria, status, pasto, peso, observações e prenhez.

**Impacto:** a mudança automática de categoria por idade — o coração do Módulo 1 — é impossível sem isso. Precisa de migration + backfill de todos os animais existentes.

**Complicação com a cliente:** ela vai precisar informar a data de nascimento (ou idade aproximada) de **todo o rebanho atual**, senão a categorização automática só funciona para animais novos. Isso é trabalho manual dela e precisa ser combinado antes, não depois.

### 3.2 Não existe vínculo de parentesco

A tabela `animals` não tem `motherId` nem `fatherId`. A tabela `births` tem `motherId`, mas **não tem vínculo com o animal que nasceu** — ou seja, não dá para navegar do parto para o bezerro.

**Impacto:** a árvore genealógica do Módulo 2 exige três campos novos e uma migration de ligação.

### 3.3 BUG EM PRODUÇÃO — contagem de nascimentos está inconsistente

Existem **dois caminhos diferentes** gravando o mesmo tipo de registro com significados opostos:

| Origem | O que grava |
|---|---|
| Cadastrar animal com origem "Nascimento" | Transação `BIRTH` no **bezerro** |
| Registrar parto na ficha da vaca | Transação `BIRTH` na **mãe** |

A página `/nascimentos` e o relatório de Nascimentos leem as transações `BIRTH` e buscam o animal vinculado. Resultado: **partos registrados pela ficha da vaca aparecem como se a mãe fosse o recém-nascido.**

Isso significa que os números atuais de nascimento estão misturando mães e crias. Precisa ser corrigido e os dados existentes normalizados. **O Módulo 1 obrigatoriamente tem que resolver isso** — é a fundação dele.

### 3.4 Causa de morte é texto livre

Hoje a causa vai no campo de observações, digitada à mão. O ranking de mortalidade que o plano descreve (`Fraqueza neonatal 42%`, `Predadores 18%`...) **é impossível de gerar** a partir de texto livre — "fraqueza", "Fraqueza neonatal", "franqueza" e "fraca" viram quatro categorias distintas.

**Precisa:** lista fechada de causas (com opção "Outros" + texto). E os registros antigos precisam ser reclassificados manualmente ou ficam de fora do gráfico.

### 3.5 Não existe cadastro de veterinário

Nenhuma tabela ou campo. O indicador de desempenho por veterinário exige um cadastro novo + vínculo nas inseminações + partos.

### 3.6 Machos não viram TOURO automaticamente

Problema de domínio, não de código. A regra descrita diz "acima de 24 meses o programa já troca para VACA". Isso funciona para fêmeas. Para machos, virar **TOURO** automaticamente está errado — a maioria dos machos é castrada, engordada e vendida como boi, e não vira reprodutor.

O sistema hoje **não tem categoria para boi/novilho castrado**. Precisa confirmar com a cliente o que acontece com os machos aos 24 meses antes de programar a regra.

### 3.7 Búfalos têm ciclo diferente

O sistema já aceita `BÚFALO` e `BÚFALA` no cadastro. A regra 12/24 meses de bovino não se aplica igual. Se ela cria búfalos, precisa de tabela de regras por espécie.

---

## 4. Análise módulo a módulo

### MÓDULO 1 — Gestão de Nascidos

**Viabilidade: alta. É o módulo mais bem desenhado do plano.**

O que agrega além do que existe:
- Cadastro de nascimento que **cria o animal automaticamente** (hoje é digitação dupla: registra o parto na mãe *e* cadastra o bezerro do zero)
- Peso ao nascer
- Tipo de nascimento (inseminação / monta natural / veterinário)
- Categorização automática por idade
- Relatório por faixa etária para declaração ao governo

**Pontos de atenção:**

- **A categorização deve ser calculada, não gravada.** Se for um processo que roda toda noite alterando o banco, você cria dependência de agendador, risco de rodar duas vezes, e o dado fica errado se falhar um dia. Calcular a categoria a partir da data de nascimento no momento da leitura é mais barato, é retroativo automaticamente e nunca dessincroniza. Recomendo fortemente esse caminho.
- **"Emite o aviso" precisa de definição.** Aviso onde? Banner no sistema? E-mail? WhatsApp? Isso muda muito o esforço. Se for notificação externa, vira integração (custo de serviço recorrente).
- **A declaração ao governo é o melhor argumento de venda do plano inteiro** — é obrigação legal, recorrente e chata. Mas cuidado ao prometer: cada estado tem formato próprio (IDARON, IAGRO, ADAPAR...). Prometa *"relatório por faixa etária que facilita o preenchimento"*, não *"gera a declaração pronta"*, a menos que você veja o formato exigido antes.

**Esforço estimado:** médio-alto. A migration + correção do bug de nascimento + backfill representam boa parte do trabalho e são invisíveis para a cliente — precisam estar no preço.

---

### MÓDULO 2 — Árvore Genealógica

*(No documento está numerado como "Módulo 3" — corrigir antes de enviar, tem dois módulos com o mesmo número.)*

**Viabilidade: alta, e é o módulo de melhor relação valor/esforço.**

Depois que o Módulo 1 estiver gravando mãe e pai corretamente, a árvore é essencialmente navegação e consulta. Não há regra de negócio complexa.

**O que agrega:** ficha da mãe com todos os filhos clicáveis, incluindo os já mortos ou vendidos. Isso é genuinamente útil e visualmente impressiona em demonstração.

**O que falta no seu texto:**
- **Profundidade de gerações.** Só mãe→filhos, ou avó→mãe→filhos? Uma árvore de 3+ níveis é bem mais trabalhosa (e mais vendável).
- **Alerta de consanguinidade.** Se o sistema conhece o parentesco, ele pode avisar quando uma inseminação for entre parentes próximos. Isso tem valor zootécnico real e é um diferencial forte que você não citou.
- **Animais que já morreram/venderam** precisam continuar aparecendo na árvore. Hoje a exclusão de animal apaga tudo em cascata — se ela apagar uma vaca, some o histórico dos filhos. Precisa revisar essa regra.

---

### MÓDULO 3 — Business Intelligence

**Viabilidade: alta tecnicamente. Média comercialmente — e esse é o problema.**

**Nível fazenda:** como mostrado na seção 2, boa parte já existe. O que é realmente novo:
- Ranking de causas de morte (bloqueado pelo item 3.4)
- Desempenho por veterinário (bloqueado pelo 3.5)
- Faixas etárias (bloqueado pelo 3.1)
- Evolução anual comparativa (2024 vs 2025 vs 2026)

**Nível animal:** isso sim é 100% novo e é a parte mais forte do módulo. Ficha da vaca com 8 inseminações / 6 prenhezes / 5 filhos vivos / taxa 75% é exatamente o tipo de coisa que faz o cliente sentir que o sistema é inteligente.

**Alertas inteligentes:** é o item mais valioso da lista inteira e está enterrado no fim do documento. Alertas são o que faz alguém abrir o sistema todo dia. Deveria ser destaque, não rodapé.

**O problema do dado vazio:**

Ela vai pagar pelo BI e abrir uma tela com gráficos vazios, porque:
- Causas de morte estruturadas só existirão a partir da implementação
- Veterinários idem
- Comparativo anual precisa de anos de dado
- Taxa de sucesso por sêmen precisa de volume para ter significado estatístico

**Como resolver:** ou você faz um trabalho de retroalimentação (ela revisa os registros antigos e classifica causas de morte — trabalho dela, precisa ser combinado), ou você vende o BI com expectativa clara de que ele *"fica mais rico a cada mês"*. A segunda opção é honesta mas mais difícil de vender.

**Sobre "Vaca próxima do parto":** esse alerta é fácil e de altíssimo valor percebido. Gestação bovina é ~283 dias. Com a data da inseminação confirmada, o sistema calcula a data prevista de parto sozinho. **Isso deveria estar no Módulo 1, não no 3** — é o tipo de funcionalidade que justifica o módulo inteiro na cabeça do cliente.

---

## 5. O que falta no seu plano

Oportunidades reais que você não descreveu, em ordem de facilidade de venda:

### 5.1 Controle de peso e ganho de peso (GMD)
Você cita "bezerro sem pesagem" como alerta, mas **não existe módulo de pesagem**. Hoje o sistema guarda só o peso atual, sem histórico. Ganho Médio Diário é uma das métricas mais importantes da pecuária de corte. Um módulo de pesagens com histórico e curva de crescimento por animal e por lote é venda fácil e alto valor.

### 5.2 Calendário sanitário com alertas
Vacinas hoje são registros soltos. Aftosa e brucelose têm calendário oficial e são **obrigação legal**. Um calendário que avisa "faltam 15 dias para a campanha de aftosa" e mostra quem já foi vacinado tem valor imediato e recorrente. Encaixa perfeitamente na mesma pegada de "declaração obrigatória" do Módulo 1.

### 5.3 Custo e rentabilidade por animal
O sistema registra venda e aquisição, mas não custos (ração, sal, medicamento, sêmen, veterinário). Sem isso, não existe margem real. *"Quanto esse animal me custou e quanto ele me deu"* é a pergunta que todo pecuarista quer responder e é o BI de maior valor comercial que existe.

### 5.4 Estoque de sêmen
Você mede sucesso por sêmen mas não controla o estoque. Doses compradas, usadas, restantes, custo por prenhez. Complemento natural e barato do que já existe.

### 5.5 Previsão de parto e calendário reprodutivo
Já mencionado acima. Cheap win, altíssimo valor percebido.

### 5.6 Lotação e capacidade de pasto
Pastos hoje não têm área (hectares) nem capacidade. Com isso dava para calcular UA/ha e avisar superlotação, além de sugerir rotação. Diferencial técnico forte.

### 5.7 Uso no celular (campo)
**Este é o ponto cego mais grave do plano.** Todo o cadastro que você está propondo — nascimento, peso ao nascer, pesagem, auditoria de pasto — acontece **no curral, não no escritório**. Se ela tiver que anotar no papel e digitar depois, a adoção dos módulos 1 e 2 despenca e o BI do módulo 3 nasce com dado incompleto.

O sistema é responsivo, mas não é feito para uso com uma mão, luva suja e sinal fraco. Isso não é um módulo — é o que determina se os outros três vão funcionar.

### 5.8 Usuários e permissões
Hoje **qualquer pessoa com o link tem acesso total**, incluindo a página `/adm/setup` que zera o banco inteiro. Para um produto pago com múltiplas pessoas (ela, o capataz, o veterinário), isso é um risco sério. Login com perfis é pré-requisito de qualquer venda maior.

### 5.9 Backup automático
Foi conversado e nunca implementado. Hoje o backup depende dela lembrar de clicar em "Excel completo". Para produto pago, backup automático é obrigação, não diferencial — e é argumento de tranquilidade na venda.

---

## 6. Recomendação de reempacotamento comercial

O problema central: **os módulos 1 e 2 custam esforço para a cliente e entregam valor depois. O 3 entrega valor mas depende dos outros dois.**

### Sugestão de reorganização

**Pacote A — "Rebanho Inteligente"** (junta Módulo 1 + Módulo 2)

Vender separado é ruim: cadastro de nascimento sem árvore genealógica parece incompleto, e árvore sem cadastro não tem o que mostrar. Juntos formam uma história única e vendável.

Entrega imediata e tangível:
- Cadastro de nascimento que cria o animal sozinho (elimina digitação dupla — economia de tempo dela, hoje)
- Categoria muda sozinha por idade (fim do retrabalho manual)
- Relatório por faixa etária para a declaração obrigatória
- Previsão de parto
- Árvore genealógica navegável

**Pacote B — "Inteligência e Alertas"** (Módulo 3, reposicionado)

Vender como *aprofundamento*, com honestidade sobre o que já existe. Foco no que é novo: nível animal, alertas, causas de morte, veterinários. Deixar claro que enriquece com o tempo.

**Pacote C — "Produtividade"** (o que falta, seção 5)

Pesagem + GMD + calendário sanitário + custo por animal. Este é provavelmente o pacote de **maior valor comercial de todos** e não está no seu plano.

### Sobre modelo de cobrança

Você está estruturando venda por módulo (pagamento único). Considere separar:

- **Implementação** (valor único por módulo)
- **Mensalidade** de hospedagem, backup, suporte e evolução

Hoje o sistema roda em plano gratuito de Supabase e Vercel. Isso tem limite de linhas e o projeto pode ser pausado por inatividade. Quando virar produção real de um cliente pagante, vai precisar de plano pago — **esse custo precisa estar coberto por receita recorrente**, senão ele sai do seu bolso. Mensalidade também resolve o problema de você ficar refém de vender módulo novo para faturar.

---

## 7. Riscos a controlar

| Risco | Gravidade | Mitigação |
|---|---|---|
| Bug de nascimento (mãe vs cria) já corrompe dados | Alta | Corrigir no Módulo 1, normalizar histórico |
| Rebanho atual sem data de nascimento | Alta | Combinar com a cliente ANTES de vender o Módulo 1 |
| Prometer "declaração do governo pronta" | Alta | Ver o formato do estado dela antes de prometer |
| BI vazio na entrega | Média | Alinhar expectativa ou fazer retroalimentação |
| Regra de macho aos 24 meses | Média | Confirmar com a cliente o que fazer com machos |
| Sem controle de acesso | Média | Login antes de qualquer módulo pago sério |
| Adoção travar por ser desktop | Alta | Testar cadastro no celular no curral antes de vender |
| Plano gratuito de banco em produção | Média | Migrar para plano pago coberto por mensalidade |

---

## 8. Resumo executivo

**Manter:** a sequência 1 → 2 → 3, que está tecnicamente certa.

**Corrigir antes de enviar:**
- A numeração (dois módulos chamados "3")
- Remover do Módulo 3 o que já está entregue (indicadores de sêmen, taxa de prenhez, evolução mensal)
- Mover previsão de parto para o Módulo 1
- Promover "Alertas Inteligentes" a destaque

**Adicionar ao orçamento (hoje invisível):** migration de data de nascimento, correção do bug de nascimentos, vínculo de parentesco, causas de morte estruturadas, cadastro de veterinário.

**Adicionar ao plano de vendas:** pesagem/GMD, calendário sanitário, custo por animal — provavelmente mais vendáveis que o próprio Módulo 3.

**Resolver antes de tudo:** uso no celular e controle de acesso. Sem o primeiro, os módulos não são usados. Sem o segundo, um clique errado apaga a fazenda inteira.
