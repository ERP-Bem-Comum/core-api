# W0 — Testes RED · FIN-DOC-ISSUE-DATE (#163)

**Agente**: tdd-strategist · **Data**: 2026-06-19 · branch `feat/financial-document-issue-date`.

Modelar `issueDate` (data de emissão) no Document + expor nos DTOs + filtros `issuedFrom`/`issuedTo`. Espelha `dueDate`.

| Camada | Teste RED |
| --- | --- |
| Domínio | `domain/document/document.test.ts` — `create` captura `issueDate`; ausente → null. RED (campo não existe no agregado). |
| Persistência (contrato) | `adapters/persistence/document-repository.suite.ts` — `findPaged` janela de EMISSÃO inclusiva + `issueDate` exposto no read-model. Roda nos 2 adapters (in-memory + drizzle-mysql). |

`issueDate` é **nullable** (opcional + back-compat). Capturado no create (imutável); preservado em undoApproval/adjust/editMetadata.
