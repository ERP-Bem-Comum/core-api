# Feature Specification: Geração de arquivo de remessa CNAB 240 (Bradesco)

**Feature Branch**: `016-fin-remessa-cnab240`

**Created**: 2026-06-17

**Status**: Draft

**Input**: Sub-fatia da Fatia 3 (#58) do épico Financeiro (#64) — APENAS a geração da remessa. O retorno/importação fica para a sub-fatia seguinte.

## Clarifications

### Session 2026-06-17

- Q: Como o arquivo de remessa gerado deve ser entregue/persistido? → A: Persistido em object-storage (S3/MinIO, ADR-0019); a resposta retorna referência p/ download e o hash é calculado sobre o blob persistido.
- Q: Quais títulos entram na remessa quando o operador dispara a geração? → A: O operador **seleciona um subconjunto** explícito de títulos (lista), não "todos os elegíveis".
- Q: A organização tem uma única conta-débito (cedente) Bradesco ou múltiplas? → A: **Múltiplas contas** — os títulos selecionados são agrupados por conta-cedente e a geração produz **um arquivo/lote por conta**.
- Q: Como gerar a numeração sequencial do arquivo (NSA, header CNAB)? → A: Contador **monotônico por conta-cedente**, persistido, nunca reutilizado (mesmo em re-geração/falha).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Gerar remessa(s) a partir dos títulos selecionados (Priority: P1)

O Operador de Contas a Pagar **seleciona** um conjunto de títulos no estado `Aprovado` (forma de pagamento TED ou Transferência Bancária) e dispara a geração. O sistema agrupa os selecionados **por conta-cedente**, traduz cada grupo para um arquivo CNAB 240 do Bradesco, persiste cada arquivo no object-storage e marca os títulos incluídos como `Transmitido`.

**Why this priority**: É o coração da Fatia 3 — sem o arquivo de remessa não há como ordenar pagamentos ao banco. Entrega valor sozinha: o operador passa a exportar pagamentos em lote, escolhendo o que transmitir.

**Independent Test**: Selecionar ≥1 título `Aprovado` (TED/Transferência) e executar a geração; verificar que (a) um arquivo CNAB 240 por conta-cedente é produzido e persistido, (b) os títulos incluídos passam a `Transmitido`, (c) um lote de remessa por conta é registrado com hash e NSA.

**Acceptance Scenarios**:

1. **Given** 2 títulos `Aprovado` (TED) da **mesma** conta-cedente selecionados, **When** o operador gera a remessa, **Then** o sistema produz **um** arquivo CNAB 240 contendo ambos, persiste-o no storage e os dois títulos passam a `Transmitido`.
2. **Given** títulos selecionados de **duas** contas-cedente distintas, **When** o operador gera a remessa, **Then** o sistema produz **dois** lotes/arquivos (um por conta), cada um com seu próprio NSA e hash.
3. **Given** a remessa gerada, **When** consultada, **Then** cada lote registra os títulos incluídos, a conta-cedente, o NSA, a data de geração, o hash de integridade e a referência do arquivo no storage.

---

### User Story 2 - Validação da seleção e integridade (Priority: P2)

Só títulos `Aprovado` e elegíveis (TED/Transferência) podem ser transmitidos; cada arquivo carrega um checksum que garante que o arquivo entregue ao banco é exatamente o que o sistema gerou.

**Why this priority**: Transmitir um título não-aprovado ou de forma manual (PIX/Boleto) é risco financeiro direto; sem integridade, uma adulteração do arquivo antes do banco passaria despercebida.

**Independent Test**: Selecionar um título não-elegível e verificar a recusa; gerar uma remessa válida e verificar que o hash registrado coincide com o conteúdo do arquivo persistido.

**Acceptance Scenarios**:

1. **Given** a seleção inclui um título com forma PIX/Boleto/Cartão/Câmbio/Guia/Outro **ou** um título que não está `Aprovado`, **When** o operador gera, **Then** a geração é **recusada** identificando o(s) título(s) inválido(s); nenhum título muda de estado.
2. **Given** uma remessa gerada, **When** o hash é recalculado sobre o conteúdo do arquivo persistido, **Then** coincide com o hash registrado no lote.

---

### User Story 3 - Não-duplicação e seleção vazia (Priority: P3)

Um título já `Transmitido` não pode ser re-selecionado, e uma seleção vazia não produz arquivo.

**Why this priority**: Evita dupla ordem de pagamento (risco de pagar duas vezes) e dá feedback claro quando não há o que transmitir.

**Independent Test**: Gerar a remessa de um título; tentar gerar de novo com o mesmo título e verificar a recusa; gerar com seleção vazia e verificar a recusa.

**Acceptance Scenarios**:

1. **Given** um título já `Transmitido`, **When** o operador o inclui numa nova seleção, **Then** a geração é recusada (proteção contra dupla transmissão).
2. **Given** uma seleção vazia (nenhum título), **When** o operador gera, **Then** nenhum arquivo é gerado e o operador é informado.

---

### Edge Cases

- **Seleção com títulos de múltiplas contas-cedente**: NÃO é erro — produz um arquivo/lote por conta distinta.
- **Título selecionado não-elegível** (forma manual) ou **não-`Aprovado`**: recusa a geração inteira, identificando os inválidos (atomicidade).
- **Falha de tradução de layout** (dado inválido para o CNAB): a geração inteira falha e **nenhum** título muda de estado.
- **Título com valor inválido** (zero/negativo): rejeitado antes de compor o arquivo.
- **Dados do cedente ausentes/inválidos** para alguma conta presente na seleção: a geração falha com erro claro, sem efeito colateral.
- **Seleção vazia**: recusa com mensagem clara.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: O sistema MUST permitir que o operador **selecione um conjunto explícito** de títulos a transmitir e gere a remessa a partir dessa seleção.
- **FR-002**: O sistema MUST validar que **cada** título selecionado está `Aprovado` e tem forma de pagamento **TED** ou **Transferência Bancária** (R5.1); se qualquer um falhar, a geração é recusada identificando os inválidos (nenhum efeito colateral).
- **FR-003**: O sistema MUST agrupar os títulos selecionados **por conta-cedente** e produzir **um arquivo de remessa por conta**.
- **FR-004**: O sistema MUST produzir cada arquivo no layout **CNAB 240 do Bradesco** (segmentos P/Q/J), por meio de uma camada de tradução que isola o formato do domínio — o núcleo financeiro não conhece posições/strings fixas do CNAB (R3, ACL).
- **FR-005**: O sistema MUST calcular e registrar um **hash de integridade** (checksum) de cada arquivo, calculado sobre o blob persistido (R2).
- **FR-006**: O sistema MUST **persistir cada arquivo gerado em object-storage** (ADR-0019) e retornar uma referência para download/recuperação; o envio efetivo à VAN/banco é fora de escopo desta sub-fatia.
- **FR-007**: O sistema MUST atribuir a cada lote um **NSA (numeração sequencial)** monotônico **por conta-cedente**, persistido e nunca reutilizado.
- **FR-008**: Ao gerar com sucesso, o sistema MUST transicionar cada título incluído de `Aprovado` para `Transmitido`.
- **FR-009**: O sistema MUST registrar cada lote (tipo `Remessa`) com: conta-cedente, NSA, hash, data de geração, referência do arquivo no storage e a relação dos títulos incluídos.
- **FR-010**: Após persistir, o sistema MUST publicar os eventos de integração de **remessa gerada** (um por lote) e de **título transmitido** (um por título).
- **FR-011**: A geração MUST ser atômica quanto ao estado de domínio: ou todos os títulos selecionados são transmitidos e todos os lotes registrados, ou nada muda.
- **FR-012**: Um título já `Transmitido` MUST NOT ser incluído numa nova remessa (proteção contra dupla transmissão).
- **FR-013**: O sistema MUST recusar uma **seleção vazia** com mensagem clara, sem gerar arquivo.
- **FR-014**: O sistema MUST compor o cabeçalho de cada arquivo com os dados do **cedente** da respectiva conta-débito (agência/conta/convênio Bradesco), obtidos da configuração do sistema.

### Key Entities _(include if feature involves data)_

- **Lote de Comunicação (Remessa)**: um arquivo de remessa gerado para **uma** conta-cedente. Atributos: identificador, tipo (`Remessa`), conta-cedente, NSA, status, hash de integridade, data de geração, referência do arquivo no storage, conjunto de títulos incluídos.
- **Título (existente)**: referenciado pela remessa; sofre a transição `Aprovado → Transmitido`. Possui forma de pagamento (determina elegibilidade), conta-cedente e valor.
- **Conta-Cedente (configuração)**: uma das contas-débito Bradesco da organização (agência/conta/convênio) + seu contador de NSA. Pode haver **múltiplas**.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% dos títulos selecionados **válidos** (`Aprovado` + TED/Transferência) entram na remessa da sua conta; 0% dos inválidos passam (seleção com inválido é recusada por inteiro).
- **SC-002**: 100% dos arquivos gerados a partir de dados válidos são aceitos por uma validação do layout CNAB 240 Bradesco (segmentos P/Q/J + cabeçalhos/trailers corretos).
- **SC-003**: Após cada geração bem-sucedida, 100% dos títulos incluídos estão em `Transmitido`, cada lote tem hash que coincide com o blob persistido e NSA único por conta.
- **SC-004**: Em qualquer falha de geração, 0 títulos ficam em estado inconsistente e nenhum lote órfão é registrado.
- **SC-005**: Selecionar um título já `Transmitido` resulta em 0 transmissões duplicadas (recusa).
- **SC-006**: Uma seleção com títulos de N contas-cedente distintas produz exatamente N lotes/arquivos.

## Impacto Arquitetural (core-api) _(obrigatório se a feature toca `src/`)_

- **Bounded Contexts afetados**: [x] Financeiro (`fin_*`) · [ ] Contratos · [ ] Auth · [ ] Parceiros
  - Toca **apenas** o Financeiro — não ofende ADR-0014.
- **Novos agregados / Value Objects?**: agregado de **Lote de Remessa** (`LoteComunicacao` tipo Remessa, por conta); VOs candidatos: `RemittanceHash`/checksum, `Nsa` (sequência por conta), referência de storage. Cada um exige smart constructor + branded type + `Result<T,E>`.
- **Novos eventos de domínio (outbox)?**: `ArquivoRemessaGerado` (por lote) e `TituloTransmitido` (por título) — nomenclatura EN-passado a definir no plano; contrato registrado em `handbook/architecture/`.
- **Borda HTTP envolvida?**: sim — endpoint para disparar a geração (recebe a seleção de títulos) e recuperar os arquivos (o `financial` já expõe `/api/v2/financial/*`). Detalhe no plano.
- **Storage**: cada arquivo de remessa é persistido em object-storage (ADR-0019, S3/MinIO) — confirmado na clarificação.
- **ACL (Tradutor de Layout)**: traduz domínio→CNAB 240 Bradesco; o guideline Bradesco é **local-only** (`handbook/guidelines/bradesco_guideline/`), nada commitável (R3).
- **ADRs candidatos da fatia**: layout/ACL CNAB, algoritmo de hash de integridade, NSA por conta-cedente.
- **Possíveis violações da constituição (I–VIII)?**: nenhuma prevista (1 BC, sem JSON nativo, sem broker novo).

## Assumptions

- **Escopo desta sub-fatia = somente geração.** Importação de retorno, acatamento/recusa, extrato D+1, conciliação e a transição `Transmitido → Recusado`/`Pago` ficam para sub-fatias seguintes da Fatia 3.
- **Apenas Bradesco** nesta fatia; multi-banco (Itaú/Santander) é evolução futura via novas "receitas" de tradução (a ACL já prevê).
- **Múltiplas contas-cedente** Bradesco existem como configuração do sistema; cada uma tem agência/conta/convênio e seu próprio contador de NSA.
- **O operador seleciona** quais títulos transmitir; o sistema agrupa por conta-cedente (1 lote/arquivo por conta).
- **Envio à VAN/banco é externo** — esta fatia entrega os arquivos persistidos + hash; a transmissão física não é automatizada aqui.
- Títulos no estado `Aprovado` já existem (entregue na fatia 1, na `dev`).
- Acatamento **não** altera status (R5) — irrelevante nesta sub-fatia (sem retorno), mas registrado para não introduzir transição indevida.
