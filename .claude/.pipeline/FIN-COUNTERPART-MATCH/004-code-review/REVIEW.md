# Code Review — Ticket FIN-COUNTERPART-MATCH — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer
**Data:** 2026-07-13
**Escopo revisado:** domínio `expected-counterpart.match`; use-cases `suggest-counterpart-matches.ts` + `confirm-counterpart-match.ts`; port `ReconciliationRepository.confirmCounterpartMatch` + adapters in-memory/Drizzle; `match-score.dateWithinTolerance` (export); borda HTTP (`schemas.ts`, `dto.ts`, `error-mapping.ts`, `plugin.ts`, `composition.ts`).

---

## Issues

### 🔴 Crítica

Nenhuma.

### 🟡 Importante (registrar)

#### Issue 1 — Borda: endpoints dedicados vs. `kind` unificado do spec — **RESOLVIDO**

`contracts/http.md` previa `kind: 'payable' | 'counterpart'` na rota de suggestions existente + `target` no confirm. A implementação usa **endpoints dedicados**. **Verificado contra o contrato real do front** (`web-app/specs/034-bank-reconciliation/contracts/server-fns.md` #4): o front consome `GET .../suggestions` → `{ suggestions: [{payableId, score, band, criteria}] }` **sem `kind`**, com parsing exaustivo; e **não há spec/server-function de front para a contrapartida** (US2 não construído). Conclusão: o `kind` unificado teria **quebrado** o contrato vigente do front — os **endpoints dedicados são a escolha correta e de menor risco**. `contracts/http.md` (§2/§3) atualizado para o contrato entregue. Sem ação de front além do consumo US2 (não iniciado).

### 🔵 Sugestão

#### Sugestão 1 — `suggest-counterpart-matches.ts`: `score` constante

Como `exactValue` e `withinWindow` são pré-requisitos do match, `compute({exactValue:true,dateD0:true,...})` = **60** para toda sugestão. O campo existe por consistência de contrato (banda 'media' na UI), mas não discrimina. Ordenação real é por `expectedDate` (CA4). Aceitável; documentar se a UI precisar de score variável no futuro.

#### Sugestão 2 — Vínculo A↔B implícito

O vínculo A↔B é materializado pela própria contrapartida (`originReconciliationRef`=A + `matchedTransactionRef`=B) + a perna B (Reconciliation ManualEntry Transfer). Não há tabela de "link" dedicada (data-model mencionava "Transfer Link" conceitual) — a navegação A↔B é derivável. YAGNI correto; sem ação.

---

## O que está bom

- **Atomicidade real (melhor que o CREATE):** `confirmCounterpartMatch` é **1 transação** (INSERT recon+manual_entry, UPDATE tx→Reconciled, UPDATE contrapartida→Matched com guard de corrida `WHERE status='Pending'`, outbox) — resolve o trade-off 🟡 do CREATE. **Validado no MySQL real (OrbStack): 74/74.**
- **Invariante preservado:** a perna B vira `Reconciliation` ManualEntry/Transfer (espelho da perna A) → "tx Reconciled ⟹ tem Reconciliation" continua valendo (undo/lookup reverso funcionam).
- **Domínio purista:** `match` = função pura + `Result` + `Readonly` + erro EN kebab; `Matched`/`Discarded` terminais.
- **Reuso sem duplicar:** `dateWithinTolerance` exportada de `match-score` (mesma janela ±5d; sem constante duplicada).
- **Borda secure-by-default:** Zod schemas (ADR-0027), money como string, `z.uuid()`, permissões `reconciliationRead`/`Write`, error-mapping público sem vazar slug (409/422/503). Teste E2E `fastify.inject` cobre GET→confirm bogus (422)→confirm (201)→GET vazio.
- **Regressão zero:** port change + refactor in-memory sem quebrar nada — 3953 unit + 74 integração verdes.

---

## Próximo passo

**APPROVED** → W3 (gate + OrbStack já validados). Issue 1 (🟡) = confirmar contrato com o front (follow-up, não bloqueia).
