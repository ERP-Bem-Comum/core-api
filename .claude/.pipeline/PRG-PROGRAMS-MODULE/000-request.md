# 000 — Request PRG-PROGRAMS-MODULE

> **Novo módulo `programs` (Bounded Context).** Size: L. Plano completo em `specs/008-gestao-programas/`.
> Implementação **MVP-first** em fatias W0→W3: domínio puro → persistência → use cases → HTTP.

## Escopo

Implementar o módulo `src/modules/programs/` conforme `specs/008-gestao-programas/` (spec/plan/data-model/
contracts/tasks). Borda HTTP sob **`/api/v1/programs`** (port legado — ADR-0033).

## Fatiamento (sub-entregas, cada uma W0→W1→gate verde)

1. **Domínio puro** (esta fatia): `ProgramId`, VO `Sigla`, `ProgramStatus`, `errors`, `events`, `types`,
   operações `Program.{create,update,deactivate,reactivate}`. Testes: `sigla.test.ts`, `program.test.ts`.
2. Ports + persistência (InMemory + Drizzle `prg_*`, geração `program_number`, optimistic-lock, outbox).
3. Use cases (create/list/get/update/deactivate/reactivate).
4. Borda HTTP (`/api/v1/programs`) + permissões `program:*` no catálogo `auth`.
5. Logo (storage S3/MinIO) — sub-fatia P3.

## Decisões herdadas da spec (já clarificadas)

- Identidade dupla: `id` UUID v4 (PK) + `program_number` sequencial interno (UNIQUE, MAX+1 sob FOR UPDATE).
- Optimistic-lock (`version`) **só no `PUT`**; desativar/reativar usam guarda de estado.
- Desativação soft (status); escritas retornam o recurso no corpo.
- Erros: string-union kebab EN (padrão `auth`/`partners`). Agregado como namespace-objeto.

## Critérios de aceitação (fatia 1 — domínio)

- **CA1** `Sigla.create` normaliza (trim+uppercase) e valida `[A-Z0-9]{2,20}`; inválida → `program-sigla-invalid`.
- **CA2** `Program.create` exige nome (≥2) e sigla válida; nasce `ATIVO`, `version=1`; emite `ProgramCreated`.
- **CA3** `Program.update` revalida nome/sigla; rejeita `version` divergente → `program-version-conflict`; incrementa `version`; emite `ProgramUpdated`.
- **CA4** `Program.deactivate` exige `ATIVO` (senão `program-not-active`) → `INATIVO`; emite `ProgramDeactivated`.
- **CA5** `Program.reactivate` exige `INATIVO` (senão `program-not-inactive`) → `ATIVO`; emite `ProgramReactivated`.
- **CA6** Domínio puro: `Result`, sem `throw`, sem `class`, switch exaustivo. Gate W3 verde.
