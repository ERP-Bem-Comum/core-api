# CTR-PIPELINE-SUPERSEDE-STATUS — status `superseded` + comando `supersede` no pipeline tooling

## Origem

Descoberto em 2026-05-27 ao encerrar `CTR-INFRA-READONLY-BI-GRANT`, duplicata já resolvida por
`CTR-INFRA-READONLY-BI-AUTH`. O tooling de pipeline **não modela** o caso "ticket descartado por
ter sido superado/duplicado por outro". Tive de:

1. Editar `STATE.json` à mão (o `state-cli` não fecha ticket sem as 4 waves `done`, nem seta
   status não-green).
2. Reusar `closed-rejected` como terminal — semântica errada (não houve review reprovando), só
   o menos pior dos status existentes.

## Problema

`scripts/pipeline/state-schema.ts` define:

```ts
export type TicketStatus = 'open' | 'in-progress' | 'closed-green' | 'closed-rejected' | 'blocked';
```

Não há `superseded`. Pior: se alguém gravar um status fora do enum, `scripts/pipeline/dashboard.ts`
(`summarize`) joga qualquer status desconhecido no `else → blocked++` — reportando um ticket
superado como **blocked**, o que é enganoso. `scripts/pipeline/metrics.ts` (`byStatusOf`) usa
`switch` **sem default**, então o status some silenciosamente das contagens (total ≠ soma).

E o `state-cli` só tem caminho de fechamento via `close`, que exige todas as 4 waves `done`.

## Critérios de aceitação

- **CA1:** `TicketStatus` em `state-schema.ts` passa a incluir `'superseded'`. Campo opcional
  `supersededBy?: string` (ticket que substitui) no `PipelineState`, com guard de validação.
- **CA2:** `pnpm run pipeline:state supersede <ticket> --by <outro-ticket>` seta
  `status: 'superseded'`, `closedAt`, `supersededBy`, `lastEvent: 'superseded-by-<outro>'`, sem
  exigir waves `done`. Erro claro se `<outro-ticket>` não existir ou se o alvo já for terminal.
- **CA3:** `dashboard.ts` trata `superseded` como terminal **fora** de open/closed/blocked — não
  cai mais no `else → blocked`. Some de `--filter open`; aparece em `--filter all`. Decidir no W1
  se entra em `--filter closed` (provável sim, como "encerrado").
- **CA4:** `metrics.ts` conta `superseded` em linha própria na tabela Status; total volta a bater
  com a soma das linhas. `superseded` **não** entra na base da taxa de rejection por W2-rounds.
- **CA5:** `render-state-md.ts` rotula `superseded` no header do `STATE.md` (com `supersededBy`).
- **CA6:** Migração do legado: `CTR-INFRA-READONLY-BI-GRANT` reclassificado de `closed-rejected`
  para `superseded` via o novo comando, e o `closed-rejected: 1` das métricas volta a `0`.
- **CA7:** W0 RED cobre schema, cli, dashboard e metrics. Testes em `tests/pipeline/*.test.ts`
  (suites já existentes: `state-schema`, `state-cli`, `dashboard`, `metrics`, `render-state-md`).

## Fora de escopo

- Status `duplicate` separado de `superseded` — `supersededBy` já carrega a relação; um único
  status terminal basta (YAGNI).
- UI/relatório novo além das tabelas já existentes de dashboard e metrics.
- Reabrir ticket superseded (caminho inverso) — abrir ticket próprio se surgir necessidade.

## Notas

- Arquivos prováveis: `scripts/pipeline/state-schema.ts`, `state-cli.ts`, `dashboard.ts`,
  `metrics.ts`, `render-state-md.ts` (+ seus testes em `tests/pipeline/`).
- `schemaVersion` segue `1` (adição retrocompatível: novo membro de union + campo opcional).
