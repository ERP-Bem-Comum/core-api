# Request — PAR-ACT-ACORDO

> Handoff do **front (web-app v2)** para o **core-api**. Padrão `000-request.md`.
> Origem: redesenho do submódulo **ACTs** como **Acordo de Cooperação Técnica** (form + grid + detalhe).
> Verificado contra `core-api@dev` em 2026-06-09. **Prioridade: alta** (maior gap de backend desta rodada).

## Título
Reformular o agregado **ACT** de pessoa-física para **Acordo de Cooperação Técnica (instituição parceira)**

## Contexto
O submódulo ACT foi modelado no backend como **pessoa-física** (igual ao Colaborador). A regra de negócio,
porém, é a de um **Acordo/Instrumento** firmado com uma **instituição parceira**. O front já foi reorganizado
para refletir o Acordo (form em 3 seções, grid e detalhe), **mas a maioria dos campos não persiste** porque o
agregado do core-api ainda é pessoa-física. Os campos novos estão na UI como **placeholders desabilitados
("gated")** até este ticket.

## Estado atual (verificado no core-api)
`act-schemas.ts` / agregado ACT expõe hoje (pessoa-física):
`name`, `email`, **`cpf`** (11 díg.), `occupationArea` (enum `PARC|DDI|DCE|EPV`), `role`,
`startOfContract` (YYYY-MM-DD), `employmentRelationship` (enum). List item: `id`, `name`, `email`,
`occupationArea`, `role`, `registration`, `activation`.

## Alvo (estrutura do Acordo — como o front está montado)

### Seção 1 — Identificação do Instrumento
| Campo (UI) | Origem | Ação no backend |
|---|---|---|
| Número do ACT / Instrumento | — | **NOVO** `actNumber: string` (único? confirmar) |
| Título / Objeto Resumido | reaproveita `name` | manter (renomear conceitualmente p/ "objeto/título") |
| Vigência Inicial (Meses) | — | **NOVO** `initialValidityMonths: number` (inteiro ≥ 1) |
| Área de Atuação | reaproveita `occupationArea` | manter (enum atual ou rever lista p/ Acordo) |

### Seção 2 — Dados da Instituição Parceira
| Campo (UI) | Origem | Ação no backend |
|---|---|---|
| CNPJ do Parceiro | — (hoje ACT tem **CPF**) | **NOVO** `cnpj` (14 díg., DV validado). Ver "Decisão CPF→CNPJ" |
| Razão Social / Nome da Entidade | — | **NOVO** `corporateName: string` |
| Nome Fantasia / Sigla | — | **NOVO** `fantasyName: string` |
| Representante Legal / Ponto de Contato | reaproveita `role` | manter (renomear conceitualmente) |
| E-mail de Contato | reaproveita `email` | manter |

### Seção 3 — Dados Bancários e PIX (reaproveita 100% o payment-target de Fornecedor)
| Campo (UI) | Ação no backend |
|---|---|
| **Possui Repasse Financeiro?** (Sim/Não) | **NOVO** `hasFinancialTransfer: boolean` |
| Banco, Agência-DV, Número da Conta, DV | **NOVO** `bankAccount` (mesmo VO do Supplier) |
| Tipo de chave, Chave PIX | **NOVO** `pixKey` (mesmo VO do Supplier) |

**Regra de negócio (repasse):** se `hasFinancialTransfer = true`, **≥1 payment target** (banco OU PIX) é
**obrigatório** (mesma invariante do Supplier); se `false`, banco/PIX são opcionais (acordo de cooperação
pura). O front já alterna o aviso "dados bancários obrigatórios" conforme o Sim/Não.

> ⚠️ O campo **"Valor Global do Acordo" foi REMOVIDO** do front nesta rodada (decisão da P.O.). **Não** criar
> `globalValue` por ora — se voltar a ser requisito, abrir item à parte.

### Campos atuais a REMOVER/repensar (decisão da P.O. — hoje removidos da tela)
- **CPF**, **Vínculo Empregatício**, **Início de Contrato**: saíram do form/detalhe. No backend continuam
  **obrigatórios** — por isso **criar um novo ACT pela tela não salva** hoje (validação do cliente/servidor
  barra). A reformulação precisa **remover/torná-los opcionais** (CPF dá lugar ao CNPJ institucional).

## Grid (lista) — campos novos
- **Nº do Instrumento** (`actNumber`) — hoje `—`.
- **Parceiro Principal** (`corporateName`) — hoje `—`.
- (Título/Objeto = `name` e Status já reais.)
→ Incluir `actNumber` e `corporateName` no **list item**.

## Filtros de lista — novos
- **Tipo: Com Repasse / Sem Repasse** → filtro por `hasFinancialTransfer` no `ListActsInput`.
- **Área de Atuação** → filtro por `occupationArea` (combo já populado no front; hoje desabilitado).
- Busca textual deve casar **Nº do Instrumento** e **Razão Social** (hoje busca name/email/cpf).

## Critérios de Aceitação
1. Agregado ACT representa um **Acordo**: `actNumber`, `title/objeto`(name), `initialValidityMonths`,
   `occupationArea`, `cnpj`, `corporateName`, `fantasyName`, `legalRepresentative`(role), `email`,
   `hasFinancialTransfer`, `bankAccount?`, `pixKey?`.
2. Criar/editar ACT pela tela **persiste** (sem exigir CPF/vínculo/início).
3. Regra do repasse aplicada (≥1 payment target quando `hasFinancialTransfer=true`).
4. List item traz `actNumber` e `corporateName`; busca por nº/razão social; filtros `tipo`(repasse) e `área`.
5. **Migração** dos ACTs existentes (pessoa-física → acordo) definida (ou descontinuar dados de teste).

## Notas / Decisões para o tech lead + P.O.
- **CPF→CNPJ**: o Acordo é com **instituição** (CNPJ). Decidir o destino do `cpf` atual (drop) e a migração.
- **Numeração do Instrumento**: sequencial gerado pelo backend? formato? unicidade?
- **Vigência**: "meses" basta ou precisa de data início/fim derivada?
- **`registration` (pré/completo)**: conceito de **Colaborador**, **não** se aplica a ACT — já removido do
  detalhe no front (badge). Confirmar que sai também do agregado/list do ACT.
- **Reuso de VOs**: `bankAccount`/`pixKey` devem reaproveitar o `payment-target` do Supplier.
