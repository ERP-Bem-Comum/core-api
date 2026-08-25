---
paths:
  - 'src/modules/partners/**/*.ts'
  - 'tests/modules/partners/**/*.ts'
verify:
  - claim: 'o VO Email não está no shared kernel'
    glob: 'src/shared/kernel/email.ts'
    expect: []
  - claim: 'partner_states não existe — o nome real da tabela é par_states'
    root: 'src'
    pattern: 'partner_states'
    expect: []
---

Cadastro de contrapartes ([ADR-0031](../../handbook/architecture/adr/0031-partners-registry-module.md)): `supplier`, `financier`, `collaborator`, `geography`, `user-profile` e `act` ([ADR-0036](../../handbook/architecture/adr/0036-act-partner-placeholder.md)). Não fatiar em N módulos — cardinalidade modesta e mesma linguagem ubíqua de "cadastro de contraparte". A coerência de `active`/`deactivated_at` é cobrada por `tests/cleanup/partners-soft-delete-coherence.test.ts`.

- **Soft-delete é o padrão dos agregados, não de toda tabela `par_*`.** Seis das quatorze o têm: `suppliers`, `financiers`, `collaborators`, `states`, `municipalities`, `acts`. As outras oito — outbox, DLQ, views de projeção, histórico, tokens de convite — não têm por natureza, e acrescentar `active` a uma delas é sinal de modelagem errada, não de padrão a seguir. **Nunca hard delete** no que é agregado: desmarcar é inativar, marcar é criar-ou-reativar, idempotente ([ADR-0035](../../handbook/architecture/adr/0035-partner-territory-soft-delete.md)). ⚠️ A convenção de **nome** do constraint nunca foi uniforme — cinco usam `*_active_consistency_chk` e `par_collaborators` usa `par_collaborators_soft_delete_chk`. Procurar pelo sufixo majoritário conclui, errado, que `par_collaborators` não tem soft-delete.

- **Geografia são DUAS coisas, e confundi-las é o erro clássico aqui.** O **catálogo** IBGE (`state.ts`, `municipality.ts`, `municipalities.data.ts`) é read-only, seed estático de build-time, **sem tabela e sem persistência** — constante de domínio. A **parceria territorial** (`partner-state.ts`, `partner-municipality.ts`) é Entity com `activate`/`deactivate`/`reactivate`, persistida em `par_states`/`par_municipalities` **com soft-delete**, e apenas referencia o catálogo. Os nomes de tabela são `par_states`/`par_municipalities`; **`partner_states` não existe**. Ler "geografia é lookup imutável" e aplicar isso às tabelas produz consulta que ignora parceria desativada.

- **`Collaborator` tem duas dimensões de estado ORTOGONAIS — e é dele, não do `Act`.** `registrationStatus` (`PreRegistration` → `Complete`) é o avanço do cadastro; `active`/`deactivated_at` é o soft-delete. Um colaborador pode estar `Complete` e inativo, ou `PreRegistration` e ativo. O `Act` tem apenas `status` (`Active`/`Inactive`). Na borda HTTP o campo `status` carrega o `registrationStatus` e `active` viaja separado, por fidelidade ao contrato legado.

- **VOs no shared kernel: `Cpf`, `Cnpj`, `Money`, `NonZeroMoney`, `Period`, `PlainDate`, `UserRef`.** **`Email` NÃO está lá** — vive em `auth/domain/identity/email.ts`, e alcançá-lo daqui atravessaria a fronteira do ADR-0006. Para o CNPJ alfanumérico, ver [ADR-0044](../../handbook/architecture/adr/0044-cnpj-alphanumeric-kernel.md).

- **Enum legado vira string literal union EN kebab-case, com quatro exceções literais.** `race` e `genderIdentity` espelham categorias oficiais do IBGE (traduzir distorce a semântica); `serviceCategory` tem ~40 valores **incluindo o typo legado `ONGANIZACAO_DE_EVENTOS`**; `occupationArea` são siglas internas (`PARC`/`DDI`/`DCE`/`EPV`). ⚠️ Corrigir o typo **quebra o ETL** — ele é intencional.

- **Só dois eventos de supplier cruzam para o `financial`, e o compilador cobra.** `supplier-outbox.mapper.ts` declara `type PublishableEventType = 'SupplierRegistered' | 'SupplierEdited'` ([ADR-0043](../../handbook/architecture/adr/0043-partners-supplier-integration-events.md)). O domínio emite quatro eventos de supplier; acrescentar um quinto **não o publica por acidente**, porque o tipo não deixa. `SupplierDeactivated`/`Reactivated` ficam fora do contrato por não mudarem nome nem CNPJ, que é o que o read-model consome.
