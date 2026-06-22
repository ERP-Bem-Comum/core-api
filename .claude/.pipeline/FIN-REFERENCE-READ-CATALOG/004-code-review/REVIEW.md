# W2 — Code Review (read-only) · FIN-REFERENCE-READ-CATALOG (#200)

**Wave**: W2 · **Round**: 1 · **Veredito**: **APPROVED** · **Data**: 2026-06-22
**Revisor**: code-reviewer (read-only)

## Escopo revisado

```
src/modules/auth/domain/authorization/permission-catalog.ts            (+2)  produção
tests/modules/auth/domain/authorization/permission-catalog.test.ts     (+10) teste
tests/modules/financial/adapters/http/reference-read-rbac.real-authorize.http.test.ts (novo) teste
```

## Checklist

| Critério | Veredito | Nota |
|---|---|---|
| ADR-0006 (sem import cross-módulo em produção) | ✅ | Única mudança de produção: 1 entrada no `CATALOG_RAW` do próprio auth. Nenhum import de `domain/`/`application/` de outro módulo. |
| FR-008 (sem over-grant) | ✅ | Só a string no catálogo. Nenhum código de seed/grant de role de negócio. Admin recebe via `.all` (FR-002). |
| FR-006 (teste exercita `authorize` REAL) | ✅ Forte | Novo teste usa `buildAuthHttpDeps` + `makeAuthorize` real; semeia o ator com `adminDevPermissions` (= `PermissionCatalog.all`), **não** string crua — evita a armadilha do fake e do `Role.create` (sem validação ⊆ catálogo). |
| Domínio puro (`domain.md`) | ✅ | String literal adicionada a array `as const`; sem `throw`, sem `class`. |
| Idioma por camada | ✅ | Código EN (`'reference:read'`); comentários/mensagens PT. |
| Convenção de teste (`testing.md`) | ✅ | `tests/` (não co-locado), `node:test`, import via `#src/*`, driver `memory`. |
| Convenção do arquivo (em-dash/⊆ em prosa) | ✅ | A âncora `#200` espelha exatamente `#176`/`#138` (mesmo `—`); consistente. |

## Achados

### Blocker: nenhum
### Major: nenhum

### Minor (1) — cosmético, sem ação obrigatória

- **M1 — ordem de `reference:read` no `CATALOG_RAW`**: inserida entre `program:*` e `reconciliation:*`; alfabeticamente `reconciliation` (`reco`) precede `reference` (`refe`), então a posição estritamente alfabética seria após `reconciliation`. **Sem impacto funcional**: o teste de integridade ordena ambos os lados (`.sort()`). O arquivo **já não é estritamente alfabético** (`fiscal-document` precede `financier`), e agrupar `reference` adjacente a `reconciliation` (ambas do módulo financial) é defensável. **Decisão**: aceito sem ação — não justifica reabrir W1 por 2 linhas cosméticas; registrado para transparência.

## Observação (não-achado)

- O teste financeiro importa `adminDevPermissions` de `auth/adapters/http/dev-seed.ts`. Aceitável: é código de **teste** (ADR-0006 governa produção), e é a fonte fiel do conjunto que o admin recebe — reforça o vínculo com o catálogo (anti-regressão SC-004).

## Conclusão

Mudança mínima, correta e bem-coberta. O teste de integração com `authorize` real fecha o buraco de processo que originou o #200. **APPROVED** para W3.
