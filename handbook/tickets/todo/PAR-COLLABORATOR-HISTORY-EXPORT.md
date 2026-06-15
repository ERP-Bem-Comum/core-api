# Request — PAR-COLLABORATOR-HISTORY-EXPORT

> Handoff do **front (web-app v2)** para o **core-api**. Padrão `000-request.md`.
> Origem: Gestão de Colaboradores → grid → **Exportar → Histórico**. No legado gerava **CSV** de histórico;
> no projeto atual a opção é um stub (gera PDF do grid). Verificado contra `core-api@dev` em 2026-06-12.

> ---
> **🔄 Estado verificado no core-api — 2026-06-15** · revisão pós-handoff (conteúdo abaixo = visão do front em 2026-06-09/14).
>
> - **Já implementado:** nada do histórico. Confirmado: não há tabela `par_collaborator_history` — a única tabela do colaborador é `par_collaborators` (`src/modules/partners/adapters/persistence/schemas/mysql.ts:146-199`), sem coluna/relação de histórico. Não há endpoint de histórico nem `?type=history` no plugin (`src/modules/partners/adapters/http/plugin.ts`). O único export é o **cadastral** (`GET /api/v1/collaborators/export`, `plugin.ts:152-176` + `src/modules/partners/adapters/export/collaborator-csv.ts`), que serializa só o cadastro atual — sem `tipo_alteracao`/`historico_antes`/`historico_depois`/`data_alteracao`.
> - **Escopo real restante:** todo o ticket. (1) **Audit trail persistido**: eventos de domínio existem (`CollaboratorRegistered`/`...RegistrationCompleted`/`...Edited`/`...Deactivated`/`...Reactivated` em `src/modules/partners/domain/collaborator/events.ts`), mas NÃO há projeção/tabela que grave o antes/depois por alteração — os eventos não carregam diff de campo (cargo/programa). É preciso modelar a entrada de histórico + persistência + gravação a cada alteração relevante. (2) **Exposição**: rota de export `?type=history` (formato legado: separador `;`, aspas, colunas/ordem do card) ou endpoint de dados. (3) Observação: `programa` não é campo do colaborador no core-api (ver `PARTNERS-COLLAB-FILTERS-DECISION`), então o `tipo_alteracao=Programa` do legado precisa de fonte/decisão à parte.
> - **Veredito:** NÃO FEITO.
> ---

## Título
Portar o **histórico de alterações do colaborador** + **export CSV** no formato exato do legado

## Size
L

## Contexto
A opção **Exportar → Histórico** (grid de colaboradores) deve gerar um **CSV** com o histórico de alterações
de cada colaborador (admissão, mudança de cargo, mudança de programa, etc.), com **valor antes/depois** e
**data**. No **ERP-BACKEND (legado)** isso vinha de uma tabela dedicada — confirmado:
`collaborator_history` (migration `CreateCollaboratorHistory`), `HistoryModule`,
`ImportCollaboratorHistoryService`.

## Estado atual (verificado)
- O **`core-api` (#32) NÃO portou** o histórico de colaborador: não há tabela `collaborator_history`,
  nem endpoint de histórico, nem export de histórico. O único export é o **cadastral**
  (`GET /collaborators/export`, CSV dos campos de cadastro).
- Logo, o front **não tem fonte** para as colunas de alteração (`tipo_alteracao`, `historico_antes`,
  `historico_depois`, `data_alteracao`). As colunas cadastrais (nome/email/cpf/programa/inicio_contrato)
  existem; as de histórico **não**.
- No front, a opção "Histórico" hoje chama o mesmo print do "Tudo" (PDF do grid) — não é o histórico real.
  Será **desabilitada com aviso** até este ticket ser atendido.

## Pedido ao backend
1. **Registrar histórico** de alterações do colaborador (audit trail): a cada alteração relevante
   (admissão, cargo, programa, e o que o legado registrava), gravar uma entrada com:
   `tipo_alteracao`, `historico_antes`, `historico_depois`, `data_alteracao` (+ vínculo ao colaborador).
2. **Expor** o histórico — preferência por **uma das duas**:
   - **(a) Export CSV pronto**: `GET /api/v1/collaborators/export?type=history` (ou rota dedicada)
     devolvendo o CSV **exatamente** no formato legado (abaixo); o front só baixa o blob; **ou**
   - **(b) Endpoint de dados**: `GET /api/v1/collaborators/history` (lista, com os campos acima) e o front
     monta o CSV. (Se for (b), confirmar paginação/filtros — idealmente respeitar os filtros do grid.)

### Formato EXATO do CSV (legado) — referência
- Separador **`;`**, todos os valores entre **aspas duplas**, encoding UTF-8.
- Cabeçalho (nesta ordem):
  ```
  "nome";"email";"cpf";"programa";"inicio_contrato";"tipo_alteracao";"historico_antes";"historico_depois";"data_alteracao"
  ```
- Uma linha **por alteração**. Datas em `dd/MM/aaaa`. Exemplo real (arquivo `Colaboradores-Historico-2.csv`):
  ```
  "kauan";"kauanoliveira@abemcomum.org";"08444178314";"PARC";"06/06/2026";"Cargo";"Diretor de Programa";"Diretor de Programa Adjunto";"11/06/2026"
  "kauan";"kauanoliveira@abemcomum.org";"08444178314";"PARC";"06/06/2026";"Admissão";"";"06/06/2026";"11/06/2026"
  "kauan";"kauanoliveira@abemcomum.org";"08444178314";"PARC";"06/06/2026";"Programa";"";"PARC";"11/06/2026"
  "kauan";"kauanoliveira@abemcomum.org";"08444178314";"PARC";"06/06/2026";"Cargo";"";"Diretor de Programa";"11/06/2026"
  ```
- Valores `tipo_alteracao` observados: **Admissão**, **Cargo**, **Programa** (confirmar a lista completa do
  legado). `historico_antes` vazio na criação inicial; preenchido nas mudanças subsequentes.

### Critérios de aceite
1. Alterar cargo/programa de um colaborador gera entradas de histórico com antes/depois/data corretos.
2. O export de histórico devolve o CSV no formato acima (separador `;`, aspas, colunas e ordem idênticas).
3. (Se rota de dados) os campos batem 1:1 com as colunas do CSV.

## Impacto no front (hoje)
- "Exportar → **Histórico**" fica **desabilitado** (com aviso "disponível quando o backend liberar o
  histórico"); "Tudo" e "Baixar template" seguem funcionando.
- Ao liberar: se (a), o front troca o handler para baixar o blob do endpoint; se (b), o front monta o CSV
  com `buildCsv` (já existe) no formato legado. Mudança pequena no front.
