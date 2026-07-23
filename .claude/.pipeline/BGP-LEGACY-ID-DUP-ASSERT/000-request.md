# BGP-LEGACY-ID-DUP-ASSERT — escopo

> Size **S** (trivial, test-only). Issue **#520**. Módulo `budget-plans`. Exposto pelo CI de integração
> do #523 (job `budget-plans` vermelho). Solução pesquisada por `tdd-strategist` em
> `.claude/.planning/ci-integration-gate-523/` (relatório SOL-520-521-522).

## Problema

`tests/modules/budget-plans/adapters/persistence/legacy-id.drizzle-mysql.test.ts:255` (CA3) assere a
rejeição da UNIQUE `legacy_id` com o matcher `/duplicate/i` — **mas a UNIQUE funciona**; o defeito é a
asserção. O Drizzle embrulha o erro do `mysql2` num `DrizzleQueryError` cuja `message` de topo é
`Failed query: INSERT ...`; o `Duplicate entry` / `errno 1062` fica em **`err.cause`**, que o `RegExp`
de `assert.rejects` (testado só contra `err.message`) não inspeciona. Vale para as 6 tabelas `bgp_*` → 6
testes vermelhos.

## Alvo (fix trivial — 1 edição no corpo do `for`, cobre as 6 tabelas)

Trocar o `RegExp` por predicado que inspeciona `err.cause.errno`, **reusando o molde canônico do repo**
(`tests/modules/financial/adapters/persistence/payable-paid-at-check.drizzle-mysql.test.ts:87-92`):

```ts
await assert.rejects(
  () => insertRow(dbName, 2, 999),
  (e: unknown) => {
    const cause = (e as { cause?: { errno?: number } }).cause;
    assert.equal(cause?.errno, 1062); // ER_DUP_ENTRY
    return true;
  },
  `${dbName}: legacy_id repetido deveria violar o UNIQUE`,
);
```

## Critérios de aceite

- [ ] **CA1** — CA3 assere `cause?.errno === 1062` nas 6 tabelas `bgp_*`; passa contra MySQL real.
- [ ] **CA2 (não-afrouxamento)** — `1062` é mais estrito que `/duplicate/i`; se a UNIQUE fosse dropada, não
      haveria throw e `assert.rejects` falharia. CA2 (2× NULL) e CA4 (regressão) intactos.
- [ ] **CA3** — `test:integration:budget-plans` verde; job `budget-plans` do `integration.yml` vira verde.

## Disciplina

`db.execute` errno via `e.cause.errno` — memória `drizzle-execute-error-cause-errno`. Só o módulo
`budget-plans` (ADR-0014). É bug trivial (pode ir direto), mas roteado por ticket a pedido — W0 pode ser
a própria conversão RED→GREEN validada em MySQL real (x99/VM isolada), como no #519.

## Rastreio

Issue #520 · exposto pelo #523/`integration.yml` · solução em `SOL-520-521-522.md`.
