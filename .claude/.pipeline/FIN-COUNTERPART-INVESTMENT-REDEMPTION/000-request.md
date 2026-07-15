# FIN-COUNTERPART-INVESTMENT-REDEMPTION — escopo (#428)

> Estende a **contrapartida esperada** da conciliação (feature 029 / #269, PR #427 MERGED) de só
> `type='Transfer'` para **`Investment` (Aplicação)** e **`Redemption` (Resgate)**. Size **M**.
> Branch `feat/428-counterpart-investment-redemption`. Prioridade da P.O. (2026-07-15).

## Contexto (P.O.)

Hoje a conciliação só cria a contrapartida esperada no destino quando `type='Transfer'`. Mas Aplicação
e Resgate **também circulam entre contas correntes da própria empresa** e são o **MAIOR fluxo**. Sem a
contrapartida, a perna de destino não aparece como palpite no extrato da outra conta. O front **já
manda `destinationAccountRef`** para os 3 tipos (`requiresDestination = Transfer|Investment|Redemption`).

**Esta extensão estava PREVISTA na spec 029** — não é escopo novo: `spec.md:88` (FR-009) diz
*"Aplicação/Resgate... follow-up com o mesmo mecanismo (Q3)"*; `spec.md:122` fixa *"sinal determinado
pelo tipo... a perna de destino tem sinal oposto ao da origem"*.

## Fundamento técnico (verificado no código)

- **O movimento esperado no destino já é agnóstico ao tipo.** `expected-counterpart.ts:34,51` deriva
  `movement: opposite(originMovement)`, e `originMovement = transaction.movement` (o fato real do
  extrato conciliado). Como é sempre o oposto do movimento real da conta de origem, a regra vale igual
  para os 3 tipos — é a identidade contábil de partida dobrada. **Não parametrizar movimento por tipo.**
  - Resgate: entra na corrente → `transaction.movement='Credit'` → destino espera `Debit`.
  - Aplicação: sai da corrente → `transaction.movement='Debit'` → destino espera `Credit`.
- `ManualEntryType` (`reconciliation/types.ts:15-21`), o CHECK `fin_manual_entries_type_chk`
  (`mysql.ts:812-815`) e o schema HTTP (`schemas.ts:640-646`) **já têm os 6 tipos** — `Investment`/
  `Redemption` são lançamentos válidos desde a #143. Nada a mudar aí.
- `suggest-counterpart-matches.ts` casa por valor+movimento+data e **ignora** `counterpart.type` — já
  agnóstico, não muda.

## Escopo (in) — 7 pontos localizados

1. **`record-manual-entry.ts:149`** — abrir o `if (input.type === 'Transfer' && …)` para incluir
   `Investment` e `Redemption`. Guard de não-regressão preservado: fora dos 3 tipos ou sem destino,
   nada é criado.
2. **`expected-counterpart.ts` (`create`, `:18-27,36,50,58-67`)** — `create` passa a **receber e
   propagar** o `type` (hoje hardcoda `'Transfer'`). Ajustar a chamada em `record-manual-entry.ts:150-159`.
3. **`expected-counterpart/types.ts:13`** — `ExpectedCounterpartType` ganha `'Investment' | 'Redemption'`.
4. **`mysql.ts:874`** — CHECK `fin_expected_counterpart_type_chk IN ('Transfer')` → +Investment/+Redemption.
   **Exige migration** (`pnpm run db:generate`). MySQL 8.4: ampliar CHECK é DDL — validar o ALTER real
   no x99/OrbStack (ver lição de ALTER 8.4).
5. **`expected-counterpart.mapper.ts:32`** — `toType` whitelist aceita os 3 (senão `toDomain` rejeita
   rows Investment/Redemption com `invalid-expected-counterpart-type`).
6. **`confirm-counterpart-match.ts:122`** — a perna espelho B hardcoda `type: 'Transfer'` → espelhar o
   **tipo real** da contrapartida.
7. **Eventos** (`events.ts:10-37`, `TransferCounterpart{Created,Matched,Discarded}`) — **decisão de W1**:
   os payloads já são agnósticos ao tipo; **reusar os eventos existentes** (não renomear) para não
   quebrar o contrato do outbox nem consumidores. Registrar a decisão no REPORT.

## Fora de escopo

- Renomear eventos/agregado (`Transfer*` → genérico) — os payloads servem os 3 tipos; renomear é
  churn de contrato sem valor. Se a P.O. quiser rótulo distinto por tipo na UI, é follow-up.
- Qualquer mudança no `suggest`/`match`/`discard`/`reopen` (já agnósticos).
- Tocar `ManualEntryType`/CHECK de `fin_manual_entries` (já completos).

## Critérios de aceite (Dado/Quando/Então)

- **CA1** — Dado um lançamento manual `type='Investment'` com `destinationAccountRef`, Quando concilia,
  Então nasce 1 contrapartida `Pending` no destino com `movement = opposite(transaction.movement)`,
  valor espelhado, `type='Investment'`.
- **CA2** — Idem para `type='Redemption'` (`type='Redemption'` na contrapartida, movimento oposto).
- **CA3** — **Não-regressão:** `Transfer` continua criando exatamente como antes; `Payment`/`Receipt`/
  `FeePenaltyInterest` (e qualquer tipo sem `destinationAccountRef`) **não** criam contrapartida.
- **CA4** — O `suggest-counterpart-matches` e o `POST /reconciliations/counterpart` (US2) funcionam para
  contrapartidas Investment/Redemption (casamento por valor+movimento+janela; confirmar consome a
  contrapartida). A perna espelho B nasce com o **tipo correto** (não `Transfer` fixo).
- **CA5** — Persistência validada em **MySQL real**: migration do CHECK aplica; round-trip de
  contrapartida Investment/Redemption (save + toDomain) sem `invalid-expected-counterpart-type`.

## Pipeline

| Wave | Skill/agente | Atividade |
| :-- | :-- | :-- |
| W0 | `tdd-strategist` | RED — inverter o teste `record-manual-entry-counterpart.test.ts:152-171` (hoje afirma que Investment NÃO cria) + casos Investment/Redemption + CA3 não-regressão |
| W1 | `ts-domain-modeler` (+ `drizzle-schema-author` no CHECK/migration) | os 7 pontos; decisão dos eventos |
| W2 | `code-reviewer` | audit read-only (não-regressão do Transfer é o foco) |
| W3 | `ts-quality-checker` | gate + migration + integração MySQL (x99/OrbStack não-destrutivo) |

## DoD

Gate W3 verde + CA1–CA5 + migration do CHECK validada em MySQL real + `Transfer` sem regressão +
suíte `financial` completa verde. Fecha #428.

## DECISÃO DE DESIGN (Gabriel, 2026-07-15) — perna espelho carrega `productLabel`

O W0 revelou que, ao fazer a perna espelho B (criada em `confirm-counterpart-match.ts`) nascer com o
tipo real Investment/Redemption, o guard `investment-requires-product` (`manual-entry.ts:57-62`) passa a
exigir `productLabel` — que o agregado `ExpectedCounterpart` **não carrega** hoje.

**Decisão: opção (a) — propagar o `productLabel` pela contrapartida.** É o correto conceitualmente: a
perna B é a mesma operação de produto, então deve conhecer o produto. **NÃO** relaxar o guard (opção b,
mexe em invariante) nem usar placeholder (opção c, remendo). Expande o escopo do W1:

- **8.** `ExpectedCounterpart` ganha `productLabel: string | null` (`types.ts`, input de `create`,
  `immutable`). Nulo para `Transfer` (não tem produto); preenchido para Investment/Redemption a partir
  do `input.productLabel` do lançamento de origem em `record-manual-entry.ts`.
- **9.** Coluna `product_label` em `fin_expected_counterpart` — **na MESMA migration** que amplia o CHECK
  (ponto 4). Mapper `toRow`/`toDomain` (`expected-counterpart.mapper.ts`).
- **10.** `confirm-counterpart-match.ts` usa `counterpart.productLabel` (não `'Transfer'` fixo nem
  placeholder) ao montar a perna espelho B.

**Trava contra o remendo (c):** o W1 deve incluir teste que assere que a perna espelho B recebe o
`productLabel` **REAL** da operação de origem (não placeholder/vazio) — estende o CA4. O W2 valida isso
explicitamente. CA4 atualizado: a perna B tem `type` real **e** `productLabel` real.

## Ponto de confirmação (não bloqueia W0 — a spec já responde)

O item 3 da issue pede "confirmar a semântica do movimento". A spec 029 (`spec.md:122`) já fixa **sinal
oposto ao da origem** para os 3 tipos, e a implementação `opposite(transaction.movement)` já cumpre.
Não é decisão de 3 vias — só validar em tela no fim (a P.O. valida o palpite aparecendo na conta certa).
