# PAR-COLLABORATOR-FIELDS — campos do Colaborador (PERFIL + TERRITÓRIO + BANCÁRIO)

Trilha A. 1 PR, 1 migration aditiva em `par_collaborators`. Fecha #41 e #42; #40 só
fecha junto da trilha B (Financier) — este PR entrega só o lado Colaborador.

## Escopo

Expandir o agregado `Collaborator` com três conjuntos de campos, todos nullable
(backward-compatible). Zero regressão em colaboradores legados sem os campos.

- **PERFIL (#41):** `sex` (`'F'|'M'`, VO novo), `maritalStatus` (VO enum novo),
  `hasChildren`, `childrenCount`, `childrenAges`, `isPwd`, `pwdDescription`, `isOnLeave`,
  `leaveDuration`, `leaveRenewable`, `leaveRenewalDuration`, `publicSectorExperienceDuration`.
  (`genderIdentity` e `experienceInThePublicSector` já existem — NÃO duplicar.)
- **TERRITÓRIO (#42):** `territory: { uf: StateAbbreviation|null; municipality: string|null }`.
  UF reusa `geography/state.ts` (slug remapeado p/ `territory-uf-invalid`); município é
  NOME livre (varchar 255) conforme texto da issue #42.
- **BANCÁRIO (#40 lado Colaborador):** `bankAccount`/`pixKey` reusando
  `supplier/payment-target.ts` (igual Act). Agência ganha regex 4 dígitos + DV opcional no VO
  compartilhado (slug `bank-agency-invalid`), harmonizado com Supplier/Act (CA3 #40).

## Decisões de risco (issue CAs vencem o plano de design)

1. **`sex` é campo NOVO** (`'F'|'M'`, slug `sex-invalid`) — issue #41 CA2 é explícita; não
   é o `genderIdentity` existente.
2. **Slug = error-code** (`toErrorEnvelope(code, code)`): VOs emitem EXATAMENTE
   `sex-invalid`, `marital-status-invalid`, `territory-uf-invalid`, `bank-agency-invalid`.
3. **Município = NOME (varchar 255)** — issue #42, não código IBGE.
4. **Bank/pix reusa supplier/payment-target** (menor risco) em vez de promover p/ shared.
5. **Agência: regex aplicado no VO compartilhado** (harmoniza Supplier/Act — CA3 #40). Todos
   os fixtures existentes usam agências válidas (`0001-2`, `1234`).
6. PCD/afastamento são booleans+strings na issue #41 (isPwd/isOnLeave + descrições/durações),
   não enums — sem VO dedicado (só `sex` e `maritalStatus` viram VO).
