# BACKLOG — Grafo de Dependências e Decisões

> **Gerado em 2026-06-19** numa sessão de triagem + decisões do backlog do `core-api`.
> Cada issue foi cruzada com o código real da `dev` (na época, `HEAD` da branch `019-fin-recon-cedente-account` ≡ `dev` em commits).
> **Fonte de verdade das decisões = comentários nas próprias issues.** Este doc é o mapa de navegação.

---

## 1. Estado da triagem

- **100 issues auditadas:** 58 abertas (→ 57 após fechar #168) + 42 fechadas.
- **Fechadas:** confiáveis — todas com código/entrega correspondente na `dev`. **Ressalva única:** #71 (2º auditor `audit.sh`) vive no repo externo ERP-INFRA, não no core-api → tecnicamente PARCIAL deste lado.
- **#168 fechada** como duplicata de #138 (+ #139 para saldo/contadores do grid).

---

## 2. Decisões tomadas (11) — `needs-decision` zerado no backlog

| # | Decisão | Consequência no grafo |
| --- | --- | --- |
| #117 | **SMTP Umbler** (Resend = fallback no código) | Destrava #131/#132/#135 e o épico #170 |
| #159 | **Union EN fechado + CHECK** (`entryType`; desconhecido→`Other`) | Migration union+CHECK (Trilha conciliação) |
| #90 | **`payeeRef` + `payeeKind`** (favorecido polimórfico) + list-fn de Colaborador | Migration + ajuste no create; toca partners (public-api) |
| #130 | **Emenda ao ADR-0022** (timeline intra-agregado síncrona-na-tx é legítima) | **Pré-requisito #127** (outbox atômico) p/ reconstruibilidade |
| #142 / #147 | **Fonte da categorização no Orçamento (#113)**; financial faz passthrough | #142/#147 passam a ser **bloqueados por #113** |
| #48 | Aceita competência/emissão/conta-débito + **categorização herdada do contrato (editável)** | Depende de #163 + #138 + **#178** (novo) |
| #148 | **`approverRef` designado** no create (informativo, não trava) + endpoint de aprovadores | Toca auth (listagem de aprovadores) |
| #112/#113/#114 | Ordem **#113→#112→#114**, fatiado, **JSON-first** (CSV/PDF server-side incremental), #114 entrega 6 slices e adia 3 | **#113 vira raiz** que destrava #142/#147; 3 slices → **#179** |
| #135 | Operacional (provider já = Umbler) | Reclassificada como infra/deploy |
| #132 | Bounce: webhook Umbler se disponível, senão mailbox/adiar | Implementar na ativação de notifications |

> Embasamento do #130 (pesquisa via acdg-skills MCP): Vernon (*Implementing DDD*, p. 712), Newman (*Building Microservices*, p. 537 e p. 49). Read-models cross-aggregate/analíticos → projeção async; timeline append-only intra-agregado → síncrona-na-tx aceitável (single-DB mantém a transação).

---

## 3. Itens de trabalho criados pelas decisões

| Item | Onde | Status |
| --- | --- | --- |
| **#178** — contracts expor categoria/programa/plano/CC na public-api | contracts | **issue criada** (pré-req de #48) |
| **#179** — 3 slices de relatórios de recebíveis adiados | reports | **issue criada** (bloqueada por módulo `receivables` inexistente) |
| Emenda ao ADR-0022 | handbook/adr | escopo de **#130** (não duplicar) |
| list-fn de Colaborador na public-api de partners | partners | escopo de **#90** (não duplicar) |
| Endpoint de listagem de aprovadores | auth | escopo de **#148** (não duplicar) |
| Eventual épico `receivables` (contas a receber) | novo módulo | **não criado** (prematuro — só adiado em #179) |

---

## 4. Grafo de dependências (swimlanes por módulo · paralelizáveis)

Legenda: `A → B` = A destrava B · 🔓 raiz · 🍃 folha pronta (alto ROI) · 🚦 (todos resolvidos) · ⏳ em andamento.

### Trilha A — Conciliação (`financial`, `fin_*`)
```
#176 🍃🔓 (permission-catalog reconciliation:*) → destrava validação E2E de TODA a conciliação
#138 ⏳🔓 (cedente CRUD + HTTP)  [ticket FIN-RECON-CEDENTE-ACCOUNT, W0 done → W1 pendente]
        ├─→ #160 (FK debit_account_ref → fin_cedente_accounts)
        ├─→ #139 🔓 (read-model do extrato) → #175 (reconciliationId na listagem)
        └─→ (grid de contas no front)
#111 (backfill fin_supplier_view) → #172 (enriquecer sugestões c/ fornecedor)
#159 (union+CHECK — decidido)   independentes: #140 #141 #143 #144 #146 #161 #173 #174
#145 (import PDF OCR) ⟂ #62 (Fatia 7 OCR)
#171 = EPIC (agrega #142+#159)
```

### Trilha B — Lançar Documento (`financial`, `fin_documents`)
```
🍃 #154 (ISS no RPA)   🍃 #165 (editar Aprovado)   🍃 #166 (DELETE Draft)
#163 🔓 (issueDate) → #95 (detail-DTO) · #164 (filtros) · #48
#178 🔓 (contracts expor categorização) → #48 (categorização herdada)
#90 (payeeRef — decidido)   #148 (approverRef — decidido)
#113 ──(fatia referência)──→ #147 / #142 (categoria/CC/plano)
#115 #162 #167   #116 (←contracts list-item)   #53 (multi-tenant)
#89 = EPIC guarda-chuva
```

### Trilha C — Débitos arquiteturais (`financial`)
```
#127 🔓 (outbox atômico) → pré-req de #130 (emenda ADR-0022) e de #63 (cross-módulo)
#130 (emenda ADR-0022 — decidido; implementação depende de #127)
```

### Trilha D — Notifications (`notifications`)
```
#117 (Umbler — decidido) 🔓
        ├─→ #132 (bounce — implementação na ativação)
        ├─→ #135 (provisionar deploy — operacional)
        ├─→ #131 (observabilidade)
        └─→ #133 (rate-limit)
#170 = EPIC
```

### Trilha E — Partners (`partners`)
```
#126 🔓 (export histórico LISTA + gerador CSV 9 colunas) [P1] → #128 (DETALHE herda)
#110 (job backfill count-view) ⟂ #129 (job reconciler) — fundíveis
```

### Trilha F — Front v2 (módulos GREENFIELD)
```
#113 🔓 (budget-plans — fatiado: REFERÊNCIA primeiro) → #142/#147
        → Planejamento → Consolidado ABC
#112 (dashboard, fatiado, depois de #113)
#114 (reports: 6 slices viáveis) ; #179 (3 slices recebíveis, adiado)
#169 = EPIC
```

### Trilha G — Roadmap financial (épico #64)
```
#58 🔓 (Fatia 3 — CNAB 240) [P1] → #59 (Fatia 4 — extrato D+1) → #61 (Fatia 6 — desfazimento)
#62 (Fatia 7 — OCR) ⟂ #145
#63 (Fatia 8 — cross-módulo) ──→ #127 (atomicidade) + módulo Orçamento (#113)
```

---

## 5. Ordem de execução (ondas topológicas)

**🌊 Onda 0 — Quick wins (alto ROI, destrava validação):**
`#176` (permission-catalog → destrava E2E da conciliação) · `#154` · `#166` · `#165` · `#91`

**🌊 Onda 1 — Raízes (paralelizáveis por módulo):**
`#138`⏳ (terminar) · `#163` · `#178`→`#48` · `#126` · `#58` · `#111` · `#113` (fatia referência) · `#127`

**🌊 Onda 2 — Dependentes diretos:**
`#160`,`#139` (←#138) · `#95`,`#164` (←#163) · `#142`,`#147` (←#113) · `#128` (←#126) · `#59` (←#58) · `#172` (←#111) · `#130` (←#127) · `#131/#132/#133/#135` (←#117) · `#112` (←#113)

**🌊 Onda 3 — Folha longa / agregação:**
`#175` (←#139) · `#61` (←#59) · `#63` (←#127) · `#114` (6 slices) · enhancements de conciliação (#140/#141/#143/#144/#146/#173/#174)

**🌊 Onda 4 — Greenfield grande:**
`#53` (multi-tenant) · `#62` (OCR) · módulo `receivables` (#179)

**Encaixáveis a qualquer momento** (não bloqueiam): #161, #162, #167, #110, #129, #115.

**EPICs** (fecham quando os filhos fecham): #64, #89, #169, #170, #171.

---

## 6. Gargalos de decisão

**ZERO.** Todos os `needs-decision` foram resolvidos em 2026-06-19 (ver §2). O grafo está livre de gargalos humanos — o que resta é execução.
