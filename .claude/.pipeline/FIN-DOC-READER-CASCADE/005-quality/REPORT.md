# W3 — GREEN — FIN-DOC-READER-CASCADE

Gate final (skill `ts-quality-checker`). 4 gates no **projeto inteiro** (regressão zero).

## Gates (saída literal)

```
1/4 pnpm run typecheck    → exit 0
2/4 pnpm run format:check → All matched files use Prettier code style!
3/4 pnpm run lint         → 0 errors, 0 warnings
4/4 pnpm test             → tests 3619 · pass 3601 · fail 0 · skipped 18 (integração MySQL gateada)
```

Delta vs FIN-DOC-READER-NATIVE (3614): **+5 testes** (integração ponta-a-ponta dos 3 readers reais).

## Resultado

**Todos os 4 gates verdes.** `createDocumentReader` compõe a cascata nativo-first (XML → PDF nativo → scanned) com os readers reais; integração comprovada (precedência por `resolvedVia`, escaneado, erro de recurso propagado, XXE sem vazamento).

## 🏁 Motor de leitura de documento fiscal (feature 034) — COMPLETO

| Fatia | Ticket | Size | Entrega |
| :-- | :-- | :-: | :-- |
| 1 | FIN-DOC-READER-PORT | S | port + result minimizado + errors + mock + cascade skeleton |
| 3 | FIN-DOC-READER-XML | M | NFS-e Nacional + NF-e (fast-xml-parser) + anti-XXE |
| 2 | FIN-DOC-READER-NATIVE | L | parser PDF in-house (WinAnsi + Identity-H) + hardening anti-DoS |
| 4 | FIN-DOC-READER-CASCADE | S | composição + integração ponta-a-ponta |

Pronto para a **fatia 2 de feature**: borda HTTP de ingestão + storage do PDF-fonte + wiring ao agregado `Document` (pré-preenche o rascunho; humano confirma — #62 CA4).
