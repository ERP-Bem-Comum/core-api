# EPIC-PAR-ACT-ACORDO — Reformular ACT: pessoa-física → Acordo de Cooperação Técnica

> **Status:** Aberto (design) — 2026-06-10. Origem: `handbook/tickets/todo/PAR-ACT-ACORDO.md` (handoff
> front, **prioridade alta** — maior gap de backend da rodada). Módulo `partners` (`par_*`, ADR-0014).
> Decompõe o ticket L em fatias W0→W3 verticais por capacidade. Cada fatia abre seu próprio ticket de
> pipeline em `.claude/.pipeline/<ID>/` na hora de implementar.

---

## 1. Objetivo

O submódulo **ACT** foi modelado como **pessoa-física** (espelho do Colaborador: `cpf`, vínculo
empregatício, início de contrato, `registrationStatus`). A regra de negócio real é um **Acordo de
Cooperação Técnica** firmado com uma **instituição parceira** (CNPJ). O front já foi reorganizado para o
Acordo (form 3 seções, grid, detalhe), mas **criar/editar ACT pela tela não persiste** porque o agregado
ainda exige os campos de pessoa-física. Este épico reescreve o agregado e propaga até a borda HTTP + export.

## 2. Transformação (estado atual → alvo)

| Campo atual (pessoa-física) | Destino |
| --- | --- |
| `cpf` (`shared/kernel/cpf.ts`) | **REMOVER** → dá lugar a `cnpj` institucional |
| `employmentRelationship` (enum collaborator) | **REMOVER** |
| `startOfContract` (YYYY-MM-DD) | **REMOVER** (vigência vira `initialValidityMonths`) |
| `registrationStatus` (PreRegistration/...) | **REMOVER** (conceito de Colaborador, não de Acordo) |
| `name` | **MANTER** (reconceituar como "título/objeto do acordo") |
| `email` | **MANTER** (e-mail de contato) |
| `occupationArea` (`PARC\|DDI\|DCE\|EPV`) | **MANTER** (área de atuação) |
| `role` | **MANTER** (reconceituar como `legalRepresentative` / ponto de contato) |
| — | **NOVO** `actNumber: string` (nº do instrumento, único) |
| — | **NOVO** `initialValidityMonths: number` (inteiro ≥ 1) |
| — | **NOVO** `cnpj` (`shared/kernel/cnpj.ts` — já existe) |
| — | **NOVO** `corporateName: string` (razão social) |
| — | **NOVO** `fantasyName: string` (nome fantasia/sigla) |
| — | **NOVO** `hasFinancialTransfer: boolean` |
| — | **NOVO** `bankAccount?` / `pixKey?` (reusa `supplier/payment-target.ts`) |

**Regra de repasse (invariante):** se `hasFinancialTransfer = true` ⇒ **≥1 payment target** (banco OU PIX)
obrigatório (mesma invariante do Supplier); se `false`, ambos opcionais.

**Fora do escopo (decisão P.O.):** `globalValue` ("Valor Global do Acordo") foi **removido** do front — **não**
criar por ora.

## 3. Reuso de VOs (não reinventar)

- `Cnpj` — `src/shared/kernel/cnpj.ts` (DV validado; já usado pelo Supplier).
- `BankAccount` / `PixKey` / `createBankAccount` / `createPixKey` — `src/modules/partners/domain/supplier/payment-target.ts`.
- `OccupationArea` — mantém o VO atual do ACT.

## 4. ⚠️ Decisões a resolver antes de A1 (P.O. / tech lead)

| # | Decisão | Recomendação (default proposto) |
| --- | --- | --- |
| **D1** | `actNumber`: gerado pelo backend ou fornecido? formato? unicidade? | **Fornecido pelo operador** (é o nº do instrumento jurídico real), `string` obrigatória, **única** (unique index). NÃO gerar como em contrato. |
| **D2** | Vigência: "meses" basta ou precisa data início/fim derivada? | `initialValidityMonths: number` (inteiro ≥ 1) como o front pede. Datas derivadas = follow-up. |
| **D3** | CPF→CNPJ: destino do `cpf` atual + migração dos ACTs existentes | **Drop `cpf`.** Se os ACTs atuais são dados de teste → migração descontinua (recria); se há reais → mapear caso a caso. **Confirmar com P.O.** |
| **D4** | `registrationStatus` sai do agregado/list do ACT? | **Sim** — remover (não se aplica a Acordo). |

## 5. Fatiamento (W0→W3 por fatia — ordem = dependência)

### A1 — `PAR-ACT-DOMAIN` (size M)
Reescreve o agregado puro. Novos VOs (`actNumber`, `initialValidityMonths`), reusa `Cnpj`/`PaymentTarget`,
remove `cpf`/`employmentRelationship`/`startOfContract`/`registrationStatus`. Smart constructors
`register`/`edit` com a **regra de repasse**. Eventos `ActRegistered`/`ActEdited` refletindo os campos novos.
**Arquivos:** `domain/act/{act.ts,act-id.ts,errors.ts,events.ts,types.ts}` (+ novos VOs do acordo).
**CA-chave:** registrar acordo sem CPF/vínculo/início; repasse=true sem payment target → erro.

### A2 — `PAR-ACT-PERSISTENCE` (size M)
Schema Drizzle `par_acts` (add `act_number` UNIQUE, `validity_months`, `cnpj`, `corporate_name`,
`fantasy_name`, `has_financial_transfer`, colunas de banco/PIX; **drop** `cpf`/`employment`/`start`/
`registration`). `act.mapper` (row↔domínio), `act-repository.{drizzle,in-memory}`, `act-reader.{drizzle,in-memory}`.
Migration via `pnpm run db:generate:partners`. **+ migração de dados (D3).**
**⚠️ Cross-módulo:** atualizar `public-api/contractor-view.mapper.ts` e `adapters/persistence/repos/contractor-read.drizzle.ts`
— o ACT é um **contratado** consumido por Contratos (read port, ADR-0006). Ver §6.

### A3 — `PAR-ACT-USECASES` (size S/M)
`register-act` + `edit-act` (novos campos, delega a regra de repasse ao domínio). `list-acts` com filtros
`hasFinancialTransfer` (tipo: com/sem repasse) + `occupationArea` (área) e **busca por `actNumber`/`corporateName`**.
`deactivate-act`/`reactivate-act` (ajuste se a forma do agregado exigir). Atualizar port `act-reader.ts`.

### A4 — `PAR-ACT-HTTP` (size M)
`act-schemas` (Zod: body de register/edit com os campos do acordo), `act-dto` (response + **list item com
`actNumber`/`corporateName`**), `act-plugin` (mapeamento de erros: cnpj inválido → 422, repasse sem target →
422), `act-list-query` (parse dos filtros tipo/área + busca). Rotas `/api/v1/acts` (espelham o padrão dos
demais submódulos de partners).

### A5 — `PAR-ACT-EXPORT` (size S)
`adapters/export/act-csv.ts` com os campos do acordo (`actNumber`, `corporateName`, `cnpj`,
`hasFinancialTransfer`, …) — anti-CSV-injection já no util compartilhado.

## 6. Risco / dependência cross-módulo (contractor-view)

O ACT é projetado como **contratado** (`ContractorReadPort`) consumido pelo módulo **Contratos** (ADR-0006/0032).
Trocar `name`→objeto e `cpf`→`cnpj` muda **como um ACT aparece como contratado num contrato**. A fatia **A2**
deve atualizar `contractor-view.mapper.ts` + `contractor-read.drizzle.ts` e **rodar a suíte de contracts** para
garantir que o read-model do contratado-ACT continua coerente (documento = CNPJ, não CPF). Tratar como parte
do "definition of done" de A2 — não deixar para depois.

## 7. Invariantes (herdadas do projeto)

- Domínio puro (sem throw/class/any; `Result<T,E>`; branded; exhaustive switch) — `.claude/rules/domain.md`.
- Schema MySQL único, sem ENUM nativo (enums via `varchar` + CHECK), sem JSON, sem AUTO_INCREMENT em PK de
  domínio — ADR-0020. `cnpj` em `varchar(14)`; `has_financial_transfer` em `tinyint`/CHECK.
- Cross-módulo só via `public-api/` — ADR-0006.
- Cada fatia: W0 RED antes de tocar `src/`; W3 = typecheck + format + lint + test verdes.

## 8. Sequência sugerida

`D1–D4 (decisões)` → **A1** → **A2** (+contractor-view) → **A3** → **A4** → **A5**. A1 e A2 são o núcleo
(reescrita do agregado + persistência/migração); A3–A5 propagam até a borda. Estimativa: ~5 tickets de
pipeline (2× M no núcleo, 1× S/M, 1× M, 1× S).
