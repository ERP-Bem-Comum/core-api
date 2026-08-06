# Rastreabilidade — testes de feature pendente (backend)

> Cenários que descrevem comportamento DESEJADO de tickets de backend ainda não implementados.
> **Reprovam** até o ticket fechar. Fail-first: o vermelho dirige a implementação (W0 RED).
> Origem: handoff do front web-app v2 (Contratos), validação em tela 2026-06-08.

## Ticket: CTR-HTTP-DISTRATO-DOCUMENTO (M) — distrato rico

Arquivos: `bdd/pending-backend/distrato-documento.feature` · `tdd/pending-backend/distrato-documento.md`

| caso   | comportamento esperado                                    | hoje                        |
| ------ | --------------------------------------------------------- | --------------------------- |
| DIST-1 | distrato com PDF + data efetiva + motivo → 200 Terminated | ❌ reprova (body só `kind`) |
| DIST-2 | `endedAt` = data efetiva informada (não now)              | ❌ reprova (now)            |
| DIST-3 | documento `signed_termination` vinculado no detalhe       | ❌ reprova                  |
| DIST-4 | sem documento → 422 `terminate-no-signed-document`        | ❌ reprova (200)            |
| DIST-5 | data futura → 422 `terminate-invalid-date`                | ❌ reprova                  |
| DIST-6 | exige `contract:write` → 403                              | ✅ já passa (guarda)        |

## Ticket: CTR-HTTP-DOCUMENT-CONTENT (M) — conteúdo do documento

Arquivos: `bdd/pending-backend/document-content.feature` · `tdd/pending-backend/document-content.md`

| caso  | comportamento esperado                             | hoje                          |
| ----- | -------------------------------------------------- | ----------------------------- |
| DOC-1 | GET content → 200 `application/pdf` (preview)      | ❌ reprova (rota inexistente) |
| DOC-2 | download com nome original (`Content-Disposition`) | ❌ reprova                    |
| DOC-3 | documento de aditivo acessível                     | ❌ reprova                    |
| DOC-4 | ownership: documento de outro contrato → 404/403   | ❌ reprova                    |
| DOC-5 | exige `contract:read` → 403                        | ❌ reprova                    |
| DOC-6 | sem sessão → 401                                   | ❌ reprova                    |

**Fechamento:** estes cenários entram na coleção unificada (US3, módulo contracts). Quando a US4 rodar,
reprovam até os tickets CTR-HTTP-DISTRATO-DOCUMENTO e CTR-HTTP-DOCUMENT-CONTENT serem implementados.

## Achados de front já resolvidos (registro, sem ação de backend)

Do handoff: bug do `Content-Type` duplicado (415) em aditivos; sinal define kind (Addition/Suppression);
datas em UTC (off-by-one); grid enriquece `children`/`currentPeriod`. Sem teste de backend (são do front).

## Pendências de backend SEM ticket ainda (alinhamento P.O./tech lead)

- `signedAt` por aditivo (`ctr_amendments` não persiste data de assinatura).
- Subtipo de aditivo (escopo/outro/distrato colapsam em `Misc`).
- Metadados do contrato (programa, categoria, centro de custo, plano orçamentário, classificação CT/OS).
- Ações do grid (Excluir contrato Pendente; Histórico Financeiro; Termo de Quitação).

## Nota T014 — cobertura na coleção unificada

- z-pending-fixes/ com **17 expected-fail** (catalog 5 + distrato 6 + document-content 6).
- **DIST-3** (documento signed_termination vinculado no detalhe) e **DOC-3** (documento de aditivo)
  agora **INCLUÍDOS** na bateria `.bru` (`06-dist-3-documento-vinculado.bru`, `06-doc-3-conteudo-aditivo.bru`).
  DOC-3 traz nota de setup: idealmente usa documentId de aditivo homologado; sem o setup de aditivo
  dedicado, reusa o doc do contrato (a rota inexistente reprova igual — valida o gap). Completar o
  setup de aditivo quando o fix CTR-HTTP-DOCUMENT-CONTENT for implementado.
- **Cobertura pending-backend: 12/12 na rede == 12/12 na bateria executável.**
