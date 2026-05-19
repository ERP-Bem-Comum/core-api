# W3 — QUALITY Report — CTR-DB-SCHEMA-MYSQL-CTR-PREFIX

**Skill:** `ts-quality-checker` (gate final do pipeline)
**Data:** 2026-05-15
**Veredito final:** ✅ **ALL GREEN**

---

## Gates de qualidade

| # | Gate | Comando | Resultado |
| :- | :--- | :--- | :--- |
| 1 | Type check | `pnpm run typecheck` (= `tsc --noEmit`) | ✅ zero erros |
| 2 | Format check | `pnpm run format:check` (= `prettier --check .`) | ✅ "All matched files use Prettier code style!" |
| 3 | Lint | `pnpm run lint` (= `eslint .`) | ✅ zero erros |
| 4 | Tests | `pnpm test` (= `node --test --experimental-strip-types --no-warnings 'tests/**/*.test.ts'`) | ✅ **422/422 pass** (zero fail, zero skipped) |

---

## Suite completa — saída

```
ℹ tests 422
ℹ suites 134
ℹ pass  422
ℹ fail  0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 47913
```

### Distribuição

- **Suite anterior intacta:** 408 testes (módulos contracts/domain, contracts/application, contracts/adapters, contracts/cli, infra MySQL Compose) — zero regressão
- **Suite nova deste ticket:** 14 testes em `tests/modules/contracts/adapters/persistence/schemas/mysql.test.ts` — todos verdes

---

## Polish aplicado durante o W3 (Suggestion #3 do W2)

`src/modules/contracts/adapters/persistence/schemas/mysql.ts:69-73` ganhou comentário documentando o trade-off de legibilidade do bicondicional:

```ts
// Trade-off de leitura (suggestion #3 do W2 review): a alternativa explícita
//   (status='Active' AND endedAt IS NULL)
//     OR (status IN ('Expired','Terminated') AND endedAt IS NOT NULL)
// é mais verbosa mas equivalente. Mantemos `=` por ser compacto e
// MySQL-idiomático (= entre booleans = bicondicional).
```

Fecha o loose-end apontado pelo reviewer e documenta a decisão para leitores futuros.

---

## Fechamento dos findings do W2

| Sugestão W2 | Status W3 |
| :--- | :--- |
| 🔵 **S-1** CA-6/CA-7 só checam existência por nome (não a expressão SQL) | 🔄 **Deferido para `CTR-DB-MIGRATION-MYSQL` (#3)** — quando a migration real for gerada e aplicada contra MySQL ao vivo, validamos o SQL emitido pelo Drizzle (behavioral genuíno, supersede a sugestão) |
| 🔵 **S-2** `mysql.ts:54` cita ADR-0018 (autoridade superseded) | 🔄 **Deferido para `CTR-DOCS-UPDATE-FOR-ADR-0020` (#8)** — varredura geral de refs a ADR-0018 já está no escopo desse ticket |
| 🔵 **S-3** Trade-off F-L1 não documentado (= vs CASE/OR) | ✅ **Aplicado neste W3** — comentário em `mysql.ts:69-73` |
| 🔵 **S-4** Falta CHECK `value_cents >= 0` em colunas monetárias | 🔄 **Ticket novo `CTR-DB-DOMAIN-INVARIANTS`** — defesa em profundidade adicional para invariantes monetários/estado, não estava no audit original |

---

## Conformidade

| Verificação | Status |
| :--- | :--- |
| 4 gates de qualidade (tsc, prettier, eslint, test) | ✅ Zero erros em todos |
| Suite antiga intacta (408 testes) | ✅ Zero regressão |
| Suite nova (14 CAs) | ✅ 14/14 |
| `package.json` intacto | ✅ Zero dep nova |
| ADR-0020 §"Convenção de nomenclatura" | ✅ aplicado (D1, D2) |
| ADR-0020 §"Lista normativa atualizada" | ✅ sem features proibidas |
| ADR-0018 §"Features proibidas" (zero ENUM/AUTO_INCREMENT/JSON/stored proc) | ✅ preservado |
| DB Audit findings F-H2, F-M2, F-L1, F-L2 | ✅ todos fechados |
| W2 review veredito | ✅ APPROVED com Suggestion #3 aplicada |

---

## Arquivos modificados no ticket

| Arquivo | Mudança |
| :--- | :--- |
| `src/modules/contracts/adapters/persistence/schemas/mysql.ts` | Refactor completo (rename + índices + CHECKs) + polish W3 do trade-off F-L1 |
| `tests/modules/contracts/adapters/persistence/schemas/mysql.test.ts` | Novo — 14 testes via `getTableConfig` |

**2 arquivos** modificados; **zero dep nova**; **zero arquivo deletado**.

---

## Próximo ticket

`CTR-DB-MIGRATION-MYSQL` (#3 da sequência ADR-0020):

- Configurar `drizzle.config.ts` apontando para MySQL (substituir ou paralelizar com o SQLite atual — decisão de design)
- Adicionar script `pnpm db:generate:mysql`
- Gerar primeira migration MySQL
- Validar SQL emitido (oportunidade de absorver a Suggestion #1 do W2 — behavioral genuine)
- Aplicar a migration contra MySQL do compose (smoke test E2E real)

Esse ticket destrava o ticket #4 (driver wired) e #5 (cleanup SQLite).
