# CLAUDE.md

Contexto canônico do `core-api`. Regras por camada vivem em [`.claude/rules/`](./.claude/rules/) e carregam só quando o path casa.

## O repositório

Backend do ERP Bem Comum — **modular monolith**, 8 módulos em `src/modules/` (`auth`, `budget-plans`, `contracts`, `financial`, `notifications`, `partners`, `programs`, `reports`). A **borda HTTP é a UX primária** (ADR-0037); a CLI embutida foi aposentada.

**Quando código e handbook discordam, o handbook vence.**

## Hierarquia de fontes

```
1. handbook/architecture/adr/   ← ADRs aceitos, IMUTÁVEIS, vencem tudo
2. handbook/                    ← domínio, infra, inquiries, reference/<tech>/
3. Este CLAUDE.md + .claude/rules/
4. .claude/agents/<agent>.md
5. .claude/skills/<skill>/SKILL.md
```

Nunca contradizer um ADR aceito — abrir novo que `supersedes` o anterior e registrar em `handbook/CHANGELOG.md`.

**ADRs que mais aparecem no dia a dia:** [0006](./handbook/architecture/adr/0006-modular-monolith-core-api.md) (modular monolith + ports & adapters) · [0014](./handbook/architecture/adr/0014-mysql-database-isolation.md) (isolamento por prefixo) · [0015](./handbook/architecture/adr/0015-mysql-outbox-pattern.md) (outbox) · [0020](./handbook/architecture/adr/0020-mysql-only-supersedes-dual-dialect.md) (MySQL único, features SQL permitidas) · [0029](./handbook/architecture/adr/0029-pnpm-11-supply-chain-defaults.md) (pnpm 11 + supply-chain; **supersedes 0012**) · [0037](./handbook/architecture/adr/0037-http-first-retire-embedded-cli.md) (HTTP-first) · [0054](./handbook/architecture/adr/0054-ai-assisted-contribution-policy.md) (contribuição assistida por IA).

## Idioma — invariante

| Camada                                    | Idioma                                                      |
| ----------------------------------------- | ----------------------------------------------------------- |
| Código (`src/`, `tests/`)                 | **EN**                                                      |
| Strings ao humano, logs, erros formatados | **PT-BR**                                                   |
| Documentação, diálogo, commits            | **PT-BR com acentuação completa**                           |
| Erros internos (string literal union)     | **EN kebab-case** — `'contract-not-active'`                 |
| Eventos de domínio                        | **EN passado** — `ContractCreated`                          |
| Commit                                    | **PT-BR** com escopo — `feat(contracts): adiciona VO Money` |

Casing dentro do código é enforced por `@typescript-eslint/naming-convention`.

## Política de regressão zero — invariante

**Não existe "o erro não é meu".** Qualquer vermelho — teste, `lint`, `typecheck`, hook, build — é regressão a corrigir **agora**, tenha ou não sido causado pelo diff atual. "Já estava quebrado" não fecha turno.

Três saídas aceitáveis, e só três:

1. **Consertar a causa** — volta ao verde de verdade.
2. **Corrigir o gate que classifica errado** — e **provar** o verde no caminho certo. Nunca esconder atrás de `skip`.
3. **Escalar ao humano** com causa-raiz — só quando 1 e 2 estão fora de alcance, e sempre explícito.

## Contribuição assistida por IA (ADR-0054)

Todo commit gerado por IA leva `Assisted-by: AGENT_NAME:MODEL_VERSION` — enforced por `scripts/ci/check-commit-trailers.ts`. **A IA nunca adiciona `Signed-off-by`**: só um humano certifica o DCO. O humano que submete é dono de cada linha e assume responsabilidade integral.

## Anti-padrões — os que exigem julgamento

Os mecânicos (`npm`, sintaxe TS, casing, `class` no domínio, JSON/ENUM no MySQL) já são barrados por hook, `tsconfig`, ESLint e semgrep — não estão listados aqui.

1. **Misturar módulos numa sessão** (`ctr_*` e `fin_*` ao mesmo tempo) — ofende ADR-0014.
2. **Editar ADR aceito** — criar novo que `supersedes`.
3. **Citar handbook de memória** — abrir o arquivo e citar literalmente.
4. **Importar de `<module>/domain/` ou `application/` de outro módulo** — só via `<module>/public-api/` (ADR-0006).
5. **Dispensar vermelho como "não é meu erro"** — ver Política de regressão zero.
6. **Consertar problema fora do escopo atual** (scope-creep) — registrar via skill [`issue-report`](.claude/skills/issue-report/SKILL.md) e seguir a tarefa (ADR-0040).
7. **Duplicar regra que já vive no handbook ou numa SKILL.md** — referenciar, não copiar.

## Comandos não-óbvios

```bash
pnpm run test:integration     # sobe MySQL via Docker compose --wait
node src/server.ts            # borda HTTP; config por env (CONTRACTS_DATABASE_URL etc.)
pnpm run worker:outbox        # worker do outbox em foreground
pnpm run db:generate          # Drizzle Kit — nunca escrever migration à mão
pnpm run secrets:setup        # gera ./secrets/*.txt para o compose
```

Gate de qualidade: `typecheck` + `format:check` + `lint` + `test`. Os demais scripts estão no `package.json`.

## Onde procurar

- **Regras por camada:** [`.claude/rules/`](./.claude/rules/) — carregam por `paths:`.
- **Referências de tecnologia:** [`handbook/reference/<tech>/`](./handbook/reference/) — cada uma tem agente especialista.
- **Domínio formal:** [`handbook/domain_questions/contratos/`](./handbook/domain_questions/contratos/) e [`handbook/domain/`](./handbook/domain/).
- **Contexto do agente:** [`context/`](./context/) — planejamento, decisões, playbooks. Sob demanda.
- **Cheatsheet do Claude Code:** [`.claude/runbooks/claude-code-cheatsheet.md`](./.claude/runbooks/claude-code-cheatsheet.md).

## Material local-only

[`handbook/guidelines/`](./handbook/guidelines/) está no `.gitignore` — PDFs Bradesco (CNAB/Pix/WebService) com restrição de redistribuição. Leitura autorizada localmente; **não copiar trechos para código commitável**.
