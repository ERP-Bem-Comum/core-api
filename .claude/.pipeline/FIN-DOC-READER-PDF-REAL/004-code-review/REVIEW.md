# Code Review — FIN-DOC-READER-PDF-REAL (#386 Fatia 1)

**Veredito final:** APPROVED (round 2)

**Reviewers:** security-backend-expert (agente, foco parser hostil) + code-reviewer (inline). **Data:** 2026-07-09.

## Round 1 — REJECTED (1 Blocker)
`security-backend-expert` provou empiricamente (PoC, 8KB PDF → 209MB heap):
- **🔴 F1 (Blocker, CWE-400/789)** — **regressão introduzida pelo #386**: `pending` mudou de slot único (`{...}|null`, O(1)) para `Operand[]` acumulador sem teto → content-stream com milhões de `()`/`<>` sem `Tj`/`TJ` cresce sem limite. Vetor realista: fornecedor manda "fatura.pdf" hostil que o operador ingere no fluxo normal.
- **🟠 F2 (Major, pré-existente, fora do diff)** — `parseToUnicode` lança `RangeError` (`String.fromCodePoint` de codepoint > 0x10FFFF) não capturado, atravessa a borda do port. Contido hoje pelo error handler do Fastify; risco latente p/ callers não-HTTP (worker Fatia 2 #388).

## Correções aplicadas (round 2)
- **F1 corrigido**: teto `MAX_PENDING_OPERANDS = 2048` nos dois pushes de `extractText`; operandos acima do teto descartados (nenhuma linha fiscal real passa disso). **Fixture adversarial F5** (`PENDING_AMPLIFY`, 300k operandos sem Tj) + teste que assere término < 2s e `scanned-unsupported` — cobre a classe de ataque que a suíte não pegava. ✅
- **F2 registrado como issue #389** (pré-existente, fora do escopo #386 — anti-padrão #15; será corrigido em ticket próprio antes da Fatia 2 usar o reader fora do Fastify). ✅

## Confirmações do agente (limpo)
- ReDoS: regex novas lineares (`\s+`, alternações planas). ✅
- Terminação: `i` avança em todos os 7 ramos do `while`. ✅
- F1–F4 adversariais seguem verdes. ✅
- LGPD: teste local autoexclui-se sem os fixtures reais. ✅

## Resultado
synthetic **16/16** (inclui F5); reais 2 pass / 5 todo (#388) / 0 fail; typecheck limpo.

## Próximo (W3)
Gate: typecheck + format:check + lint + test.
