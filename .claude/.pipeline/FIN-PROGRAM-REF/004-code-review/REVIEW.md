# Code Review — FIN-PROGRAM-REF (US3 Programa, passthrough)

**Veredito:** **APPROVED** (round 1)

**Reviewer:** code-reviewer · **Data:** 2026-06-20

**Escopo revisado:** `programs/adapters/persistence/repos/program-list-read.drizzle.ts`, `programs/public-api/read.ts`, `financial/application/ports/program-read.ts`, `financial/adapters/persistence/repos/program-read.{in-memory,from-programs}.ts`, `financial/adapters/http/{schemas,dto,error-mapping,composition,plugin}.ts`, e os 2 testes do US3.

## Evidência objetiva

- `eslint` nos arquivos do ticket → **0 problemas**.
- `tsc --noEmit` (cross-módulo) → 0 erros. 3 testes US3 → 4 pass / 0 fail. Regressão financial+programs → 222 pass / 0 fail.

## Checklist + foco cross-módulo (ADR-0006/0014)

| Item | Resultado |
| --- | --- |
| **ADR-0006** (consumo só via public-api) | ✅ O financial importa **só** `programs/public-api/index.ts` (`buildProgramsReadPort`, `ProgramsReadPort`) — nunca `programs/domain` ou `application`. |
| **Não-quebra do contrato existente** | ✅ A listagem entrou como `listAll()` no `ProgramsReadPort` (público), **sem tocar** o `ProgramReadPort` batch — os mocks do contracts (`contracts-program.routes.test.ts`, `program-composition.test.ts`) continuam válidos (222/222). |
| **D** Ports & Adapters | ✅ Port do financial = `type Readonly<{}>`; `from-programs` adapta + projeta `{id,name}`; `list-read.drizzle` `try/catch → Result`. |
| **Sem domínio/tabela/migration** | ✅ Programa é referência externa (research D2) — nenhum agregado/tabela no financial. |
| **F** ESM/TS · **G** Idioma | ✅ imports `.ts`, `import type`, return types; código EN; erro `program-read-unavailable` (mesmo slug nos 2 módulos, repassado direto). |
| **Shutdown** | ✅ `buildMysqlPools` fecha `programsReadPort` no shutdown (espelha `contractsReadPort`). |

## 🔵 Sugestão (não-bloqueia)

- `program-list-read.drizzle.ts` lista **todos** os programas (sem filtro de status). Se o domínio Program ganhar inativação no futuro, filtrar ativos. Hoje não há esse conceito → ok.
- Stub de programas no driver memory é inline em `composition.ts` (3 itens). Aceitável para dev/testes; a fonte real (mysql) é a public-api.

## O que está bom

- Extensão cirúrgica do programs (1 adapter novo + `listAll` no port público) — risco zero para consumidores existentes, comprovado pela regressão verde.
- Reuso do padrão `buildContractsReadPort` (#178) para o consumo cross-módulo + close no shutdown.

## Veredito: **APPROVED** → avançar para W3.
