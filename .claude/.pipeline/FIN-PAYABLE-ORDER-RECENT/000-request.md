# FIN-PAYABLE-ORDER-RECENT — escopo (#263)

> Size **M**. No grid de Contas a Pagar, o título recém-lançado deve aparecer **no topo da pág. 1**.
> Hoje `GET /financial/payable-titles` ordena por `dueDate asc` e não aceita ordenação. Como a lista é
> paginada server-side, o front não reordena globalmente. **Decisão da P.O.: trocar o default para
> `createdAt desc`** (mais recente primeiro), sem parâmetro `sort`.

## Situação
- `payable-list-view.drizzle.ts` — `orderBy(asc(finPayables.dueDate), asc(finPayables.id))`.
- `payable-list-view.in-memory.ts` — ordena por `dueDate` asc, desempate `payableId`.
- `finPayables` tem `createdAt` (datetime(3)) — títulos são criados junto do documento (mesmo lançamento).

## Escopo (in)
1. **Drizzle**: `orderBy(desc(finPayables.createdAt), desc(finPayables.id))` — mais recente no topo.
2. **In-memory**: ordenar por ordem de inserção **decrescente** (mais recente primeiro), preservando pai
   antes dos filhos dentro do mesmo documento — paridade com o `createdAt desc` do Drizzle (o modelo
   in-memory não guarda `createdAt`; a ordem de inserção do `source()` é o proxy fiel).
3. **Atualizar testes** que assumiam `dueDate asc` no payable-titles para a nova spec (não é enfraquecer —
   é a mudança intencional de default).

## Fora de escopo (decisão da P.O.)
- Parâmetro `sort` — a P.O. escolheu só o default `createdAt desc`. Se surgir necessidade de "por
  vencimento", reabrir com o `sort` opt-in.
- Expor `createdAt` no DTO de resposta — a ordenação é server-side, não precisa vazar o campo.

## Critérios de aceite
- **CA1** `GET /payable-titles` (pág. 1) → o título do documento **mais recente** vem no topo, mesmo que
  seu vencimento não seja o mais próximo.
- **CA2** Paridade in-memory ↔ Drizzle na ordem (mais recente primeiro).
- **CA3** Regressão zero: `pnpm test` verde (testes de ordem atualizados para a nova spec).

## Pipeline
| Wave | Skill/agente | Atividade |
| :-- | :-- | :-- |
| W0 | `tdd-strategist` | RED — pág. 1 traz o lançamento mais recente no topo |
| W1 | `drizzle-orm-expert` | orderBy createdAt desc (Drizzle) + inserção desc (in-memory) |
| W2 | `code-reviewer` | audit — paridade de ordem, testes atualizados |
| W3 | `ts-quality-checker` | gate |
