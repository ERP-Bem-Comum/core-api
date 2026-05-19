# Code Review W2 — CTR-DOCS-UPDATE-FOR-ADR-0020 — Round 1

**Veredito:** APPROVED
**Reviewer:** Claude (self-review — padrão #4-#7)
**Data:** 2026-05-16

## Foco — checks críticos

| # | Foco | Veredito | Ancoragem |
| :- | :- | :-: | :- |
| 1 | Refs operacionais SQLite removidas de CLAUDE.md/handbook/SKILLs | PASS | docs-update.test.ts 11/11 GREEN |
| 2 | Refs históricas preservadas (clean-code-theorist DRY/WET, ADR-0018 como evidência) | PASS | `clean-code-theorist:81` expande com contexto temporal; `database-engineer` e `ports-and-adapters` referenciam ADR-0018 como "Superseded by ADR-0020" (não como vigente) |
| 3 | Banner ⚠️ em `06-persistence-strategy.md` claro | PASS | Topo do arquivo, parágrafo dedicado, link explícito para git history |
| 4 | ADR-0020 entrou na lista de ADRs críticos do CLAUDE.md | PASS | linha 39 |
| 5 | Sem regressão em runtime (typecheck/lint/test) | PASS | gates W3 todos clean |

## Issues encontradas

### 🔴 Critical
Nenhuma.

### 🟡 Important
Nenhuma.

### 🔵 Suggestions

- **S-1: `database-theorist/SKILL.md` ainda tem 8 menções a SQLite/ADR-0018** em refs comparativas/históricas (linhas 79, 82, 84, 85, 86, 88, 89, 90). **Preservadas intencionalmente** — são comparações de paradigmas/escolas (Polyglot vs One-Size-Fits-All, Relational vs Document, etc.) que ancoram o raciocínio teórico. ADR-0018 continua válido como **decisão deliberada documentada**, ainda que superseded. **Não é issue; é a aplicação consciente do D2 do request.**

- **S-2: `handbook/inquiries/0004-...` menciona SQLite**. Inquiry é documento deliberativo/histórico por natureza — não tocou no W1. Confirmado correto.

- **S-3: `06-persistence-strategy.md` reescrito sem preservação de seções obsoletas**. A versão anterior tinha §6 "Build do binário nativo (better-sqlite3)" — totalmente removida na reescrita (correto: o conteúdo deixou de ser aplicável). Git history preserva o original para quem precisar.

- **S-4: Tech debt herdado do #7 (flakiness CA-3 do smoke)** identificado durante o W3 (1ª execução `test:integration` falhou; 2ª 57/57). Não é regressão deste ticket. Documentado no REPORT do W1 com sugestão de fix (`compose up --wait` mais robusto OU `SELECT 1` aquecedor no `before()`).

## O que está bom

- **`06-persistence-strategy.md`** ficou compreensivo. Adicionei §8 sobre SELECT-then-UPDATE-or-INSERT que cristaliza a decisão da #4 (validada pelo database-theorist) num lugar canônico — qualquer dev futuro entende o "por que" sem precisar abrir o pipeline.
- **Banner ⚠️** no topo do `06-persistence-strategy.md` segue o mesmo padrão do banner no topo do ADR-0018 (criado pelo ADR-0020). Consistência visual.
- **Distinção operacional × histórica** foi aplicada cirurgicamente: 8/16 SKILLs editadas, 8 SKILLs INTACTAS (porque não tinham refs operacionais). Test estrutural validou.
- **`clean-code-theorist`** ganhou uma nota que **valoriza** a regra (não só preserva): agora explica que a duplicação SQLite+MySQL serviu de evidência empírica do princípio, e que a regra continua válida em outros contextos. Refs históricas educativas — não fósseis.
- **`tdd-tutor` e `tdd-strategist`** ganharam o `contracts.cli.mysql.test.ts` como exemplo vivo de E2E real — coverage do #7 promovido para SKILL.

## Próximo passo

**APPROVED → seguir para W3.** Gates já passaram em paralelo com o W1.

## Follow-ups gerados

- **S-4 (flakiness CA-3 smoke)**: abrir ticket `CTR-CLI-MYSQL-SMOKE-FLAKINESS` se a equipe quiser endereçar. Workaround atual: re-run.
- ADR-0018 continua como evidência histórica — não tocar. ADR-0020 continua vigente.

Nenhum bloqueante.
