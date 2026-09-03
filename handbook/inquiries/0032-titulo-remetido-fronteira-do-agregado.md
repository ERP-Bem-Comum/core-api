---
inquiry: 0032
title: "Título remetido pertence ao documento? — a fronteira de agregado por trás do deadlock"
state: open
opened: 2026-08-23
last_reviewed: 2026-08-23
---

# Inquiry-0032: Título remetido pertence ao documento? — a fronteira de agregado por trás do deadlock

- **Status:** Open
- **Opened:** 2026-08-23
- **Closed/Decided:** —
- **Opened by:** Gabriel (sessão `core-api-17`, assistida)
- **Asked to:** P.O. (pendente) / `suporte-infra-agent` (medição em MySQL real, respondida)
- **Impact:** ADR novo sobre fronteira `Document`↔`Payable` | decisão operacional sobre ajuste de nota

---

## 1. Contexto

Investigação aberta a partir de uma conversa de modelagem — "o que é o fato gerador, e como
represento isso?" — que convergiu num incidente vivo: **deadlock recorrente no `financial`**.

O Gabriel descreveu o sintoma como "o banco está com ciclos em todo canto". A medição mostrou que
**não há ciclo de chave estrangeira**: as 11 FKs do módulo formam um grafo acíclico. O ciclo é de
**ordem de aquisição de lock** — um ciclo no *wait-for graph*, que existe num schema em árvore.

A conexão entre os dois temas não é acidental: **a fronteira do agregado é a fronteira da
transação**. Um agregado que reivindica mais do que lhe pertence trava mais do que precisa.

---

## 2. Pergunta(s) feita(s)

```
Um título já enviado ao banco pode ser apagado por um save do documento?
```

E a decorrente, que define a forma da resposta:

```
Quando o operador corrige uma nota cujo título já foi remetido, o que ele deveria ver?
```

---

## 3. Respostas / Investigação

### 2026-08-23 — Gabriel (decisão de produto, parcial)

> "Deixe explicado no ERRO que lançarmos que é recusa e por quê; no front a P.O. poderá nos corrigir."

Ou seja: **recusa**, com erro autoexplicativo. A alternativa (versionamento / documento de ajuste)
fica para a P.O. avaliar a partir do texto que a borda expuser.

### 2026-08-23 — `suporte-infra-agent`, sessão 06 (MySQL 8.4.11 real, lab autorizado)

Capturou o `LATEST DETECTED DEADLOCK`. Forma do ciclo:

```
(1) INSERT INTO fin_remittance_payables ...
    HOLDS:   fin_payables   PRIMARY  S, REC_NOT_GAP
    WAITING: fin_documents  PRIMARY  S, REC_NOT_GAP

(2) DELETE FROM fin_payables WHERE id IN (...)
    HOLDS:   fin_documents  PRIMARY  X, REC_NOT_GAP
    WAITING: fin_payables   PRIMARY  X, REC_NOT_GAP

*** WE ROLL BACK TRANSACTION (2)
```

Quatro achados que mudam o rumo:

1. **Não há `gap` em lock nenhum.** Todos `REC_NOT_GAP`, nas PKs. Não é faixa de índice, não é
   índice não-único, não é intercalação de UUID. É ordem pura.
2. **`READ COMMITTED` não resolve — medido, não inferido.** `REPEATABLE READ` → 10/10 deadlocks;
   `READ COMMITTED` → 10/10. Idêntico. RC remove *gap locks*, e aqui não há gap a remover. Todas
   as transações de domínio do `financial` rodam hoje em RR (nenhum repo passa `isolationLevel`;
   o único `CLAIM_ISOLATION` é do outbox, em `fin-outbox-reader.drizzle.ts:295`).
3. **Ordenar a aquisição zera o deadlock (0/10) e desenterra outro erro:**
   `1451 ER_ROW_IS_REFERENCED_2`. A remessa commita, cria o vínculo em `fin_remittance_payables`,
   e o `DELETE FROM fin_payables` do hard replace bate na FK `RESTRICT`. **O deadlock estava
   mascarando uma regra de negócio nunca decidida.**
4. **Assimetria de rede.** `withDeadlockRetry` existe só em
   `document-repository.drizzle.ts:236`; `remittance-repository.drizzle.ts` não tem. Nas 10
   rodadas a vítima foi o save 10/10 — mas por *sorte estrutural* (o InnoDB elege quem fez menos
   trabalho, e a remessa insere mais linhas). Lote pequeno inverte a vítima para o caminho sem rede.

**Ressalva do próprio laudo:** o harness força a intercalação com sleeps. Os 10/10 provam que o
ciclo é **alcançável** e qual é sua **forma** — não com que frequência ocorre em produção.

**Lacuna declarada:** não há contagem de `1213` vs `1205` de produção. Fechar isso exige
`SHOW ENGINE INNODB STATUS` no ambiente onde dói — acesso não autorizado ao agente de infra.

### 2026-08-23 — Leitura estática do código (esta sessão, read-only)

- O erro **já existe**: `document-has-held-payable` (`domain/document/errors.ts:25`), com comentário
  que já descreve a regra em `errors.ts:21-24`.
- A recusa **já é aplicada** no ajuste: `application/use-cases/adjust-document.ts:175` lê os títulos
  presos e `domain/document/document.ts:520-521` recusa.
- **Mas a verificação é TOCTOU.** `findHeldPayableIds` roda em `adjust-document.ts:175`, **fora** da
  transação do `repo.save` (linha 200). Entre a checagem e o `DELETE`, a emissão de remessa pode
  inserir o vínculo — e aí sai `1451`, ou o deadlock.
- A branch `fix/remittance-hold-toctou` (worktree `remittance-toctou`, HEAD `92d131ed`) fecha a
  janela do lado da **emissão** (`72d94c2c`, "a emissão reserva os títulos sob lock"). Ela **não**
  toca `adjust-document.ts` nem `document-repository.drizzle.ts`: a janela do lado do **ajuste**
  segue aberta.
- O fix do outbox **não está em `dev`** (`dev` = `f5fc19be`). O risco de escala do claim novo, medido
  na sessão 06, é prognóstico — não explica o incidente atual. ⚠️ O SHA daquele fix mudou de
  `7172b7d2` para `4c149573` (commit emendado; ver §3, coordenação).

### 2026-08-23 — Peer `core-api-4c` (dono do fanout do outbox), consultado antes de propor

Confirmado **por diff**, não de memória: o commit do fanout toca cinco arquivos do `financial`, todos
do lado do **consumo** ou do schema (`fin-outbox-reader.drizzle.ts`, `schemas/mysql.ts`, a migration
`0052` e seu `meta/`). Consequências para esta inquiry:

1. **Não há colisão no produtor.** `appendOutboxInTx` continua fazendo um `INSERT` no outbox e nada
   mais — mesmas tabelas, mesma ordem, mesmo momento dentro da transação do `save`. O que mudou de
   lugar foi a *marcação de processado*, que saiu de `UPDATE <outbox>.processed_at` e virou upsert em
   `eventos_processados`, **na transação do worker**, nunca na do agregado.
2. **`document-repository.drizzle.ts` está livre** — não está no commit dele, sem mudança pendente.
   Os itens 2–4 das saídas podem seguir sem esperar o PR do outbox.

**Duas dependências registradas:**

- ⚠️ **Numeração de migration.** O peer criou `0052_curvy_legion.sql` e o journal do `financial` foi
  52 → 53. Gerar migration no `financial` a partir de `dev` (que ainda não tem o commit dele) faz o
  `drizzle-kit` emitir **outra** `0052` e os journals colidem no merge. Antes de gerar migration
  aqui: rebase na branch dele, ou avisá-lo para renumerar. **Só vale quando esta inquiry virar
  código** — hoje é documento.
- ⚠️ **Ordem de aquisição do worker.** O claim trava `<outbox>` (via `FOR UPDATE SKIP LOCKED`) e
  depois lê/escreve `eventos_processados`. Se a regra de ordenação proposta alcançar transações que
  toquem `fin_outbox`, manter a mesma direção: **`fin_outbox` antes de `eventos_processados`**. Não
  há colisão com o par `fin_documents`/`fin_payables`, mas a direção fica registrada para que a regra
  nasça completa.

Confirmação cruzada do peer sobre o diagnóstico desta inquiry: RC curou o caso dele porque **havia
gap** — o claim travava next-key no índice `(processed_at, occurred_at)`, e evento novo nasce com
`processed_at NULL` exatamente no gap. Aqui não há gap: são locks de registro em PK, com ordem
invertida. **Mesmo código de erro (`1213`), causas distintas.**

---

### 2026-08-23 — Agente `drizzle-orm-expert` (leitura estática, read-only)

**Premissa derrubada.** A suposição de que `fin_payables` teria ficado de fora do diff está **errada**:
`child-rows-diff.ts` já cobre as três filhas com o mesmo tratamento, e é deliberado
(`document-repository.drizzle.ts:309-310`).

| Tabela filha | Regime | Evidência |
| :--- | :--- | :--- |
| `fin_payables` | diff de conjunto (E1/E2) | `document-repository.drizzle.ts:312-342` |
| `fin_retentions` | diff de conjunto (E1/E2) | `:344-370` |
| `fin_registered_taxes` | diff de conjunto (E1/E2) | `:372-398` |
| `fin_document_timeline` | append-only | `:406-415`, `mysql.ts:409` |
| `fin_timeline_field_changes` | append-only | `:411-414` |

**Nenhuma filha está em hard replace puro.** O gap não é de cobertura — é de **granularidade**:
o diff é de *conjunto*, não de *linha*. Se o multiconjunto mudou, apaga tudo por PK e reinsere tudo.

**O que isso significa para a correção:**

- Diff **de linha** (UPDATE só no que mudou) reduz a superfície no caso típico — ajuste que muda só o
  valor do pai passaria de 3 linhas travadas para 1. Reduz **frequência**, não elimina a classe: se a
  remessa concorrente for sobre o título-**pai** (o caso mais comum, porque é ele que carrega o
  líquido pagável), a colisão permanece.
- **Não corrige a inversão de ordem.** A inversão é entre **duas transações**; nenhuma granularidade
  de escrita dentro de uma delas muda a ordem em que ela pede locks em `fin_documents` vs
  `fin_payables`.
- **`onDuplicateKeyUpdate` não é saída.** `fin_payables` só tem UNIQUE na PK (`mysql.ts:242-317`), então
  o risco do ADR-0020 não se materializa — mas ODKU não remove linha (retenção que some ainda exige
  `DELETE`) e não muda ordem de lock. ⚠️ Além disso, há decisão **local** contra ODKU registrada no
  próprio adapter (`document-repository.drizzle.ts:8-12`) — é nota de quem escreveu o arquivo, não o
  ADR-0020 geral. Revisar deliberadamente, não tratar como consequência automática.

**Onde cada transação adquire o primeiro lock — localizado:**

- **Save:** `SELECT ... FOR UPDATE` em `fin_documents` (`document-repository.drizzle.ts:239-243`),
  antes de qualquer trabalho nas filhas. Serializa dois `save` do mesmo documento, por desenho
  (comentário em `:220-225`).
- **Remessa:** S em `fin_payables` via checagem de FK do `INSERT INTO fin_remittance_payables`, no
  loop por título (`remittance-repository.drizzle.ts:178-181`).

**Hipótese em aberto (NÃO confirmada, enviada para verificação):** a ordem do lado da remessa seria
determinada pela **ordem de declaração das três FKs** (`mysql.ts:1273-1287`: `remittance_id`,
`payable_id`, `document_id`). Se for verdade, reordenar a declaração alinharia as duas ordens sem
tocar em lógica. ⚠️ Exige separar três coisas: a ordem no `mysqlTable`, a ordem no DDL emitido, e a
ordem em que o InnoDB **de fato** checa as FKs. Só a terceira decide, e não foi medida.

**⚠️ Armadilha registrada — por que a correção provavelmente é do lado da remessa:** inverter o
**save** (travar `fin_payables` antes de `fin_documents`) **reintroduz o gap lock** que o #803 /
`eac1de0a` eliminou, porque travar por `document_id` usa índice **não-único**. Travar por PK exigiria
já saber os ids afetados — que só se descobrem no `SELECT` que roda **depois** do lock em
`fin_documents`. É circular.

**Interação com o outbox:** `appendFinOutboxInTx` roda por último
(`document-repository.drizzle.ts:417-419`), por `INSERT` em PK própria; não compete com
`fin_documents`/`fin_payables`. Mudar o regime das filhas não altera nada nessa relação.

**Riscos e lacunas do próprio laudo:**

- **Lacuna declarada:** não foram abertos linha a linha
  `document-repository.drizzle-mysql.test.ts` nem `document-repository-concurrency.drizzle-mysql.test.ts`.
  A suíte de concorrência é justamente onde uma mudança de padrão de lock quebra em silêncio.
- **Drift de doc:** o cabeçalho de `document-repository.drizzle.ts:22-28` ainda descreve os três blocos
  como "hard replace" puro — desatualizado frente ao E1/E2 documentado em `:286-310`.
- **Fragilidade herdada:** "só toca o que mudou" depende de `payableKey`/`taxLikeKey` cobrirem **todo**
  campo relevante. Campo novo que não entre na chave faz mudança real parecer "sem mudança", e o save
  deixa de persistir em silêncio — risco que o próprio `child-rows-diff.ts:23-26` já registra, e que o
  diff de linha **amplia**, porque a decisão passa a ser por campo.

---

### 2026-08-23 — Revisão adversarial do PR #814, com medição

O Gabriel questionou se **manter** o #814 não deixaria "toxicidade antiga" na `dev`, e pediu que a
recomendação de mantê-lo fosse **atacada**, não confirmada. O `suporte-infra-agent` mediu quatro
frentes. **A conclusão sobrevive; a justificativa não.**

#### O custo do descarte, medido com a mesma régua

```
save() em dev — ocorrências de finPayables/HOLDING: 0
contrafactual, RR sem ② ...........: 2 vínculos para o mesmo título  ← PAGAMENTO EM DOBRO
```

Descartar o PR devolve o `save()` exatamente ao estado que o contrafactual mede. **Não deletar.**

#### 🔴 A premissa do comentário do PR é FALSA — a exclusão declarativa existe

O PR afirma que *"nenhuma UNIQUE pode recusar, porque a invariante é CONDICIONAL […] e o MySQL não
tem índice parcial"*. Construído e medido em MySQL 8.4:

```sql
vivo_payable char(36) GENERATED ALWAYS AS (
  CASE WHEN rem_status IN ('Queued','Transmitted','Failed') THEN payable_id ELSE NULL END
) STORED,
UNIQUE KEY uk_vivo (vivo_payable)
```

```
2ª remessa VIVA, mesmo título .....: RECUSADO 1062 ER_DUP_ENTRY
sob concorrência, SEM lock nenhum .: A=inseriu  B=1062  → vínculos vivos: 1
```

Índice parcial não existe; **exclusão condicional existe**. Funciona sem ①, sem ②, sem depender de
ordem de statement, de isolamento ou de comentário.

**Custo real, que sustenta rejeitá-la mesmo assim:** exige desnormalizar `rem_status` na tabela de
vínculo, e descartar remessa passa a exigir `UPDATE` em massa lá. Trigger é **proibido pelo ADR-0020**
(§"lógica de negócio vive no código TS"), então a sincronia vira responsabilidade da aplicação —
segunda fonte de verdade para o status.

**Alternativa REJEITADA POR CUSTO, não por impossibilidade.** A diferença não é semântica: "impossível"
encerra a conversa com informação falsa; "custa uma desnormalização" convida a reavaliar quando o
custo mudar. Uma afirmação técnica errada dentro do comentário que existe para proteger o desenho é a
própria definição da toxicidade que a pergunta do Gabriel procurava.

#### 🔴 `READ COMMITTED` resolve as três fragilidades — e a objeção contra ele era conclusão transportada

```
gap do passo (0) sob RR ........: fin_remittances.PRIMARY → X,GAP ×1
gap do passo (0) sob RC ........: (nenhum lock de registro)
leitura cedo injetada, sob RR ..: ② viu 0 → 2 vínculos  ← PAGAMENTO EM DOBRO
leitura cedo injetada, sob RC ..: ② viu 1 → 1 vínculo   ← protegido
```

A afirmação "RC não cura o deadlock" vale para o caminho **documento × remessa** e continua válida
lá. Para **este `save()`** ela não se aplica — foi conclusão aplicada fora do escopo, e o erro é meu.

#### O passo (0) não é removível — a suspeita estava certa, a conclusão não

Medido: com e sem o passo (0), a corrida dá resultado **idêntico** (recusa limpa, 1 vínculo). Ele
**não contribui para a exclusão**. Mas o resultado dele decide criar vs. atualizar
(`if (existing[0] === undefined)`), e tirar o `for('update')` o transformaria em consistent read —
isto é, na própria "leitura cedo" que produz pagamento em dobro. **O gap é o preço de mantê-lo
locking**, e isso não está escrito no comentário.

#### A Fatia B não agrava

8/8 recusa limpa com o `SELECT fin_documents … FOR UPDATE` no topo; o lock é sobre linha **existente**,
logo `REC_NOT_GAP`, sem somar gap. ⚠️ **Lacuna:** não houve deadlock em nenhum braço, então não há
comparação de **taxas** — só a constatação de que nenhum modo de falha novo apareceu.

#### Decisão do Gabriel (23/08/2026)

**O `save()` de criação de remessa passa a rodar em `READ COMMITTED`.** É a mudança de maior retorno e
menor custo das três: remove a dependência de ordem, elimina o gap do passo (0) e torna irrelevante o
padrão que o próprio Refman desaconselha (§17.7.2.1: *"difficult to parse"*). A exclusão é
`REC_NOT_GAP` nos dois isolamentos, então nada se perde.

⚠️ Consequência a registrar quando for aplicado: uma transação do módulo passa a divergir do default do
servidor. Isso precisa estar escrito no ponto onde o isolamento é definido, ou vira a próxima
divergência silenciosa.

**Lacunas do laudo:** tudo com duas conexões dedicadas e corrida forçada — sem pool real nem carga. A
UNIQUE declarativa não foi medida sob volume, nem o custo do `UPDATE` em massa; se voltar à mesa, é a
primeira coisa a medir.

---

## 4. Análise interna

### A leitura estrutural

A cadeia de nascimento é de mão única, e cada seta aumenta o compromisso com o mundo externo:

```
Fato gerador ──[regra de geração]──▶ Documento ──▶ Título pai + filhos ──▶ Remessa (banco)
   ocorre                             evidencia      obriga                  compromete
```

O `save` do documento hoje **re-executa a cadeia inteira** a cada ajuste (hard replace). Isso trata
"corrigir o registro" como "o fato aconteceu de novo" — e o fato gerador, por definição, ocorre
uma vez só.

O erro de fundo é confundir **geração** com **derivação**:

| | derivação | geração |
|---|---|---|
| exemplo no módulo | `fin_payable_view` | `fin_payables` |
| recalcular é | correto | destrutivo |
| tem identidade referenciável? | não | **sim** |
| `DELETE`+`INSERT` é | legítimo | perda de identidade |

`fin_payables` é geração sendo tratada com a semântica de read-model. O sintoma é a FK `RESTRICT`
reclamando: **ninguém aponta para uma projeção.**

O ponto de não-retorno já tem nome no código: `Transmitted`, em `domain/document/types.ts:38`. O
estado existe; a fronteira não é cobrada. E a fronteira já rachou de fato — `payable/types.ts:16`
ainda diz `// espelha o documento nesta fatia`, mas `payPayableManually` deixa um título ficar
`Paid` com os irmãos `Approved`, e `3d9e8fa1`/`88e71df7` moveram baixa e reagendamento para escrever
o título direto.

**Qual invariante obriga documento e título remetido a mudarem na mesma transação?** Nenhuma. A
soma dos títulos bater com o líquido é invariante enquanto os títulos são derivados; depois da
remessa o valor já saiu, e a consistência que resta é histórica, não transacional. O que não é
invariante transacional não pertence ao mesmo agregado (Vernon, *Implementing DDD*, p. 450).

### Alternativas avaliadas

| Alternativa | Prós | Contras | Veredito |
| :--- | :--- | :--- | :--- |
| **A. Levar o domínio para `READ COMMITTED`** | barato; foi o que curou o outbox | **medido: 10/10 deadlocks em RR e em RC** — não há gap a remover | ❌ Rejeitada por medição |
| **B. Índice novo / mudança de plano** | não invasivo | os locks são de PK; não há varredura a otimizar | ❌ Rejeitada |
| **C. Unificar ordem de aquisição** (todo caminho trava `fin_documents` antes de `fin_payables`) | zera o `1213` (0/10, medido) | sozinha, troca `1213` por `1451` | ✅ Necessária, insuficiente |
| **D. Recusa explícita do ajuste com título remetido** | é a decisão do Gabriel; erro já existe | precisa fechar o TOCTOU para valer sempre | ✅ Escolhida |
| **E. `withDeadlockRetry` no `remittance-repository`** | remove a assimetria de rede | é rede, não correção; sem jitter, realimenta a colisão | ✅ Complementar |
| **F. `Payable` vira agregado próprio** | remove o hard replace, a ordem e o ciclo de uma vez | mudança estrutural, prazo maior | ✅ Direção, fora desta fatia |

### Correção da hipótese inicial (validação pela skill `ts-domain-modeler`)

A formulação inicial era **"`Payable` sai do agregado `Document` ao atingir `Transmitted`"**. Está errada
na forma, e a skill canônica de modelagem do repo é explícita sobre por quê:

**Fronteira de agregado não muda em runtime.** Um agregado não vira outro conforme o estado — o
repositório teria de decidir, a cada carga, qual agregado montar. O que muda com o estado é **quais
transições existem**, e isso é *state machine*, não fronteira (skill `ts-domain-modeler`, §3.D.2).

A forma correta da mesma intenção:

1. **`Payable` é agregado próprio desde sempre**; `Document` o referencia **por identidade** (Vernon,
   p. 460). Não há fronteira dinâmica.
2. **`Transmitted` é um tipo refinado** com transições próprias — e a invariante "não se apaga título
   remetido" é expressa pela **ausência** de uma transição que o destrua, não por um `if`.

```ts
type OpenPayable        = PayableCore & Readonly<{ status: 'Open' }>;
type ApprovedPayable    = PayableCore & Readonly<{ status: 'Approved' }>;
type TransmittedPayable = PayableCore & Readonly<{
  status: 'Transmitted';
  remittanceRef: RemittanceId;   // estado elimina `null` (skill §3.D.2, DO C§29)
  yourNumber: YourNumber;
}>;
```

### Lacunas medidas contra a skill

O `payable/` de hoje **não é** um agregado pelo critério do próprio repo:

| Exigido (skill §3.H.1) | `payable/` hoje |
| :--- | :--- |
| `types.ts` | ✅ existe |
| `errors.ts` | ❌ ausente — erros vivem em `document/errors.ts` |
| `events.ts` | ❌ ausente — eventos vivem em `document/events.ts` |
| `<aggregate>.ts` (funções) | ❌ ausente — lógica vive em `document/document.ts` |
| `repository.ts` (port) | ❌ ausente — só `query.ts` |

E dois sinais no tipo atual (`domain/payable/types.ts`):

- **`status: DocumentStatus`** (linha 16) — o título **empresta o estado do documento**. Um agregado
  que não tem estado próprio não é agregado. O comentário `// espelha o documento nesta fatia` já não
  é verdade: `payPayableManually` deixa um título `Paid` com irmãos `Approved`.
- **`retentionType: RetentionType | null` e `paidAt: Date | null`** — campos nuláveis codificando
  estado, que a skill manda substituir por tipo refinado (§3.D.2, DO C§29).

### ⚠️ Divergência a registrar (não resolver aqui)

O pedido do Gabriel é que **o erro explique que é recusa e por quê**. Um erro que explica precisa
carregar evidência — *quais* títulos estão presos, em *qual* remessa. Hoje
`document-has-held-payable` é uma string literal: não carrega nada, e a borda não tem o que exibir.

- `.claude/rules/domain.md` determina: *"Erro de domínio é string literal union, nunca classe"* — e é
  o que o `financial` faz.
- A skill `ts-domain-modeler` §3.D.1 canoniza **tagged errors** com payload de evidência
  (`Readonly<{ tag: 'PascalCase'; …payload }>`) — e é o que o módulo `contracts` faz.

Tagged error **não** é classe, então não fere a letra da rule; fere a forma "string literal union".
**Os dois módulos do mesmo repositório divergem, e nenhum dos dois documentos cita o outro.** Isso é
defeito a registrar, não a resolver escolhendo o mais bonito (`CLAUDE.md`, §Fonte de verdade).

Sem essa decisão, o erro só pode explicar via **mensagem na borda**, não via payload — o que atende
o pedido de forma mais fraca.

---

## 5. Decisão final

**PARCIAL — decidido o comportamento, pendente o texto de borda com a P.O.**

Decidido pelo Gabriel em 2026-08-23:

> Ajuste de nota com título já remetido é **recusado**, e o erro deve **explicar que é recusa e por
> quê**, para que a P.O. avalie o texto no front e corrija o rumo se quiser.

Consequências aceitas:

1. A recusa é a regra; versionamento (documento de ajuste) fica em aberto para a P.O.
2. `document-has-held-payable` **já é** essa recusa — não criar erro novo. O trabalho é
   (a) garantir que ela não seja contornável por corrida e (b) melhorar a mensagem ao humano.
3. O `1451` nunca deve chegar ao operador: hoje sobe intacto e vira `document-repository-failure`
   (503 genérico), porque `driver-error.ts` só classifica deadlock.

**Pendente com a P.O.:** se existe caminho de escape (corrigir só campos não-financeiros, que o
`editMetadata` já preserva — `adjust-document.ts:169-170`).

### Decidido em 2026-08-23 — o erro carrega payload (tagged error)

Resolve a divergência registrada em §4. Decisão do Gabriel:

> O erro **deve** carregar payload, como o `contracts` faz. A borda comunica ao front **tudo o que se
> sabe** sobre o erro; **quem decide o que mostrar ao usuário final é o front.**

Consequências:

1. `document-has-held-payable` deixa de ser string literal nua e passa a carregar a evidência que a
   recusa apurou — no mínimo **quais** títulos estão presos e em **qual** remessa. É o padrão
   §3.D.1 da skill `ts-domain-modeler` ("payload de invariante carrega as duas peças de evidência que
   colidiram"), já vigente no módulo `contracts`.
2. **O domínio não decide texto.** Ele entrega `tag` + evidência estruturada; a borda serializa; o
   front escolhe a redação. Nenhuma string em PT-BR entra no domínio por conta desta decisão.
3. **Isto altera a forma de erro do módulo `financial`**, hoje string literal union por
   `.claude/rules/domain.md`. A decisão vale para este erro e abre a questão de convergir o módulo —
   que **não** se resolve nesta inquiry: ou a rule passa a admitir tagged error explicitamente, ou
   nasce um ADR que registre a convergência. Enquanto isso não acontecer, há **duas formas vigentes no
   mesmo módulo**, e isso precisa estar escrito onde o próximo leitor tropece.
4. O `1451` continua sem poder chegar ao operador: ele não é erro de domínio, é a FK avisando que a
   recusa foi contornada por corrida. Classificá-lo em `driver-error.ts` segue necessário — mas o
   destino dele é o **erro de recusa com payload**, não um 503.

---

### 2026-09-02 — P.O. (resposta ao pendente de §5): a forma da recusa na tela

Fecha o item que §5 deixou **pendente com a P.O.** e o que o índice
(`PERGUNTAS-EM-ABERTO.md`) registra como *"a forma da recusa na tela"*. Respondido também na
discussion #956, que é o canal do fio.

**1. A recusa acontece ANTES do clique, não no salvar.** Nota com título já remetido abre com os
campos financeiros — valor, vencimento, retenções — em **somente-consulta**, com o motivo visível ao
lado. Habilitar o campo para depois recusar o save é ensinar o operador a perder trabalho.

O front já tem a mecânica: `document-form.view.ts` trava **por campo e por status** (`FieldLocks`),
e é a mesma régua que já vale para `issueDate` e `competencia`, ambos imutáveis após a criação.

**2. A mensagem NOMEIA a recusa — qual título, em qual remessa.** É exatamente a evidência que a
decisão de 23/08 mandou o erro carregar. Redação de referência:

> **Esta nota tem título já enviado ao banco.** O título #N saiu na remessa NSA 000123 em
> 02/09/2026. Valor, vencimento e retenções não podem ser alterados enquanto ele estiver enviado.

**3. ✅ O caminho de escape EXISTE — resposta ao pendente explícito de §5.** Campos não-financeiros
seguem editáveis; o bloqueio é só do que muda dinheiro. O backend já preserva os títulos nesse
caminho (`editMetadata`, `adjust-document.ts:169-170`), então a mudança é de tela, não de domínio.

Recusar a nota inteira porque um título saiu é punir o operador por algo que ele não pode desfazer —
e o empurra para o pior contorno possível: criar uma nota nova.

**4. O `1451` não chega ao operador — concordo com §5.** Do lado da tela, um 503 ali é
indistinguível de "o sistema caiu", e a reação natural do operador é **tentar de novo**, que é a pior
ação possível quando a causa foi uma corrida.

#### 📌 O encanamento para isto passou a existir em 02/09

O PR **ERP-Bem-Comum/web-app#396** (fecha a web-app#359) trocou o transporte de erro dos formulários:
o motivo deixou de ser descartado no controller — era um `Record<string, boolean>` — e passa à tela
como **slug nomeado**, traduzido por fonte única, com fallback para a frase genérica.

Ou seja: quando o `document-has-held-payable` passar a carregar payload, **o front já sabe exibi-lo**.
A redação do item 2 entra como uma linha no mapa de mensagens, sem tocar view nenhuma.

---

### 2026-08-23 — Agente `mysql-database-expert` (leitura estática + Refman 8.4)

**Veredito: o diagnóstico está certo e três dos quatro remédios também. O item "releitura sob lock no
ajuste" tem um furo sério — ele reabre a classe de deadlock da #803 por outra porta.**

#### 🔴 Furo: a releitura sob lock cria um ciclo NOVO, de três nós

A releitura buscaria `payable_id` em `fin_remittance_payables` **que ainda não existem** — é
justamente essa ausência que se quer confirmar. Busca por valor **ausente** em índice secundário
**não-único**, sob `REPEATABLE READ`, toma **gap lock** na posição onde o valor entraria. É o mesmo
mecanismo que `document-repository.drizzle.ts:291-298` documenta ter sofrido em `fin_retentions_document_id_idx`.

O ciclo resultante sobrevive à correção de ordem:

- **TX ajuste** segura X em `fin_documents` + gap em `fin_remittance_payables_payable_idx` (novo) e
  ainda vai pedir X em `fin_payables` (o `DELETE`, que vem depois).
- **TX remessa** (já com `fin_documents` travado primeiro) pega S em `fin_payables` no check de FK e
  então tenta *insert-intention* no **mesmo gap** que o ajuste segura.

#### ✅ Contraproposta: nenhum lock novo — a FK `RESTRICT` já é a autoridade

O check da FK acontece **dentro do `DELETE FROM fin_payables` que já existe**
(`document-repository.drizzle.ts:332-337`). Isso faz a ordem de toque virar
`documents → payables → remittance_payables` — a **mesma ordem relativa** que a TX de remessa passa a
usar. Ordens consistentes, sem ciclo (*resource ordering protocol*; Ramakrishnan & Gehrke, cap. 18).

Consequência: **classificar o `1451` deixa de ser cosmético e vira o mecanismo principal** de fechar o
TOCTOU. `findHeldPayableIds` (`adjust-document.ts:175`) permanece como checagem primária do caso
comum, dando o erro de domínio correto; o `RESTRICT` vira o **backstop da janela de corrida**.

Confirmado que `fin_payables.id` tem **uma única** FK apontando para ele em todo o schema
(`mysql.ts:1281`) — logo `1451` naquele `DELETE` é sinal **inambíguo** de "preso por remessa".

#### 🔴 A hipótese da ordem de declaração das FKs foi DERRUBADA como base de correção

A ordem hoje vem de `migrations/mysql/0051_charming_scream.sql:1-3` — três `ALTER TABLE` separados,
`remittance_id` → `payable_id` → `document_id`. **Mas o Refman 8.4 não garante em lugar nenhum** que a
ordem de checagem de múltiplas FKs num `INSERT` siga a ordem de criação: o manual garante *que* um
shared lock é tomado, não *em que ordem*. **É comportamento observado, não contrato** — não sobrevive
necessariamente a um `ALTER TABLE` que recrie as constraints, nem a outra versão.

**Não depender disso.** Em vez de reordenar DDL, adicionar lock **explícito** no início da transação
de criação de remessa, espelhando a convenção que `document-repository.drizzle.ts:238-243` já
estabelece — garantia de **aplicação**, testável, sem migration:

```ts
// antes do laço de INSERT em finRemittancePayables (remittance-repository.drizzle.ts:178-182)
const documentIds = [...new Set(remittance.payables.map((p) => p.documentId))];
if (documentIds.length > 0) {
  await tx.select({ id: finDocuments.id }).from(finDocuments)
    .where(inArray(finDocuments.id, documentIds)).for('update');
}
```

#### ✅ Não há quarto participante — varredura completa

Só **duas** formas de transação tocam `fin_documents` **e** `fin_payables` na mesma unidade atômica, e
são as duas do trace. Descartados com evidência: confirmação de desfecho de remessa (o laço de INSERT
só roda na criação, `remittance-repository.drizzle.ts:156-182`); `financial-etl-store.drizzle.ts:101-118`
(`UPDATE` solto, sem transação); `apply-payable-event.ts` (escreve `fin_payable_view`); triagem VAN.
"Reagendamento" **não existe** no módulo. `reconciliation-repository.drizzle.ts:100-109,341-349` escreve
`fin_payables` por PK mas **nunca** toca `fin_documents` — terceiro escritor, fora do grafo.

#### Riscos novos levantados

- **CASCADE `fin_payables→fin_documents` é estruturalmente inalcançável hoje** — mas por *máquina de
  estados*, não por schema: `cancel-document.ts:39` só cancela `Draft`/`Open`, e
  `remittance-payment-reader.drizzle.ts:74-78` só aceita título `Approved`. Conjuntos disjuntos.
  ⚠️ **É implícito.** Permitir cancelar `Approved` no futuro reabre o caminho em silêncio — vale teste
  de regressão prendendo a dependência.
- **`deleteDoc()` não tem `withDeadlockRetry`** (`document-repository.drizzle.ts:441-483`) —
  assimetria dentro do arquivo que o trabalho já vai tocar.
- **`reconciliation-repository` escreve `fin_payables` sem retry** — não está no ciclo atual, mas fica
  sem rede se um dia entrar num. Lacuna de simetria, não bloqueante.
- **Retry sem jitter não é livelock** — `maxAttempts: 3` (`retry-on-deadlock.ts:48-51`) limita o pior
  caso a falhar, nunca laço infinito. Trade-off já deliberado por escrito (`:35-47`).

#### Lacunas declaradas (com o comando que as fecharia)

1. **Não confirmou empiricamente** que o check de `RESTRICT` num `DELETE` de linha-pai toma gap lock
   em índice secundário não-único quando não há filha correspondente — a inferência vem do texto
   genérico do Refman §15.7.1 mais o precedente da #803, não do mesmo statement. Fecharia com duas
   conexões concorrentes no x99 (**nunca** no Docker do Mac) lendo `performance_schema.data_locks`.
2. **Não confirmou** a ordem real de checagem de FKs múltiplas. ⚠️ Não é bloqueante: a contraproposta
   do lock explícito **funciona independentemente** de qual seja a ordem real.
3. **Não mediu** o custo do `SELECT ... FOR UPDATE` extra proposto (busca por PK, poucos ids —
   esperado baixo, não medido).

### 2026-08-23 — `mysql-database-expert`, complemento: as três ordens separadas

| Camada | Status | Evidência |
| :--- | :--- | :--- |
| 1. Ordem no `mysqlTable` (Drizzle) | ✅ confirmada | `mysql.ts:1273-1287` — `remittance_id` → `payable_id` → `document_id` |
| 2. Ordem no DDL emitido | ✅ confirmada, **idêntica** | `0051_charming_scream.sql:1-3` — três `ALTER TABLE` separados, mesma ordem |
| 3. Ordem em que o InnoDB **checa** | ❌ **lacuna real** | Refman 8.4 §17.7.1 garante *que* o shared lock é tomado, **nunca em que ordem** com múltiplas FKs. Busca por "order in which" / "checked in the order" / "foreign keys are checked" no cap. 17 local: **zero ocorrências** |

Hipótese alternativa levantada e **marcada como baixa confiança** pelo próprio agente: o InnoDB
guardaria o `dict_foreign_set` ordenado por **nome** da constraint. Se fosse verdade, a ordem
alfabética seria `document_id_fk` < `payable_id_fk` < `remittance_id_fk` — `fin_documents` **antes** de
`fin_payables`, o **oposto** do trace. Como o trace observado bate com "ordem de criação" e não com
"alfabética", isso é evidência **fraca** contra a hipótese do nome — uma observação, não experimento.

Experimento decisivo proposto (tabelas sintéticas, sem tocar nada real), roteável ao
`suporte-infra-agent`: criar `t_child` com duas FKs cujo **nome** e **ordem de criação** discordem
(`fk_b` criada antes de `fk_a`), prender uma tabela-pai numa sessão e observar em
`performance_schema.data_locks` **onde** o `INSERT` concorrente bloqueia. Se seguir a ordem de criação,
a hipótese se confirma; se seguir o nome, cai; se for outra coisa, nenhuma das duas.

⚠️ **Não bloqueante**: a recomendação do lock explícito funciona **independentemente** da resposta.

#### Reforço triplo do argumento circular (por que NÃO inverter o `save`)

1. **Dependência de dado:** `existingPayables` só é conhecida pelo `SELECT` em
   `document-repository.drizzle.ts:313-326`, que roda **depois** do `FOR UPDATE` em `fin_documents`
   (`:239-243`).
2. **🔴 Achado novo — travar por PK ids que sumiram NÃO escapa do gap lock.** Refman 8.4
   (`17-innodb-storage-engine.part01.md:3272-3274`, repetido em `:3636-3637`): *"For a unique index with
   a unique search condition, InnoDB locks only the index record **found**, not the gap before it."* A
   isenção vale só para o registro **encontrado**. Como o hard replace **gera UUID novo** quando o
   conjunto muda, um `id IN (…) FOR UPDATE` pode buscar ids que já não existem — e cai no caso geral,
   com gap lock, mesmo em PK.
3. **O repositório já sabia disso.** O comentário de `72d94c2c` em `remittance-repository.drizzle.ts`
   diz textualmente: *"O lock é sobre `fin_payables`, cujas linhas EXISTEM, e não sobre
   `fin_remittance_payables`, cujas linhas ainda não existem. […] Travar a tabela de vínculo pegaria
   GAP lock […] deadlock 1213 em vez de espera."* O agente chegou ao mesmo heurístico de forma
   independente, e há memória de agente registrando-o para o caso irmão #789
   (`remittance-toctou-789-lock-review.md`, na branch `fix/remittance-hold-toctou`).

**Recomendação inalterada:** mexer no lado da **remessa**, com lock explícito por PK em
`fin_documents`. Inverter o `save` trocaria um problema já entendido (ordem pura, `REC_NOT_GAP` nas
duas linhas do trace) por um pior e menos previsível.

#### 🔴 Coordenação — `remittance-repository.drizzle.ts` já está sendo alterado

A branch **`fix/remittance-hold-toctou`** (worktree `remittance-toctou`, HEAD `92d131ed`, commit-chave
`72d94c2c`) **já adiciona um pré-lock no mesmo `save()`**:

```ts
await tx.select({ id: finPayables.id }).from(finPayables)
  .where(inArray(finPayables.id, payableIds)).for('update');
```

Ela resolve corrida **diferente** (#789 — mesmo título em duas remessas) e trava `fin_payables` por PK.
**Não muda a ordem relativa `payables → documents`**, que é o assunto desta inquiry: `fin_documents`
segue sendo tocado depois, via check de FK.

**Ordem final desejada:** `fin_documents` (novo) → `fin_payables` (já existe em `72d94c2c`) →
`fin_remittance_payables` (já existe, já seguro).

⚠️ **Quem implementar precisa ler `72d94c2c` antes**, sob pena de duplicar o `SELECT FOR UPDATE` em
`fin_payables` ou inverter a ordem sem perceber. E a **base** da branch de implementação passa a ser
uma decisão: partir de `dev` (sem aquele commit) cria conflito garantido naquele arquivo.

### 2026-08-23 — Review pela skill `clean-code-reviewer`

**Veredito: proposta aceita, com correção de escopo — a conversão deve ser do `DocumentError` inteiro,
não pontual.**

**A favor do payload:**

> "Cada exceção lançada deve fornecer contexto o suficiente para determinar a fonte e a localização de
> um erro. […] **Crie mensagens de erro informativas** e as passe juntamente com as exceções.
> **Mencione a operação que falhou e o tipo da falha.**"
> — Uncle Bob, *Código Limpo*, p. 107 (`codigo-limpo--uncle-bob.md:3443`)

`document-has-held-payable` não menciona *qual* título nem *qual* remessa. A borda não tem o que
exibir além de texto fixo.

**Contra a conversão pontual:**

> "**G11: Inconsistência.** Se você fizer algo de uma determinada maneira, faça da mesma forma todas as
> outras coisas similares. Isso retoma o **princípio da surpresa mínima**. Atenção ao escolher suas
> convenções. Uma vez escolhidas, atente para continuar seguindo-as."
> — Uncle Bob, p. 280 (`codigo-limpo--uncle-bob.md:10161`)

**Achado técnico decisivo:** misturar as duas formas na **mesma union** é pior que qualquer uma delas
isolada. `type DocumentError = 'net-value-not-positive' | Readonly<{ tag: 'DocumentHasHeldPayable'; … }>`
obriga todo consumidor a discriminar por `typeof e === 'string'` antes de olhar o `tag` — o
exhaustive switch deixa de ser uma leitura só. Ou a union inteira é tagged, ou permanece string.

**Custo medido (não estimado):**

| Métrica | Valor |
| :--- | ---: |
| Referências a `DocumentError` em `src/` | 73 |
| Pontos que comparam o erro **por igualdade de string** | **4** |

Os 4 pontos: `generate-remittance.ts:85`, `bulk-update-due-date.ts:38,39,40`. **O custo real da
conversão é baixo** — as outras 69 referências apenas propagam o tipo, sem inspecionar o valor.

**A inconsistência aparente do `contracts` tem critério, e o critério já está escrito.** A skill
`ts-domain-modeler` §3.D.1 determina: erro de **invariante** carrega as duas peças de evidência que
colidiram; **validação simples** fica nulária. É o que `contracts/domain/contract/errors.ts` faz —
`ContractTitleRequired` é `Readonly<{ tag }>` puro (linha 46), `ContractCannotExpireYet` carrega
`currentEnd` + `attemptedAt`. Convertido com esse critério, o `financial` não ganha 25 objetos gordos.

**Recomendação:** converter `DocumentError` inteiro, aplicando o critério da §3.D.1, e **atualizar
`.claude/rules/domain.md`** — que hoje prescreve string literal union e passaria a mentir sobre o
código. A rule não é ADR; pode ser atualizada. Mas deliberadamente, não como efeito colateral.

### Achado colateral: o cânone trata a ordenação de recursos — e prevê nossa armadilha

> "**Como evitar a espera circular.** […] simplesmente força as Threads 1 e 2 a alocarem recursos na
> mesma ordem impossibilita a espera circular. De modo mais geral, **se todas as threads puderem usar
> uma ordenação de recursos global e se todas os alocarem naquela ordem, então o deadlock se torna
> impossível.** Como todas as outras estratégias, essa pode gerar problemas:
> - A ordem de aquisição pode não corresponder com a de uso […]
> - **De vez em quando, você não tem como ordenar a aquisição de recursos. Se a ID do segundo recurso
>   vier de uma operação efetuada no primeiro, então a ordenação não é viável.**"
> — Uncle Bob, p. 330 (`codigo-limpo--uncle-bob.md:11717`)

A segunda ressalva **descreve literalmente** a armadilha medida do lado do `save`: os ids dos títulos
(segundo recurso) só se descobrem no `SELECT` que roda depois do lock em `fin_documents` (primeiro
recurso). **Ordenar o lado do save não é viável** — o cânone diz por quê, e a medição confirma.

Do lado da **remessa**, os `payableIds` chegam como **input** do caso de uso
(`generate-remittance.ts:74`), não derivam de operação anterior. **A ordenação é viável ali.** Isso
converge com a conclusão independente do `drizzle-orm-expert`: a correção de ordem é do lado da
remessa, não do save.

---

### Mitigação que ninguém tinha escrito: o hard replace é CONDICIONAL

Medido em 24/08, e vale para toda esta inquiry: `document-repository.drizzle.ts:330` só executa o
`DELETE`+`INSERT` dos títulos quando o conjunto **muda** —
`if (!sameRowSet(existingPayables, payableRows, payableKey))`. Re-salvar o documento com os mesmos
títulos pula o hard replace inteiro.

Consequência prática: **a janela do ciclo só abre quando o usuário muda de fato os títulos** —
valor, vencimento, retenção. Salvar um documento sem mexer neles não passa perto do caminho
perigoso. Isso reduz a exposição real, e não estava registrado em lugar nenhum.

> É também uma armadilha de medição: três tentativas do harness de 24/08 deram "0 de tudo" e quase
> viraram um "não reproduz" — o que acontecia é que, sem mutar o valor, o hard replace **nunca
> disparava**. Ausência de defeito e ausência de execução se parecem no relatório.

---

## 6. Saídas (outputs concretos)

Ordenados por dependência. Os três primeiros são independentes entre si.

**Decididos, prontos para execução:**

- [ ] **Converter `DocumentError` inteiro para tagged error**, com o critério da skill §3.D.1
      (invariante carrega evidência; validação simples fica nulária). Custo medido: **4** pontos de
      comparação por string — `generate-remittance.ts:85`, `bulk-update-due-date.ts:38,39,40`.
      ⚠️ Não converter **pontualmente**: string e objeto na mesma union forçam `typeof e === 'string'`
      em todo consumidor e quebram o exhaustive switch como leitura única.
- [ ] **Atualizar `.claude/rules/domain.md`** — ela prescreve string literal union e passaria a mentir
      sobre o código. Não é ADR, pode ser atualizada; mas deliberadamente, não como efeito colateral.
- [ ] **Classificar `1451` em `driver-error.ts`** → o destino é o erro de recusa **com payload**, não
      um 503 genérico.
- [ ] **`withDeadlockRetry` no `remittance-repository`** — rede, não correção. ⚠️ Política atual é
      `maxAttempts: 3` **sem jitter** (deliberado, documentado): duas transações que colidiram no
      mesmo instante voltam no mesmo instante.

### Decisão de base (23/08/2026): a Fatia B espera o PR #814

`fix/remittance-hold-toctou` tem **PR #814 aberto** (não-draft, desde 21/08, 3 commits à frente de
`dev`, com teste dedicado em `d86408e7`). Ele altera o **mesmo `save()`** que a Fatia B precisa tocar.

Decisão do Gabriel: **esperar o merge**, em vez de empilhar ou resolver conflito. O custo aceito é o
deadlock seguir vivo enquanto o PR espera review; o risco evitado é resolver conflito à mão
justamente na região onde a ordem dos locks se decide.

**As duas correções são complementares, e o encaixe é limpo depois do merge:**

| Correção | Problema que resolve | Mecanismo |
| :--- | :--- | :--- |
| PR #814 | duas emissões concorrentes do mesmo título (#789) | **mutex** — `FOR UPDATE` em `fin_payables` |
| Fatia B | ciclo de espera contra o `save` do documento | **ordenação** — pré-lock em `fin_documents` |

Ordem final pretendida, com o pré-lock novo entrando **acima** do que o #814 já adiciona:

```
fin_documents (Fatia B)  →  fin_payables (#814, já existe)  →  fin_remittance_payables (INSERT)
```

⚠️ **Achado sobre o #814, levantado por leitura e NÃO medido — não agir sem confirmar.** O `SELECT` de
releitura (`heldNow`) não usa `FOR UPDATE`: é *consistent read*. Sob `REPEATABLE READ`, se o snapshot
da transação já tiver sido estabelecido por uma leitura anterior no mesmo `save`, essa releitura pode
enxergar uma versão antiga e **não ver** o vínculo que o vencedor da corrida acabou de commitar — o
que enfraqueceria a proteção que o PR existe para dar. Pode não ser problema: depende de qual
statement estabelece o snapshot. É pergunta para o `mysql-database-expert`, e é sobre PR de outra
sessão — reportar, nunca alterar.

**Ordem de aquisição — a correção é do lado da REMESSA, não do save:**

- [ ] Unificar em **`fin_documents` antes de `fin_payables`**, mexendo no lado da emissão.
      Fundamento duplo e independente: (a) o `drizzle-orm-expert` mediu que travar `fin_payables`
      cedo no save reintroduz o gap lock que `eac1de0a` eliminou, e travar por PK exigiria ids que só
      se descobrem *depois* do lock em `fin_documents` — circular; (b) Uncle Bob, p. 330: *"se a ID do
      segundo recurso vier de uma operação efetuada no primeiro, então a ordenação não é viável"*.
      Do lado da remessa os `payableIds` chegam como **input** (`generate-remittance.ts:74`) — ali é viável.
- [ ] **O mecanismo é lock explícito na aplicação, NÃO reordenar as FKs.** ❌ A hipótese de reordenar a
      declaração (`0051_charming_scream.sql:1-3`) foi **derrubada**: o Refman 8.4 garante *que* um
      shared lock é tomado no check de FK, **nunca em que ordem** quando há mais de uma. É
      comportamento observado, não contrato — não sobrevive a um `ALTER TABLE` que recrie as
      constraints. Em vez disso, `SELECT … FOR UPDATE` em `fin_documents` no início da transação de
      criação de remessa (antes do laço em `remittance-repository.drizzle.ts:178-182`), espelhando a
      convenção de `document-repository.drizzle.ts:238-243`. Zero DDL, zero migration — só código.
- [ ] ❌ **NÃO adicionar releitura sob lock no ajuste.** A proposta original tinha furo: buscar
      `payable_id` **ausente** em índice secundário não-único sob RR toma **gap lock**, criando um
      ciclo novo de três nós que sobrevive à correção de ordem. É o mesmo mecanismo da #803, por outra
      porta.
- [ ] **Fechar o TOCTOU pelo `RESTRICT` que já existe.** O check da FK roda dentro do
      `DELETE FROM fin_payables` que já está lá (`document-repository.drizzle.ts:332-337`), deixando a
      ordem em `documents → payables → remittance_payables` — a mesma da remessa. `findHeldPayableIds`
      (`adjust-document.ts:175`) segue como checagem primária do caso comum; o `RESTRICT` é o backstop
      da corrida. **Nenhum lock novo.**
- [ ] Teste de regressão prendendo a dependência implícita: hoje o CASCADE
      `fin_payables→fin_documents` é inalcançável só porque `cancel-document.ts:39` cancela apenas
      `Draft`/`Open` e a remessa exige `Approved` (conjuntos disjuntos). Permitir cancelar `Approved`
      reabriria o caminho **em silêncio**.
- [ ] `withDeadlockRetry` em `deleteDoc()` (`document-repository.drizzle.ts:441-483`) — assimetria
      dentro do arquivo que o trabalho já vai tocar.
- [ ] Registrar a lacuna de simetria: `reconciliation-repository.drizzle.ts:100-109,341-349` escreve
      `fin_payables` sem retry. Fora do ciclo atual, sem rede se um dia entrar num.

**Estruturais e de coordenação:**

- [ ] ADR novo: fronteira `Document`↔`Payable`. ⚠️ Forma correta: **`Payable` é agregado próprio
      desde sempre**, referenciado por identidade — não "sai do agregado ao virar `Transmitted`".
      `Transmitted` é tipo refinado; a invariante é a **ausência** de transição destrutiva.
- [ ] Caminho de escape com a P.O.: corrigir só campos não-financeiros (`editMetadata` já preserva
      os títulos — `adjust-document.ts:169-170`).
- [ ] Contagem `1213` vs `1205` no ambiente real — fecha a lacuna do laudo de infra.
- [ ] Abrir `document-repository-concurrency.drizzle-mysql.test.ts` — **lacuna declarada** pelo
      `drizzle-orm-expert`: é onde mudança de padrão de lock quebra em silêncio.
- [ ] Corrigir drift de doc: o cabeçalho de `document-repository.drizzle.ts:22-28` ainda descreve os
      três blocos como "hard replace" puro, desatualizado frente ao E1/E2 de `:286-310`.
- [ ] ⚠️ **Antes de gerar qualquer migration no `financial`**: rebase na branch do fanout ou avisar o
      peer — ele já criou a `0052` e o `drizzle-kit` emitiria outra a partir de `dev`.

---

## 7. Referências

- `suporte_infra_agent/diarios/2026-08-23-sessao-06.md` — medição do outbox e do ambiente
- Laudo do `suporte-infra-agent` de 2026-08-23 (deadlock capturado; A/B RR × RC; ordenação × `1451`)
- `handbook/architecture/adr/0001-strangler-fig-over-rewrite.md:13,17` — "Fato Gerador" como nome do
  agregado `Document`; origem da ambiguidade de vocabulário
- `.claude/rules/adapters.md` — "Apontar para o id de uma entidade FILHA é um contrato com o save do
  agregado dono"; FK cross-aggregate é `RESTRICT`
- `.claude/rules/domain.md` — "Operação que RECONSTRÓI o agregado não gera identidade nova"
- PR #794 (`8811e226`) — "o título mantém a identidade, e nota com título em remessa não se ajusta"
- Branch `fix/remittance-hold-toctou` (`92d131ed`) — fecha a janela do lado da emissão
- Vernon, *Implementing DDD*, p. 450 (invariantes verdadeiras em fronteiras de consistência) e
  p. 391 (um agregado por transação); Evans, *DDD*, p. 52 (identidade imutável)
