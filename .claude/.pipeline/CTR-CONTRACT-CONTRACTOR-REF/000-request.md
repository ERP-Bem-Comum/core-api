# CTR-CONTRACT-CONTRACTOR-REF — vínculo do contratado no agregado `Contract`

> **Size:** M · **Origem:** [ADR-0032](../../../handbook/architecture/adr/0032-transient-http-composition-read-until-bff.md) (regra "atributo do próprio contrato → evolui o agregado") + [ADR-0031](../../../handbook/architecture/adr/0031-partners-registry-module.md) (módulo Parceiros). **Habilita:** CTR-HTTP-CONTRACT-DETAIL-CONTRACTOR (composição HTTP do contratado).
>
> ⚠️ **Inferido.** Revisar antes de W0 — em especial obrigatoriedade do campo e estratégia de migration sobre dados existentes.

## Contexto

A rota gorda `GET /contracts/:id` (ADR-0032) precisa devolver o **contratado** (supplier/financier/collaborator). O dado do contratado mora em Parceiros e é lido via `partners/public-api` (`buildPartnersReadPort`, entregue). Mas a borda não tem como saber **qual** contratado compor: o agregado `Contract` **não referencia nenhum** hoje (`grep` por `supplierId|financierId|collaboratorId|contractorId|partnerId` em `src/modules/contracts/` retorna vazio).

ADR-0032 fixa de qual lado a peça cai (citação literal, `adr/0032-...md:42`):

> **dado de outro módulo → composição na borda; atributo do próprio contrato → evolui o agregado.**

O **vínculo** (qual contratado: `{ type, id }`) é atributo intrínseco do contrato — um contrato é firmado *com* alguém. Logo **evolui o agregado**. Este ticket faz só isso; a composição do **dado** do contratado fica no ticket HTTP que este habilita.

## Escopo (domínio + persistência)

1. **VO de referência.** `ContractorRef` como discriminated union sobre os branded refs já expostos por `partners/public-api/refs.ts`:
   ```
   type ContractorRef =
     | { type: 'Supplier'; id: SupplierRef }
     | { type: 'Financier'; id: FinancierRef }
     | { type: 'Collaborator'; id: CollaboratorRef };
   ```
   Importado **só** via `#src/modules/partners/public-api/refs.ts` (ADR-0006) — Contratos guarda o parceiro por ID branded, nunca toca o domínio de Parceiros. Smart constructor `rehydrate({ type, id })` retornando `Result<ContractorRef, E>`.
2. **Agregado.** `contractorRef` entra em `ContractRegistration` (vale desde `Pending` — o contratado é conhecido no cadastro inicial), portanto presente em todas as variantes do `Contract`.
3. **Inputs de criação.** `CreateContractInput` e `CreatePendingContractInput` ganham `contractorRef`; `createContract`/`createPendingContract` repassam ao agregado.
4. **Persistência (`ctr_*`).** Mapper row↔domínio + colunas `contractor_type` (varchar curto, sem `ENUM` nativo — ADR-0020) e `contractor_id` (`varchar(36)`, UUID — ADR-0018). **Migration** Drizzle Kit (`db:generate`). Definir estratégia para linhas existentes (ver Decisão abaixo).
5. **CLI.** Comandos de criação que hoje montam contrato passam a aceitar/exigir o contratado (flag `--contractor-type` + `--contractor-id`), com formatter PT-BR.

## Decisão (resolver em W0)

**Obrigatoriedade + migration sobre dados existentes.** O campo é semanticamente obrigatório (todo contrato tem um contratado). Mas há contratos já persistidos sem ele. Opções:

- **A (recomendada) — NOT NULL com backfill explícito:** coluna `NOT NULL`; a migration exige um valor para linhas existentes. Em dev/test (sem dados reais relevantes) é trivial; se houver dado real, definir sentinela/backfill com a P.O. antes. Mantém o invariante "todo contrato tem contratado" forte no schema.
- **B — nullable transitório:** coluna nulável + `contractorRef?` opcional no agregado por um período, fechando depois. Mais frouxo, adia o invariante, e o ticket HTTP já trata `contractor: null` graciosamente — mas enfraquece o domínio.

Recomendo **A** (invariante forte; o projeto não tem dado de produção de contratos a preservar nesta fase). Confirmar antes de W1.

## Critérios de Aceite

- [ ] **CA1** — `ContractorRef.rehydrate` valida `type` ∈ {Supplier,Financier,Collaborator} e delega o `id` ao ref branded correspondente de Parceiros; entrada inválida → `Result` err tipado. **(Refinado em W0/W1, ratificado em W2):** duas variantes — `'contractor-ref-invalid-type'` (type fora do conjunto) e `'partner-ref-invalid'` (id malformado, propagado do ref de Parceiros) — em vez do literal único `'contractor-ref-invalid'` originalmente esboçado.
- [ ] **CA2** — `Contract` (todas as variantes, inclusive `Pending`) carrega `contractorRef`; criar contrato sem ele é **erro de compilação** (não runtime).
- [ ] **CA3** — round-trip de persistência preserva `contractorRef` (save→findById devolve o mesmo `{ type, id }`); mapper rejeita `contractor_type` inválido vindo do banco com `Result` err.
- [ ] **CA4** — **isolamento (ADR-0006/0014):** o vínculo usa só os branded refs de `partners/public-api/refs.ts`; zero import de `partners/domain|application`; zero `SELECT` em `par_*`.
- [ ] **CA5** — migration aplica limpa em base nova; estratégia para linhas existentes implementada conforme a Decisão (A ou B).
- [ ] **CA6** — CLI de criação aceita o contratado e o exibe no detalhe (formatter PT-BR).
- [ ] **CA7** — integração gated (`MYSQL_INTEGRATION=1`) provando o round-trip real da coluna.

## Fora de escopo

- Compor o **dado** do contratado (nome/banco/PIX) na resposta HTTP — é o ticket CTR-HTTP-CONTRACT-DETAIL-CONTRACTOR, que este habilita.
- Validar que o `id` referenciado **existe** em Parceiros no momento da criação (FK lógica cross-módulo) — decisão separada; refs são rehydrate-only por design (ADR-0031 §7).
- Qualquer leitura de Parceiros.

## Pipeline

W0 testes RED (VO `ContractorRef` + agregado + mapper) → W1 VO + campo no agregado + inputs + migration + CLI → W2 review (isolamento CA4, invariante CA2) → W3 gate (`typecheck` + `format:check` + `lint` + `test`, integração gated não-órfã). Skills: `ts-domain-modeler` (VO + agregado) + `drizzle-schema-author` (coluna + migration) + `application-cli-builder` (flags CLI).
