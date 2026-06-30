# W0 (RED) — Ticket CTR-INFRA-READONLY-BI-AUTH

**Skill:** tdd-strategist
**Data:** 2026-05-26T18:20Z
**Resultado:** 🔴 RED confirmado (2 testes falham por comportamento ausente, não por erro de sintaxe)

## Estratégia

O ticket assume a dívida destacada no W3 de `CTR-OUTBOX-CONSUMER-PORT`: `readonly_bi` não
autentica no MySQL provisionado pelo `compose.yaml` + seed `initdb.d/`. O teste de comportamento
já existe (`tests/infra/mysql-compose.test.ts`, suíte `CTR-DB-COMPOSE-MYSQL`); o W0 deste ticket
torna o RED **honesto e específico**, sem presumir a causa raiz (que é trabalho do W1).

Mínimo aplicado (YAGNI): nenhum teste especulativo de causa raiz (ex.: `LENGTH(authentication_string)`)
— esses dariam falso-negativo se a causa não fosse senha vazia. Os REDs canônicos são de
**comportamento observável**, válidos seja qual for a causa:

| Teste | Estado antes | Estado W0 | Cobre CA |
| :--- | :--- | :--- | :--- |
| CA-5: `readonly_bi` consegue SELECT | 🔴 fail (já era) | 🔴 fail | CA-2 |
| CA-6: `readonly_bi` recebe **privilege-denied** ao CREATE TABLE | 🟢 falso-positivo | 🔴 fail | CA-3 |

### O falso-positivo eliminado (CA-3 do ticket)

CA-6 antes assertava `assert.match(r.stderr, /denied|access/i)` — satisfeito já pelo
`Access denied` do **login** negado, sem nunca exercitar o GRANT. Endurecido para exigir
`ER_TABLEACCESS_DENIED_ERROR` (1142) e **negar** explicitamente o auth-denied (1045):

```ts
assert.match(r.stderr, /CREATE command denied/i, ...);       // privilege-denied (1142)
assert.doesNotMatch(r.stderr, /Access denied for user/i, ...); // não auth-denied (1045)
```

## Saída integral (RED)

```
ℹ tests 21
ℹ pass 19
ℹ fail 2

✖ CA-5: readonly_bi consegue SELECT (55.929864ms)
  AssertionError: SELECT falhou: ERROR 1045 (28000): Access denied for user 'readonly_bi'@'localhost' (using password: YES)
  1 !== 0

✖ CA-6: readonly_bi recebe privilege-denied (não auth-denied) ao CREATE TABLE (50.088124ms)
  AssertionError [ERR_ASSERTION]: esperado privilege-denied (1142), foi:
    ERROR 1045 (28000): Access denied for user 'readonly_bi'@'localhost' (using password: YES)
    expected: /CREATE command denied/i
```

O `1045` em CA-6 prova que a falha é de **autenticação** (login), não de privilégio — exatamente
o sintoma a corrigir no W1. CA-3 (container healthy) e CA-4 (`core_app` conecta) seguem **GREEN**,
isolando o problema ao seed de `readonly_bi`.

## Critério para o GREEN (W1)

Ambos os testes passam quando `readonly_bi` autenticar com a senha do secret
`mysql_readonly_password` e o GRANT `SELECT ON core.*` (sem CREATE) estiver ativo — sem regressão
em CA-3/CA-4/CA-7..19.

## Arquivo tocado

- `tests/infra/mysql-compose.test.ts` (CA-6 endurecido) — camada de teste, não `src/`.
