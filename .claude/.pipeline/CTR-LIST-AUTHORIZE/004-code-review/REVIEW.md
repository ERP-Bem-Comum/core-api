# W2 — Code Review (read-only) · CTR-LIST-AUTHORIZE (#202)

**Wave**: W2 · **Round**: 1 · **Veredito**: **APPROVED** · **Data**: 2026-06-22

## Escopo revisado

```
src/modules/contracts/adapters/http/plugin.ts                          (+1/-1)  produção
tests/modules/contracts/adapters/http/contracts-list-authorize.routes.test.ts  (novo) teste
tests/modules/contracts/adapters/http/contracts-list.routes.test.ts    (~)      teste corrigido
tests/modules/contracts/adapters/http/contracts-reads.routes.test.ts   (~)      teste corrigido
```

## Checklist

| Critério | Veredito | Nota |
|---|---|---|
| Paridade com rotas-irmãs | ✅ | `[hooks.requireAuth, hooks.authorize(CONTRACT_PERMISSION.read)]` — idêntico a `/:id` (`:250`), `/:id/history` (`:351`), `/export.csv` (`:224`). |
| ADR-0006 (cross-módulo) | ✅ | `authorize` vem da public-api do auth, já injetado no plugin (`server.ts`). Nenhum acoplamento novo; sem import de `domain/`/`application/`. |
| Sem mudança de contrato de resposta | ✅ | `schema.querystring`/`response` inalterados; só o `preHandler`. |
| FR-006 (teste exercita authorize REAL) | ✅ | Novo teste usa `buildAuthHttpDeps` + seed RBAC + caso negado (403 sem `contract:read`). |
| Idioma por camada | ✅ | Código EN; comentários PT. |
| Domínio puro | ✅ N/A | Mudança só na borda (adapter HTTP). |

## Achados

### Blocker: nenhum · Major: nenhum

### Minor (1) — observação, sem ação obrigatória

- **M1 — sobreposição de cobertura**: o novo `contracts-list-authorize.routes.test.ts` e o CA5 corrigido em `contracts-reads.routes.test.ts` ambos verificam 403-sem/200-com na listagem. Redundância leve, mas **aceitável**: o arquivo novo é a cobertura dedicada do #202; o CA5 é o guard de regressão histórico da suíte de reads (que *codificava o bug* e foi invertido para o invariante correto — preservá-lo mantém o guard onde ele sempre viveu). Sem ação.

## Avaliação da correção dos 2 testes pré-existentes (ponto sensível)

Correta e necessária. Ambos afirmavam o comportamento **inseguro** (listagem aberta a qualquer autenticado — decisão antiga "enxuta", `plugin.ts:246`). O #202 reverte essa decisão; logo as asserções tinham de mudar:
- `contracts-list.routes.test.ts` CA2: passou a **semear `contract:read`** no caminho feliz (intenção original — validar shape paginado — preservada).
- `contracts-reads.routes.test.ts` CA5: **invertido** de "segue 200 com qualquer token" para "exige contract:read (403 sem, 200 com)".

Não houve enfraquecimento de teste para "passar o gate": a mudança alinha as asserções ao contrato seguro, com prova de verde na suíte HTTP inteira (193/193). Conforme política de regressão zero (consertar a causa + corrigir o gate que classificava errado).

## Conclusão

Correção mínima, consistente com o módulo, bem coberta com authorize real, e os testes que codificavam a vulnerabilidade foram corretamente realinhados. **APPROVED** para W3.
