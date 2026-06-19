# Feature Specification: Conta Cedente para Conciliação Bancária (extensão do agregado)

**Feature Branch**: `019-fin-recon-cedente-account`

**Created**: 2026-06-19

**Status**: Draft

**Input**: User description: "Conta Cedente para Conciliação Bancária (issue #138, FIN-RECON-CEDENTE-ACCOUNT, feature #60 / épico #64). Estender o agregado `fin_cedente_accounts` existente (criado pela 016/CNAB) com campos de conciliação (tipo, apelido, saldo de abertura + data, nome do banco); adicionar use-cases create/edit/close e a borda HTTP de CRUD + encerrar; conta encerrada bloqueia import de extrato e conciliação."

## Clarifications

### Session 2026-06-19 (decisões de escopo já tomadas com o P.O./time)

- Q: A conta cedente da conciliação é a mesma entidade da conta cedente da remessa (016/CNAB) ou uma nova? → A: **A mesma** — é a conta bancária da organização de onde sai o pagamento. Esta feature **estende** o agregado `fin_cedente_accounts` existente; **não** cria um agregado separado.
- Q: O agregado/tabela/port/repos/mapper já existem (016)? → A: **Sim.** Já existem o domínio (`create`, `isActive`, `isClosed`, `close()` + guard `cedente-account-already-closed`; status `Active`/`Closed`), a tabela `fin_cedente_accounts` (migration `0004`), o port, os repos Drizzle/InMemory e o mapper. **Faltam** os campos de conciliação, os use-cases e a borda HTTP.

### Session 2026-06-19 (clarify) — resolvido

- Q: Como autorizar as operações de conta cedente (ler/criar/editar/encerrar)? → A: **Criar permissão dedicada `bank-account:read|write`** no permission-catalog (mesmo padrão de `reconciliation:*` da #176). Codificado em FR-014.
- Q: Após a conta ter histórico (extrato importado/conciliações), o que é editável? → A: **Travar dados bancários** — com histórico, só `apelido` e `bankName` (rótulos) são editáveis; `bankCode`/`agency`/`accountNumber`/`accountDigit` ficam imutáveis (preserva a integridade do `debit_account_ref`). Sem histórico, tudo é editável. Codificado em FR-008.
- Q: Impedir cadastrar a mesma conta bancária duas vezes? → A: **Sim** — único por (`bankCode` + `agency` + `accountNumber` + `accountDigit`); o CNPJ continua não-único (a organização pode ter várias contas). Codificado em FR-016.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Cadastrar e listar a conta cedente (Priority: P1)

O Operador de Conciliação cadastra a conta bancária da organização (banco, tipo, agência, conta + dígito, apelido) para que ela apareça no **grid de contas** — a tela inicial da conciliação — e possa, em seguida, receber importação de extrato. Sem uma conta cadastrada, não há onde importar nem conciliar.

**Why this priority**: É a menor fatia que entrega valor e desbloqueia o resto. O import de extrato (#120) referencia `debit_account_ref`, que só existe se a conta puder ser criada e listada. Sozinha já é um MVP demonstrável (cadastro + grid).

**Independent Test**: Criar uma conta via `POST /api/v2/financial/cedente-accounts` com banco/tipo/agência/conta-DV/apelido e verificar que (a) ela é retornada na listagem (`GET …/cedente-accounts`) com status `ativa`, e (b) é recuperável por id (`GET …/cedente-accounts/:id`).

**Acceptance Scenarios**:

1. **Given** nenhum dado faltando, **When** o Operador cria uma conta com banco (código + nome), tipo, agência, conta + dígito e apelido, **Then** a conta é persistida com `status = ativa` e retornada com seu id.
2. **Given** um campo obrigatório em branco (código do banco, agência, número da conta ou documento), **When** o Operador tenta criar, **Then** a criação é rejeitada com erro de validação claro e nenhuma conta é persistida.
3. **Given** uma ou mais contas cadastradas, **When** o Operador abre o grid, **Then** a listagem retorna todas as contas com seus campos e status.
4. **Given** um `tipo` fora de `corrente|poupanca|investimento`, **When** o Operador tenta criar, **Then** a criação é rejeitada.
5. **Given** uma conta já cadastrada, **When** o Operador tenta criar outra com o mesmo banco + agência + conta + dígito, **Then** a criação é rejeitada (conta duplicada — FR-016).

---

### User Story 2 - Encerrar a conta e bloquear operações (Priority: P2)

O Operador encerra uma conta que não está mais em uso. A conta encerrada permanece visível (histórico), mas **não pode mais receber importação de extrato nem conciliação**. Esta é a origem real do guard `account-closed` / FR-015 já citado pela #123.

**Why this priority**: É o que torna o ciclo de vida da conta seguro e desbloqueia o guard de que a #123 depende. Incremental sobre a US1 (precisa de uma conta criada para encerrar).

**Independent Test**: Encerrar uma conta ativa (`POST …/cedente-accounts/:id/close`), verificar `status = encerrada`; então tentar importar extrato e conciliar contra ela e verificar que ambas as operações são rejeitadas com o motivo `account-closed`.

**Acceptance Scenarios**:

1. **Given** uma conta ativa, **When** o Operador a encerra, **Then** o `status` passa a `encerrada` (Closed).
2. **Given** uma conta já encerrada, **When** o Operador tenta encerrá-la de novo, **Then** a operação é rejeitada com `cedente-account-already-closed` (guard já existente, reusado).
3. **Given** uma conta encerrada, **When** se tenta importar extrato para ela, **Then** o import é rejeitado com `account-closed`.
4. **Given** uma conta encerrada, **When** se tenta conciliar uma transação contra ela, **Then** a conciliação é rejeitada com `account-closed`.

---

### User Story 3 - Editar os dados da conta (Priority: P2)

O Operador corrige dados de uma conta cadastrada (ex.: apelido, nome do banco, ou dados bancários digitados errado) sem precisar recriá-la.

**Why this priority**: Necessário para operação real (erros de digitação acontecem), mas incremental sobre a US1. O que é editável depende da existência de histórico (FR-008, resolvido no clarify).

**Independent Test**: A partir de uma conta criada, alterar o apelido via `PATCH …/cedente-accounts/:id` e verificar que a listagem e o `GET …/:id` refletem o novo valor.

**Acceptance Scenarios**:

1. **Given** uma conta sem histórico, **When** o Operador altera o apelido e/ou o nome do banco, **Then** a conta é atualizada e os novos valores são refletidos na listagem e na consulta por id.
2. **Given** uma conta SEM histórico (sem extrato/conciliação), **When** o Operador altera dados bancários (agência/conta-DV), **Then** a conta é atualizada.
3. **Given** uma conta COM histórico (extrato importado ou conciliações), **When** o Operador tenta alterar banco/agência/conta-DV, **Then** a alteração é rejeitada; apenas apelido e nome do banco podem ser alterados (FR-008).

---

### User Story 4 - Saldo de abertura para conciliação retroativa (Priority: P3)

O Operador informa, opcionalmente, um saldo de abertura e a data correspondente, habilitando a conciliação de transações **anteriores** à primeira importação de extrato (conciliação retroativa).

**Why this priority**: Aumenta a cobertura (contas migradas com histórico anterior), mas é opcional e não bloqueia o MVP de cadastro/import.

**Independent Test**: Criar uma conta informando `saldoAberturaCents` + `dataSaldoAbertura` e verificar que ambos são persistidos e recuperados; criar outra sem esses campos e verificar que continua válida (campos opcionais).

**Acceptance Scenarios**:

1. **Given** uma conta nova, **When** o Operador informa saldo de abertura + data, **Then** ambos são persistidos e retornados na consulta.
2. **Given** uma conta nova sem saldo de abertura, **When** o Operador a cria, **Then** a conta é válida e os campos de saldo ficam ausentes (opcionais).

---

### Edge Cases

- **Conta criada pela 016 (sem campos novos)**: ao listar/consultar uma conta pré-existente que não tem `tipo`/`apelido`/saldo/`bankName`, o sistema a apresenta sem erro (campos novos são opcionais — extensão não-quebrante).
- **Documento da organização (CNPJ) repetido**: duas contas com o mesmo `document` mas agências/contas diferentes são permitidas (uma organização pode ter várias contas) — não há unicidade por documento.
- **Saldo de abertura sem data (ou vice-versa)**: informar um sem o outro é rejeitado (par coeso) — ver FR-006.
- **Encerrar conta que possui conciliações em aberto**: o encerramento não apaga histórico; apenas impede novas operações (ver US2).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: O sistema MUST permitir criar uma conta cedente com código do banco, nome do banco, `tipo`, agência, número da conta + dígito, apelido e documento (CNPJ) da organização.
- **FR-002**: O sistema MUST rejeitar a criação quando código do banco, agência, número da conta ou documento estiverem em branco (reusa as validações já existentes do agregado).
- **FR-003**: O sistema MUST aceitar `tipo` apenas em `corrente | poupanca | investimento`.
- **FR-004**: O sistema MUST registrar `apelido` na criação como nome de exibição da conta no grid.
- **FR-005**: O sistema MUST aceitar `saldoAberturaCents` e `dataSaldoAbertura` como **opcionais**; quando presentes, habilitam conciliação retroativa a partir da data informada.
- **FR-006**: O sistema MUST tratar saldo de abertura e data como um par coeso — informar um sem o outro é rejeitado.
- **FR-007**: O sistema MUST listar as contas cedente (grid) com seus campos e status, e permitir consulta individual por id.
- **FR-008**: O sistema MUST permitir editar a conta. Enquanto a conta **não** tiver histórico (sem extrato importado nem conciliação), todos os campos são editáveis. **Após** ter histórico, apenas `apelido` e `bankName` (rótulos) permanecem editáveis; `bankCode`/`agency`/`accountNumber`/`accountDigit` tornam-se imutáveis (preserva a integridade do `debit_account_ref`) e a tentativa de alterá-los é rejeitada.
- **FR-009**: O sistema MUST permitir encerrar uma conta ativa, levando seu `status` a `encerrada` (Closed).
- **FR-010**: O sistema MUST rejeitar o encerramento de uma conta já encerrada com `cedente-account-already-closed` (guard já existente).
- **FR-011**: O sistema MUST impedir importação de extrato para uma conta encerrada, rejeitando com `account-closed`.
- **FR-012**: O sistema MUST impedir conciliação contra uma conta encerrada, rejeitando com `account-closed` (origem real do guard FR-015 citado pela #123).
- **FR-013**: O sistema MUST preservar a compatibilidade com contas criadas pela 016 — os campos novos são opcionais e contas pré-existentes continuam válidas e carregáveis (extensão não-quebrante).
- **FR-014**: O sistema MUST proteger as operações de conta cedente por autorização via permissão dedicada `bank-account:read` (listar/consultar) e `bank-account:write` (criar/editar/encerrar), registrada no permission-catalog (mesmo padrão de `reconciliation:*` da #176).
- **FR-015**: O sistema MUST NOT calcular nesta feature saldo consolidado nem contadores agregados do grid — isso é responsabilidade de um read-model em issue separada (fora de escopo).
- **FR-016**: O sistema MUST impedir o cadastro de conta duplicada — a combinação (`bankCode`, `agency`, `accountNumber`, `accountDigit`) é única; uma tentativa de criar conta com a mesma combinação é rejeitada. O documento (CNPJ) **não** é único (a organização pode ter múltiplas contas).

### Key Entities _(include if feature involves data)_

- **ContaCedente** (`fin_cedente_accounts`, agregado existente — **estendido**): representa a conta bancária da organização (cedente / D-CEDENTE) de onde sai o pagamento.
  - Atributos já existentes (016/CNAB, preservados): identidade, código do banco, agência, número da conta, dígito, convênio, documento (CNPJ), `status` (`Active`/`Closed`), `nextNsa` (uso exclusivo da remessa 016).
  - Atributos **novos** (conciliação): `tipo` (`corrente|poupanca|investimento`), `apelido`, `bankName` (nome do banco), `saldoAberturaCents` (opcional), `dataSaldoAbertura` (opcional).
  - Relacionamento: é referenciada pelo import de extrato e pela conciliação via `debit_account_ref` (#120/#123).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: O Operador consegue cadastrar uma conta cedente e vê-la no grid de contas numa única operação de criação seguida de uma listagem (sem passos intermediários).
- **SC-002**: 100% das contas cedente pré-existentes (criadas pela 016) continuam sendo listadas e consultadas sem erro após a extensão (não-quebrante).
- **SC-003**: 100% das tentativas de importar extrato ou conciliar contra uma conta encerrada são rejeitadas com motivo `account-closed`.
- **SC-004**: Uma conta com saldo de abertura + data permite conciliar transações datadas antes da primeira importação (conciliação retroativa), enquanto uma conta sem esses campos não oferece essa capacidade.

## Impacto Arquitetural (core-api) _(obrigatório se a feature toca `src/`)_

- **Bounded Contexts afetados**: [ ] Contratos (`ctr_*`) · [x] Financeiro (`fin_*`) · [ ] Auth (`auth_*`) · [ ] Parceiros (`partners_*`)
  - Toca **apenas** o BC Financeiro — isolamento por prefixo `fin_*` preservado (ADR-0014).
- **Novos agregados / Value Objects?**: **Nenhum agregado novo** — estende o agregado `ContaCedente` existente (`src/modules/financial/domain/cedente/`). Os campos novos exigem extensão de `types.ts`, do smart constructor `create` e dos `Result<T,E>`. Avaliar VO para `tipo` (union literal) e para o par saldo+data (coesão de FR-006).
- **Novos eventos de domínio (outbox)?**: **Nenhum** — operações CRUD locais; sem evento cross-módulo (não-produtor nesta feature).
- **Novos subcomandos de CLI?**: Nenhum (CLI embutida removida — ADR-0037).
- **Borda HTTP envolvida?**: **Sim** — `POST/GET/GET:id/PATCH /api/v2/financial/cedente-accounts` + `POST …/:id/close`. Borda Fastify + validação Zod (ADR-0027 contract-first, ADR-0037).
- **Possíveis violações da constituição (I–VIII)?**: Nenhuma prevista. Mapeamentos canônicos (ADR-0018/0020): UUID em `varchar(36)`, Money em `bigint` cents (`saldoAberturaCents`), `tipo` e `status` via `varchar` + `CHECK` (sem `ENUM`), sem `JSON` nativo. A migration nova adiciona colunas **NULLABLE** à tabela existente (não-quebrante para as linhas da 016).

## Assumptions

- O `apelido` é obrigatório na criação (nome de exibição no grid); contas legadas da 016 sem apelido continuam válidas (campo opcional na persistência por compatibilidade).
- `bankName` é texto livre informado junto ao código do banco — **não** há, nesta feature, consulta a um registro/tabela FEBRABAN de bancos.
- `convenio` e `nextNsa` permanecem campos exclusivos da remessa (016) e **não** são tocados por esta feature.
- `tipo` é um rótulo/classificação da conta; não altera, por si só, o comportamento de pagamento ou de conciliação.
- O `status` `Active`/`Closed` e o guard `close()` (`cedente-account-already-closed`) já existentes são **reusados**, não reescritos.
- O guard `account-closed` referenciado por FR-011/FR-012 é a materialização do FR-015 citado pela #123; a implementação concreta de onde o guard é aplicado (import e conciliação) fica para o plano.
- A unicidade de conta é por (`bankCode` + `agency` + `accountNumber` + `accountDigit`), não por documento (CNPJ) — uma organização pode ter múltiplas contas (FR-016).
- O índice único de FR-016 assume que **não** há duplicatas pré-existentes nas linhas criadas pela 016; o plano deve validar isso antes de aplicar a constraint (e a permissão `bank-account:read|write` é nova no permission-catalog).
