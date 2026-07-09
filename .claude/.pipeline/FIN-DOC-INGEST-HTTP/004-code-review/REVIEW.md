# Code Review — Ticket FIN-DOC-INGEST-HTTP — Round 1

**Veredito:** REJECTED

**Reviewer:** code-reviewer (contrato) + agente `security-backend-expert` (borda, comparação com precedente `contracts`)
**Data:** 2026-07-09

## Parte A — contrato: sem achado
Rota + Zod + error-mapping aderentes ao padrão do módulo. RBAC, error-mapping sem vazamento, log sem PII e path-traversal da key **confirmados PASS** pelo security-expert.

## Parte B — segurança: CHANGES-REQUESTED (2 Major + 2 Minor)

### 🟠 M1 — `addContentTypeParser` vaza o bodyLimit de 20 MiB para todas as rotas de `/financial` (CWE-770)
`plugin.ts:289-297` — o parser é registrado no `scope` compartilhado por ~39 rotas; e o Parsing ocorre **antes** do `preHandler` (Fastify Lifecycle), então 20 MiB são alocados **pré-auth** para qualquer POST `/financial/*` com `Content-Type: application/octet-stream`. **Fix:** isolar parser + rota de ingest num sub-scope (`scope.register(async (ingestScope) => {...})`). (Precedente `contracts` tem o mesmo gap → follow-up.)

### 🟠 M2 — sem verificação de conteúdo para XML → unrestricted upload (CWE-434)
`magicBytesMatch` (`plugin.ts:275`) só valida `%PDF`; `text/xml`/`application/xml` sempre `true`. Erro de LEITURA não bloqueia gravação → blob arbitrário com `mimeType=text/xml` é persistido no storage. **Fix:** sniff XML (1º byte não-branco, após BOM, deve ser `<`).

### 🟡 m1 — `fileName` `.`/`..` passa no Zod → cai no adapter (503) em vez de 400 limpo — `schemas.ts` regex. **Fix:** vetar `.`/`..` no Zod.
### 🟡 m2 — cópia dupla de buffer (`new Uint8Array(bytes)` no plugin + `.slice()` no adapter) — `plugin.ts:317`. **Fix:** passar `bytes` (Buffer é Uint8Array) direto no plugin.

## Próximo passo
REJECTED → aplicar M1/M2/m1/m2 + testes de regressão (XML-lixo → rejeitado; octet-stream noutra rota não aloca). Precedente `contracts` (M1) → issue follow-up. Depois W2 round 2.

---

# Code Review — Round 2

**Veredito:** APPROVED

**Data:** 2026-07-09

| Finding | Correção | Regressão travada |
| :-- | :-- | :-- |
| 🟠 M1 parser vaza | rota + parser isolados num sub-scope (`scope.register(async (ingestScope: typeof scope) => …)`) — bodyLimit 20 MiB não vaza p/ as demais rotas | (encapsulamento; typecheck+lint verdes) |
| 🟠 M2 upload arbitrário XML | `magicBytesMatch` faz sniff de XML (1º byte não-branco, pós-BOM, deve ser `<`) | `M2: mimeType=text/xml + body não-"<" → 4xx` |
| 🟡 m1 fileName `.`/`..` | `.refine` no Zod veta `.`/`..` → 400 limpo (não 503) | `m1: fileName=".." → 400` |
| 🟡 m2 cópia de buffer | `bytes` (Buffer) direto ao use case, sem `new Uint8Array(...)` | (typecheck) |

**Follow-up:** o precedente `contracts/http/plugin.ts` tem o **mesmo M1** (parser octet-stream no scope compartilhado) — registrar issue para isolar lá também (fora do escopo deste ticket, ADR-0040).

**Gates pós-fix:** `node --test` ingest 7 pass / 0 fail (2 novos: M2 + m1); `tests/.../http` 219 pass / 0 fail; `typecheck` exit 0; `eslint` 0 erros.

**Próximo passo:** APPROVED → **W3** (gate final). **Fatia 2 (ingest completo) COMPLETA** após o W3.
