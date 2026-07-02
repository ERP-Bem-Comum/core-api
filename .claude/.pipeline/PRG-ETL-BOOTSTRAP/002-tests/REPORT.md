# W0 — RED · PRG-ETL-BOOTSTRAP

**Skill:** tdd-strategist · **Outcome:** RED ✅ · **Data:** 2026-07-01

> **Nota:** fatia implementada como spike; o RED foi **reproduzido genuinamente** na formalização
> (não fabricado) — ver "Evidência do RED" abaixo.

## Arquivos de teste criados

| Arquivo | Tipo | Cobertura |
| --- | --- | --- |
| `tests/etl/mappers/program.mapper.test.ts` | unit (roda em `pnpm test`) | `mapLegacyProgramRow` com fakes de linha legada + `Clock` |
| `tests/etl/orchestrate.test.ts` (estendido) | unit | `programs` no `MIGRATION_ORDER` + fake `ProgramsEtlPort` |
| `tests/etl/fixtures/legacy-mini.sql` (estendido) | fixture | tabela `programs` (1 ativa, 1 inativa) p/ o caminho gated |

## Cenários — unit (`program.mapper.test.ts`)

1. **happy (ativo):** linha `active=1` → `Program` ATIVO; `programNumber === legacyId === row.id`; UUID gerado.
2. **inativo (active=0):** → agregado Inativo via `Program.deactivate`; `deactivatedAt` = updatedAt legado.
3. **director/description em branco → null:** `trim || null` (campos nullable no destino).
4. **nome curto → quarentena:** `name` < 2 chars → `DomainRejected { field:'name', code:'program-name-required' }`.
5. **sigla inválida → quarentena:** `abbreviation` fora do formato → `DomainRejected { field:'sigla', code:<erro de Sigla> }`.
6. **programNumber = legacyId:** o int legado é reusado como número de exibição (determinístico).
7. **acúmulo de erros:** nome curto + sigla inválida na mesma linha → `combine` retorna os DOIS erros numa quarentena.

## Evidência do RED (reproduzida na formalização)

Removido `scripts/etl/mappers/program.mapper.ts` e executado o teste:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../scripts/etl/mappers/program.mapper.ts'
  imported from .../tests/etl/mappers/program.mapper.test.ts
✖ tests/etl/mappers/program.mapper.test.ts
exit code: 1
```

RED confirmado: o teste falha por **inexistência da API** (`mapLegacyProgramRow`) — o critério de W0 do
projeto. Mapper restaurado após a prova.
