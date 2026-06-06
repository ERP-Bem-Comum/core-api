# Code Review — Ticket CONTRACTS-DETAIL-COMPOSITION-HTTP — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer
**Data:** 2026-06-06T23:10Z
**Escopo revisado:**

- `src/modules/contracts/adapters/http/contractor-composition.ts` (NOVO)
- `src/modules/contracts/adapters/http/{composition,contract-dto,schemas,plugin}.ts`
- testes (`contractor-composition.test.ts`, `contract-detail-composition.http.test.ts`, `contract-detail-dto.test.ts`)

---

## Issues encontradas

Nenhuma 🔴 / 🟡.

### 🔵 Sugestão

- A composição é provada em memory (port fake) + o wiring mysql é confirmado pela suíte de integração existente (88/0). Um teste de integração cross-módulo **dedicado** (contracts lendo `par_*` real via `buildPartnersReadPort` no mesmo MySQL) agregaria confiança fim-a-fim — candidato a ticket de e2e (Bruno). Sem bloqueio.

## Verificações-chave

- **ADR-0032 (rota gorda transitória)** — composição vive **só** em `adapters/http/contractor-composition.ts`; o núcleo (`domain`/`application` de contracts) permanece intocado. Headers `Deprecation: true` + `Sunset` setados no handler. ✓
- **ADR-0006/0014 (cross-BC)** — leitura do contratado **só** via `partners/public-api` (`ContractorReadPort`/`buildPartnersReadPort`); zero import de `partners/domain|application`; nunca SELECT em `par_*` direto (o adapter de partners é quem lê). ✓
- **FR-006 (degradação graciosa / anti-oráculo)** — `composeContractor` colapsa not-found, erro de IO e timeout no MESMO `snapshot: null`, sem campo distinguindo o motivo. `withTimeout` (2s default) limita o bloqueio; `clearTimeout` no `finally` evita timer pendente. ✓
- **Tipagem** — `ContractorRefLike { type, id: string }` aceita o `contractor` do agregado (ContractorId é assignable a string) sem cast inseguro. `viewToSnapshot` discrimina supplier (com bankAccount/pixKey) vs demais. Schema Zod do detalhe espelha o snapshot (nullable). ✓
- **Injeção p/ testabilidade** — `contractorReadPort?` na config permite memory (fake) testar a rota gorda; mysql constrói o port real e o fecha no shutdown (sem vazar pool). ✓
- **List-item intocado** — `contractFullDetailSchema` ganhou contractor+metadados; `contractListItemSchema` (POST/list) inalterado. ✓
- **Prova de verde** — unit 5/5, http route 2/2, default 2241/0, lint/typecheck/format limpos, integração 88/0.

## O que está bom

- Separação limpa: composição isolada num módulo de borda descartável (alinhado ao "caminho de saída" do ADR-0032 — quando o BFF v2 assumir, remove-se `contractor-composition.ts` + a chamada no handler).
- Degradação e timeout tratados com cuidado de segurança (anti-oráculo) e de recursos (clearTimeout).

## Próximo passo

- **APPROVED:** segue para W3.
