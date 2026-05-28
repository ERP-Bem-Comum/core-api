# CTR-IMPORT-LEGACY — Importar contratos legados (UC-11)

> **Size:** L (provável split em sub-tickets) · **Módulo:** contracts · **Fase:** requisitos
> **Skill da fase atual:** `requirements-engineer` · **Status:** especificação fechada, **aguardando greenlight para W0**
> **Gap:** #3 do relatório de cobertura
> **Fonte:** `especificacao-dominio.md:463-476` (lá numerado **UC-07**; o relatório de cobertura chama de **UC-11** — mesmo caso de uso).

---

## 1. Objetivo e atores

| Item | Valor |
| :--- | :--- |
| **Objetivo** | Realizar carga inicial do legado com segurança — importar Contratos Mãe a partir de arquivo. |
| **Ator primário** | Equipe técnica (operador de CLI). |
| **Pré-condições** | Arquivo válido (CSV ou JSON UTF-8) no schema canônico (§4). |
| **Pós-condições** | Contratos importados ou rejeitados, com relatório por linha. |

---

## 2. Decisões de produto (P.O., sessão 2026-05-25)

| # | Decisão | Consequência |
| :-- | :--- | :--- |
| D1 | **v1 = só Contratos Mãe.** Aditivos legados ficam para **v2**. | v2 depende de [Inquiry-0014 Q3](../../../handbook/inquiries/0014-schema-legado-vs-modelo-alvo.md) (política de migração) + de um caminho de seed de aditivo já-homologado no domínio. |
| D2 | **Importar só o subconjunto atual (~8 campos) do agregado.** CNPJ é **validado e descartado** (não persistido). | Migração **explicitamente parcial/lossy**. O gap 26→8 campos (`contratadoCnpjCpf`, `programaId`, `unidadeGestoraId`, `codigoLegado`, …) é decisão de modelo-alvo (alimenta Inquiry-0014), **fora** do escopo deste ticket. |
| D3 | **Atomicidade por grupo** (contrato + seus aditivos). | Em v1 (só Mãe) = cada contrato é uma transação independente; uma linha falha não derruba as outras. |
| D4 | **Schema fixo canônico** (colunas/keys definidas por nós, §4). | Sem mapeamento configurável em v1 (YAGNI). A equipe técnica adapta o arquivo ao nosso schema. |

---

## 3. Escopo

### 3.1. Em escopo (v1)

- Comando CLI `importar-contratos` (módulo contracts) que lê CSV **ou** JSON UTF-8.
- Validação estrutural (colunas/keys obrigatórias presentes; arquivo parseável; UTF-8).
- Validação por linha reusando as regras de `createContract` + VOs do domínio.
- Validação de **duplicidade** de `numero/ano` dentro do arquivo **e** contra o repositório.
- Validação de **formato de CNPJ** quando a coluna estiver presente (resultado **descartado** — D2).
- **Dry-run** (simula, valida, reporta, **não** persiste) e modo **persistente**.
- **Relatório por linha** (sucesso / falha com motivo + número da linha).
- Atomicidade por contrato (D3).

### 3.2. Fora de escopo (v1)

- **Aditivos legados** (v2 — depende de Inquiry-0014 Q3).
- Persistir `contratado/CNPJ`, `programa`, `unidade gestora`, `codigoLegado` etc. (gap de modelo-alvo — Inquiry-0014).
- Mapeamento configurável coluna→campo (D4).
- Migração direta do **dump MySQL legado** (territory da Inquiry-0014 Q3; aqui é import **file-based** que a equipe prepara).
- Rollback pós-commit / staging com reversão (a spec §6.5 menciona "rollback controlado"; em v1 o dry-run cobre a prevenção — rollback real é v2).

---

## 4. Schema canônico de entrada (D4)

Mapeia 1:1 para `CreateContractCommand`. Colunas CSV (cabeçalho obrigatório) / keys JSON:

| Coluna / key | Tipo | Obrigatório | Regra (origem no domínio) |
| :--- | :--- | :--- | :--- |
| `numero` | `string` | sim | formato `XXX/AAAA` (`contract.ts:37`); único por `numero+ano` (R4) |
| `titulo` | `string` | sim | não-branco |
| `objetivo` | `string` | sim | não-branco |
| `assinado_em` | ISO `YYYY-MM-DD` | sim | data válida |
| `valor_centavos` | `integer` | sim | `!= 0` (`contractOriginalValueZero`); `Money.fromCents` |
| `inicio` | ISO `YYYY-MM-DD` | sim | data válida |
| `fim` | ISO `YYYY-MM-DD` ou vazio | não | vazio ⇒ período `Indefinite`; senão `fim >= inicio` |
| `cnpj` | `string` | não | se presente: formato CNPJ válido — **validado e descartado** (D2) |

> Colunas extras do legado (`programa`, `unidade_gestora`, `contratado_nome`, …) são **ignoradas** em v1 (não causam erro; ficam fora do modelo). Documentar isso no `--help`.

---

## 5. Requisitos funcionais (FR)

| ID | Requisito | Origem |
| :--- | :--- | :--- |
| FR-1 | Aceitar arquivo **CSV** e **JSON** em **UTF-8**; detectar formato por extensão/flag. | CA spec `:471` |
| FR-2 | Validar **estrutura** (colunas/keys obrigatórias; parse; encoding). Falha estrutural aborta antes de processar linhas. | CA spec `:471` |
| FR-3 | Validar **cada linha** com as regras de domínio (`createContract`): formato sequencial, datas, valor ≠ 0, período. | CA spec `:472` |
| FR-4 | Validar **duplicidade** `numero+ano`: (a) intra-arquivo; (b) contra o repositório (`findBySequentialNumber`). | CA spec `:472` |
| FR-5 | Validar **formato de CNPJ** quando presente; resultado **não persistido** (D2). | CA spec `:472` |
| FR-6 | Suportar **dry-run** (default seguro): valida e reporta, **zero** escrita / zero evento. | CA spec `:473` |
| FR-7 | Em modo persistente, criar cada contrato via `createContract` (emite `ContractCreated` no outbox), **transação por contrato** (D3). | CA spec `:475` |
| FR-8 | Gerar **relatório por linha**: `OK` ou `FALHA(<motivo PT>)` + nº da linha; sumário (total/ok/falhas). | CA spec `:474` |
| FR-9 | `origemCadastro = migracao` é **conceitual** (não modelado — D2); registrar no relatório, não no agregado. | spec `:121-123` |

## 6. Requisitos não-funcionais (NFR)

| ID | Requisito |
| :--- | :--- |
| NFR-1 | **Encoding UTF-8** estrito; rejeitar com erro claro se não-decodificável. |
| NFR-2 | **Idempotência parcial** via FR-4: reimportar o mesmo arquivo não duplica contratos (duplicados viram FALHA, não erro fatal). |
| NFR-3 | **Mensagens PT-BR** na CLI (dicionário `cli/formatters/`); erros internos EN kebab-case. |
| NFR-4 | **Determinismo**: dry-run e persistente percorrem as mesmas validações na mesma ordem (relatório do dry-run prevê o resultado real). |
| NFR-5 | Domínio puro intacto: parsing/IO de arquivo só em `adapters/` ou `cli/`; use case recebe linhas já decodificadas. |

---

## 7. Histórias com critérios de aceite (Given-When-Then)

**H1 — Importar contratos válidos (persistente)**
> _Como_ equipe técnica, _quero_ importar um CSV de Contratos Mãe, _para_ popular o sistema com o legado.
- **Dado** um CSV UTF-8 com 3 linhas válidas no schema canônico, **quando** rodo `importar-contratos --arquivo x.csv` (modo persistente), **então** 3 contratos são criados (status `Active`), 3 eventos `ContractCreated` no outbox, e o relatório mostra `3 OK / 0 falhas`.

**H2 — Dry-run não persiste**
- **Dado** o mesmo CSV, **quando** rodo com `--dry-run`, **então** o relatório mostra `3 OK`, **e** nenhum contrato é persistido **e** o outbox fica vazio.

**H3 — Linha inválida é reportada, não aborta as outras (D3)**
- **Dado** um CSV com 3 linhas onde a linha 2 tem `valor_centavos=0`, **quando** importo (persistente), **então** linhas 1 e 3 são criadas, a linha 2 vira `FALHA(valor original do contrato não pode ser zero)`, e o relatório mostra `2 OK / 1 falha` com o nº da linha.

**H4 — Duplicidade intra-arquivo e vs repositório (FR-4)**
- **Dado** um CSV com duas linhas de `numero=001/2026`, **quando** importo, **então** a primeira é criada e a segunda vira `FALHA(já existe um contrato com este número sequencial)`.
- **Dado** que `001/2026` já existe no repositório, **quando** importo um arquivo com essa linha, **então** ela vira `FALHA(duplicado)` sem sobrescrever.

**H5 — CNPJ validado e descartado (D2)**
- **Dado** uma linha com `cnpj` de formato inválido, **quando** importo, **então** a linha vira `FALHA(CNPJ inválido)`.
- **Dado** uma linha com `cnpj` válido, **quando** importo, **então** o contrato é criado **sem** campo de CNPJ persistido.

**H6 — Falha estrutural aborta (FR-2)**
- **Dado** um arquivo sem a coluna obrigatória `numero`, **quando** importo, **então** exit ≠ 0 com erro estrutural e **zero** linhas processadas.

**H7 — JSON UTF-8 (FR-1)**
- **Dado** o mesmo conteúdo em JSON (array de objetos), **quando** importo, **então** o resultado é idêntico ao CSV equivalente.

---

## 8. Rastreabilidade (CA da spec → FR/História)

| CA `especificacao-dominio.md` | FR | História |
| :--- | :--- | :--- |
| `:471` aceitar CSV e JSON UTF-8 | FR-1, NFR-1 | H1, H7 |
| `:472` validar CNPJ, datas e duplicidade | FR-3, FR-4, FR-5 | H3, H4, H5 |
| `:473` permitir dry-run | FR-6 | H2 |
| `:474` relatório de falhas por linha | FR-8 | H3, H4 |
| `:475` atomicidade contrato + aditivos | FR-7 (por grupo, D3) | H3 |

---

## 9. Dependências e itens em aberto

- **v2 (aditivos legados)** → bloqueado por [Inquiry-0014 Q3](../../../handbook/inquiries/0014-schema-legado-vs-modelo-alvo.md) + caminho de seed de aditivo homologado.
- **Modelo-alvo do `Contract` (26→8 campos)** → decisão de modelagem; alimenta Inquiry-0014. v1 assume import lossy (D2).
- **Validador de CNPJ** → o VO `TaxId` existe só em `financial/domain/shared/tax-id.ts`; import proibido cross-módulo (ADR-0006). **Decidir no W1:** validador de CNPJ puro em `src/shared/kernel/` (compartilhável) ou local em contracts. (Como não é persistido, pode ser função de validação pura.)
- **Split sugerido** (Size L): considerar sub-tickets — (a) leitor/parariser CSV+JSON UTF-8 (adapter); (b) use case `importContracts` (dry-run + persistente + relatório); (c) comando CLI `importar-contratos`.

---

## 10. Pipeline (proposta, após greenlight)

| Wave | Skill/Agente | Gate |
| :--- | :--- | :--- |
| W0 RED | `tdd-strategist` | `pnpm test` |
| W1 GREEN | `nodejs-fs-scripter` (leitura de arquivo) + `ports-and-adapters` (use case) + `application-cli-builder` (CLI) | `pnpm test` + `typecheck` |
| W2 REVIEW | `code-reviewer` | `pnpm run lint` |
| W3 QUALITY | `ts-quality-checker` | typecheck + format:check + test + lint |

> **Próximo passo:** validação desta spec pelo P.O. → ao aprovar, `pnpm run pipeline:state init CTR-IMPORT-LEGACY --size L` e abrir o W0.
