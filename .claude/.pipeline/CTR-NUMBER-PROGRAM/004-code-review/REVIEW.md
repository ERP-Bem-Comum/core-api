# 004 — W2 (code review, read-only) — CTR-NUMBER-PROGRAM

**Resultado: APPROVED** (round 1)

Audit read-only do diff da borda HTTP (W1). Foco: isolamento de módulo, ADRs, idioma, degradação.

## Conformidade verificada

| Item | Veredito |
| --- | --- |
| Cross-módulo só via `programs/public-api/index.ts` (ADR-0006/0014) | ✓ `composition.ts` e `program-composition.ts` importam só `public-api/index.ts`; zero import de `programs/domain` ou `programs/application`. |
| Domínio puro (sem infra, `Result`, sem `throw`) | ✓ `contract.ts`/`errors.ts` só validação + tagged error. |
| ADR-0020 (sem ENUM nativo) | ✓ `classification` é `varchar(8)` + `CHECK IN ('CT','OS')`. |
| ADR-0014/0018 (refs leves sem FK física, UUID varchar(36)) | ✓ `program_id`/`budget_plan_id` `varchar(36)` sem FK. |
| Legado → CT | ✓ coluna `NOT NULL DEFAULT 'CT'`; default no domínio (`resolveMeta`). |
| Degradação graciosa (ADR-0032) | ✓ port ausente/erro/timeout → `snapshot: null`; boot não cai (server degrada com log). |
| Sem N+1 na listagem | ✓ `getProgramSnapshots` batch (1 chamada/página); teste prova `calls === 1`. |
| `exactOptionalPropertyTypes` | ✓ `classification` via spread condicional; metadados `?? null`. |
| Idioma EN/PT por camada | ✓ erros `kebab`/tagged EN, comentários PT, identifiers EN. |
| Borda valida input (Zod) | ✓ `classification` enum, `programId`/`budgetPlanId` `z.uuid()`, rótulos `min(1).max(255)`. |

## Observações (não-bloqueantes)

1. **PATCH não edita classification/programId/metadados** — `patchContractMetadataBodySchema`
   permanece com `title/objective/observations/email/telephone`. O request (CA-1..5) não pede edição
   desses campos via PATCH; mantido fora por YAGNI. Se o front pedir edição depois, abrir ticket.
2. **CSV não traz o snapshot do programa** (só os campos crus + `programId`) — composição async não
   cabe no serializador síncrono; decisão registrada no W1. Coerente com "metadados retornados".
3. **`import-contracts.ts` intacto** — legado v1 não carrega os campos; default CT + null cobre.

## Gate
Nenhum issue bloqueante. Segue para W3.
