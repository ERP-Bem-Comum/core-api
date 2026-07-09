# W3 — Gate de Qualidade (FIN-DOC-SEARCH)

**Skill:** ts-quality-checker · **Outcome:** GREEN

| Comando | Resultado |
| --- | --- |
| `pnpm run typecheck` | ✅ zero erros |
| `pnpm run format:check` | ✅ "All matched files use Prettier code style!" |
| `pnpm run lint` | ✅ zero warnings/errors |
| `pnpm test` | ✅ **3743 pass / 0 fail** / 18 skipped / 3761 total (~83s) |

## Validação real (CA4 + CA3-x99) — ✅ x99 MySQL 8.4.10
`document-repository.drizzle-mysql.test.ts` (bloco #167) rodado com `MYSQL_INTEGRATION=1` contra MySQL
**8.4.10 real** no x99 (container `fin-ca4-mysql` reusado, túnel `-L 13306`). **2/2 pass**:
- **CA4** — `q` casa por **nome do fornecedor**, **CNPJ** e **documentNumber**; LEFT JOIN não duplica (`mine.length === 1`).
- **CA3-x99** — `%` no termo é **literal** (escapado): `q='50%'` casa o literal; `q='%'` não vira coringa.

## Hardening do W2 aplicado
- Guard de caracteres de controle no `q` (`.regex(/^[^\x00-\x1F\x7F]*$/)`), espelhando `paymentDetailInput`.
- 000-request corrigido (payable-list-view → document-repository).
- Caso x99 de wildcard literal adicionado.

## Conclusão
Gate W3 verde + CA4/CA3 validados em MySQL real. Painel W2 (3 revisores) APPROVED. Pronto para commit + PR para `dev`. Fecha #167.
