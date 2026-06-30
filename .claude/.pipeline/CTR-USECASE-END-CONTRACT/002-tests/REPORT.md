# W0 RED — CTR-USECASE-END-CONTRACT

> **Skill:** `tdd-strategist` · **Outcome:** RED · **Data:** 2026-05-25

## Objetivo da wave

Descrever, via testes que falham por inexistência da API, o use case `endContract`
(Expire/Terminate) e o comando CLI `encerrar-contrato`, cobrindo os CA-1..CA-8 de
`000-request.md`.

## Arquivos criados

| Arquivo | Camada | Cobre |
| :--- | :--- | :--- |
| `tests/modules/contracts/application/use-cases/end-contract.test.ts` | application | CA-1..CA-6 (use case) |
| `tests/cli/contracts.cli.end-contract.test.ts` | E2E CLI | CA-7, CA-8 + regra de domínio via CLI + not-found |

**Não-tocado:** `src/` (disciplina red-first). Domínio `Contract.expire`/`terminate` consumido como API existente.

## Saída literal do gate (`node --test`)

**Use case** (`end-contract.test.ts`) — RED por inexistência do módulo:

```
url: 'file:///.../src/modules/contracts/application/use-cases/end-contract.ts'
code: 'ERR_MODULE_NOT_FOUND'
ℹ tests 1
ℹ pass 0
ℹ fail 1
```

**E2E CLI** (`contracts.cli.end-contract.test.ts`):

```
ℹ tests 5
ℹ suites 1
ℹ pass 2
ℹ fail 3
```

- 3 fails legítimos (RED): distrato happy (`64 !== 0`), expiracao-antes-do-fim (`64 !== 1`),
  contrato-inexistente (`64 !== 1`). O subcomando `encerrar-contrato` ainda não existe →
  `main.ts` devolve exit 64 (subcomando desconhecido).
- 2 "pass" são **colisão transitória**: os CA-8 esperam exit 64, e o subcomando desconhecido
  também devolve 64. Após o W1, virarão verde legítimo (validação real de `--motivo`).

## Próximo passo

W1 GREEN — skill `ports-and-adapters` (use case) → `application-cli-builder` (comando + registry):

1. `src/modules/contracts/application/use-cases/end-contract.ts` — `endContract` factory.
2. `src/modules/contracts/cli/commands/encerrar-contrato.ts` + registro em `cli/registry.ts`.
