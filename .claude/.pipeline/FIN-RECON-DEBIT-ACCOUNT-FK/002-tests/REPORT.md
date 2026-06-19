# W0 — Testes RED · FIN-RECON-DEBIT-ACCOUNT-FK (#160)

**Agente**: tdd-strategist · **Data**: 2026-06-19 · branch `feat/fin-recon-debit-account-fk`.

**Decisão de design (ver REVIEW.md):** o #160 pediu uma FK cross-aggregate `debit_account_ref → fin_cedente_accounts`. Escolhido (decisão do humano) o **guard por identidade na aplicação** em vez da FK física — consistente com a convenção do código (todas as FKs são intra-agregado) e com Vernon (*Implementing DDD*, p.460: "reference external Aggregates only by their globally unique identity, not by holding a direct object reference"). Mesma garantia de integridade (extrato não referencia cedente inexistente), sem acoplar agregados no DB.

| Camada | Teste RED |
| --- | --- |
| Application | `use-cases/import-bank-statement.test.ts` — novo caso: cedente inexistente (`findById → null`) → `account-not-found`, sem parsear/persistir. Hoje o guard é lenient (`!== null && isClosed`) → cedente inexistente passa → **RED**. |

Fixtures ajustados (happy-paths passam a seedar um cedente real): `import-bank-statement.test.ts`, `period.use-cases.test.ts`, `financial-bank-statements.http.test.ts`.
