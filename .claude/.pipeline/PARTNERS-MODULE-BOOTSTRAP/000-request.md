# PARTNERS-MODULE-BOOTSTRAP — Fundação do módulo `partners` (VOs do kernel + refs do public-api)

> **Size:** S · **ADR:** [ADR-0031](../../../handbook/architecture/adr/0031-partners-registry-module.md) · **Épico:** `.claude/.planning/EPIC-PARTNERS-CADASTROS.md` (Fase 0)

## Escopo

Primeiro ticket da fronteira Parceiros/Cadastros. Entrega a **fundação mínima e testável** que
desbloqueia os agregados (supplier, financier, collaborator) das fases seguintes. **Não** modela
agregado, schema Drizzle nem adapters ainda — isso vem nos tickets de agregado.

### Em escopo

1. **VOs documentais no Shared Kernel** (`src/shared/kernel/`), genuinamente cross-BC (ADR-0031 §4):
   - **`Cpf`** (novo) — `src/shared/kernel/cpf.ts`. Branded `Brand<string, 'Cpf'>`, smart constructor
     `parse(raw): Result<Cpf, CpfError>` validando 11 dígitos + DV módulo 11, rejeitando sequência
     repetida; normaliza removendo máscara. Padrão D (module-as-namespace), espelhando `user-ref.ts`.
   - **`Cnpj`** (evolução) — `src/shared/kernel/cnpj.ts`. O arquivo hoje só exporta o predicado
     `isValidCnpj`. Evoluir para VO `Cnpj` (`Brand<string, 'Cnpj'>` + `parse`), **reusando** o
     algoritmo módulo 11 já existente. Manter `isValidCnpj` exportado (consumido pelo import de
     contratos legados — não quebrar).
   - Atualizar o barrel `src/shared/kernel/index.ts` com os novos tipos.

2. **Esqueleto do public-api do módulo** (`src/modules/partners/public-api/`):
   - **`refs.ts`** — `SupplierRef`, `FinancierRef`, `CollaboratorRef` (branded UUID, **rehydrate-only**,
     padrão `UserRef`). São os tipos que Contratos/Financeiro guardarão (ADR-0031 §7).
   - **`index.ts`** — barrel.

### Fora de escopo (tickets futuros)

- **`Email` no kernel** — vive hoje em `src/modules/auth/domain/identity/email.ts`. A promoção ao
  kernel + migração do `auth` é ticket próprio (ADR-0031 §4: "sem bloquear Parceiros"). Os agregados
  que precisarem de Email usam-no quando chegarem.
- Agregados, schema `par_*`, migrations, adapters, CLI, eventos, ETL.

## Critérios de aceite

- [ ] `Cpf.parse` aceita CPF válido (com/sem máscara), rejeita DV inválido, comprimento != 11 e
      sequência repetida (`111...`) — retornando `Result<Cpf, 'invalid-cpf'>`.
- [ ] `Cnpj.parse` aceita CNPJ válido (com/sem máscara), rejeita inválido — `Result<Cnpj, 'invalid-cnpj'>`.
- [ ] `isValidCnpj` continua exportado e funcional (sem regressão no import de contratos).
- [ ] `SupplierRef`/`FinancierRef`/`CollaboratorRef.rehydrate` validam UUID v4, rejeitam o resto.
- [ ] Barrel `kernel/index.ts` exporta os novos tipos.
- [ ] W3 verde: `typecheck` + `format:check` + `test` + `lint`.

## Notas de disciplina

- W0 RED antes de tocar `src/` (testes de `Cpf`/`Cnpj`/refs falham por inexistência da API).
- Idioma: código EN; erros internos kebab EN (`'invalid-cpf'`, `'invalid-cnpj'`).
- ADR-0006: `public-api` é puro (só tipos + validators, sem regra de negócio).
