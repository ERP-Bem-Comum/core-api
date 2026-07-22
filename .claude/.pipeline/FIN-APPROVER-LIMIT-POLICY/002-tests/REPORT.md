# W0 — Testes (RED) · FIN-APPROVER-LIMIT-POLICY

**Skill:** tdd-strategist (+ test-pyramid-engineer para a decisão de camada)
**Data:** 2026-06-30T20:32Z
**Estado:** **RED** (prova que a API do POLICY ainda não existe).

## Arquivos criados (W0)

1. `tests/modules/financial/domain/document/approval-policy.test.ts` — **domínio puro**, tabela-verdade de `checkApprover` (CA1–CA5).
2. `tests/modules/financial/application/use-cases/save-document-approver-limit.test.ts` — **use-case** (driver memory, fake `approverAuthorityReader`), CA6 + CA8.

## Casos (mapeados ao 000-request)

### Domínio — `checkApprover(netValue: Money, authority: ApproverAuthority | null)`
- **CA1** `authority === null` → `err('approver-not-found')`
- **CA2** `canApprove === false` → `err('approver-missing-permission')`
- **CA3** `canApprove && limit === null` → `err('approver-limit-exceeded')` (FR-008 fail-closed)
- **CA4** `limit < netValue` → `err('approver-limit-exceeded')`
- **CA5** `limit === netValue` (fronteira) e `limit > netValue` → `ok`

### Use-case — `saveDocument` (líquido do `nfseCommand` = 77500)
- **CA6** alçada 50000 < 77500 → recusa (`approver-limit-exceeded`), outbox vazio
- **CA6** alçada 100000 ≥ 77500 → cria o documento
- **CA8** sem `approverRef` → não valida alçada (reader bloqueante ignorado)

## Evidência RED

```
✖ tests/modules/financial/domain/document/approval-policy.test.ts  ('test failed' — load error: approval-policy.ts inexistente)
✖ CA6: aprovador com alçada < líquido (50000 < 77500) → recusa  (AssertionError: false !== true)
ℹ tests 4 · pass 2 · fail 2
```

- **Domínio:** o arquivo não carrega — `import { checkApprover } from '.../approval-policy.ts'` aponta para módulo inexistente (mesmo padrão idiomático do projeto, cf. `net-value.test.ts:7-8`). Os 6 casos CA1–CA5 ficam RED por inexistência da API.
- **Use-case CA6 (alçada insuficiente):** RED por assertion — `saveDocument` ainda **não** consulta `approverAuthorityReader` nem aplica `checkApprover`, então cria o documento em vez de recusar. Os `import type` (`ApproverAuthority`, `ApproverAuthorityReader`) são apagados pelo strip-types, por isso o arquivo carrega e o RED é por assertion (o nível correto).
- **CA6 (alçada suficiente) e CA8** passam trivialmente nesta fase (sem validação, o documento é criado) — passam a ter significado pleno no W1 GREEN.

## Decisão de camada (test-pyramid-engineer)

- **Domínio puro** (`approval-policy.test.ts`): a tabela-verdade de `checkApprover` é a unidade canônica — rápida, sem I/O, cobre CA1–CA5 exaustivamente.
- **Application/use-case** (`save-document-approver-limit.test.ts`): valida a costura (resolver `approverRef` → `reader.get` → `checkApprover`) com fake injetado — driver memory, sem MySQL.
- **Borda HTTP / mapeamento 4xx PT (CA9) e submit Draft→Open (CA7) ADIADOS para o W1:** o teste de rota memory (`financial-documents.http.test.ts`) e o gate no `submit-draft.ts` entram junto da implementação do `error-mapping`. Justificativa: o use-case test já cobre a regra (CA6/CA8) no nível mais barato; o teste de borda valida só o status/mensagem (responsabilidade do `error-mapping`), e o de submit espelha a mesma costura no `submit-draft`. Evita duplicação de cobertura da regra entre camadas no W0.

## API alvo (a criar no W1)

- `src/modules/financial/domain/document/approval-policy.ts`: `type ApproverAuthority { userId, canApprove, limit: Money | null }`, `type ApprovalError = 'approver-not-found' | 'approver-missing-permission' | 'approver-limit-exceeded'`, `checkApprover` (puro). (`escalate`/`no-approver-with-sufficient-limit` = ticket CASCADE.)
- `src/modules/financial/application/ports/approver-authority-reader.ts`: `type ApproverAuthorityReader { get(userId), list() }` + `ApproverAuthorityReadError = 'approver-authority-unavailable'`.
- Integração em `save-document.ts` (após resolver `approverRef`/`netValue`) + `submit-draft.ts` + adapter do reader na `composition.ts` + entrada PT em `error-mapping.ts`.
