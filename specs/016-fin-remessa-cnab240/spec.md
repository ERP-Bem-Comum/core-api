# Feature Specification: Geração de arquivo de remessa CNAB 240 (Bradesco)

**Feature Branch**: `016-fin-remessa-cnab240`

**Created**: 2026-06-17

**Status**: Draft

**Input**: Sub-fatia da Fatia 3 (#58) do épico Financeiro (#64) — APENAS a geração da remessa. O retorno/importação fica para a sub-fatia seguinte.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Gerar remessa dos títulos aprovados elegíveis (Priority: P1)

O Operador de Contas a Pagar dispara a geração da remessa bancária. O sistema reúne os títulos no estado `Aprovado` cuja forma de pagamento é **TED** ou **Transferência Bancária**, traduz para o arquivo CNAB 240 do Bradesco e marca esses títulos como `Transmitido`.

**Why this priority**: É o coração da Fatia 3 — sem o arquivo de remessa não há como ordenar pagamentos ao banco. Entrega valor sozinha: o operador passa a exportar pagamentos em lote em vez de lançar um a um.

**Independent Test**: Com ≥1 título `Aprovado` (TED/Transferência) semeado, executar a geração e verificar que (a) um arquivo CNAB 240 é produzido, (b) os títulos incluídos passam a `Transmitido`, (c) um lote de remessa é registrado.

**Acceptance Scenarios**:

1. **Given** 2 títulos `Aprovado` com forma TED, **When** o operador gera a remessa, **Then** o sistema produz um arquivo CNAB 240 contendo ambos e os dois títulos passam a `Transmitido`.
2. **Given** a remessa gerada, **When** consultada, **Then** o lote registra o conjunto de títulos incluídos, a data de geração e um hash de integridade.
3. **Given** títulos `Aprovado` com forma TED **e** títulos `Aprovado` com forma PIX/Boleto, **When** o operador gera a remessa, **Then** somente os TED/Transferência entram; os demais permanecem `Aprovado`.

---

### User Story 2 - Integridade e escopo correto da remessa (Priority: P2)

A remessa carrega um checksum que garante que o arquivo entregue ao banco é exatamente o que o sistema gerou, e contém **apenas** títulos elegíveis.

**Why this priority**: Sem integridade, uma adulteração do arquivo antes do banco passaria despercebida (risco financeiro). Sem o escopo correto, pagamentos manuais seriam transmitidos indevidamente.

**Independent Test**: Gerar a remessa e verificar que o hash registrado corresponde ao conteúdo do arquivo; alterar o conteúdo e verificar que o hash não bate.

**Acceptance Scenarios**:

1. **Given** uma remessa gerada, **When** o hash é recalculado sobre o conteúdo do arquivo, **Then** ele coincide com o hash registrado no lote.
2. **Given** um título `Aprovado` com forma Cartão Corporativo/Câmbio/Guia/Outro, **When** a remessa é gerada, **Then** esse título não é incluído.

---

### User Story 3 - Não-duplicação e remessa vazia (Priority: P3)

Um título já transmitido não entra de novo numa nova remessa, e uma geração sem títulos elegíveis não produz arquivo.

**Why this priority**: Evita dupla ordem de pagamento (risco de pagar duas vezes) e dá feedback claro quando não há o que transmitir.

**Independent Test**: Gerar a remessa duas vezes seguidas e verificar que a segunda não reinclui os títulos já `Transmitido`; gerar sem títulos elegíveis e verificar a recusa.

**Acceptance Scenarios**:

1. **Given** títulos já `Transmitido`, **When** o operador gera nova remessa, **Then** esses títulos não são reincluídos.
2. **Given** nenhum título `Aprovado` elegível, **When** o operador gera a remessa, **Then** nenhum arquivo é gerado e o operador é informado de que não há títulos a transmitir.

---

### Edge Cases

- **Nenhum título elegível**: não gera arquivo; retorna erro de negócio claro (sem lote registrado).
- **Falha de tradução de layout** (dado de um título inválido para o CNAB): a geração inteira falha e **nenhum** título muda de estado (atomicidade).
- **Título com valor inválido** (zero/negativo) elegível por forma de pagamento: rejeitado antes de compor o arquivo.
- **Dados do cedente ausentes/ inválidos** (conta-débito Bradesco): a geração falha com erro claro, sem efeito colateral.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: O sistema MUST permitir gerar um arquivo de remessa agrupando os títulos no estado `Aprovado` cuja forma de pagamento seja **TED** ou **Transferência Bancária** (R5.1).
- **FR-002**: O sistema MUST excluir da remessa títulos com qualquer outra forma de pagamento (PIX, Boleto, Cartão Corporativo, Câmbio, Guia de Recolhimento, Outro), que permanecem no fluxo manual.
- **FR-003**: O sistema MUST produzir o arquivo no layout **CNAB 240 do Bradesco** (segmentos P/Q/J), por meio de uma camada de tradução que isola o formato do domínio — o núcleo financeiro não conhece posições/strings fixas do CNAB (R3, ACL).
- **FR-004**: O sistema MUST calcular e registrar um **hash de integridade** (checksum) do arquivo no momento da geração (R2).
- **FR-005**: Ao gerar a remessa com sucesso, o sistema MUST transicionar cada título incluído de `Aprovado` para `Transmitido`.
- **FR-006**: O sistema MUST registrar o lote de remessa gerado (tipo `Remessa`) com seu hash, data de geração, numeração sequencial e a relação dos títulos incluídos.
- **FR-007**: Após persistir a remessa, o sistema MUST publicar os eventos de integração de **remessa gerada** e de **título transmitido** (um por título incluído).
- **FR-008**: Se não houver títulos elegíveis, o sistema MUST NOT gerar arquivo e MUST informar o operador (erro de negócio "sem títulos a transmitir").
- **FR-009**: A geração MUST ser atômica: se a tradução de layout ou a persistência falhar, nenhum título muda de estado e nenhum lote é registrado.
- **FR-010**: Um título já `Transmitido` MUST NOT ser incluído em uma nova remessa (proteção contra dupla transmissão).
- **FR-011**: O sistema MUST compor o cabeçalho da remessa com os dados do **cedente** (conta-débito Bradesco da organização), obtidos da configuração do sistema.
- **FR-012**: O arquivo gerado MUST ser disponibilizado para download/recuperação pelo operador (o envio efetivo à VAN/banco é fora de escopo desta sub-fatia).

### Key Entities _(include if feature involves data)_

- **Lote de Comunicação (Remessa)**: representa um arquivo de remessa gerado. Atributos: identificador, tipo (`Remessa`), status, hash de integridade, numeração sequencial, data de geração, conjunto de títulos incluídos.
- **Título (existente)**: referenciado pela remessa; sofre a transição `Aprovado → Transmitido`. Possui forma de pagamento (determina elegibilidade) e valor.
- **Dados do Cedente (configuração)**: agência/conta/convênio Bradesco da organização, usados no cabeçalho da remessa.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% dos títulos elegíveis (`Aprovado` + TED/Transferência) presentes no momento da geração entram na remessa; 0% dos não-elegíveis.
- **SC-002**: 100% dos arquivos gerados a partir de dados válidos são aceitos por uma validação do layout CNAB 240 Bradesco (estrutura de segmentos P/Q/J e cabeçalhos/trailers corretos).
- **SC-003**: Após cada geração bem-sucedida, 100% dos títulos incluídos estão em `Transmitido` e o lote possui hash registrado que coincide com o conteúdo do arquivo.
- **SC-004**: Em qualquer falha de geração, 0 títulos ficam em estado inconsistente (nenhum parcialmente transmitido) e nenhum lote órfão é registrado.
- **SC-005**: Gerar a remessa duas vezes em sequência não reinclui nenhum título já `Transmitido` (0 duplicatas de transmissão).

## Impacto Arquitetural (core-api) _(obrigatório se a feature toca `src/`)_

- **Bounded Contexts afetados**: [x] Financeiro (`fin_*`) · [ ] Contratos · [ ] Auth · [ ] Parceiros
  - Toca **apenas** o Financeiro — não ofende ADR-0014.
- **Novos agregados / Value Objects?**: agregado de **Lote de Remessa** (`LoteComunicacao` tipo Remessa) com hash; VOs candidatos: `RemittanceHash`/checksum, `RemittanceSequence` (numeração), forma de pagamento já existente. Cada um exige smart constructor + branded type + `Result<T,E>`.
- **Novos eventos de domínio (outbox)?**: `ArquivoRemessaGerado` e `TituloTransmitido` (nomenclatura EN-passado a definir no plano; contrato registrado em `handbook/architecture/`).
- **Borda HTTP envolvida?**: provável — endpoint para disparar a geração e recuperar o arquivo (o `financial` já expõe `/api/v2/financial/*`). Detalhe no plano.
- **Storage**: o arquivo de remessa pode ser persistido em object-storage (ADR-0019, S3/MinIO) — decisão do plano.
- **ACL (Tradutor de Layout)**: componente que traduz domínio→CNAB 240 Bradesco; o guideline Bradesco é **local-only** (`handbook/guidelines/bradesco_guideline/`), nada commitável (R3).
- **ADRs candidatos da fatia**: layout/ACL CNAB, algoritmo de hash de integridade, numeração sequencial de remessa.
- **Possíveis violações da constituição (I–VIII)?**: nenhuma prevista (1 BC, sem JSON nativo, sem broker novo).

## Assumptions

- **Escopo desta sub-fatia = somente geração.** Importação de retorno, acatamento/recusa, extrato D+1, conciliação e a transição `Transmitido → Recusado`/`Pago` ficam para sub-fatias seguintes da Fatia 3.
- **Apenas Bradesco** nesta fatia; multi-banco (Itaú/Santander) é evolução futura via novas "receitas" de tradução (a ACL já prevê).
- **Dados do cedente** (conta-débito Bradesco da organização) existem como configuração do sistema.
- **Uma remessa por execução**, agrupando todos os títulos elegíveis no instante da geração.
- **Numeração sequencial de remessa** mantida por um contador persistido.
- **Envio à VAN/banco é externo** — esta fatia entrega o arquivo + o hash; a transmissão física não é automatizada aqui.
- Títulos no estado `Aprovado` já existem (entregue na fatia 1, na `dev`).
- Acatamento **não** altera status (R5) — irrelevante nesta sub-fatia (sem retorno), mas registrado para não introduzir transição indevida.
