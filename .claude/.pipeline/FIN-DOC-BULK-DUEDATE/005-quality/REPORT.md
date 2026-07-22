# W3 — Gate de Qualidade (FIN-DOC-LIST-FILTERS #164 + FIN-DOC-BULK-DUEDATE #162)

**Skill:** ts-quality-checker · **Outcome:** GREEN

| Comando | Resultado |
| --- | --- |
| `pnpm run typecheck` | ✅ zero erros |
| `pnpm run format:check` | ✅ ok |
| `pnpm run lint` | ✅ zero (após corrigir 2 erros dos edits: switch-exhaustiveness → if/else no `toOutcome`; init-declarations → const ternário no sort in-memory) |
| `pnpm test` | ✅ **3753 pass / 0 fail** / 18 skipped / 3771 total |

## Validação real (x99 MySQL 8.4.10)
`document-repository.drizzle-mysql.test.ts` com `MYSQL_INTEGRATION=1`, túnel `-L 13306` → container `fin-ca4-mysql`.

Primeira execução no container reusado: 1 teste pré-existente falhou (`#163 janela de EMISSÃO`, `3 !== 1`) — **contaminação de dados** (docs acumulados por ~4h caindo na janela de emissão; o teste assere contagem absoluta). **Não é regressão** deste diff (não toca `issuedFrom/issuedTo` nem o `orderBy` default).

Após reset do DB `core` (autorizado pelo humano — `DROP/CREATE core`) → **re-run 20/20 GREEN em DB limpo**, incluindo:
- **#164 CA5** — netValue range + `sort=supplierName` + `inArray` (supplierRefs/types) + `sort=netValue desc`, sem duplicar count.
- **#162 CA5** — lote misto (version-conflict/ok/not-found) com optimistic lock real.
- **#167 CA4/CA3** + suíte de contrato inteira (inclui #163) — todos verdes.

## Lição
Container x99 reusado acumula dados → testes de contrato com contagem absoluta quebram. Resetar `core` antes de rodar a suíte de contrato completa no x99.

## Conclusão
Gate verde + x99 verde em DB limpo. Painel W2 (4 revisores) APPROVED. Pronto para commit + PR único (`dev`).
