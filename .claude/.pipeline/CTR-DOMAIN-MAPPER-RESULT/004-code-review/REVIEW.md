# Code Review — CTR-DOMAIN-MAPPER-RESULT — Round 1

**Veredito:** ✅ APPROVED

**Reviewer:** code-reviewer
**Data:** 2026-05-21T00:00Z
**Round:** 1 / 3

---

## Escopo revisado

```
src/modules/contracts/adapters/persistence/mappers/contract.mapper.ts
src/modules/contracts/adapters/persistence/mappers/amendment.mapper.ts
src/modules/contracts/adapters/persistence/mappers/period.mapper.ts
src/modules/contracts/adapters/persistence/repos/contract-repository.drizzle.ts
src/modules/contracts/adapters/persistence/repos/amendment-repository.drizzle.ts
src/modules/contracts/domain/contract/errors.ts          (referência de padrão)
src/modules/contracts/domain/amendment/errors.ts         (referência de padrão)
src/modules/contracts/cli/formatters/error.ts            (consumidor periférico)
tests/modules/contracts/adapters/persistence/contract.mapper.test.ts
tests/modules/contracts/adapters/persistence/amendment.mapper.test.ts
```

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

Nenhuma.

---

### 🟡 Importante (não-bloqueia, registrar para próximo ticket)

#### Issue 1 — `amendment-repository.drizzle.ts` vs `contract-repository.drizzle.ts` — assimetria estrutural no tratamento do mapper error

**Categoria:** D (Ports & Adapters — qualidade de implementação)
**Arquivo:** `src/modules/contracts/adapters/persistence/repos/amendment-repository.drizzle.ts:44-46`

O `contract-repository` encapsula a conversão de `ContractMapperError → ContractRepositoryError` em uma função `buildContract()` dedicada:

```ts
// contract-repository.drizzle.ts:31-42
const buildContract = (...): Result<Contract, ContractRepositoryError> => {
  const r = contractFromRow(row, ids);
  if (!r.ok) {
    process.stderr.write(`[contract-repo:mapper] ${r.error.tag}\n`);
    return err('contract-repo-unavailable');
  }
  return ok(r.value);
};
```

O `amendment-repository` não tem equivalente — o erro do mapper é propagado via `throw`/`catch` dentro do `safe()`:

```ts
// amendment-repository.drizzle.ts:44-46
const r = amendmentFromRow(row);
if (!r.ok) throw new Error(r.error.tag);
return r.value as Amendment | null;
```

Funciona corretamente (o `safe()` captura e emite `'amendment-repo-unavailable'`), mas há duas consequências:

1. O `r.error.tag` lançado como mensagem de `Error` não é logado via `process.stderr.write` — o diagnóstico da corrupção some no `String(cause)` do `safe()` se quem chama não instrumentar.
2. A assimetria estrutural dificulta manutenção futura: quem editar o amendment-repo pode não perceber que `throw` aqui é um mecanismo de controle de fluxo (não exceção de infra).

**Recomendação:** extrair `buildAmendment()` análogo ao `buildContract()` em ticket dedicado. Fora do escopo deste ticket.

---

### 🔵 Sugestão (estilo / clareza)

#### Sugestão 1 — `cli/formatters/error.ts:12` — comentário menciona forma eliminada

**Arquivo:** `src/modules/contracts/cli/formatters/error.ts:12`

O comentário de contexto cita:

```
//        - Mappers de persistência (`'contract-mapper-invalid-money'`).
```

Essa forma string literal foi eliminada por este ticket (CA1/CA2). O `ERROR_DICTIONARY` não contém — e não deve conter — entradas `contract-mapper-*` (esses erros são internos à camada persistence, nunca sobem à CLI). O comentário pode induzir um futuro mantenedor a adicionar essas chaves erroneamente.

**Fix sugerido:** remover ou substituir por:

```ts
//        - Mappers de persistência (interno — não sobe à CLI; tratados como 'contract-repo-unavailable').
```

Impacto: nenhum. Sugestão cosmética.

---

#### Sugestão 2 — `contract.mapper.test.ts` e `amendment.mapper.test.ts` — cast `as unknown as` desnecessário nos asserts de erro

**Arquivos:**
- `tests/modules/contracts/adapters/persistence/contract.mapper.test.ts:159`
- `tests/modules/contracts/adapters/persistence/amendment.mapper.test.ts:205`

Os testes foram escritos em W0, quando `ContractMapperError` / `AmendmentMapperError` ainda eram string literals (sem `.tag`). Após W1, ambos os types são unions de tagged records — **todos os membros têm `tag: string`**. O cast `as unknown as { tag: string }` é portanto desnecessário; o TS aceita `r.error.tag` diretamente.

```ts
// antes (ainda funciona, mas obscuro)
(r.error as unknown as { tag: string }).tag

// depois (semântico correto — ContractMapperError agora garante .tag)
r.error.tag
```

Impacto: sem efeito em runtime; melhora legibilidade e remove a sugestão falsa de que o tipo é opaco.

---

#### Sugestão 3 — `amendment.mapper.ts:61-65` — `AmendmentMapperInvalidDate` exportado sem uso atual

**Arquivo:** `src/modules/contracts/adapters/persistence/mappers/amendment.mapper.ts:62-65`

`AmendmentMapperInvalidDate` (e seu case constructor `amendmentMapperInvalidDate`) são exportados mas nunca chamados em `amendmentFromRow`. O header documenta isso explicitamente como "reservado para futura validação de campos Date" — o intent é claro. Apenas registro: se o ticket que usar esses tipos for aberto em mais de 2 sprints, considerar remover e recriar quando necessário (YAGNI).

Não bloqueia.

---

## O que está bom

- **Padrão D aplicado com fidelidade ao domínio.** O estilo dos mapper errors (`Readonly<{ tag: PascalCase, ...payload }>` + free functions + union nomeada) é idêntico ao de `domain/contract/errors.ts` e `domain/amendment/errors.ts`. A consistência cross-layer facilita leitura sem saltar de contexto mental.

- **Payloads de evidência semanticamente corretos (CA5 / DO D§23).** Cada variant carrega exatamente as "duas peças da colisão": `ContractMapperInvalidMoney` tem `field` (qual coluna) + `attemptedCents` (qual valor); `ContractMapperInvalidEndedAt` tem `status` + `endedAtPresent` — isso é o payload mínimo necessário para diagnosticar corrupção de DB em produção sem logs adicionais.

- **Union heterogênea `PeriodMapperError` bem documentada.** O comentário em `period.mapper.ts:29-36` explica a assimetria (`PeriodError` = string literal do VO, `PeriodMapperFixedMissingEnd` = tagged do mapper), seu motivo (migração do VO é escopo de outro ticket) e a instrução para consumidores (`typeof e === 'string'`). O `periodErrorReason()` helper em `contract.mapper.ts:131-133` trata a union heterogênea de forma segura.

- **Switch exhaustivo correto em `variantFromRow` e `amendmentFromRow`.** O padrão `default: { const _exhaustive: never = kind; return _exhaustive; }` sem `throw` está aplicado corretamente nos dois lugares onde o compilador precisa de exaustividade.

- **Repos consomem tagged corretamente.** `contract-repository.drizzle.ts:38` usa `r.error.tag` no log; `amendment-repository.drizzle.ts:45` usa `r.error.tag` no `throw new Error(...)`. Nenhum consumidor tenta `String(r.error)` num tagged record.

- **CA1/CA2 completos.** `grep "'contract-mapper-"` e `grep "'amendment-mapper-"` em `src/` retornam 0 ocorrências de código ativo (o único hit é um comentário em `error.ts` — Issue Sugestão 1 acima).

- **Testes novos com asserções de payload (CA6).** Os testes de "DB corrompido" para id inválido, amendment id inválido e kind inválido verificam `.tag` e `.attemptedValue` — não apenas `isErr(r) === true`. Isso é o mínimo para garantir que o payload está chegando correto e não apenas que o erro existe.

- **Gates W3 verdes.** `pnpm run typecheck` exit 0, `pnpm test` 643/630 pass 0 fail, `pnpm run lint` exit 0.

---

## Próximo passo

Pipeline avança para **W3 — QUALITY** (`ts-quality-checker`).

Recomendações não-bloqueantes para tickets futuros:
- Criar `buildAmendment()` análogo ao `buildContract()` em ticket de refactor do amendment-repo (Issue 🟡 1).
- Remover casts `as unknown as` nos testes de mapper (Sugestão 2) — pode ser feito em `CTR-TEST-CLEANUP` ou no próximo ticket que tocar esses arquivos.
- Atualizar comentário em `cli/formatters/error.ts:12` (Sugestão 1) — cosmético, pode ir no próximo `CTR-CHORE-*`.
