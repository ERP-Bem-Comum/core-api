# W0 — Testes RED

**Agente:** tdd-strategist
**Arquivo:** `tests/infra/integration-script-secret-perms.test.ts` (novo)
**Resultado:** **RED — 3 testes, 0 pass, 3 fail** ✅ (falham por ausência do fix)

## Decisão de design (refinamento da proposta do request)

O `000-request.md` propôs no W0 decidir entre teste **funcional** (subir container, provar
`readonly_bi`) e algo mais barato. Decisão tomada:

- A **prova funcional** de que `0o644` cria `readonly_bi` e o container fica `healthy` **já
  existe e é GREEN** em `tests/infra/mysql-compose.test.ts` (CA-3 healthy, CA-5 readonly_bi
  SELECT, CA-6 privilege-denied). Aquela suíte usa `writeSecrets()` com `0o644`. Duplicar a
  subida de container aqui seria caro e redundante (YAGNI).

- O **gap real** que nenhuma suíte cobre: o `package.json#scripts.test:integration` cria os
  secrets com seu próprio `chmod 600` inline, **independente** do `mysql-compose.test.ts`. Nada
  amarra esse script à permissão correta — foi por isso que `948b76c` corrigiu dois dos três
  pontos e a dívida sobreviveu no terceiro.

Logo o teste de regressão certo é **estático sobre o `package.json`**: determinístico, roda em
`pnpm test` sem Docker, e pega exatamente a regressão "alguém voltou o script para `chmod 600`".

## Testes (mapa → CA)

| Teste | CA | Asserção |
| --- | --- | --- |
| CA-1: não cria secrets com chmod 600 | CA-1, CA-4 | `script test:integration` **não** casa `/chmod 0?600 secrets\/mysql_/` |
| CA-1b: grava secrets com chmod 644 | CA-1 | `script test:integration` casa `/chmod 0?644 secrets\/mysql_/` |
| CA-4: nenhum script usa chmod 600 p/ secrets | CA-4 | varre todos os `scripts` do package.json; lista de ofensores vazia |

## Cobertura dos CAs do request

- **CA-1 / CA-4** → cobertos diretamente por este arquivo (RED agora).
- **CA-2 (seed cria readonly_bi com a permissão correta)** → coberto por
  `mysql-compose.test.ts` CA-5/CA-6 (já GREEN com `0o644`). Não duplicado.
- **CA-3 (boot healthy na 1ª tentativa)** → `mysql-compose.test.ts` CA-3 (já GREEN) +
  validação manual registrada na avaliação E2E de 2026-05-26.
- **CA-5 (test:integration segue verde)** → validado no W3 rodando `pnpm run test:integration`.
- **CA-6 (postura de segurança 0644 sem world/group-write)** → `mysql-compose.test.ts` CA-16.

## Saída (resumo)

```
ℹ tests 3
ℹ pass 0
ℹ fail 3
```

Os 3 falham porque `package.json:30` (`test:integration`) contém
`chmod 600 secrets/mysql_*.txt`. W1 troca para `644`.
