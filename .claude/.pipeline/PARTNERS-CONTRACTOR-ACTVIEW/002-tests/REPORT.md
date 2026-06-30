# W0 (RED) — PARTNERS-CONTRACTOR-ACTVIEW

**Wave**: W0 · **Agente**: tdd-strategist · **Size**: S
**Feature**: `specs/002-contracts-http-gaps/` (ticket #3) · **Data**: 2026-06-06

## Escopo

Fechar a paridade 4/4 do contratado no módulo **partners** (FR-005): adicionar `ActView` + `actToView`
ao `contractor-view.mapper.ts` e `getActView` ao `ContractorReadPort` + adapter Drizzle. Independente do
módulo contracts.

## Testes escritos (RED)

- `tests/modules/partners/public-api/contractor-view.mapper.test.ts` (ESTENDIDO) — novo `describe('actToView')`:
  - `actToView(act, updatedAt)` → `ActView` com `type: 'act'`, id, name, email, document (cpf), role, occupationArea, updatedAt (espelha `CollaboratorView`).
  - `ActView` é membro da união `ContractorView` (narrowing por `type`).

> Cobertura do `getActView` (read port + adapter Drizzle) é integração MySQL (guarded) — entra no W1 junto
> da extensão da read-port integration test existente; o RED unitário acima já trava a ausência do mapper.

## Prova do RED

```
node --test tests/modules/partners/public-api/contractor-view.mapper.test.ts
ℹ tests 1 · pass 0 · fail 1
```

RED por inexistência: `import { actToView }` falha (named export inexistente em `contractor-view.mapper.ts`)
→ o arquivo não carrega. Não é erro de ambiente.

## Roteiro W1

1. `contractor-view.mapper.ts`: `ActView` (type 'act' + campos do Collaborator) + `actToView`; `ContractorView` 3→4.
2. `application/ports/contractor-read.ts`: `getActView`.
3. `adapters/persistence/repos/contractor-read.drizzle.ts`: implementar `getActView` (SELECT `parActs` + `actFromRow` + `actToView`).
4. `public-api/read.ts`/`refs.ts`: reexportar `ActView` se aplicável.
