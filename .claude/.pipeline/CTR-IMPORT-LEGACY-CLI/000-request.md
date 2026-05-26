# CTR-IMPORT-LEGACY-CLI — Parser CSV/JSON + comando `importar-contratos` (UC-11 passada 2)

> **Size:** M · **Módulo:** contracts · **Pai:** [CTR-IMPORT-LEGACY](../CTR-IMPORT-LEGACY/000-request.md)
> A especificação de requisitos completa (FR/NFR/histórias/rastreabilidade) vive no `000-request.md` do ticket pai.

## Contexto

O use case `importContracts` (núcleo) já está pronto e verde (passada 1). Falta a **borda de
I/O**: ler arquivo, decodificar UTF-8, fazer parse (CSV/JSON), validar estrutura e expor o
comando CLI que a equipe técnica usa.

## Decisão de dependência (registrada)

**Sem nova dependência.** Node não tem parser CSV nativo; dado o ethos de supply-chain
(ADR-0011 — `only-allow`, `approve-builds`, minimizar deps) e a "preferência por nativo",
o parser CSV é **hand-rolled** (subset RFC-4180: header + campos com aspas, vírgula/quebra de
linha dentro de aspas, `""` escapado). JSON usa `JSON.parse` nativo.

## Decisão de UX (registrada)

**Dry-run é o default seguro.** `importar-contratos --arquivo x.csv` simula e reporta sem
escrever; **`--confirmar`** persiste. Carga inicial não escreve por acidente.

## Escopo

1. **Parser** `src/modules/contracts/cli/import-parser.ts` (puro):
   `parseImportRows(content, format: 'csv'|'json'): Result<readonly ImportContractRow[], ImportParseError>`.
   - Schema canônico (D4 do pai): colunas/keys `numero, titulo, objetivo, assinado_em,
     valor_centavos, inicio` (obrigatórias) + `fim, cnpj` (opcionais). `fim` vazio ⇒ `null`.
   - Mapeia snake_case do arquivo → `ImportContractRow` (camelCase). Coage valores a string.
   - Valida **estrutura** (colunas obrigatórias presentes) → FR-2.
2. **Comando** `src/modules/contracts/cli/commands/importar-contratos.ts` + registro:
   - flags: `--arquivo <path>` (obrig.), `--formato <csv|json>` (opc.; infere da extensão),
     `--confirmar` (persiste; ausência = dry-run).
   - lê arquivo (`node:fs/promises`, UTF-8; erro de IO → `Result`), chama parser, chama
     `importContracts`, formata o relatório PT-BR, `ctx.persist()` só quando `--confirmar`.
3. **Formatter** do relatório (PT-BR) + strings de erro novas em `error.ts`
   (`import-cnpj-invalid` e os `ImportParseError`).

## Fora de escopo

- Aditivos legados (v2 — Inquiry-0014 Q3). Mapeamento configurável (D4 do pai). Rollback pós-commit.

## Critérios de aceite

- **CA-1 (H1):** `--arquivo x.csv --confirmar` cria os contratos; `listar-contratos` os mostra.
- **CA-2 (H2):** sem `--confirmar` → dry-run: reporta, **não** persiste; aviso "use --confirmar".
- **CA-3 (H6):** arquivo sem coluna obrigatória → exit ≠ 0, erro estrutural, zero linhas processadas.
- **CA-4 (H7):** JSON UTF-8 equivalente produz o mesmo resultado do CSV.
- **CA-5:** `--arquivo` inexistente/ilegível → exit ≠ 0 com mensagem clara.
- **CA-6:** CSV com campo entre aspas contendo vírgula e `""` é parseado corretamente.
- **CA-7:** relatório por linha (índice + motivo PT-BR) para falhas de dado (reusa `formatErrorCode`).

## Pipeline

| Wave | Skill/Agente | Gate |
| :--- | :--- | :--- |
| W0 RED | `tdd-strategist` | `pnpm test` |
| W1 GREEN | `nodejs-fs-scripter` (leitura) + `application-cli-builder` (parser + comando) | `pnpm test` + `typecheck` |
| W2 REVIEW | `code-reviewer` | `pnpm run lint` |
| W3 QUALITY | `ts-quality-checker` | typecheck + format:check + test + lint |
