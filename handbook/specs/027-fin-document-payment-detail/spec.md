# Feature Specification: Complemento da forma de pagamento no lançamento de documento

**Feature Branch**: `027-fin-document-payment-detail`

**Created**: 2026-06-29

**Status**: Draft

**Input**: Sub-issue da #89 (Lançar Documento — capacidades de backend pendentes). Gap registrado em comentário da P.O.: o front captura um complemento editável da forma de pagamento (linha digitável/código de barras de boleto, identificador de cartão corporativo, referência de câmbio, ou texto livre para "Outro"), mas o lançamento do documento **descarta** o valor porque o campo não existe no backend.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Registrar o complemento da forma de pagamento (Priority: P1)

Ao lançar um documento de Contas a Pagar, o operador financeiro informa — junto da forma de pagamento — um complemento textual que a identifica operacionalmente (a linha digitável do boleto, o identificador do cartão corporativo, a referência do câmbio, ou uma observação livre quando a forma é "Outro"). Esse complemento é persistido com o documento e fica disponível na consulta de detalhe, para que quem for efetuar o pagamento tenha a informação necessária sem precisar reabrir a nota.

**Why this priority**: É o núcleo do gap — hoje o dado é capturado na tela e perdido no salvamento, obrigando retrabalho manual na hora de pagar. Sozinha, esta história já entrega valor: o complemento deixa de ser descartado.

**Independent Test**: Lançar um documento informando o complemento e, em seguida, consultar o detalhe do mesmo documento; o complemento informado deve aparecer idêntico ao que foi enviado.

**Acceptance Scenarios**:

1. **Given** um lançamento de documento com forma de pagamento "Boleto", **When** o operador informa a linha digitável no complemento e salva, **Then** o documento é criado e o detalhe retorna o complemento exatamente como informado.
2. **Given** um lançamento de documento **sem** complemento informado, **When** o operador salva, **Then** o documento é criado normalmente e o detalhe indica o complemento como "não informado".
3. **Given** um complemento com valor vazio, apenas espaços, contendo caracteres de controle, ou acima do limite de tamanho, **When** o operador tenta salvar, **Then** o sistema rejeita o lançamento com uma mensagem de validação clara, sem persistir.
4. **Given** documentos já existentes na base antes desta capacidade, **When** são consultados, **Then** seguem legíveis e apresentam o complemento como "não informado", sem erro.

---

### User Story 2 - Corrigir ou remover o complemento após o lançamento (Priority: P2)

Após lançar o documento, o operador percebe que digitou a linha digitável errada (ou que ela mudou) e precisa corrigir — ou apagar — o complemento, sem recriar o documento.

**Why this priority**: Útil para a operação real (erro de digitação em linha digitável é comum), mas secundária ao registro inicial. Confirmada em escopo: o complemento é editável e removível via atualização do documento, reusando o fluxo de ajuste já existente.

**Independent Test**: Lançar um documento com complemento, depois atualizar o documento alterando apenas o complemento, e confirmar que o detalhe reflete o novo valor (e que a trilha de auditoria registra a mudança).

**Acceptance Scenarios**:

1. **Given** um documento com complemento informado, **When** o operador atualiza o documento com um novo complemento, **Then** o detalhe passa a refletir o novo valor.
2. **Given** um documento com complemento informado, **When** o operador atualiza o documento removendo o complemento, **Then** o detalhe passa a indicar "não informado".

---

### Edge Cases

- **Vazio vs não informado**: complemento ausente significa "não informado"; complemento enviado como string vazia ou só espaços é **inválido** (rejeitado), não equivalente a ausente. Isso evita ambiguidade entre "não informado" e "informado em branco".
- **Conteúdo opaco**: linha digitável e código de barras contêm dígitos, espaços e pontuação que devem ser preservados como digitados (sem normalização de conteúdo além de remover espaços nas extremidades). O sistema não interpreta nem valida o formato específico do boleto.
- **Caracteres de controle**: quebras de linha e demais caracteres de controle são rejeitados (evitam poluição de trilha de auditoria/logs e corrupção de armazenamento).
- **Exibição segura**: o complemento é texto livre fornecido pelo usuário; ao ser exibido, deve ser tratado como texto puro (a renderização é responsabilidade do consumidor da API, que deve aplicar codificação de saída adequada e nunca renderizar como HTML cru).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: O sistema MUST permitir, no lançamento de um documento de Contas a Pagar, informar um complemento opcional da forma de pagamento, em texto livre.
- **FR-002**: O sistema MUST persistir o complemento informado e retorná-lo na consulta de detalhe do documento, idêntico ao valor aceito.
- **FR-003**: O sistema MUST criar o documento normalmente quando o complemento não é informado, tratando-o como "não informado".
- **FR-004**: O sistema MUST rejeitar, na borda, complementos inválidos — vazio, somente espaços, contendo caracteres de controle, ou acima do limite de tamanho — com erro de validação claro e sem persistir.
- **FR-005**: O sistema MUST preservar o conteúdo do complemento como informado (sem sanitizar/alterar o texto), removendo apenas espaços nas extremidades.
- **FR-006**: O sistema MUST NÃO expor o complemento na listagem de documentos; o campo é exposto apenas na consulta de detalhe.
- **FR-007**: O sistema MUST manter documentos pré-existentes (anteriores a esta capacidade) legíveis, apresentando o complemento como "não informado".
- **FR-008**: O sistema MUST tratar o complemento como dado operacional (não credencial de autenticação); ele não recebe o mesmo tratamento de ocultação aplicado a segredos.
- **FR-009**: Usuários MUST poder corrigir ou remover o complemento após o lançamento, via atualização do documento (incluindo torná-lo "não informado"). A trilha de auditoria do documento MUST registrar os valores anterior e novo do complemento nessas alterações.

### Key Entities _(include if feature involves data)_

- **Documento (Contas a Pagar)**: agregado já existente do módulo Financeiro. Ganha um atributo simples e opcional — o complemento da forma de pagamento — sem identidade própria e sem comportamento associado (atributo textual, não um conceito de domínio independente).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Em 100% dos lançamentos em que o complemento é informado com valor válido, ele é recuperável idêntico na consulta de detalhe.
- **SC-002**: 100% dos lançamentos sem complemento continuam sendo criados com sucesso (zero regressão de compatibilidade com o fluxo atual).
- **SC-003**: 100% das entradas inválidas (vazio, somente espaços, com caracteres de controle, ou acima do limite) são rejeitadas com mensagem de validação, sem persistência.
- **SC-004**: O complemento não aparece em nenhuma resposta de listagem de documentos (0 ocorrências).
- **SC-005**: 100% dos documentos criados antes desta capacidade permanecem consultáveis sem erro.

## Impacto Arquitetural (core-api) _(obrigatório se a feature toca `src/`)_

- **Bounded Contexts afetados**: [ ] Contratos (`ctr_*`) · [x] Financeiro (`fin_*`) · [ ] Auth (`auth_*`) · [ ] Parceiros (`partners_*`)
  - Toca apenas o BC Financeiro — sem cruzamento de isolamento (ADR-0014).
- **Novos agregados / Value Objects?**: Nenhum. O complemento é um **atributo primitivo simples** do agregado Documento, não um Value Object — alinhado a Vernon, _Implementing DDD_, p.292 ("truly simple attributes that really don't need any special treatment... a Meaningful Whole"), validado via MCP DDD antes desta spec. Não exige smart constructor próprio.
- **Novos eventos de domínio (outbox)?**: Nenhum.
- **Novos subcomandos de CLI?**: N/A (CLI embutida retirada — ADR-0037).
- **Borda HTTP envolvida?**: Sim — estende rotas já existentes do documento (lançamento e detalhe). Fastify ativo por ADR-0025/0037; sem nova rota, sem novo ADR.
- **Possíveis violações da constituição (I–VIII)?**: Nenhuma. Segue o padrão de campo opcional já trilhado 3× na mesma tabela (`issueDate` #163, `accessKey` #115, `competencia` #197). Migration aditiva (coluna nullable), compatível com ADR-0018/ADR-0020.

## Assumptions

- **Reuso de rotas existentes**: a capacidade estende o lançamento de documento e a consulta de detalhe já existentes; não cria novas rotas nem novos casos de uso.
- **Limite de tamanho**: 255 caracteres cobrem com folga os usos conhecidos (linha digitável ~47–54, código de barras 44, referência de câmbio < 100). Documentado como decisão de borda; o domínio não impõe formato.
- **Fronteira de segurança (XSS)**: a defesa contra Stored XSS é responsabilidade do consumidor que renderiza (codificação de saída / texto puro; renderização HTML crua proibida para este campo). O backend valida formato/limites e **não** sanitiza conteúdo — validada via MCP OWASP Input Validation antes desta spec. Esta cláusula deve ser repassada ao lado front da #89.
- **Logs**: o complemento não é tratado como segredo; em nível de log de troubleshooting (verboso) pode aparecer. Reavaliar caso o campo passe a conter dado pessoal identificável.
- **Auditoria**: a edição pós-lançamento (US2) está em escopo (decisão de clarify, 2026-06-29); a trilha de auditoria do documento registra os valores anterior/novo do complemento — intencional para auditoria.
- **Detalhe técnico**: o mapeamento de implementação (camadas de domínio→persistência→borda, migration, validação de borda) foi pré-validado por agentes especialistas (domínio/persistência/borda/segurança) e será consolidado no `/speckit-plan`, não nesta spec.
