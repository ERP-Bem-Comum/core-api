# CTR-CLI-SUBIR-DOCUMENTO-CATEGORIA — `subir-documento` aceita `--categoria`

## Origem

Série [ADR-0023](../../../handbook/architecture/adr/0023-contract-lifecycle-pending-state.md), frente
CLI. Pré-requisito do `activar-contrato`: o happy path da ativação exige um documento
**`signed_contract`** `Active` vinculado ao contrato, mas `subir-documento` (CLI) hoje cria categoria
**`'other'` hardcoded** (`commands/subir-documento.ts:113`) — não há como produzir um `signed_contract`
via CLI.

## Estado atual

- `subir-documento`: `ALLOWED = ['parent-id', 'parent-tipo', 'doc-id', 'user-id', 'help', 'h']`;
  `Document.create({ ..., categoria: 'other' })` fixo.
- `DocumentCategory` (domínio): `signed_contract | signed_amendment | opinion | certificate |
  justification | technical_attachment | publication | other` (8 valores).

## Critérios de aceitação

- **CA1:** `subir-documento --categoria signed_contract --parent-tipo Contract --parent-id <uuid>` →
  cria `ContractDocument` com `categoria: 'signed_contract'` (exit 0).
- **CA2:** `--categoria` inválida (fora do enum) → exit 64 com mensagem listando as válidas.
- **CA3 (regressão):** **sem** `--categoria` → default `'other'` (comportamento atual preservado;
  testes E2E existentes de `subir-documento` seguem verdes).
- **CA4:** `--categoria` entra em `ALLOWED` (flag conhecida).

## Fora de escopo

- **Coerência categoria↔parentTipo** (ex.: `signed_contract` só com `Contract`) — o domínio
  `Document.create` não restringe; manter livre neste ticket (regra própria se necessária).
- Comando `activar-contrato` (próximo — consome este).
- Upload real de bytes (segue placeholder, como hoje).

## Notas

- Skill: `application-cli-builder`. Pipeline W0→W3. E2E via `tests/cli/`.
- Validação da categoria: set dos 8 `DocumentCategory` (espelha o `CONTRACT_STATUSES`/`AMENDMENT_STATUSES`
  do `state.ts`). Default `'other'` mantém retrocompat.
