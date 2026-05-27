# Code Review — CTR-DOMAIN-CONTRACT-PENDING-PERSISTENCE — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer
**Data:** 2026-05-27
**Escopo revisado:** `schemas/mysql.ts`, migration `0006_*.sql` (+meta), `mappers/contract.mapper.ts`, `repository.ts`, `drizzle repo`, `cli/state.ts`, `fixtures.ts`, `contract.mapper.test.ts`, `contract-repository.suite.ts`.

---

## Conformidade

- ✅ **DDL ADR-0020:** enum via `varchar` + CHECK (sem ENUM nativo); `pending_consistency_chk` usa
  `=` entre booleans (bicondicional), idêntico ao padrão do `ended_at_consistency_chk`. CHECK é
  feature permitida.
- ✅ **Migration backward-compatible:** `MODIFY` relaxa NOT NULL + DROP/ADD amplia o CHECK de status.
  Dados existentes (todos efetivos, status≠Pending, vigência preenchida) satisfazem o novo CHECK —
  nenhuma linha viola. `_journal.json` + snapshot atualizados pelo drizzle-kit.
- ✅ **Mapper correto:** `contractToInsert` ramo `Pending` (NULLs) + narrowing para efetivo;
  `contractFromRow` **bifurca `Pending` antes** de exigir vigência (evita `moneyFromCents(null)`),
  com guard de null no ramo efetivo (narrowing + defesa em profundidade).
- ✅ **Revert limpo:** `save` volta a `Contract` (port + drizzle); `state.ts` restaura Pending.
- ✅ Sem `throw`/`class`/`any`; `Result` em todo o mapper; idioma EN no código.
- ✅ Gate read-only: typecheck/format/lint OK; unit do mapper (CA-M1/M2) + round-trip in-memory (CA6) GREEN.

## 🔵 Sugestões (decisão do usuário, 2026-05-27)

1. **`EffectiveContract` órfão.** → **MANTIDO** como vocabulário de domínio (estados com vigência;
   provável uso na transição `activate`). Sem ação.
2. **Comentário stale** em `contract.mapper.test.ts:274`. → **CORRIGIDO** (texto atualizado).
3. **Erro reusado.** → **CORRIGIDO**: criado `ContractMapperInvalidPendingShape` (tag + status +
   `effectiveFieldsPresent`); `contractFromRow` o usa nos dois pontos de shape inconsistente. Teste
   CA-M3 adicionado. Gate verde (typecheck/format/lint; mapper 11/11). Veredito permanece **APPROVED**.

## Nota de validação (não é defeito de código)

⚠️ O round-trip **CA6 no adapter drizzle/MySQL** (`pnpm run test:integration`) **não foi exercido** —
Docker offline. A migration `0006` e os CHECKs (`pending_consistency_chk`, status ampliado) só serão
validados contra o MySQL real com Docker. **Rodar `test:integration` antes do merge da branch.**
A lógica está coberta por typecheck + unit do mapper + in-memory.

## Próximo passo

**APPROVED → W3** (gate automatizado, sem Docker → MySQL fica `skipped`). As 3 sugestões 🔵 ficam
registradas; a nota de validação MySQL é um lembrete operacional para o merge.
