# Code Review — Ticket CONTRACTS-HTTP-WRITES-CORE (C2) — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer
**Data:** 2026-05-28T19:05Z
**Escopo revisado:**

- `src/modules/contracts/adapters/http/composition.ts`
- `src/modules/contracts/adapters/http/schemas.ts`
- `src/modules/contracts/adapters/http/amendment-dto.ts` (novo)
- `src/modules/contracts/adapters/http/plugin.ts`
- Testes: `contracts-writes.routes.test.ts` (W0) + migração de `contracts-reads.routes.test.ts`

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

Nenhuma.

### 🟡 Importante (não-bloqueia, mas registrar)

#### Nota 1 — Atomicidade distribuída do homologate (limitação MVP herdada)

`homologateAmendment` persiste em **dois saves sequenciais** (`amendmentRepo.save` → `contractRepo.save`)
— se o 2º falhar, o aditivo fica `Homologated` mas o contrato não recalculado. É limitação **MVP já
documentada no próprio use case** (CTR-OUTBOX-INTEGRATION-IN-REPOS), **não introduzida pelo C2** — o plugin
apenas invoca o use case. Registrado para visibilidade; resolução (saga/2-phase) é ticket futuro fora do C2.

### 🔵 Sugestão (estilo / clareza)

#### Sugestão 1 — `plugin.ts:84` — `writeErrorStatus` default 422 mascara repo errors não-enumerados

O default 422 é correto para o conjunto atual (todos os 15 codes + `ContractNotActive` + repo errors estão
cobertos). Mas se um **novo** `*-repo-*` surgir sem ser adicionado a `REPO_UNAVAILABLE_CODES`, cairá em 422
em vez de 503. Risco baixo (codes são fechados hoje); considerar um teste de exaustividade futuro.

#### Sugestão 2 — `plugin.ts` — divergência de nomes body (`periodStart`) ↔ command (`originalPeriodStart`)

O body HTTP usa `periodStart`/`periodEnd`; o `CreateContractCommand` usa `originalPeriodStart/End`. O
handler traduz corretamente. É intencional (API mais limpa), mas vale um comentário curto no handler para
quem for ler depois. Não-bloqueante.

#### Sugestão 3 — `plugin.ts:90` — `as unknown as Promise<void>`

Mesmo padrão já aceito em `reply.ts:28,37` (limitação de tipo do `reply.send`). Consistente; sem ação.

---

## O que está bom

- **Classificador `writeErrorStatus` completo e correto:** auditei os 5 use cases — todos os 15 codes
  string-literal + a tag `ContractNotActive` + `*-repo-conflict`/`*-unavailable` estão mapeados. Default
  422 (invariante semântica), **nunca 500 para erro de negócio** (SPEC §3). 409 vs 422 fiel à decisão aprovada.
- **`toErrorCode` reusado** para o union misto string|tagged-record (CTR-DOMAIN-TAGGED-ERRORS).
- **D5 — repos do writer corretos:** reads no reader, writes no writer; em mysql `createDrizzle*` +
  `DocumentRepositoryDrizzle(handle.db)`; em memory reader=writer (consistente com C0/C1).
- **D2 — seed objeto** bem modelado (`ContractsSeed`), aplicado só nos repos do writer; migração do C1
  feita e revalidada (12/12).
- **D3 — seed test-only** monta os pré-requisitos de activate/homologate sem antecipar o C3; `seed`+mysql
  emite warn e é ignorado.
- **`amendment-dto.ts`** com switch exaustivo por `kind` (compilador trava variante), mapper puro.
- **Bodies Zod discriminados** (`mode`, `kind`); datas/valor com `z.string()`/`int()` soltos de propósito
  (domínio valida → 422), coerente com a decisão de borda.
- **`throw` só em composition root** (boot/seed dev/test) — consistente com C0/C1 e `.claude/rules/adapters.md`.
- **Testes:** fixtures reais, UUIDs válidos, `app.inject` sem mock; CA8 valida o **RBAC fino** (token
  `contract:write` → 403 no read C1), prova de que as permissões não vazam entre escopos.
- Zero `any`, zero `class`/`this`. `typecheck` + `lint` + `format` + `test` (1498 pass / 0 fail) já verdes.

---

## Próximo passo

- **APPROVED** → pipeline avança para W3 (gate de qualidade formal).
- Nota 1 (atomicidade distribuída) é limitação MVP herdada — candidata a ticket futuro, fora do C2.
  Sugestões 🔵 são opcionais.

---

## Follow-up das notas/sugestões (aplicado 2026-05-28, pós-close)

- **Nota 1 (🟡) — REGISTRADA como débito técnico.** Documento criado em
  `.claude/.planning/HOMOLOGATE-DISTRIBUTED-ATOMICITY.md` (opções de resolução + recomendação Opção 1:
  transação única multi-agregado via `db.transaction`, dado o MySQL único; abrir `CTR-HOMOLOGATE-ATOMIC-TX`
  quando priorizado). Não resolvido aqui — é épico próprio, fora da borda HTTP.
- **Sugestão 1 — APLICADA.** Comentário em `plugin.ts:writeErrorStatus` alertando que `*-repo-*` novo
  não-enumerado cai no default 422; instrui a atualizar os Sets ao introduzir código de repo.
- **Sugestão 2 — APLICADA.** Comentário no handler de `POST /contracts` explicando a tradução
  `periodStart`/`periodEnd` (body) → `originalPeriodStart`/`originalPeriodEnd` (command).
- **Sugestão 3 — SEM AÇÃO.** O `as unknown as Promise<void>` já é o padrão consolidado de `reply.ts`.

Gates revalidados pós-follow-up: `typecheck` ✓ · `lint` ✓ · `format:check` ✓ · suítes HTTP contracts 48/48 ✓.
