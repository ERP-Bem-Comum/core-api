# Mapa-mestre de rastreabilidade — rede de segurança BDD+TDD 1:1 (spec 007)

> Captura de cobertura **antes** de reescrever as coleções Bruno. Este é o mapa unificado
> que consolida as três tabelas parciais por módulo. Cada "request real" mapeia 1:1 para
> exatamente um cenário BDD e um caso TDD.

## Critério canônico (decisão)

**"Request real" = arquivo `.bru` que contém um verbo HTTP** (`get` / `post` / `put` / `patch` /
`delete`). Apenas esses arquivos fazem uma chamada e carregam asserção (`tests {}`), por isso
entram no 1:1.

**Excluídos do critério** (metadados de coleção/config — sem verbo HTTP, sem asserção):

- `folder.bru` — descritor de pasta da coleção Bruno.
- `collection.bru` — metadados raiz da coleção.
- `environments/local.bru` — variáveis de ambiente.

**Incluído:** `health-check.bru` (GET `/health`, asserção status 200) — é um request real.

**Total canônico: 158 requests reais → 158 cenários BDD → 158 casos TDD.**

## Resumo por módulo

| módulo    | requests reais | cenários BDD | casos TDD | status    |
| --------- | -------------- | ------------ | --------- | --------- |
| auth      | 85             | 85           | 85        | capturado |
| contracts | 15             | 15           | 15        | capturado |
| partners  | 58             | 58           | 58        | capturado |
| **Total** | **158**        | **158**      | **158**   | capturado |

## Tabelas parciais (fonte de cada linha)

As tabelas 1:1 completas (bru ↔ cenário BDD ↔ caso TDD ↔ asserções) vivem nos mapas por módulo:

- **auth — 85** → [`auth-traceability.md`](./auth-traceability.md)
  Distribuição por pasta: `1-auth`=6, `2-users`=31, `3-security`=5, `4-me`=3,
  `5-permissions`=8, `6-roles`=12, `7-role-mgmt`=20.
  BDD: `bdd/auth/{1-auth,2-users,3-security,4-me,5-permissions,6-roles,7-role-mgmt}.feature`.
  TDD: `tdd/auth/<pasta>.md`.

- **contracts — 15** → [`contracts-traceability.md`](./contracts-traceability.md)
  Composição: 1 health-check + 4 auth (`auth/0[1-4]-*.bru`) + 10 contracts (`contracts/[01-10]-*.bru`).
  BDD: `bdd/contracts/{auth,contracts}.feature`. TDD: `tdd/contracts/{auth,contracts}.md`.

- **partners — 58** → [`partners-traceability.md`](./partners-traceability.md)
  Composição: 1 health-check de raiz + 57 nas 7 pastas
  (`acts`=2, `aggregate`=7, `auth`=3, `collaborators`=15, `financiers`=10, `suppliers`=10,
  `territory`=10).
  BDD: `bdd/partners/{health,acts,aggregate,auth,collaborators,financiers,suppliers,territory}.feature`.
  TDD: `tdd/partners/<pasta>.md`.

## Nota sobre contagem

Uma varredura ingênua de `find api-collections -name '*.bru'` retorna mais de 158 porque inclui
`folder.bru`, `collection.bru` e `environments/local.bru`. Esses são metadados, não requests HTTP —
não têm verbo nem `tests {}`, e portanto não geram cenário/caso. Aplicando o critério canônico
(presença de verbo HTTP), o 1:1 fecha em **158/158/158**.

Validação reproduzível (devem bater por módulo: auth 85, contracts 15, partners 58):

```bash
# cenários BDD por módulo
for m in auth contracts partners; do echo "$m BDD: $(grep -rcE '^\s*(Cenário|Cenario|Scenario):' specs/007-integration-test-suite/safety-net/bdd/$m/ | awk -F: '{s+=$2} END{print s}')"; done
# requests reais por módulo (com verbo)
for m in auth contracts partners; do echo "$m real: $(grep -rlE '^\s*(get|post|put|patch|delete)\s*\{' api-collections/$m --include='*.bru' | wc -l)"; done
```
