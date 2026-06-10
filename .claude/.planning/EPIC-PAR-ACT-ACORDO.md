# EPIC-PAR-ACT-ACORDO — Reformular ACT: pessoa-física → Acordo de Cooperação Técnica

> **Status:** ✅ **CONCLUÍDO** (2026-06-10) — entregue como **vertical única** no ticket
> `.claude/.pipeline/PAR-ACT-ACORDO/` (closed-green). As fatias A1–A5 viraram etapas internas
> (commits por camada `2967dc0`→`81f389d` + W2 `dcd16c7`); gate W3 global verde no fechamento.
> Decisão de estratégia (P.O., 2026-06-10): a reescrita de forma quebra o typecheck global se
> fatiada por camada, então foi conduzida como uma branch única. Handoff ao front registrado em
> `.claude/.pipeline/PAR-ACT-ACORDO/006-handoff/HANDOFF.md`.
>
> _Histórico de planejamento abaixo._ Origem: `handbook/tickets/todo/PAR-ACT-ACORDO.md` (handoff
> front, **prioridade alta** — maior gap de backend da rodada). Módulo `partners` (`par_*`, ADR-0014).

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
| `startOfContract` (YYYY-MM-DD) | **REMOVER** (vigência vira `validity: Period` — D2) |
| `registrationStatus` (PreRegistration/...) | **REMOVER** (conceito de Colaborador, não de Acordo) |
| `name` | **MANTER** (reconceituar como "título/objeto do acordo") |
| `email` | **MANTER** (e-mail de contato) |
| `occupationArea` (`PARC\|DDI\|DCE\|EPV`) | **MANTER** (área de atuação) |
| `role` | **MANTER** (reconceituar como `legalRepresentative` / ponto de contato) |
| — | **NOVO** `actNumber: string` (nº do instrumento, **único** — D1) |
| — | **NOVO** `validity: Period` (`startDate` + `endDate`) — **D2** |
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

## 4. ✅ Decisões resolvidas (P.O., 2026-06-10)

| # | Decisão | **Resolução** |
| --- | --- | --- |
| **D1** | `actNumber`: gerado ou fornecido? unicidade? | **Fornecido pelo operador** (nº do instrumento jurídico), `string` obrigatória, **única** (unique index). NÃO gerar pelo backend. |
| **D2** | Vigência: meses ou data início/fim? | **Período explícito** — `validity: Period` (`startDate` + `endDate`). ⚠️ Diverge do front (que coleta "meses") — ver nota abaixo. |
| **D3** | Destino do `cpf` + migração | **Drop `cpf` + recriar.** Os ACTs atuais são só seed de teste (sem produção) → migração descontinua os dados e o `seed-partners.ts` é reescrito para acordos. |
| **D4** | `registrationStatus` sai do ACT? | **Sim** — remover do agregado, schema e list item (conceito de Colaborador, não de Acordo). |

> **⚠️ Handoff reverso ao front (D2):** o form atual coleta **"Vigência Inicial (Meses)"**, mas o backend
> passará a modelar `validity` como **período (início + fim)**. O front precisará coletar/derivar as duas
> datas (ou o BFF converte meses → `startDate`+`endDate`). Registrar como item de handoff core-api → front
> ao concluir A4 (HTTP). Reusar o VO `Period` se já houver kernel compartilhado; senão, criar em `partners`.

## 5. Fatiamento (W0→W3 por fatia — ordem = dependência)

### A1 — `PAR-ACT-DOMAIN` (size M)
Reescreve o agregado puro. Novos VOs (`actNumber` único, `validity: Period`), reusa `Cnpj`/`PaymentTarget`,
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

`D1–D4 (✅ resolvidas)` → **A1** → **A2** (+contractor-view) → **A3** → **A4** (+handoff vigência ao front) → **A5**. A1 e A2 são o núcleo
(reescrita do agregado + persistência/migração); A3–A5 propagam até a borda. Estimativa: ~5 tickets de
pipeline (2× M no núcleo, 1× S/M, 1× M, 1× S).
