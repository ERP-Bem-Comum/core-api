# Feature Specification: Módulo Financeiro — Fatia 1: Gestão de Documentos + Geração de Títulos

**Feature Branch**: `feat/fin-module`

**Created**: 2026-06-15

**Status**: Draft

**Input**: Fatia 1 do Módulo Financeiro — Gestão de Documentos (Fato Gerador) + geração automática de Títulos (Pai + Filhos) + máquina de estados Rascunho→Aberto→Aprovado. Fonte de domínio: `handbook/domain_questions/financeiro/`. Discovery (Fase 0): `./discovery.md`.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Lançar documento não-fiscal e gerar título pai (Priority: P1)

O Operador de Contas a Pagar registra manualmente um documento não-fiscal (Boleto, Recibo, Imposto) ou uma Fatura, informando valor bruto, fornecedor, vencimento e forma de pagamento. Ao salvar, o sistema cria automaticamente **um único título pai** com o valor líquido, em status `Aberto`, vinculado ao documento.

**Why this priority**: É a menor fatia que já entrega o conceito central de "Fato Gerador → obrigação a pagar". Sozinha já é um MVP demonstrável: lançar um documento e ver o título nascer.

**Independent Test**: Salvar um Boleto de R$ 1.000,00 sem retenções e verificar que existe 1 título pai de R$ 1.000,00 em `Aberto` vinculado ao documento, sem títulos filhos.

**Acceptance Scenarios**:

1. **Given** um documento Boleto com valor bruto R$ 1.000,00 e nenhuma retenção, **When** o Operador salva o documento, **Then** é criado 1 título pai de R$ 1.000,00 em `Aberto` e nenhum título filho.
2. **Given** uma Fatura com bruto R$ 5.000,00 e desconto comercial R$ 200,00, **When** salva, **Then** o título pai é R$ 4.800,00 (líquido) em `Aberto`.
3. **Given** um documento sem fornecedor informado, **When** o Operador tenta salvar, **Then** o salvamento é rejeitado com mensagem de campo obrigatório.

---

### User Story 2 - Lançar documento fiscal com retenções e gerar pai + filhos (Priority: P1)

O Operador registra um documento fiscal com retenções (NFS-e ou RPA). Ao salvar, o sistema calcula o valor líquido e gera **um título pai (líquido) mais um título filho por imposto retido**, todos em `Aberto`. Impostos apenas registrados (ICMS, IPI, PIS, COFINS, CBS, IBS) são guardados, mas não geram filhos nem afetam o líquido.

**Why this priority**: Exercita a regra-mãe do domínio — cálculo do líquido e geração de filhos por tipo de documento. É o coração do "Document-Driven Finance".

**Independent Test**: Salvar uma NFS-e com Bruto 1.000, desconto na fonte 50, retenções ISS 50 / IRRF 15 / INSS 110 e verificar pai = R$ 775,00 + 3 filhos; CBS/IBS apenas registrados.

**Acceptance Scenarios**:

1. **Given** NFS-e com Bruto R$ 1.000,00, desconto na fonte R$ 50,00, ISS R$ 50,00, IRRF R$ 15,00, INSS R$ 110,00, **When** salva, **Then** pai = R$ 775,00 e há 3 filhos (ISS R$ 50, IRRF R$ 15, INSS R$ 110), todos em `Aberto`.
2. **Given** uma NFS-e que também registra CBS R$ 90,00 e IBS Municipal R$ 30,00, **When** salva, **Then** CBS e IBS ficam registrados no documento e **não** alteram o líquido nem geram filhos.
3. **Given** um RPA com retenções IRRF/INSS/CSRF, **When** salva, **Then** gera pai + 3 filhos (IRRF, INSS, CSRF).
4. **Given** uma DANFE com ICMS/IPI/PIS/COFINS, **When** salva, **Then** gera **apenas 1 título pai** (impostos só registrados, sem filhos).

---

### User Story 3 - Aprovar documento com herança aos filhos (Priority: P1)

O Aprovador revisa um título em `Aberto` e o aprova. O título pai e todos os seus filhos passam para `Aprovado` em conjunto, e os campos vitais (valor, fornecedor, vínculos, impostos) tornam-se imutáveis. O Operador não pode executar a aprovação.

**Why this priority**: Fecha o ciclo mínimo "lançar → aprovar" e ativa a governança (separação de funções + travamento).

**Independent Test**: Com um título pai `Aberto` que tem 3 filhos, executar a aprovação como Aprovador e verificar que pai e os 3 filhos ficam `Aprovado` e que uma tentativa de editar o valor é rejeitada.

**Acceptance Scenarios**:

1. **Given** um título pai `Aberto` com 3 filhos, **When** o Aprovador aprova, **Then** pai e os 3 filhos passam para `Aprovado`.
2. **Given** um título `Aprovado`, **When** alguém tenta alterar o valor bruto ou o fornecedor, **Then** a operação é rejeitada (campo vital imutável).
3. **Given** um título `Aprovado`, **When** o Aprovador altera apenas Descrição ou Data de Vencimento, **Then** a alteração é aceita sem reabertura.
4. **Given** um usuário com perfil de Operador (sem permissão de aprovação), **When** ele tenta aprovar, **Then** a operação é negada.

---

### User Story 4 - Ajustar lançamento em Aberto (Priority: P2)

Antes da aprovação, o Operador ajusta os dados do documento em `Aberto` (valor bruto, retenções, descontos, juros/multa, vínculos), e o sistema recalcula o valor líquido e reflete nos títulos.

**Independent Test**: Em um documento `Aberto`, alterar o ISS de R$ 50 para R$ 40 e adicionar R$ 5 de juros, verificando que o líquido e o filho ISS são recalculados.

**Acceptance Scenarios**:

1. **Given** uma NFS-e `Aberto` com líquido R$ 775,00, **When** o Operador reduz o ISS para R$ 40,00 e adiciona R$ 5,00 de juros, **Then** o líquido passa a R$ 790,00 e o filho ISS reflete R$ 40,00.
2. **Given** um título já `Aprovado`, **When** o Operador tenta ajustar o valor bruto, **Then** a operação é rejeitada.

---

### User Story 5 - Desfazer aprovação (Priority: P2)

O Aprovador desfaz a aprovação de um título (`Aprovado` → `Aberto`) para permitir correções. Se os valores do pai forem alterados, os títulos filhos são excluídos fisicamente e recriados na próxima aprovação, refletindo as novas retenções.

**Independent Test**: Aprovar um título, desfazer a aprovação, alterar o bruto e reaprovar — verificando que os filhos antigos foram removidos e novos foram gerados.

**Acceptance Scenarios**:

1. **Given** um título `Aprovado` (não transmitido), **When** o Aprovador desfaz a aprovação, **Then** pai e filhos voltam para `Aberto`.
2. **Given** um título reaberto cujo bruto foi alterado, **When** é aprovado novamente, **Then** os filhos anteriores são excluídos (hard delete) e novos filhos são gerados com os valores atualizados.
3. **Given** um título reaberto sem alteração de valores, **When** é aprovado novamente, **Then** os filhos são reaproveitados (apenas reaprovados).

---

### User Story 6 - Cancelar documento em Aberto (Priority: P3)

O Operador cancela um documento que ainda está em `Aberto`, removendo fisicamente o documento e todos os seus títulos (pai e filhos). O cancelamento é proibido em qualquer outro status.

**Acceptance Scenarios**:

1. **Given** um documento em `Aberto`, **When** o Operador cancela, **Then** o documento e todos os títulos vinculados são excluídos (hard delete).
2. **Given** um documento cujo título já está `Aprovado`, **When** o Operador tenta cancelar, **Then** a operação é rejeitada.

---

### User Story 7 - Rascunho e submissão (Priority: P3)

O Operador salva um documento incompleto como `Rascunho` e, mais tarde, submete-o, promovendo-o para `Aberto` (o que dispara a geração/validação dos títulos).

**Acceptance Scenarios**:

1. **Given** um `Rascunho` com dados parciais, **When** o Operador o atualiza, **Then** as mudanças são persistidas sem validação de campos obrigatórios.
2. **Given** um `Rascunho` completo, **When** o Operador o submete, **Then** o documento vai para `Aberto` e os títulos são gerados; se faltarem campos obrigatórios, a submissão é rejeitada.

---

### Edge Cases

- **Líquido não-positivo**: documento cujas retenções/descontos zeram ou tornam o líquido negativo → o salvamento é rejeitado (um título pai precisa de valor positivo).
- **Tipo fiscal sem retenções**: NFS-e/RPA salvos sem nenhuma retenção → gera apenas o pai (nenhum filho), sem erro.
- **Imposto registrado em tipo que não o suporta**: registrar ICMS em um Boleto (não-fiscal) → rejeitado por tipo de documento incompatível.
- **Operação fora da máquina de estados**: aprovar um `Rascunho`, cancelar um `Aprovado`, desfazer aprovação de um `Aberto` → todas rejeitadas com erro de transição inválida.
- **Vínculo malformado**: fornecedor/contrato/programa com identificador inválido → rejeitado na borda por formato inválido.
- **Edição de filho em Aberto**: tentar alterar valor/favorecido de um título filho → rejeitado; apenas Descrição e Data de Vencimento são editáveis no filho (`titulos-liquidacao.md:72-74`).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: O sistema MUST permitir registrar um documento de um dos tipos: NFS-e, DANFE, RPA, Fatura, Boleto, Recibo, Imposto.
- **FR-002**: O sistema MUST calcular o valor líquido como `Bruto − Descontos na Fonte − Retenções − Descontos + Multa + Juros`. Impostos registrados (ICMS, IPI, PIS, COFINS, CBS, IBS) MUST NOT entrar no cálculo. O valor líquido MUST ser somente-leitura (nunca digitado).
- **FR-003**: Ao salvar/submeter um documento, o sistema MUST gerar automaticamente um título pai com o valor líquido, em status `Aberto`.
- **FR-004**: O sistema MUST gerar títulos filhos somente para NFS-e (ISS, IRRF, INSS, CSRF) e RPA (IRRF, INSS, CSRF). DANFE, Fatura, Boleto, Recibo e Imposto MUST NOT gerar filhos.
- **FR-005**: O sistema MUST registrar retenções (que geram filhos) e impostos registrados (apenas leitura), validando que o conjunto permitido corresponde ao tipo do documento.
- **FR-006**: O sistema MUST suportar a máquina de estados desta fatia: `Rascunho` → `Aberto` → `Aprovado`, com `Desfazer Aprovação` (`Aprovado`→`Aberto`) e `Cancelamento` (`Aberto`→excluído). Transições inválidas MUST ser rejeitadas.
- **FR-007**: A aprovação do título pai MUST aprovar automaticamente todos os filhos (herança). Cada título MUST manter ciclo de vida financeiro independente após a aprovação.
- **FR-008**: Após `Aprovado`, o sistema MUST tornar imutáveis os campos vitais (valor, fornecedor, contrato, plano orçamentário, categoria, impostos), permitindo editar apenas Descrição e Data de Vencimento.
- **FR-009**: O sistema MUST permitir desfazer a aprovação; se os valores do pai mudarem antes da nova aprovação, os filhos MUST sofrer hard delete e ser recriados; se não houver mudança de valores, os filhos MUST ser reaproveitados.
- **FR-010**: O sistema MUST permitir cancelar (hard delete de pai+filhos) somente quando o documento está em `Aberto`.
- **FR-011**: O sistema MUST permitir ajustar o lançamento enquanto em `Aberto`, recalculando o líquido e os filhos.
- **FR-012**: O sistema MUST impor a separação de funções: o Operador MUST NOT aprovar; apenas o Aprovador aprova e desfaz aprovação.
- **FR-013**: O documento MUST armazenar a forma de pagamento (TED, Transferência Bancária, PIX, Boleto, Cartão Corporativo, Câmbio, Guia de Recolhimento, Outro), sem efeito de remessa nesta fatia.
- **FR-014**: O documento MUST guardar os vínculos como referências por identificador: fornecedor (obrigatório), contrato, plano orçamentário, categoria e programa (opcionais nesta fatia), sem acoplar o domínio dono.
- **FR-015**: Cada mudança de estado relevante (documento salvo, título aprovado, aprovação desfeita, documento cancelado) MUST emitir um evento de domínio que sustente a trilha de auditoria.
- **FR-016**: O sistema MUST reconhecer os estados `Transmitido`, `Recusado`, `Pago` e `Conciliado` como existentes, porém sem transições disponíveis nesta fatia (reservados para fatias futuras).

### Key Entities

- **Documento (Fato Gerador)**: raiz da obrigação. Atributos: tipo (fiscal/não-fiscal), fornecedor (ref), vínculos opcionais (contrato, plano orçamentário, categoria, programa — refs), forma de pagamento, dados financeiros (bruto, descontos na fonte, retenções, impostos registrados, descontos, multa, juros, líquido calculado), metadados de origem (inclusão manual; flag de divergência). Compartilha o ciclo de vida com o título pai.
- **Título Financeiro (Pai/Filho)**: obrigação a pagar derivada do documento. Atributos: origem (documento), tipo (Pai|Filho), status, valor, vencimento, forma de pagamento. Pai = valor líquido; Filho = um imposto retido.
- **Retenção**: imposto que gera filho e abate do líquido. Atributos: tipo (ISS|IRRF|INSS|CSRF), base de cálculo, alíquota, valor.
- **Imposto Registrado**: imposto apenas lido/registrado. Atributos: tipo (ICMS|IPI|PIS|COFINS|CBS|IBS Municipal|IBS Estadual), base, alíquota, valor; nunca gera filho nem afeta o líquido.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% dos documentos salvos resultam em pelo menos 1 título pai cujo valor é exatamente o líquido calculado pela fórmula (zero divergência aritmética).
- **SC-002**: Para NFS-e/RPA, o número de filhos gerados é exatamente igual ao número de retenções informadas; para DANFE/Fatura/Boleto/Recibo/Imposto, o número de filhos é zero — em 100% dos casos.
- **SC-003**: Após a aprovação, 0% das tentativas de alterar campos vitais são bem-sucedidas (imutabilidade garantida).
- **SC-004**: 100% das operações fora da máquina de estados (ex.: cancelar `Aprovado`, aprovar como Operador) são rejeitadas com erro explícito.
- **SC-005**: O Operador conclui o lançamento de um documento fiscal com retenções (preencher + salvar + ver títulos) em menos de 3 minutos, com o cálculo do líquido feito pelo sistema sem digitação manual.
- **SC-006**: 100% das mudanças de estado relevantes produzem um registro auditável (quem/quando/o quê).

## Impacto Arquitetural (core-api) _(obrigatório se a feature toca `src/`)_

- **Bounded Contexts afetados**: [ ] Contratos (`ctr_*`) · [x] Financeiro (`fin_*`) · [ ] Auth (`auth_*`) · [ ] Parceiros (`partners_*`)
  - Toca apenas o BC Financeiro. Fornecedor/contrato/programa são **consumidos como refs leves** (sem importar domínios), preservando o isolamento do ADR-0014. O catálogo RBAC do `auth` será estendido com permissões do Financeiro (mudança aditiva no catálogo deploy-time, sem acoplar schemas).
- **Novos agregados / Value Objects?**: agregados `Document` (Fato Gerador) e `Payable` (Título, Pai/Filho). VOs: `DocumentId`, `PayableId` (branded); `Retention`, `RegisteredTax`; refs leves (`ContractRef`/`ProgramRef`/`BudgetPlanRef`/`CategoryRef` — formato UUID). Reúso de `Money` (`src/shared/kernel/money.ts`) e `SupplierRef` (`partners/public-api`). Cada VO exige smart constructor + `Result<T,E>`.
- **Novos eventos de domínio (outbox)?**: `DocumentSaved`, `PayableApproved`, `ApprovalUndone`, `DocumentCancelled`, `DocumentDraftSaved` (EN passado). Nenhum evento cross-módulo publicado nesta fatia (`TituloConciliado` é fatia futura) — o outbox é usado para a trilha interna/integração futura. Contratos de evento a registrar em `handbook/architecture/`.
- **Novos subcomandos de CLI?**: N/A — CLI embutida removida (ADR-0037 / CLI-RETIRE-EMBEDDED).
- **Borda HTTP envolvida?**: Sim. HTTP é a UX primária (ADR-0037). Rotas sob `/api/v1/` para documentos e títulos (detalhe no plano/contracts).
- **Possíveis violações da constituição (I–VIII)?**: nenhuma prevista. Atenção: refs orçamentárias sem módulo dono são intencionais (espelham `contracts.programId/budgetPlanId`) e devem ser justificadas como decisão de ADR no plano.

## Assumptions

- **Inclusão manual apenas**: não há OCR nesta fatia; os campos de metadados de OCR (valor original lido, flag de divergência) são entrada opcional. (decisão do P.O.)
- **Refs leves opcionais (proposto)**: plano orçamentário e categoria são **opcionais** no salvamento até existir o módulo Orçamento; fornecedor é obrigatório. _A ratificar em `/speckit-clarify` (Q1 do discovery)._
- **Validação por formato (proposto)**: as referências são validadas apenas quanto ao formato (UUID v4); a existência do fornecedor não é cross-checada via `partners` read port nesta fatia. _A ratificar em `/speckit-clarify` (Q2)._
- **Trilha por eventos (proposto)**: nesta fatia a auditoria se dá via emissão de eventos de domínio; uma timeline por-campo (estilo `contracts/timeline`) fica para fatia futura. _A ratificar em `/speckit-clarify` (Q3)._
- **Autosave é do cliente**: o backend expõe salvar/atualizar rascunho; o salvamento automático periódico é responsabilidade da UI.
- **Moeda única**: valores em Real (BRL), Money em centavos (`bigint`); sem multi-moeda.
- **Identidade do documento**: número/série são dados de entrada do usuário; a identidade interna é um UUID. (Identidade dupla número-de-negócio, se necessária, será decidida no plano, espelhando `programs`/`contracts`.)
- **Reúso confirmado**: `SupplierRef` + read port (`partners/public-api`), `ProgramsReadPort` (`programs/public-api`), padrões de Outbox (ADR-0015) e Storage (ADR-0019) já existem e serão reutilizados.
