# Research — Feature 015

Decisões técnicas (Phase 0). Cada decisão-chave marca a **citação canônica pendente** (Princípio IX da constituição — exigida no momento do ticket/ADR, via `acdg-skills` ou fallback `acdg/skills_base/`).

## D1 — VO de destino de pagamento: promover para `domain/shared/` (US1)

- **Decisão**: mover `BankAccount`/`PixKey` de `partners/domain/supplier/payment-target.ts` para `partners/domain/shared/payment-target.ts`. Supplier, Act (hoje já importam de `../supplier/`), Financier e Collaborator passam a importar de `../shared/`.
- **Rationale**: 4 agregados usarão o VO; mantê-lo dentro de um agregado (`supplier/`) acopla os outros 3 a ele (o Act já viola isso). `domain/shared/` é o local canônico (espelha `contracts/domain/shared/`).
- **Alternativas rejeitadas**: (a) duplicar o shape em cada agregado — viola DRY e diverge validações; (b) manter em `supplier/` e importar cross-agregado — acoplamento indevido.
- **Citação pendente (DDD)**: Evans/Vernon sobre Value Objects compartilhados / Shared Kernel.

## D2 — Validação de `agency` (US1)

- **Decisão**: regex 4 dígitos + DV opcional (`/^\d{4}(-?\d)?$/`), slug `bank-agency-invalid`. Aplicar **também** a Supplier/Act (harmonização — hoje `agency` é `z.string()` sem regex).
- **Rationale**: FR-002 + nota da issue #40 (copiar o molde Supplier não entrega a validação). Harmonizar evita drift entre os 4 tipos.
- **Risco**: dados legados de Supplier/Act com agency fora do formato → validar só na escrita (não retroativo) ou migrar. **A confirmar no W0 da US1.**

## D3 — `sex` coexiste com `genderIdentity` (US2)

- **Decisão**: `sex` é VO novo `'F'|'M'` (nullable), independente de `genderIdentity` (já existente, 8 valores).
- **Rationale**: sexo biológico ≠ identidade de gênero; decisão de PO travada em Clarifications. Aditivo.
- **Citação pendente**: N/A (decisão de produto, não de arquitetura).

## D4 — `childrenAges` sem JSON nativo (US2)

- **Decisão**: `varchar` com lista delimitada por vírgula (`5,8,12`). Coerência `hasChildren=false ⇒ childrenCount/childrenAges vazios` validada no agregado.
- **Rationale**: ADR-0020 proíbe JSON nativo; texto delimitado é permitido; YAGNI (sem query por idade). Tabela filha seria peso desproporcional.
- **Alternativa rejeitada**: `par_collaborator_children` (normalizado) — overkill para dado de baixo valor relacional.

## D5 — Histórico: snapshot genérico before/after (US4)

- **Decisão**: `par_collaborator_history` com snapshot before/after (agnóstico aos campos), projetado de `CollaboratorEdited`/`Deactivated`/`Reactivated`. Cadastro inicial não gera entry.
- **Rationale**: snapshot agnóstico não muda schema quando campos novos entram (US1–US3 já cobertas). Espelha o padrão de read-model derivado (ADR-0022).
- **Export**: util `src/shared/utils/csv.ts` (em memória). Cabeçalho legado literal `tipo_alteracao;historico_antes;historico_depois;data_alteracao`, coluna `programa` vazia (Clarifications).
- **Gatilho de streaming**: se export passar de ~dezenas de MB / dezenas de milhares de linhas, migrar para Node stream + gerador (sem trocar formato). Registrado na spec (Assumptions).
- **Débito externo (não corrigir aqui)**: hardening anti-fórmula do `csv.ts` (falta `\n` + full-width OWASP) → issue própria.
- **Citação pendente (auditoria/event-sourcing)**: ADR-0022 + Vernon (projeções/read-models).

## D6 — Autocadastro: token hash uso-único + TTL 7 dias (US5)

- **Decisão**: `par_invite_tokens` (`token_hash` UNIQUE, `collaborator_id`, `expires_at`, `used_at`). Token gerado por `node:crypto`, **armazenado como hash** (nunca em claro). TTL 7 dias (Clarifications). Consumo atômico (corrida → 2º vê `token-used`). Mailer próprio do `partners` via `notifications` — **sem importar `auth`** (ADR-0006).
- **Rationale**: token uso-único + TTL é a defesa primária contra IDOR (FR-012/013/014); revalidação de CPF é secundária. Rota pública sem enumeração (404 uniforme para expirado/usado).
- **Molde**: password-reset do `auth` (espelhar mecanismo, não importar). `EmailSender` port (ADR-0010) já existe em `notifications`.
- **Citação pendente (segurança)**: OWASP (IDOR / token de uso único / não-enumeração).
- **Review obrigatório**: `web-security-backend` no W2.

## D7 — Read-model `partners←contracts` (US6) — bloqueado por ADR-0046

- **Decisão**: contagem por parceiro via **projeção sobre o stream de eventos** do Contratos (ADR-0022), **não** port síncrono (evita ciclo — ADR-0006). Componentes:
  1. **Enriquecer eventos** do Contratos com `contractorRef { contractorType, contractorId }` no payload de integração (Opção A — montado no adapter, sem tocar o domínio; espelha ADR-0043). Hoje os eventos só têm `contractId` (`public-api/events.ts:6`).
  2. **Worker dedicado** `src/workers/contract-count-projection/` (composition root, 2 pools, lê `ctr_outbox`, projeta em `par_contract_count_view`), idempotente por `occurred_at` — espelha `supplier-view-projection` (feature 014).
  3. **Backfill one-shot** dos contratos legados, coordenado por `ctr_job_runs` (claim via INSERT IGNORE — PR #99).
  4. **Grids** lêem `par_contract_count_view` em batch por página (sem N+1); filtro `contractStatus` no Fornecedor; degrada para `0/0` se indisponível.
- **Rationale**: a única topologia que respeita o isolamento (eventos, não leitura cruzada). Reusa o worker genérico `src/shared/outbox`.
- **Alternativas rejeitadas**: port síncrono `partners→contracts` (ciclo de dependência); query cruzada em `ctr_*` a partir do `partners` (proíbe ADR-0006/0015).
- **Decisão fechada (clarify A1/A2)**: enriquecimento é **campo aditivo** ao wire-format v1 (`CONTRACTS_SCHEMA_VERSION=1` mantido; decoder tolerante; consumers antigos ignoram). US6 fatiada em **2 tickets** — `6a` (`ctr_*`, `CTR-CONTRACT-EVENT-CONTRACTOR-REF`) e `6b` (`par_*`, `PAR-CONTRACT-COUNT-READMODEL`); `6b` depende de `6a`. O ADR-0046 só registra a decisão.
- **Citação pendente (DDD/integração)**: Vernon (Integration Events, _Implementing DDD_) + ADR-0022; Newman (read-models / cross-service data) se aplicável.

## D8 — Serialização de migrations (todas as US)

- **Decisão**: `0010`→`0015`, uma por US, `db:generate` nunca concorrente, sem worktrees paralelas na persistência.
- **Rationale**: causa-raiz do reset (4 trilhas colidiram em `0009`). É invariante de processo, não técnica.
