# W0 (RED) — FIN-DOCUMENTO-INGESTAO

> Skill: `tdd-strategist` · Outcome: **RED**

## Teste de existência (spec completeness check)

Este ticket é de **especificação/documentação** (pré-código). O W0 não produz testes de código
`.test.ts`; em vez disso, verifica a completude da spec contra o escopo do `000-request.md`.

| CA da spec | Documento esperado | Status W0 |
| :-- | :-- | :-- |
| CA-0 (Descoberta) | `discovery.md` | ❌ inexistente |
| CA-1 (SPEC) | `spec.md` | ❌ inexistente |
| CA-2 (Domínio) | `domain.md` | ❌ inexistente |
| CA-3 (ADRs) | `adr/*.md` | ❌ inexistente |
| CA-4 (Métricas) | `metrics.md` | ❌ inexistente |
| CA-5 (Plano) | `plan.md` + `research.md` + `data-model.md` + `quickstart.md` + `contracts/` | ❌ inexistente |
| CA-6 (BDD) | `bdd/*.feature` | ❌ inexistente |
| CA-6b (Tasks) | `tasks.md` | ❌ inexistente |
| CA-7 (TDD) | `tdd/plano-de-testes.md` | ❌ inexistente |
| CA-QA | `qa-test-plan.md` | ❌ inexistente |

## Evidência RED

Nenhum documento da pipeline existe em `specs/FIN-DOCUMENTO-INGESTAO/`.
GREEN quando toda a documentação exigida pelo Goal.md estiver produzida.

## API que o W1 deve entregar (documentação)

- `specs/FIN-DOCUMENTO-INGESTAO/discovery.md` — stakeholders, RFs, RNFs, riscos
- `specs/FIN-DOCUMENTO-INGESTAO/spec.md` — 17 critérios de aceitação
- `specs/FIN-DOCUMENTO-INGESTAO/domain.md` — agregados, VOs, domain services, eventos, invariantes
- `specs/FIN-DOCUMENTO-INGESTAO/adr/0001-ocr-port-adapter.md` — ADR de OCR (Port/Adapter)
- `specs/FIN-DOCUMENTO-INGESTAO/metrics.md` — KPIs, NFRs, SLIs/SLOs
- `specs/FIN-DOCUMENTO-INGESTAO/plan.md` — fases de implementação, DDL, quickstart
- `specs/FIN-DOCUMENTO-INGESTAO/research.md` — pesquisa de OCR, storage, CSRF, auto-save
- `specs/FIN-DOCUMENTO-INGESTAO/data-model.md` — 6 tabelas SQL (`fin_*`)
- `specs/FIN-DOCUMENTO-INGESTAO/quickstart.md` — setup local e comandos de teste
- `specs/FIN-DOCUMENTO-INGESTAO/contracts/*.ts` — 5 ports (Ocr, Storage, DocumentoRepository, TituloRepository, AliquotaRepository)
- `specs/FIN-DOCUMENTO-INGESTAO/bdd/documento-ingestao.feature` — 14 cenários Gherkin
- `specs/FIN-DOCUMENTO-INGESTAO/tasks.md` — tasks por fase (F1..F8)
- `specs/FIN-DOCUMENTO-INGESTAO/tdd/plano-de-testes.md` — estratégia de testes + exemplos
- `specs/FIN-DOCUMENTO-INGESTAO/qa-test-plan.md` — plano de QA por quadrante
