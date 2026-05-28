# Code Review - CTR-AMENDMENT-DOCUMENT-LINK - Round 1

**Veredito:** APPROVED

## Issues

Nenhuma critica/importante/sugestao bloqueante.

## O que esta bom

1. **Loop fechado com agregado ContractDocument** — `attachSignedDocument` agora valida que o documento existe no repo antes de mutar o amendment.
2. **Composição CLI cascade** — `CliContext`, `state.ts` (load/save), `memory`/`mysql` drivers, `anexar-documento` command — todos atualizados consistentemente.
3. **Reviver JSON estendido** — `uploadedAt`/`retentionUntil` adicionados ao DATE_KEYS para round-trip Date↔ISO em state files.
4. **Validator `isValidContractDocument`** — REGR-#1 segurança aplicada: state file não pode injetar documento com schema inválido.
5. **Backward compat** — `documents` no Snapshot é opcional; state files antigos sem documents ainda carregam.
6. **Comando CLI `subir-documento`** — MVP minimal para fechar fluxo E2E. Documentado como "sem upload de bytes real" (composition root completo virá em ticket futuro).
7. **BDD 1.2 voltou a green** — fluxo `criar→aditivo→subir-documento→anexar→homologar` agora funciona ponta-a-ponta.

## Nota

O escopo do ticket cresceu além do "refator simples" porque a validação `documentRepo.findById` exigia cascade na composição CLI. Trabalho mecânico justificado — composition root sem `documentRepo` deixaria o use case impossível de injetar.

## Proximo passo

APPROVED -> W3.
