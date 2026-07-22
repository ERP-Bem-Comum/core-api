# W1 — Implementação (GREEN) · BGP-UPDATED-BY-AUDIT (#373)

**Agentes:** drizzle-orm-expert (fase A: schema+migration) + fastify-server-expert (fase B: trilha do ator) + typescript-language-expert (limpeza de tipos/lint dos testes).

## Camadas
- **Schema+migration** (`schemas/mysql.ts` + `migrations/mysql/0005_neat_jack_power.sql`): coluna `updated_by varchar(36) NULL COLLATE utf8mb4_bin` (ADD COLUMN = INSTANT no 8.4). Journal/snapshot atualizados.
- **Domínio** (`types.ts` + `budget-plan.ts`): `updatedByRef: UserRef | null` no agregado; as 6 factories setam junto do `updatedAt`. `startCalibration`/`createScenery` agrupam `now`+`actor` num `audit: {now, actor}` (respeita max-params 4).
- **Mapper** (`budget-plan.mapper.ts`): persist (`updatedBy`) + hydrate (`UserRef.rehydrate`, nullable, erro `budget-plan-mapper-invalid-updated-by`).
- **Application** (6 use cases + clone): Command += `updatedByRef: string`; valida `UserRef.rehydrate`; passa `actor` ao domínio.
- **Borda** (`plugin.ts`, 6 handlers): `updatedByRef: req.userId`.
- **Projeção** (D6): item de lista, detalhe e filhos expõem `updatedByRef: z.uuid().nullable()`.
- **Testes existentes** (~15 arquivos) atualizados para a nova aridade (actor/updatedByRef).

## Gate
```
typecheck: 0 · format: limpo · lint: 0
E2E updated-by-audit: 4/4 · suíte do módulo: 220/220 (0 fail)
```

## Nota de processo
W1 exigiu 4 iterações de agente — mudar a assinatura de 6 factories rebate em use cases, handlers, mapper e ~15 testes. A fase B (fastify-server-expert) ficou incompleta (projeção DTO + testes de aridade); corrigida na sessão principal via typescript-language-expert. Lição: para mudança de assinatura transversal, o teste de aridade dos call-sites existentes é parte do W1, não opcional.

GREEN. Próximo: W2 (review) + W3 (gate + migration validada no x99, CA5).
