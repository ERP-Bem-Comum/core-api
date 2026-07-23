# W2 — code review (self, read-only) — FIN-PAYABLE-ORDER-RECENT (#263)

**Veredito: APPROVED.**

- **Drizzle**: `orderBy(desc(finPayables.createdAt), desc(finPayables.id))` — lançamento mais recente no
  topo, desempate estável por id desc. `createdAt` é coluna real de `fin_payables` (criada junto do
  documento). ADR-0020: `ORDER BY` permitido.
- **In-memory**: `for (const stored of [...source()].reverse())` — ordem de inserção decrescente, proxy
  fiel do `createdAt desc` (o modelo em memória não guarda createdAt; `source()` já vem em ordem de
  inserção). Pai antes dos filhos preservado dentro do documento.
- **Paridade**: ambos entregam "mais recente primeiro" (CA2). O W0 semeia vencimentos fora da ordem de
  criação para provar que a ordenação é por criação, não por vencimento.
- **Regressão**: nenhum teste assere a ordem antiga posicionalmente — o gated `payable-list-view.drizzle-mysql`
  usa `.find(kind==='Parent')` (posicional-independente). `pnpm test` verde sem edição de teste existente.
- **Decisão da P.O.**: default puro (sem `sort`). `createdAt` não vaza no DTO (ordenação server-side).

Sem Blocker/Major/Minor. 1 round.
