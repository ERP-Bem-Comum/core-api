# Code Review — Ticket FIN-DOCUMENTO-INGESTAO — Round 2

**Veredito:** APPROVED

**Reviewer:** code-reviewer
**Data:** 2026-06-06T03:08Z
**Escopo revisado:** Mesmo escopo do Round 1, pós-correção.

---

## Correções aplicadas (Round 1 → Round 2)

### 🔴 Críticas — TODAS RESOLVIDAS

| Issue | Arquivo(s) | Correção aplicada |
| :--- | :--- | :--- |
| 1 | `contracts/*.ts` (5 arquivos) | `interface` → `type Readonly<{...}>` em todos os ports |
| 2 | `contracts/ocr-port.ts`, `documento-repository-port.ts`, `titulo-repository-port.ts` | Imports de `#src/modules/financeiro/` removidos; placeholders locais (`type Money = unknown`, etc.) adicionados com comentário explicativo |
| 3 | `data-model.md`, `plan.md` | `ENUM(...)` → `VARCHAR(N) NOT NULL CHECK (...)` em todas as 6 tabelas |
| 4 | `data-model.md`, `plan.md` | `BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT` → `VARCHAR(36) PRIMARY KEY` em tabelas de domínio (`fin_documentos`, `fin_retencoes`, `fin_impostos_registrados`, `fin_titulos`, `fin_divergencias`). `fin_trilha_auditoria` mantido como operacional |
| 5 | `tdd/plano-de-testes.md` | `assert.throws(..., /liquido-negativo/)` → `assert.strictEqual(result.kind, 'err')` + `assert.strictEqual(result.error, 'liquido-negativo')` |
| 6 | `tdd/plano-de-testes.md` | `new DocumentoDrizzleRepository(db)` → `createDocumentoDrizzleRepository({ db })`; `new S3StorageAdapter(...)` → `createS3StorageAdapter({...})`; `new OcrMockAdapter()` → `createOcrMockAdapter()` |
| 7 | `contracts/*.ts` | Arrays de ports e DTOs convertidos para `readonly T[]` / `ReadonlyArray<Readonly<{...}>>` |
| 8 | `bdd/documento-ingestao.feature` | Duplicação do "Cenário 9" resolvida: "Cancelamento" → 9, "Exportar CSV" → 10, e renumerados subsequentes até 14 |
| 9 | `specs/.../adr/0001-ocr-port-adapter.md` | Movido para `handbook/architecture/adr/0034-ocr-port-adapter.md` com Status "Accepted", formato canônico, e referências cruzadas a ADR-0006 e ADR-0019. Índice em `handbook/architecture/adr/README.md` atualizado. Entrada em `handbook/CHANGELOG.md` registrada |

---

## Verificação ponto-a-ponto

### A. Regras absolutas do domínio (código de spec/contracts)
- [x] Zero `interface` em ports → todos são `type Readonly<{}>`
- [x] Zero `class` mencionado em adapters de teste → factory functions
- [x] Zero `throw` em domínio → `Result<T,E>` com `kind: 'err'`
- [x] Arrays imutáveis → `ReadonlyArray<>` e `readonly T[]`

### B. ADRs
- [x] ADR-0020: `ENUM` nativo removido; `AUTO_INCREMENT` removido de tabelas de domínio
- [x] ADR-0006: Cross-módulo via placeholders (não imports de módulo inexistente)
- [x] ADR-0034 (novo): OCR como Port/Adapter formalizado no handbook

### C. TypeScript / ESM
- [x] Ports como `type` (não `interface`)
- [x] `Readonly<{}>` em contratos
- [x] `Uint8Array` em vez de `Buffer` no `StoragePort`

### D. BDD / Rastreabilidade
- [x] 14 cenários numerados sequencialmente sem duplicação
- [x] CAs 1–17 cobertos (alguns CAs agrupados em cenários combinados)

---

## Ressalvas menores (não-bloqueantes)

1. **Placeholder types (`Money = unknown`, `Documento = unknown`)** — aceitáveis em specs pré-W0, mas devem ser substituídos por branded types reais quando o domain for implementado em W1.
2. **`quickstart.md` ainda menciona `pnpm run dev` e `localhost:3000`** — a Fase 1 não tem servidor HTTP. Registrar como débito técnico de documentação para quando o HTTP entrar em escopo (ADR-0025 já habilita Fastify, mas FIN-DOCUMENTO-INGESTAO ainda não o usa).
3. **`plan.md` e `data-model.md` ainda duplicam DDL** — não é violação de regra, mas manutenção dobrada. Recomendar referência cruzada em vez de duplicação.

---

## O que continua bom

- Spec com 17 CAs claros e fora-de-escopo bem delimitado.
- Domain model separando `Documento` e `Titulo` em agregados distintos.
- Fundamentação da decisão CSRF (CNAB Bradesco + simplificação operacional).
- Research, métricas, NFRs e QA plan completos.

---

## Próximo passo

- **APPROVED.** Pipeline pode avançar para W3 (Quality Gate).
- Antes de iniciar W1 (implementação), garantir que os placeholders de tipo nos contracts sejam substituídos por branded types reais no domain.
- Executar `pnpm run typecheck` + `pnpm run format:check` + `pnpm test` no W3.
