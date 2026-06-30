# 000 — Request CTR-DOMAIN-MAPPER-RESULT

> **Frente A — Refactor radical do domínio (entrevista 0001).** **Bloco A.**
> Converte `ContractMapperError`, `AmendmentMapperError`, `PeriodMapperError` (string literal unions) para **tagged records (Padrão D)** carregando evidência da colisão. `Result<Aggregate, RehydrationError>` já existe — este ticket completa o "com tagged errors" da tabela L955.
> Habilita **Outbox MySQL** (futuro): rehydration de evento outbox precisa de erro estruturado para retry/dead-letter.
> Depende de `CTR-DOMAIN-TAGGED-ERRORS` ✅, `CTR-DOMAIN-STATE-MACHINE-CONTRACT` ✅, `CTR-DOMAIN-STATE-MACHINE-AMENDMENT` ✅, `CTR-DOMAIN-INVARIANT-CONTEXTUAL` ✅.
> 12º ticket consecutivo do protocolo **Opção B**.

---

## Origem

- **Tabela L955** da entrevista:
  > `CTR-DOMAIN-MAPPER-RESULT` — Bloco A — Mappers do Drizzle retornam `Result<Aggregate, RehydrationError>` com **tagged errors**. W0 testa BD corrompido.
- **DO A§5** (L857) — "Adapter de persistência reidrata agregado **apenas via smart constructors de VOs internos**, retornando `Result<Aggregate, RehydrationError>`."
- **§3.B.4 da SKILL.md** (recém-inserida) — Smart constructor `from<Source>` retorna `Result<T, TaggedError>` com `attemptedValue: <tipo da assinatura>`.

---

## Estado atual

`src/modules/contracts/adapters/persistence/mappers/`:

```ts
// contract.mapper.ts
export type ContractMapperError =
  | 'contract-mapper-invalid-id'
  | 'contract-mapper-invalid-status'
  | 'contract-mapper-invalid-money'
  | 'contract-mapper-invalid-period'
  | 'contract-mapper-invalid-amendment-id'
  | 'contract-mapper-invalid-ended-at';

// amendment.mapper.ts
export type AmendmentMapperError =
  | 'amendment-mapper-invalid-*'
  | 'amendment-mapper-impossible-shape';

// period.mapper.ts
export type PeriodMapperError = PeriodError | 'period-mapper-fixed-missing-end';
```

Problemas:
- **Sem payload de evidência.** Quando o mapper rejeita uma row, o erro é apenas a tag; não carrega `attemptedValue` (e.g., qual string foi tentada como UUID, qual `cents` veio negativo). Diagnóstico operacional fica difícil.
- **Inconsistente com §3.B/D.** Domínio usa tagged records (Padrão D); mappers ainda usam string literal.
- **Consumo nos repos:** repos (`contract-repository.drizzle.ts`, `amendment-repository.drizzle.ts`) repassam o erro pra cima. Os erros de mapper aparecem no `union` do repo (`ContractRepositoryError`) — devem migrar para tagged junto.

---

## Estado-alvo (Padrão D)

### `contract.mapper.ts`

```ts
import type { Brand } from '../../../../../shared/brand.ts';
import type { ContractStatus } from '../../../domain/contract/types.ts';

// Tagged variants — cada erro carrega evidência do shape impossível.
export type ContractMapperInvalidId = Readonly<{
  tag: 'ContractMapperInvalidId';
  attemptedValue: string;
}>;
export type ContractMapperInvalidStatus = Readonly<{
  tag: 'ContractMapperInvalidStatus';
  attemptedValue: string;
}>;
export type ContractMapperInvalidMoney = Readonly<{
  tag: 'ContractMapperInvalidMoney';
  field: 'originalValueCents' | 'currentValueCents';
  attemptedCents: number;
}>;
export type ContractMapperInvalidPeriod = Readonly<{
  tag: 'ContractMapperInvalidPeriod';
  field: 'originalPeriod' | 'currentPeriod';
  reason: string;
}>;
export type ContractMapperInvalidAmendmentId = Readonly<{
  tag: 'ContractMapperInvalidAmendmentId';
  attemptedValue: string;
}>;
export type ContractMapperInvalidEndedAt = Readonly<{
  tag: 'ContractMapperInvalidEndedAt';
  status: ContractStatus;
  endedAtPresent: boolean;
}>;

export type ContractMapperError =
  | ContractMapperInvalidId
  | ContractMapperInvalidStatus
  | ContractMapperInvalidMoney
  | ContractMapperInvalidPeriod
  | ContractMapperInvalidAmendmentId
  | ContractMapperInvalidEndedAt;

// Case constructors (free functions, Padrão D — §3.B.4 + §3.D.1)
export const contractMapperInvalidId = (attemptedValue: string): ContractMapperInvalidId => ({
  tag: 'ContractMapperInvalidId', attemptedValue,
});
// ... etc.
```

E `contractFromRow` retorna `err(contractMapperInvalidId(row.id))` em vez de `err('contract-mapper-invalid-id')`.

### `amendment.mapper.ts`

Mesmo padrão. Variantes:
- `AmendmentMapperInvalidId`
- `AmendmentMapperInvalidContractId`
- `AmendmentMapperInvalidStatus`
- `AmendmentMapperInvalidKind`
- `AmendmentMapperInvalidMoney`
- `AmendmentMapperInvalidDate`
- `AmendmentMapperInvalidDocumentId`
- `AmendmentMapperInvalidUserRef`
- `AmendmentMapperImpossibleShape` (já é tagged — manter)

### `period.mapper.ts`

```ts
// PeriodMapperError = PeriodError | tagged
export type PeriodMapperFixedMissingEnd = Readonly<{
  tag: 'PeriodMapperFixedMissingEnd';
}>;

export type PeriodMapperError = PeriodError | PeriodMapperFixedMissingEnd;
```

Nota: `PeriodError` vem do domain VO — já é string literal por convenção do Bloco B (smart constructor). Mantemos compat: `PeriodMapperError = PeriodError | PeriodMapperFixedMissingEnd` (union heterogênea — pragmático). Alternativa: full tagged — adiar para `SKILL-REFRESH-A` ou ticket dedicado.

### `money.mapper.ts`

Verificar. Provavelmente é `MoneyError` (do VO). Sem mudança neste ticket.

### Consumidores (repos)

`src/modules/contracts/adapters/persistence/contract-repository.drizzle.ts` e `amendment-repository.drizzle.ts` (se existirem):
- `ContractRepositoryError` / `AmendmentRepositoryError` continuam string literal por enquanto (escopo de outro ticket).
- Quando o repo encontra erro do mapper, repassa: `if (!r.ok) return r;` — funciona naturalmente (union widening).

### Testes

- `tests/modules/contracts/adapters/persistence/contract.mapper.test.ts` — ajustar asserções: `r.error.tag === 'ContractMapperInvalidId'` em vez de `r.error === 'contract-mapper-invalid-id'`.
- Idem `amendment.mapper.test.ts`.
- **W0 RED:** garantir que existem testes de DB corrompido para cada variante (id inválido, status inválido, money inválido, etc.). Provavelmente já cobertos pelos tickets SM Contract/Amendment — confirmar.

---

## Critérios de aceitação

- **CA1** — `ContractMapperError` é union de tagged records. `grep "'contract-mapper-"` em `src/` retorna 0 ocorrências (string literal eliminada).
- **CA2** — `AmendmentMapperError` mesmo.
- **CA3** — `PeriodMapperError` ganha pelo menos 1 variant tagged (`PeriodMapperFixedMissingEnd`) — pragmatismo aceita union com `PeriodError` string literal.
- **CA4** — Case constructors free functions em cada `.mapper.ts` (`contractMapperInvalidId(...)`, etc.).
- **CA5** — Cada variant carrega payload de evidência apropriada (Decisão DO D§23 — duas peças da colisão).
- **CA6** — Tests existentes atualizados (`r.error.tag === 'X'`). Pelo menos 1 teste novo por mapper exercitando DB corrompido com asserção do payload.
- **CA7** — `pnpm test` verde com 0 fails; `pnpm run typecheck` exit 0; `pnpm run lint` exit 0.

---

## Arquivos previstos

### `src/` (produção)

```
src/modules/contracts/adapters/persistence/mappers/contract.mapper.ts    (refactor erros → tagged + case constructors)
src/modules/contracts/adapters/persistence/mappers/amendment.mapper.ts   (idem)
src/modules/contracts/adapters/persistence/mappers/period.mapper.ts      (adiciona PeriodMapperFixedMissingEnd tagged)
```

### `tests/`

```
tests/modules/contracts/adapters/persistence/contract.mapper.test.ts     (atualizar asserts + 1 teste novo com payload)
tests/modules/contracts/adapters/persistence/amendment.mapper.test.ts    (idem)
tests/modules/contracts/adapters/persistence/contract-repository.suite.ts   (se assertar erro de mapper, ajustar)
tests/modules/contracts/adapters/persistence/amendment-repository.suite.ts  (idem)
tests/modules/contracts/adapters/persistence/drizzle-mysql.test.ts       (idem, se exercitar mapper erros)
```

---

## Não-objetivos

- **Migrar `ContractRepositoryError` / `AmendmentRepositoryError` para tagged** — escopo de ticket separado.
- **Migrar `MoneyError`, `PeriodError`, `IdsError` do VO** para tagged — Bloco B já cobriu via `attemptedValue` mas string literal ainda é o nome do erro. Mudaria muito o domain — adiar.
- **Outbox MySQL implementation** — este ticket apenas habilita; implementação real é outro ticket (`CTR-OUTBOX-MYSQL-*`).

---

## Risco / pontos de atenção

1. **Consumidores são repos.** O union `ContractRepositoryError` inclui `ContractMapperError` — TS vai pegar mismatches automaticamente.
2. **Padrão de erro misto.** `PeriodMapperError = PeriodError | PeriodMapperFixedMissingEnd` (string literal + tagged) é pragmático mas requer checks `typeof error === 'string'` em consumidores. Documentar.
3. **Testes que já existem** (criados em SM Contract/Amendment + INVARIANT-CONTEXTUAL) usam asserções de string literal — atualizar para tag.
4. **Mitigação Bug #47936** — Opus + checklist + hook ativo.
