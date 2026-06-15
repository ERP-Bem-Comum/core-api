# W2 — REVIEW — PRG-LOGO-CONTENT

**Data:** 2026-06-15 · **Skill:** code-reviewer · **Round:** 1 · **Veredito:** ✅ **APPROVED**

## Escopo revisado

Diff completo (5 arquivos `src/` modificados + 1 novo use case `get-program-logo.ts` + 4 testes),
read-only. Comparado 1:1 com o blueprint aprovado `USR-ME-PHOTO-DISPLAY` (rota de bytes da foto).

## Checklist de auditoria

| # | Regra | Resultado |
| :--- | :--- | :--- |
| 1 | Camadas: application só ports/domain/shared; zero adapter | ✅ `get-program-logo.ts` importa só `result`, `program-id` (domain), `repository` (domain), `logo-storage` (port). |
| 2 | Adapters: try/catch → `Result` na borda; mapper S3 NoSuchKey/NotFound → `logo-object-missing`; resto → `logo-storage-unavailable` | ✅ `logo-storage.s3.ts:72-77`; `Body undefined` → `logo-object-missing` (`:69`). |
| 3 | Erros internos EN kebab-case | ✅ `logo-object-missing`, `logo-storage-unavailable`, `program-logo-not-found`, `program-not-found`, `program-id-invalid`. |
| 4 | Isolamento de módulo (ADR-0006/0014); port `LogoStorage` próprio | ✅ zero import de `auth/`/`contracts/`; port próprio documentado. |
| 5 | TS strict (`import type`, `.ts`, `#src/*`, Readonly, sem `class` no port) | ✅ |
| 6 | Segurança GET /:id/logo: `requireAuth` + `authorize(program:read)` (= GET /:id); Content-Type vem do objeto gravado; id malformado → 400 | ✅ `plugin.ts:244`; `programIdParamSchema` (`z.uuid()`) → 400. |
| 7 | Sem vazamento de detalhe interno (5xx genérico) | ✅ `sendResult`: status ≥ 500 → envelope `internal`. |
| 8 | Cache no-store pelo hook onSend global; handler não redefine | ✅ coberto por CA1b. |
| 9 | YAGNI: sem presigned/logoUrl/ETag/thumbnail; aditivo | ✅ só `download` + tipos; `logoKey` opaca intocada. |
| 10 | Corpo binário sem `response` schema | ✅ espelha `me-plugin.ts` (`GET /me/photo`). |
| 11 | Paridade com o blueprint; divergências justificadas | ✅ usa `programRepo.findById` (não há reader port) — justificado. |
| 12 | Testes cobrem os 6 CAs; doubles adequados; sem tautologia | ✅ fake do storage discrimina found/missing/unavailable. |

## Cobertura dos CAs

CA1 (200+bytes+CT), CA2 (sem logo→404), CA3 (403/404/400), CA4 (object-missing→404 / unavailable→503),
CA6 (W3) — todos ✅. **CA5 (round-trip S3 gated) — ⚠️ ver Obs. 3.**

## Observações (não-bloqueantes)

1. `logo-storage.in-memory.ts:43` — `download` devolve referência de `stored.bytes` sem cópia; mesmo
   comportamento do helper `get` pré-existente e do adapter da foto. Adapter de teste/dev. Não bloqueia.
2. `plugin.ts:70-79` — `LOGO_GET_ERROR_STATUS` inclui `program-repo-conflict` (409) que o read puro
   jamais emite; superset defensivo, todos os 8 membros do union mapeados (nenhum cai no `?? 500`).
   Inofensivo. Não bloqueia.
3. **`logo-storage.s3.integration.test.ts:9`** — o comentário instrui `pnpm run test:integration:logo`,
   **script inexistente** no `package.json`; o arquivo também não está em nenhum glob de integração
   (`test:integration:photo` lista só o arquivo da foto). O teste fica corretamente `SKIP` no
   `pnpm test` puro (não viola regressão zero), mas **hoje não há comando do projeto para rodar o
   round-trip S3 do logo** — diferente do blueprint, cujo CA5 é executável via `test:integration:photo`.
   **Recomendação ao W3:** criar `test:integration:logo` espelhando `test:integration:photo` e
   confirmar o comentário. Não bloqueia o code-review (código correto; passa no home com gate manual).

## Issues

Nenhuma issue bloqueante. **APPROVED.**
