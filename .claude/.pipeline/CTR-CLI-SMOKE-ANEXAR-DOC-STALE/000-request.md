# CTR-CLI-SMOKE-ANEXAR-DOC-STALE — smoke CLI `anexar-documento` espera exitCode 0 obsoleto

## Origem

Descoberto em 2026-05-26 ao fechar `CTR-PERIOD-PLAIN-DATE-SCHEMA` (Docker reativado).
Pré-existente — `git stash` da migração de datas reproduziu a falha idêntica, provando
que **não tem relação com `datetime → date`**. Provável defasagem após
`CTR-DOMAIN-STATE-MACHINE-AMENDMENT` (último ticket fechado, que mexeu na máquina de
estado do aditivo).

## Sintoma

`tests/cli/contracts.cli.mysql.test.ts:233` — `CA-6: fluxo Addition completo
(criar → aditivo → anexar → homologar)` falha no passo `anexar-documento`:

```
anexar-documento: ❌ Erro desconhecido (código interno: signed-document-not-found).
1 !== 0
```

O teste (linha 220) comenta *"UUID fictício — neste ticket o storage não é wired"* e
espera `exitCode 0`. Mas `anexar-documento` agora retorna `signed-document-not-found`
para um documento que não existe no storage.

## A investigar (decidir qual é a verdade)

1. **Teste defasado:** o comportamento de validar documento assinado é correto/intencional
   → atualizar o teste smoke para um documento real (ou esperar o erro) e ajustar o fluxo
   CA-6 (anexar documento existente antes de homologar).
2. **Regressão real:** `anexar-documento` não deveria exigir documento no storage nesta
   fase → corrigir o use case.

Cruzar com o diff de `CTR-DOMAIN-STATE-MACHINE-AMENDMENT` para decidir.

## Critérios de aceitação

- CA1: `pnpm run test:integration` → `CA-6: fluxo Addition completo` verde.
- CA2: a expectativa do teste reflete o contrato atual de `anexar-documento`
  (documento existente exigido, ou storage não-wired explícito), sem `assert` mentiroso.

## Fora de escopo

- Wiring do storage real (S3/MinIO, ADR-0019) se a decisão for "storage não-wired".
