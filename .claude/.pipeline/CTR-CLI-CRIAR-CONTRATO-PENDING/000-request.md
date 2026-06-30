# CTR-CLI-CRIAR-CONTRATO-PENDING — `criar-contrato` ganha o caminho Pendente

## Origem

Série [ADR-0023](../../../handbook/architecture/adr/0023-contract-lifecycle-pending-state.md), frente
CLI. O use case `createPendingContract` existe; falta expô-lo na CLI. Hoje `criar-contrato` (CLI)
exige `--assinado-em` e sempre cria `Active` (via `createContract`).

## Estado atual

- `cli/commands/criar-contrato.ts`: `REQUIRED` inclui `assinado-em`; chama `createContract`
  (Deps `{ contractRepo, clock }` via `ctx`). `ALLOWED` já lista `assinado-em`.
- `createPendingContract({ contractRepo, clock })` — cadastra Pendente (sem `signedAt`).
- `createContract` — caminho Active (com `signedAt`), inalterado.

## Critérios de aceitação

- **CA1 (Pending):** `criar-contrato` **sem `--assinado-em`** → chama `createPendingContract`, cria
  contrato `Pending` (sem vigência efetiva), imprime confirmação (status Pendente + id).
- **CA2 (Active — regressão):** `criar-contrato` **com `--assinado-em`** → comportamento atual
  (`createContract` → Active). Testes E2E existentes do `criar-contrato` seguem verdes.
- **CA3:** `--assinado-em` deixa de ser `REQUIRED`; demais obrigatórias (`numero`, `titulo`,
  `objetivo`, `valor-centavos`, `inicio`) valem para ambos os caminhos.
- **CA4:** erros formatados (PT) para ambos os caminhos; exit codes corretos (64 uso / 0 sucesso).

## Fora de escopo

- Comando `activar-contrato` (próximo ticket).
- Realinhamento de labels de status (`Em Andamento`/`Finalizado`/`Distrato`).
- HTTP/ACL.

## Notas

- Skill: `application-cli-builder`. Pipeline W0→W3. E2E via `tests/cli/contracts.cli*.test.ts`
  (driver memory) + unit do comando se aplicável.
- Decisão de UX: presença de `--assinado-em` discrimina Active vs Pending (mais simples que uma
  flag `--pendente` explícita). Refina no W0/W1 se preferir flag explícita.
