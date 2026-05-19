# Estado do Ticket CTR-VO-MONEY

| Wave | Status | Skill | REPORT | Atualizado |
| :--- | :--- | :--- | :--- | :--- |
| W0 — RED | ✅ done | ts-domain-modeler | [002-tests/REPORT.md](./002-tests/REPORT.md) | 2026-05-14 |
| W1 — GREEN | ✅ done | ts-domain-modeler | [003-impl/REPORT.md](./003-impl/REPORT.md) | 2026-05-14 |
| W2 — REVIEW | ✅ done (APPROVED round 1) | code-reviewer | [004-code-review/REVIEW.md](./004-code-review/REVIEW.md) | 2026-05-14 |
| W3 — QUALITY | ✅ done (ALL GREEN) | ts-quality-checker | [005-quality/REPORT.md](./005-quality/REPORT.md) | 2026-05-14 |

## 🎉 Ticket FECHADO

Pipeline 4-wave completa em **1 rodada**, zero rounds de retrabalho.

### Artefatos de produção entregues

- `src/modules/contracts/domain/shared/money.ts` (32 linhas) — VO `Money` branded com smart constructor.
- `tests/modules/contracts/domain/shared/money.test.ts` (133 linhas) — 20 testes em 5 suítes.

### Commit sugerido

```
feat(contracts): adiciona VO Money com smart constructor

- branded type Money = Brand<{ readonly cents: number }, 'Money'>
- smart constructor fromCents valida inteiro >= 0
- operações: zero, add (puro), subtract (Result), equals, greaterThan
- 20 testes verdes (5 suítes, AAA)
- aderente CLAUDE.md raiz: zero throw/class/this/any, branded type, Result<T, E>
```

### Próximo ticket sugerido

- `CTR-VO-PERIOD` — VO `Period` com validação cronológica.
- `CTR-VO-IDS` — branded `ContractId`, `AmendmentId`, `DocumentId`.

## Mudanças estruturais introduzidas durante este ticket

- **Testes saíram de `src/` para `tests/`** (preferência do usuário, registrada em memória).
- **`package.json`** ganhou `"imports": { "#src/*": "./src/*" }` (Node subpath imports nativos).
- **`tsconfig.json`** perdeu `rootDir`, ganhou `tests/**/*` em `include`.
- **Regra invariante de idioma** declarada pelo usuário: código sempre EN (Clean Code), documentação sempre PT.
  - Ticket renomeado: `CTR-VO-MOEDA` → `CTR-VO-MONEY`.
  - Pastas: `src/modules/contratos/` → `src/modules/contracts/`, idem em `tests/`.
  - Aggregates: `contrato/` → `contract/`, `aditivo/` → `amendment/`.
  - Pasta de API pública: `contracts/contracts/` → `contracts/public-api/` (evita ambiguidade com nome do módulo).
- **`.claude/skills/ts-domain-modeler/SKILL.md`** atualizada (regra anterior "Tudo PT-BR no domínio" invertida).
- **`.claude/README.md`** atualizada com tabela visível da regra invariante.

## Notas

- `Money.cents` é sempre inteiro `>= 0`. Sinal de débito é responsabilidade do tipo de aditivo (`Suppression`), não do VO.
- `Money` não terá `multiply`/`divide` no MVP — só `add`, `subtract`, `equals`, `greaterThan`.
- `Money.zero()` é função (não constante) pra manter API uniforme.

## Pendência paralela (não bloqueia W1)

References longas em `.claude/skills/ts-domain-modeler/references/` (`ts-result-pattern.md`, `ts-smart-constructors.md`, `ts-branded-types.md`, `ts-discriminated-unions.md`, etc.) ainda têm exemplos com identificadores PT (`Moeda`, `Contrato`, `Aditivo`). Plano: migrar **em batch** quando o orquestrador chamar cada reference em waves futuras, ou em ticket dedicado `CHORE-CLAUDE-EN-MIGRATION` se preferir.
