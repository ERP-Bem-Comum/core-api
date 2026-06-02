# Code Review — Ticket CONTRACTS-HTTP-END — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer
**Data:** 2026-06-02
**Escopo revisado:**
- `src/modules/contracts/adapters/http/schemas.ts` (diff)
- `src/modules/contracts/adapters/http/composition.ts` (diff)
- `src/modules/contracts/adapters/http/plugin.ts` (diff)
- `tests/modules/contracts/adapters/http/contracts-end.routes.test.ts` (novo)

---

## Issues encontradas

Nenhuma 🔴 crítica · nenhuma 🟡 importante.

### 🔵 Sugestão

- Nenhuma ação requerida. A rota `/contracts/:id/end` foi posicionada entre `/activate` e
  `/amendments`; como são paths estáticos distintos, não há ambiguidade de roteamento (find-my-way).

---

## Verificação por categoria

- **D (Ports & Adapters):** `endContract` instanciado como factory `(deps) => (cmd) => Promise<Result>`,
  com `contractRepo: pools.contractWriterRepo` (mutação → **writer pool**, ADR-0026) e `clock` injetado
  (sem `new Date()`). Handler invoca o use case, mapeia erro via `sendDomainError` e serializa via
  `contractToListItem` com `{ ok: 200 }` — idêntico ao padrão de `/activate`/`/homologate`. ✓
- **F (ESM/NodeNext):** import relativo com extensão `.ts`; `endContract` importado como **valor**
  (usado em runtime no `makeDeps`), portanto sem `import type`; `ReturnType<typeof endContract>` em
  posição de tipo. ✓
- **G (idioma):** identificadores EN (`endContract`, `kind`, `Expire`, `Terminate`); enum do body é o
  literal do domínio. Comentário em PT, coerente com os comentários vizinhos do arquivo. ✓
- **Mapeamento erro→HTTP:** reusa `CONFLICT_CODES` (`ContractNotActive`→409), `NOT_FOUND_CODES`
  (`contract-not-found`→404), `REPO_UNAVAILABLE_CODES`→503 e o default 422 (`ContractCannotExpireYet`).
  Nenhum code novo precisou ser adicionado aos Sets — consistência preservada. ✓
- **Evento de domínio:** `result.value.event` é descartado na borda (publish via EventBus é futuro),
  exatamente como nas demais rotas write atuais. Sem inconsistência. ✓
- **H (testes):** `app.inject` (memory, sem Docker), UUIDs v4 válidos, fakes via seed in-memory, clock
  real coberto seedando contrato com data fim no passado (Expire feliz) e no futuro (Expire prematuro).
  Asserções claras de status HTTP + `status` do agregado. CA4 (404 por coincidência no RED) documentado
  e permanece correto pós-impl. ✓

---

## O que está bom

- Implementação genuinamente mínima (YAGNI): 3 edições pequenas reusando 100% da infra de erro,
  serialização e auth já existente. Zero duplicação.
- Escolha correta do writer pool para a mutação (read-after-write na resposta).
- Cobertura E2E completa de authz (401/403), happy paths (Terminate/Expire), validação Zod (400),
  not-found (404), conflito de estado (409), invariante semântica (422) e regressão OpenAPI.

---

## Próximo passo

- **APPROVED:** pipeline-maestro avança para W3 (gate de qualidade).
