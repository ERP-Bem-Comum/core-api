# Incidente — diretório `contracts/.../repos/` movido (2026-06-17)

> **Status:** Resolvido · **Severidade:** baixa (detectado e corrigido antes de qualquer commit/merge) · **Causa-raiz:** anomalia transitória do ambiente de execução (não é defeito do projeto).

## O que aconteceu

Durante o ticket `CTR-SWEEPER-JOB-LOCK` (W1), o diretório
`src/modules/contracts/adapters/persistence/repos/` (8 repos: contract/amendment/document/outbox/timeline)
apareceu como **deletado** no `git status`, e seu conteúdo surgiu em
`src/modules/contracts/adapters/persistence/migrations/mysql/repos/` (dentro do `out` do drizzle-kit),
junto com o `job-run.drizzle.ts` recém-criado. Detectado quando um `Edit` falhou com "file does not exist".

## Conserto aplicado

```
git checkout HEAD -- src/modules/contracts/adapters/persistence/repos/   # restaura os 8 repos originais
rm -rf src/modules/contracts/adapters/persistence/migrations/mysql/repos/ # remove o diretório errado
# job-run.drizzle.ts recriado em repos/ (com o type correto MysqlHandle)
```

Restauração limpa: o conteúdo dos repos não foi corrompido, apenas relocado → `git checkout HEAD` bastou.

## Investigação de causa-raiz (eliminação + reprodução)

| Suspeito | Veredito | Evidência |
| --- | --- | --- |
| `pnpm run db:generate` (drizzle-kit) | **Descartado** | Reprodução controlada: adicionei tabela dummy ao schema → `db:generate` (gerou migration 0016) → `repos/` **não se moveu** (9 arquivos antes/depois; `migrations/mysql/repos/` nunca surgiu). Experimento revertido. |
| Algum comando meu (Write/Edit/Bash) | **Descartado** | Os repos usam imports **relativos**; se estivessem movidos no `typecheck`, o tsc acusaria dezenas de imports quebrados — houve **1 erro só** (typo `ContractsMysqlHandle`). Logo o `repos/` estava intacto no typecheck; o movimento ocorreu entre o `typecheck`/`lint` e o `Edit`, janela sem nenhum comando que mova arquivos. |
| Hooks (`.claude/hooks/*.sh`) | **Descartados** | Nenhum faz `mv`/`cp`/`rename`/`find -exec`/`git mv`. O `prettier-write.sh` (único em Edit/Write) opera em **um arquivo** (`prettier --write "$FILE"`). |
| Recorrência | **Não houve** | `repos/` permaneceu íntegro no resto da sessão (vários `db:generate`, edits, merges). |

## Conclusão

Anomalia **transitória e não-determinística** da camada de ferramentas de arquivo do ambiente de
execução (provável estado/race do filesystem do sandbox entre dois tool calls). **Não** há defeito no
código, em `drizzle.config.ts`/`tsconfig.json` ou nos hooks. Nenhuma correção de código necessária.

## Mitigação / se recorrer

- Defesa já existente e suficiente: `typecheck`/`lint` (gate W3), `pre-commit-typecheck.sh` e o CI
  pegam o estado quebrado antes de qualquer commit/merge — foi assim que foi detectado.
- Se recorrer: capturar `git status` + o comando imediatamente anterior (para correlacionar) e
  restaurar com `git checkout HEAD -- <dir>`.
