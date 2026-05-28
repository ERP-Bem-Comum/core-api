# 📋 Débito técnico — Atomicidade distribuída do `homologateAmendment`

> **Status:** 🟡 **DIFERIDO** (registrado em 2026-05-28). Não é plano ativo — é um débito técnico
> rastreável. Origem: `CONTRACTS-HTTP-WRITES-CORE` (C2), W2 REVIEW Nota 1.
> **Severidade:** 🟡 Importante (limitação MVP conhecida, não bug introduzido).
> **Não bloqueia** nenhum ticket aberto. Resolver é um épico próprio, fora da borda HTTP.

## Casos afetados pelo mesmo padrão (2 saves sequenciais sem atomicidade distribuída)

1. **`homologateAmendment`** — `amendmentRepo.save` (aditivo Homologated) → `contractRepo.save` (contrato
   recalculado). Caso original.
2. **Upload+attach de documento de aditivo (C3, rota E2** `POST /contracts/:id/amendments/:amendmentId/documents`**)**
   — `documentRepo.save` (via `uploadDocument`) → `amendmentRepo.save` (via `attachSignedDocument`, liga
   `signedDocumentRef`). Se o attach falhar após o upload, o documento existe mas o aditivo não o referencia.
   Registrado em `CONTRACTS-HTTP-DOCS-HARDENING` (W2 Nota 2 do C3). Mesma natureza, mesma resolução proposta.

---

## O problema

`homologateAmendment` (`src/modules/contracts/application/use-cases/homologate-amendment.ts`) persiste o
resultado em **dois saves sequenciais**, cada um atômico **localmente** (agregado + seus eventos no outbox),
mas **sem atomicidade distribuída entre os dois**:

```
8. amendmentRepo.save(homologated.amendment, [homologated.event])   // 1º save
9. contractRepo.save(contractUpdated.contract, [contractUpdated.event])  // 2º save
```

Se o passo 9 falhar após o 8 ter persistido, o sistema fica em estado inconsistente:
**aditivo `Homologated`, mas contrato com valor/período NÃO recalculado** (RN-06/07 violada de fato).

A limitação **já estava documentada no próprio use case** (CTR-OUTBOX-INTEGRATION-IN-REPOS, comentário
"Atomicidade DISTRIBUÍDA entre os 2 saves é limitação MVP"). **Não foi introduzida pelo C2** — a borda HTTP
(`POST /:id/amendments/:amendmentId/homologate`) apenas invoca o use case e mapeia o `Result`.

## Por que foi diferido

- É herdado, conhecido e documentado desde o MVP do domínio — não é regressão.
- A borda HTTP (C2) não é o lugar de resolver atomicidade de persistência.
- A correção exige decisão de design (uma das opções abaixo) e provavelmente um ADR.

## Opções de resolução (a avaliar quando priorizado)

1. **Transação única multi-agregado** — `amendmentRepo` + `contractRepo` compartilham a mesma transação
   Drizzle (`db.transaction`), persistindo os dois agregados + ambos os eventos de uma vez. Requer um port
   de unit-of-work ou um repo combinado. Avaliar com `drizzle-orm-expert` + `database-engineer`. **Tende a
   ser a opção mais simples e correta** dado que ambos vivem no mesmo MySQL (ADR-0014).
2. **Saga / processo compensatório** — se o 2º save falhar, emitir compensação que reverte o 1º. Mais
   complexo; só justifica se os agregados forem para stores distintos no futuro.
3. **Reprojeção idempotente via outbox** — o contrato recalculado deriva de um handler que consome o evento
   de homologação do aditivo (event-sourcing parcial). Maior reescrita.

## Recomendação

Quando priorizado, abrir ticket `CTR-HOMOLOGATE-ATOMIC-TX` (ou similar) explorando a **Opção 1**
(transação única), por ser a de menor superfície dado o MySQL único. Exige avaliar se o contrato de
`Repository` deve expor um modo transacional compartilhado sem vazar Drizzle ao domínio (ADR-0006).

## Referências

- Use case: `src/modules/contracts/application/use-cases/homologate-amendment.ts` (comentário §8-9).
- Review que registrou: `.claude/.pipeline/CONTRACTS-HTTP-WRITES-CORE/004-code-review/REVIEW.md` (Nota 1).
- ADRs relevantes: 0014 (isolamento MySQL por prefixo), 0015 (outbox), 0020 (features SQL — `db.transaction`
  permitido), 0006 (ports & adapters — não vazar infra ao domínio).
