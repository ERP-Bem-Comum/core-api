# BGP-READ-PORT — W3 (QUALITY) · **BLOQUEADO** (não fechado)

> Wave **em aberto por decisão da P.O. (2026-07-20)**. Os 4 gates locais estão verdes; a suíte de
> integração MySQL **não pôde ser executada** e o bloqueio virou a issue #500.

## Gates locais — verdes (rodados no fio principal)

| Gate | Resultado |
| :-- | :-- |
| `pnpm run typecheck` | ✅ limpo |
| `pnpm run lint` | ✅ limpo |
| `pnpm run format:check` | ✅ "All matched files use Prettier code style!" |
| `pnpm test` | ✅ **4249 tests · 4230 pass · 0 fail · 19 skipped** |

Baseline do W0 RED: 4247 / 4227 pass / 1 fail. **Regressão zero** — a única falha (o
`ERR_MODULE_NOT_FOUND` do módulo inexistente) sumiu e nada mais mudou de sinal.

## O que está bloqueado

Os **14 testes gated** de `tests/modules/budget-plans/public-api/budget-plans-read-port.integration.test.ts`
(atrás de `MYSQL_INTEGRATION=1`) — os que provariam contra banco real:

- a **grade de 12 meses** com nós zerados (CA3);
- a **soma das Redes** sem dupla contagem (CA4);
- o `EXPLAIN` que o W0 (nota 4) alocou a esta wave;
- a conferência contra o dado real do `ETL-BUDGET-PLANS` (5 planos / 390 subcategorias / 5.040 linhas
  do export legado).

Hoje eles estão provados **só por leitura de código e pelo SQL emitido** (capturado no W2, §2/§3/§4) —
**não** contra MySQL. Isto está registrado como **não-executado**, jamais como verde.

## Causa do bloqueio

1. A porta **3306 está ocupada** pelo `erp-mysql` (ambiente ERP compartilhado, de pé há 5 dias).
2. Os **65 arquivos** de teste de integração fixam `127.0.0.1:3306` no código — subir o MySQL de teste
   em outra porta não adianta, os testes continuam procurando a 3306.
3. O **CI não roda integração MySQL** (`.github/workflows/` só tem `integration-notifications.yml`;
   `ci.yml:9` declara que a integração é via `pnpm run test:integration:*`, que "precisa de Docker").
   Logo **não há um "CI verde" para onde delegar** — descoberta desta wave, e a razão de a lacuna ser
   maior que este ticket.

## Decisão da P.O. (2026-07-20)

Descartadas: (a) parar o `erp-mysql` para liberar a 3306 — derrubaria o ambiente ERP inteiro por
alguns minutos; (b) fechar o W3 declarando a integração não-executada e seguir.

**Escolhida:** abrir ticket para destravar a porta e **adiar o W3 desta fatia** até lá.

→ **Issue #500** — [shared] tornar a porta do MySQL de teste configurável por `MYSQL_PORT`
(`dedup-key: shared:test-integration:mysql-port-hardcoded`). Traz 6 CAs testáveis, incluindo o CA6:
decidir e registrar se a integração MySQL ganha workflow de CI ou é declaradamente local-only.

## Para retomar esta wave

1. Fechar a #500.
2. `MYSQL_PORT=<porta livre> pnpm run test:integration:budget-plans` — os 14 gated verdes.
3. `EXPLAIN` da query (Minor-4 do W2): fan-out intermediário é `subcategorias × 12 × Redes_do_plano`
   antes do `GROUP BY`; índices esperados `bgp_budget_results_budget_subcategory_month_uq` (prefixo
   `budget_id`) e `bgp_budget_results_subcategory_id_idx`.
4. Conferir os totais contra o export legado — se divergirem, o **Minor-3 do W2** (lançamento órfão
   ignorado em silêncio, por ausência de FK — D1 do #317) é o primeiro suspeito.
5. Só então `pipeline:state wave-finish BGP-READ-PORT W3` e `close`.
