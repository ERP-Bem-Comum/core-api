# Code Review — Ticket PAR-GRID-CONTRACT-COUNT — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer
**Data:** 2026-06-17T12:10Z
**Escopo revisado:** diff completo vs `dev` (16 arquivos `src/` + teste W0):
port `contract-count-store.ts`, adapters InMemory/Drizzle do store, `composition.ts`,
4 schemas (`schemas.ts`/`supplier-`/`financier-`/`act-schemas.ts`), 4 DTOs, 4 plugins,
`grids-contract-count.routes.test.ts`.

---

## Verificação objetiva (evidência, não memória)

| Checagem | Resultado |
| :--- | :--- |
| ADR-0006 — import de `modules/contracts` no diff do partners | **NENHUM** (`grep` no diff) |
| `pnpm run lint` (ESLint strict + type-checked) | **verde** |
| `pnpm run typecheck` (tsc --noEmit) | **verde** |
| `throw` / `: any` / `class` / `console.` / TODO novos no diff | **NENHUM** |
| Teste roda em `pnpm test` puro (driver memory, sem MySQL) | **sim** (não é integration mal-gateado) |

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

Nenhuma.

### 🟡 Importante (não-bloqueia)

Nenhuma.

### 🔵 Sugestão (estilo / clareza — registrar, não corrigir agora)

#### Sugestão 1 — Assimetria DTO lista vs. detalhe

`*ListItemSchema` (grid) tem `contractCount`; `*DetailSchema` (`GET /:id`) não. É **decisão consciente
de escopo** (CAs da #105 são sobre grids; detalhe fora). Registrada no `003-impl/REPORT.md`. Se um
consumidor do detalhe vier a precisar da contagem, abrir issue própria — não alargar escopo aqui (ADR-0040).

#### Sugestão 2 — Cobertura CA3 dedicada só em collaborators

`grids-contract-count.routes.test.ts` tem teste CA3 explícito (read-model only, `activeCount=7`) apenas
no grid de colaboradores; nos outros 3 a garantia é implícita (o valor exibido só pode vir do seed do
read-model, pois nenhum módulo `contracts` é montado). Aceitável — a arquitetura (composição sem
`contracts`) é a mesma para os 4 grids. Não justifica round adicional.

---

## O que está bom

- **Anti-N+1 correto:** `getCounts(refs)` batch (`WHERE contractor_ref IN (...)`, 1 query) enriquecendo
  **só a página** (≤ pageSize) nos 4 handlers — não itera `getCount` por linha. ADR-0020 (IN permitido).
- **ADR-0006 respeitado:** contagem vem exclusivamente do read-model `par_contract_count_view` do próprio
  `partners`; zero acoplamento a `contracts`.
- **Ports & Adapters limpo:** port é `type Readonly<{...}>`; dois adapters (InMemory com `seed` + Drizzle
  com `try/catch → Result` via `safe()`); `getCounts` exposto como função em `PartnersHttpDeps`.
- **Escopo cirúrgico (YAGNI):** `.extend()` no item de grid evitou tocar o detalhe e os 4 handlers de
  `GET /:id` — sem regressão (215/215 na suíte partners HTTP).
- **Idioma por camada:** identificadores EN (`getCounts`, `contractCount`, `contractorRef`), comentários PT,
  erro interno `'contract-count-store-unavailable'` (EN kebab-case) → 503 nos 4 grids.
- **Compat preservada:** `makeInMemoryContractCountStore(seed = [])` não quebra o worker de projeção (US6b).

---

---

# Round 2 — sugestões aplicadas (a pedido)

**Veredito:** APPROVED · **Data:** 2026-06-17T12:25Z

As 2 sugestões 🔵 do round 1 foram implementadas (TDD: testes RED antes do código).

### Sugestão 1 — assimetria DTO lista vs. detalhe → **resolvida**

`contractCount` foi promovido ao **`*DetailSchema` canônico** dos 4 grids; lista e detalhe voltam a
compartilhar o mesmo DTO (restaura a simetria original que o W1 havia quebrado). Removidos os
`*ListItemSchema`/`*ToListItemDto` (4+4); `*ToDetailDto(record, contractCount)` passou a receber a
contagem. `GET /:id` dos 4 grids agora resolve a contagem via `getContractCounts([ref])` → `0` se ausente.

### Sugestão 2 — cobertura CA3 → **resolvida**

`grids-contract-count.routes.test.ts` ganhou CA3 dedicado nos 4 grids + teste de detalhe (`GET /:id`)
nos 4 grids. Total: **12 testes** (era 5).

### Re-verificação (evidência)

```
grids-contract-count.routes.test.ts → tests 12 · pass 12 · fail 0
suíte partners HTTP completa          → tests 222 · pass 222 · fail 0  (sem regressão)
pnpm run typecheck / lint / format:check → todos verdes
```

### Nova observação 🔵 (não-bloqueante)

O **grid agregado** `GET /api/v1/partners` (`PartnerListItem`: `type/id/name/document/active`,
`partner-aggregate-query.ts`) também é um grid de contraparte e **não** exibe `contractCount` — está
**fora do escopo travado** (decisão de produto: 4 grids individuais). Se o agregado precisar da coluna,
abrir issue própria (ADR-0040, sem scope-creep). Cada item já carrega `id` → viável no mesmo molde.

---

## Próximo passo

- **APPROVED (round 2)** → pipeline-maestro avança para **W3** (gate `typecheck` + `format:check` + `lint` + `test`).
