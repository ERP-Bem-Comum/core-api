---
paths:
  - "tests/**/*.ts"
---

# Convenções de testes

Aplicáveis a tudo sob `tests/`. Runner: Node test runner nativo + `--experimental-strip-types`.

- **Discovery:** apenas `tests/**/*.test.ts` é descoberto pelo runner.
- **Suítes parametrizadas reutilizáveis:** sufixo `.contract.ts` ou `.suite.ts`. **Não são executadas direto** — exportam uma função `(makeImpl) => void` que adapters consomem dentro do próprio `describe()`. Exemplos: `tests/modules/contracts/adapters/persistence/contract-repository.suite.ts`, `tests/modules/contracts/application/ports/document-storage.contract.ts`.
- **Mirror do `src/`:** `tests/modules/contracts/domain/shared/money.test.ts` testa `src/modules/contracts/domain/shared/money.ts`.
- **Tests podem importar via `#src/*`** (subpath imports declarados no `package.json`).
- **Regras ESLint relaxadas em `tests/**`** (ver `eslint.config.js` final): `floating-promises`, `non-null-assertion`, `return-type`, `naming-convention` — todos `off` em testes.

## Comandos úteis

```bash
pnpm test                                                                       # todos os tests
pnpm run test:integration                                                       # sobe MySQL via Docker --wait + integration
node --test --experimental-strip-types --no-warnings <path>                     # arquivo específico
node --test --experimental-strip-types --no-warnings --test-name-pattern="..."  # filtro por nome
```

## Contrato de isolamento (testes de integração contra MySQL real)

Suítes de integração (`*.drizzle*.test.ts`, `*.integration.test.ts`) rodam **no mesmo banco**, arquivo a arquivo, com `--test-concurrency=1` — o runner **não recria** o schema entre arquivos irmãos. Logo, o resíduo de um arquivo é visível ao próximo. O contrato abaixo torna cada arquivo **independente de ordem**:

- **Limpe na ENTRADA, não na saída.** Faça a limpeza em `before`/`beforeEach` das tabelas cujo espaço de chave o arquivo escreve. Um arquivo que só limpa em `after`/`afterEach` (ou não limpa) fica à mercê da ordem — e um `beforeEach` **sem** `afterEach` deixa resíduo do último caso para o próximo arquivo.
- **Limpe por TABELA, nunca por PK quando há UNIQUE natural.** `await db.delete(t)` — não `db.delete(t).where(inArray(t.id, [...]))`. A limpeza por PK não pega resíduo inserido com **outro id** que colide na UNIQUE de negócio (CNPJ `par_suppliers_cnpj_idx`, CPF `par_collaborators_cpf_idx`, `code`, `legacy_id`). Foi exatamente essa a colisão do **#521**.
- **Nenhum arquivo depende de outro ter (ou não) rodado antes.** Cada arquivo semeia o que precisa e deixa as tabelas que tocou num estado que o próximo consegue limpar por tabela.
- **Prova mecânica:** a suíte tem de passar **em ordem invertida**. Ex.: `sed -n '/^  partners: mysqlSuite(/,/^  ]),/p' scripts/ci/test-integration.ts | grep -oE "'tests/[^']+'" | tr -d "'" | tail -r | xargs node --test --test-concurrency=1 --experimental-strip-types`. Se inverter a ordem quebra, há dependência de ordem escondida.
- **Não afrouxe o teste para “passar”.** Colisão de UNIQUE em setup é falha de isolamento (limpe por tabela na entrada), **não** motivo para trocar `assert.rejects` por um matcher frouxo nem para remover o índice. Duplicata **intencional** (teste de `integrity-violation`) é asserção legítima — não confundir com resíduo.

> Verificado nesta base (2026-07-23, MySQL 8.4 isolado): após o #521, as suítes `partners` (50/50) e `financial` (119/119) passam em ordem invertida — **order-independent**. O helper `resetPartnersTables`/`resetFinancialTables` (limpeza por tabela numa chamada) é o encapsulamento natural deste contrato quando um terceiro arquivo precisar da mesma limpeza; enquanto cada arquivo já limpa por tabela na entrada, o contrato está satisfeito sem o helper (YAGNI).

## Skills canônicas

- `tdd-strategist` — red-green-refactor aplicado, qual o **próximo** teste ([`SKILL.md`](../skills/tdd-strategist/SKILL.md)).
- `test-pyramid-engineer` — **arquitetura** da suíte: em que camada (unit/integration/contract/e2e) o teste vive, política de test doubles (fakes, não mocks), o que falta cobrir, duplicação entre camadas e gating por velocidade ([`SKILL.md`](../skills/test-pyramid-engineer/SKILL.md)).
