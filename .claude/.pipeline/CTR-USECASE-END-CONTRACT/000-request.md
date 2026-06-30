# CTR-USECASE-END-CONTRACT — Encerramento de Contrato (UC-07)

> **Size:** S · **Módulo:** contracts · **Aberto por:** orquestrador (sessão 2026-05-25)
> **Gap:** #1 do relatório de cobertura (`RELATORIO-COBERTURA-DOMINIO-2026-05-25.md`)

## Contexto

O domínio do `Contract` já expõe as transições terminais — mas **nenhum caso de uso
nem comando CLI** as aciona. Hoje um contrato nasce `Active` e não tem caminho de
aplicação para `Expired`/`Terminated`.

Fonte canônica (citação literal):

- `handbook/domain/contratos/03-gestao-contratos-context.md:70-74` — **Encerrar Contrato**:
  > "Quem chama: Sistema (chegada da data fim) ou Gestor (distrato). Efeitos: Status →
  > `Encerrado` ou `Distratado`. Bloqueia novos aditivos de valor. Evento publicado:
  > `ContratoEncerrado`."
- `handbook/domain/contratos/03-gestao-contratos-context.md:90-91` — máquina de estados:
  `Vigente → Encerrado` (chegada da data fim) e `Vigente → Distratado` (rescisão antecipada).
- `handbook/domain/contratos/06-event-line-context.md:20` — `ContratoEncerrado` produzido por
  Gestão de Contratos, consumido por Aditivos (bloqueia novos) + Timeline.

Domínio pronto (read-only, não tocar):

- `src/modules/contracts/domain/contract/contract.ts:109` — `Contract.expire(active, at)`
  (rejeita período `Indefinite`; exige `at >= currentPeriod.end`).
- `src/modules/contracts/domain/contract/contract.ts:147` — `Contract.terminate(active, at)`.
- `src/modules/contracts/domain/contract/events.ts:17-22` — evento `ContractEnded`
  com `kind: 'Expired' | 'Terminated'`.

## Escopo

1. **Use case** `endContract` em `application/use-cases/end-contract.ts`:
   - factory `(deps: { contractRepo, clock }) => (cmd) => Promise<Result<…>>`.
   - command discriminado por `kind: 'Expire' | 'Terminate'`.
   - sequência: validar `contractId` → `findById` → `Contract.parseActive` → `expire`/`terminate`
     (switch exaustivo, sem `default`) → `contractRepo.save(contract, [event])`.
   - publica `ContractEnded` via 2º argumento de `save` (outbox atômico, ADR-0015).
2. **Comando CLI** `encerrar-contrato` em `cli/commands/encerrar-contrato.ts` + registro em `registry.ts`:
   - `--contrato <uuid>` (obrigatório) · `--motivo <expiracao|distrato>` (obrigatório).
   - mapeia `expiracao → Expire`, `distrato → Terminate`.

## Fora de escopo

- Reação do módulo Financeiro a `ContractEnded` (gap #7 — ticket FIN-* separado, ADR-0014).
- Agregado/consulta de Timeline (gap #2 — inquiry).
- Agendamento automático de expiração por data (sistema cron) — MVP usa `clock.now()`.

## Critérios de aceite

- **CA-1:** `endContract({ contractId, kind: 'Terminate' })` em contrato `Active` →
  `Result.ok`, contrato `Terminated` com `endedAt`, evento `ContractEnded{ kind: 'Terminated' }`
  no outbox.
- **CA-2:** `endContract({ contractId, kind: 'Expire' })` com `clock.now() >= currentPeriod.end` →
  contrato `Expired`, evento `ContractEnded{ kind: 'Expired' }`.
- **CA-3:** `Expire` antes da data fim → propaga `ContractCannotExpireYet` (tagged); nada persistido, outbox vazio.
- **CA-4:** `Expire` em contrato de período `Indefinite` → `ContractCannotExpireIndefinitePeriod`.
- **CA-5:** encerrar contrato já `Expired`/`Terminated` → `ContractNotActive` (tagged); sem efeito colateral.
- **CA-6:** `contractId` inexistente → `'contract-not-found'`. `contractId` malformado → `'contract-id-invalid'`.
- **CA-7 (CLI):** `encerrar-contrato --contrato <id> --motivo distrato` → exit 0, status PT "Distratado".
- **CA-8 (CLI):** flag `--motivo` ausente/ inválida → exit 64.

## Pipeline

| Wave | Skill/Agente | Gate |
| :--- | :--- | :--- |
| W0 RED | `tdd-strategist` | `pnpm test` (novos fails) |
| W1 GREEN | `ports-and-adapters` → `application-cli-builder` | `pnpm test` + `pnpm run typecheck` |
| W2 REVIEW | `code-reviewer` | `pnpm run lint` |
| W3 QUALITY | `ts-quality-checker` | typecheck + format:check + test + lint |
