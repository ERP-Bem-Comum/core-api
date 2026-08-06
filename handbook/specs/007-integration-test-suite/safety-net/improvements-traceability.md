# Rastreabilidade — melhorias 🔴 alta (BDD + TDD 1:1)

> Casos NOVOS de cobertura (melhorias da rede de segurança, spec 007) gerados a partir de
> `improvements.md`, prioridade **🔴 alta**. Cada caso = 1 cenário BDD + 1 caso TDD.
> BDD: `bdd/improvements/<tema>.feature`. TDD: `tdd/improvements/<tema>.md`.
> Fundamentação canônica reforçada via `requirements-engineer` (Given-When-Then / Histórias de
> Usuário 4ª ed.), `tdd-strategist` (Kent Beck — characterization/boundary) e MCP `acdg-skills`.
>
> **Total: 17 cenários BDD ↔ 17 casos TDD** (paridade 1:1).

| tema                                | caso   | dimensão     | prioridade | fundamento (citação)                                                                                                                                |
| ----------------------------------- | ------ | ------------ | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| security-rate-limit                 | RL-1   | Segurança    | 🔴         | OWASP AI Exchange (p.89): "Reduce the risk of multi-account abuse […] avoid per-user rate limits."                                                  |
| security-rate-limit                 | RL-2   | Segurança    | 🔴         | OWASP AI Exchange (p.89): least privilege / multi-account abuse.                                                                                    |
| security-rate-limit                 | RL-3   | Segurança    | 🔴         | OWASP AI Exchange (p.89): least privilege / multi-account abuse.                                                                                    |
| security-rate-limit                 | RL-4   | Segurança    | 🔴         | OWASP AI Exchange (p.89): controle — política de escrita não atinge leitura.                                                                        |
| security-injection                  | INJ-1  | Segurança    | 🔴         | OWASP AI Exchange: "input validation and sanitization to reject or correct malicious (e.g. very large) content."                                    |
| security-injection                  | INJ-2  | Segurança    | 🔴         | OWASP AI Exchange: input validation and sanitization.                                                                                               |
| security-injection                  | INJ-3  | Segurança    | 🔴         | OWASP AI Exchange: input validation and sanitization.                                                                                               |
| security-injection                  | INJ-4  | Segurança    | 🔴         | OWASP AI Exchange: input validation and sanitization (contracts).                                                                                   |
| security-injection                  | INJ-5  | Segurança    | 🔴         | OWASP AI Exchange: input validation and sanitization (partners).                                                                                    |
| failures-pagination-boundary        | PAG-1  | Falhas téc.  | 🔴         | OWASP AI Exchange: reject or correct malicious (e.g. very large) content — boundary de paginação.                                                   |
| failures-pagination-boundary        | PAG-2  | Falhas téc.  | 🔴         | OWASP AI Exchange: input validation (page negativa).                                                                                                |
| failures-pagination-boundary        | PAG-3  | Falhas téc.  | 🔴         | OWASP AI Exchange: reject/correct very large content (pageSize=99999).                                                                              |
| failures-pagination-boundary        | PAG-4  | Falhas téc.  | 🔴         | OWASP AI Exchange: input validation (page além do total → vazio coerente).                                                                          |
| failures-pagination-boundary        | PAG-5  | Falhas téc.  | 🔴         | OWASP AI Exchange: input validation (boundary em contracts).                                                                                        |
| failures-pagination-boundary        | PAG-6  | Falhas téc.  | 🔴         | OWASP AI Exchange: input validation (boundary em partners).                                                                                         |
| consistency-referential-propagation | PROP-1 | Consistência | 🔴         | Ramakrishnan & Gehrke (3ª ed., p.443, §16.1): execução atômica — "ou todas as ações são executadas ou nenhuma" (propagação por referência, FR-007). |
| consistency-edit-atomicity          | ATOM-1 | Consistência | 🔴         | Ramakrishnan & Gehrke (3ª ed., p.443, §16.1): "ou todas as ações são executadas ou nenhuma delas é executada" (all-or-nothing, FR-009).             |

## Síntese por tema

| tema                                | dimensão     | cenários BDD | casos TDD | cabeçalho com citação             |
| ----------------------------------- | ------------ | ------------ | --------- | --------------------------------- |
| security-rate-limit                 | Segurança    | 4            | 4         | OWASP AI Exchange p.89            |
| security-injection                  | Segurança    | 5            | 5         | OWASP AI Exchange                 |
| failures-pagination-boundary        | Falhas téc.  | 6            | 6         | OWASP AI Exchange                 |
| consistency-referential-propagation | Consistência | 1            | 1         | Ramakrishnan & Gehrke p.443 §16.1 |
| consistency-edit-atomicity          | Consistência | 1            | 1         | Ramakrishnan & Gehrke p.443 §16.1 |
| **TOTAL**                           | —            | **17**       | **17**    | 5/5 temas                         |

## Notas

- Estes casos são **melhorias** (testes novos): não há `.bru` correspondente hoje. Serão a base dos
  novos requests `.bru` da coleção unificada (US3), conforme `improvements.md` §"Plano de incorporação".
- Paridade 1:1 BDD↔TDD por caso. Cenários longos (PROP-1, ATOM-1) são multi-passo, com captura de IDs
  explícita no TDD.
- Não foram tocados `api-collections/` nem `src/` — apenas a rede de segurança em `safety-net/`.
