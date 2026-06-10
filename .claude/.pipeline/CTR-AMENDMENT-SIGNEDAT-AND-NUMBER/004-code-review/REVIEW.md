# 004 — W2 (code-review) — CTR-AMENDMENT-SIGNEDAT-AND-NUMBER

Audit read-only por `drizzle-orm-expert` (persistência) + `typescript-language-expert`
(soundness + exaustividade). 2 rounds.

## Veredito final: **APPROVED** (round 2, após fix)

## Round 1

### drizzle-orm-expert — APPROVED
CHECK `signed_at_consistency` (bicondicional) cobre os 3 estados sem lacuna e é complementar ao
`homologation_completeness`. `ctr_amendment_seq` + migration `0012` (ENGINE/CHARSET + `utf8mb4_bin` no
contract_id) corretos. `nextAmendmentNumber` (CHILD_CODES per-contract: INSERT-ODKU → SELECT FOR UPDATE
→ UPDATE+1) fecha a janela de corrida; gaps por rollback aceitáveis. Mapper round-trip cobre os 6
shapes `(status, signedDocumentRef, signedAt)`. In-memory espelha o Drizzle. Só MINOR/NIT cosméticos
(nome do CHECK; ODKU no-op set; assimetria visual das seq-tables) — não aplicados.

### typescript-language-expert — REJECTED (1 achado MAJOR)
**Buraco silencioso em `cli/state.ts isValidAmendment`**: não validava `signedAt` — aceitava
PendingWithDocument/Homologated SEM `signedAt` e PendingWithoutDocument COM `signedAt` (assimetria com o
mapper MySQL estrito). Padrão reincidente (mesmo tipo de gap do ticket anterior). Compilador não pega
(validador runtime). Não coberto por teste (state.test só exercitava `amendments: []`). Demais pontos
(domínio, schemas Zod, amendment-dto, mapper, use cases, CLI commands) — SOUND, zero outros holes.

## Fix (volta técnica ao W1)
- `cli/state.ts isValidAmendment`: valida `signedAt` por estado, espelhando `amendment.mapper.ts`:
  PendingWithoutDocument ⟹ sem signedAt; PendingWithDocument/Homologated ⟹ signedAt `Date` obrigatório.
- `tests/.../cli/state.test.ts`: +6 casos (round-trip válido dos 3 estados + rejeição dos 3 shapes
  inconsistentes → `state-entity-invalid`). Provam o gap fechado e travam regressão.

## Round 2 (verificação do fix)
- `state.test.ts`: 16/16 (6 novos verdes).
- Gate: typecheck ✓ · format ✓ · lint ✓ · **test 2704 / 0 fail**.
- O fix toca só o validador in-memory (não o caminho MySQL) → integração 91/91 do W1 permanece válida.

## Decisão de promoção
APPROVED após o fix do gap MAJOR. NITs/MINORs do drizzle-expert documentados, não aplicados
(cosméticos). Promove para W3.
