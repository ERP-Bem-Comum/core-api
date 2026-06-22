# Backlog do `core-api` — Grafo de Dependências e Ordem de Execução

> **Atualizado em 2026-06-22.** Reflete o estado real das issues no GitHub
> (`ERP-Bem-Comum/core-api`) cruzado com o que já foi mergeado na `dev`.
> Documento de navegação para a P.O. — **fonte de verdade das decisões = comentários nas
> próprias issues.** Sucede a triagem de 2026-06-19 (várias raízes daquele grafo já foram entregues).
>
> Esforço: **S** ≤1 dia · **M** 2-4 dias · **L** ≥1 semana. Prioridade: **P1** (urgente) → **P3** (pode esperar).

---

## 1. Onde estamos (sumário executivo)

- **50 issues abertas**, organizadas em 5 épicos e 9 fases de execução.
- **Zero gargalos de decisão** — tudo que estava `needs-decision` foi resolvido. O que resta é **execução**.
- A onda de **fundações da Conciliação e do Lançar Documento já foi entregue** (cedente, extrato,
  read-model, categorização, issueDate, quick-wins). O backlog agora é majoritariamente **enriquecimento,
  roadmap de fatias e os módulos novos do Front v2**.
- **Fase A (Hotfix & Segurança) ZERADA** (sessão 2026-06-22): #200, #202 e #204 entregues e **mergeados na `dev`**.
  A frente quente passou para a **Fase B — Correção de base**, liderada por **#127 (outbox transacional)**,
  agora reclassificado **L** (achado de recon: o financial não tinha outbox persistente — ver §2/§4).

---

## 2. Em voo agora (sendo trabalhado)

| # | Demanda | Estado | Onde |
| --- | --- | --- | --- |
| **#127** | Outbox transacional — estado+evento na MESMA tx (atomicidade, ADR-0015) | **SDD completo (specify/clarify/plan/tasks) + W0 fundação RED**; ticket `FIN-OUTBOX-ATOMIC` | branch `024` (local) · financial |

> **#127 é L, não M.** Achado de recon: o financial usa `createInMemoryOutbox()` mesmo no driver mysql —
> não há tabela `fin_outbox`. Escopo (clarify via discussão de 3 especialistas): **inclui a conciliação**
> além dos 7 use-cases de documento (atomicidade é propriedade do emissor — Vernon/Newman).

---

## 3. Entregue recentemente (backend pronto — validar no front)

> Mergeado na `dev`. A issue pode seguir **aberta** porque PR para `dev` não fecha issue
> automaticamente e/ou porque resta o handoff de front.

| # | Demanda | Entrega |
| --- | --- | --- |
| #200 | `reference:read` no catálogo central (desbloqueia /categories,/cost-centers,/programs) | **PR #212 MERGED** (2026-06-22) |
| #202 | `authorize(contract:read)` na listagem `GET /contracts` (achado de segurança) | **PR #213 MERGED** (2026-06-22) |
| #204 | CONCILIADO reflete no grid (indicador derivado read-time, ADR-0022) | **PR #214 MERGED** (2026-06-22) |
| #147 | Categorização editável (Categoria/Plano/Centro de custo) + refs no create | PR #199 (backend done) |
| #90 | Favorecido do documento aceita qualquer tipo de parceiro (`payeeKind`) | PR #199 (backend done) |
| #148 | Definir aprovador no create (`approverRef` + listagem de aprovadores) | PR #199 (backend done) |
| #48 | Herdar categorização do contrato vinculado no create | **fechada** (PR #196) |
| #178 | Contracts expor categorização na public-api | **fechada** (PR #195) |
| #142 | Dados de referência de categorização (feature 020) | **fechada** (PR #198) |
| #135 | Suporte operacional de e-mail (runbook + `.env.example` + Mailpit) | PR #210 — resta a **infra real** (credenciais SMTP, DNS) |

**Raízes do grafo anterior já fechadas:** #126, #128, #138, #139, #140, #154, #159, #160, #163, #165, #166, #173, #174, #175, #176, #208.

---

## 4. Ordem mestre de execução (triada)

### Fase A — Hotfix & Segurança ✅ CONCLUÍDA (2026-06-22)
| # | Demanda | Prio | Módulo | Esforço | Estado |
| --- | --- | --- | --- | --- | --- |
| #200 | `reference:read` no catálogo | **P1** | financial+auth | S | ✅ **MERGED** (PR #212) |
| #202 | `authorize(contract:read)` na listagem | **P2/seg** | contracts | S | ✅ **MERGED** (PR #213) |
| #204 | CONCILIADO não chega ao grid (documento fica `Paid`) | **P1** | financial | M | ✅ **MERGED** (PR #214) |

### Fase B — Correção de base (FRENTE ATUAL)
| # | Demanda | Prio | Módulo | Esforço | Depende | Por que |
| --- | --- | --- | --- | --- | --- | --- |
| **#127** | Estado + evento na MESMA tx (outbox não-atômico) — **+ construir `fin_outbox` (não existe)** | **P2/bug** | financial | **L** | — | **Em voo (branch `024`, SDD+W0 fundação).** Pré-requisito de eventos confiáveis da Conciliação. Achado: financial é in-memory only → migration `fin_outbox`. Escopo inclui conciliação (clarify). |
| #205 | Read-model do extrato não computa saldo no início do período (`from`) | **P2** | financial | M | — | Tesouraria vê saldo errado em período passado. |
| #206 | Tipo de conta-cedente: enum fechado impede Cartão corporativo / Outro | **P2** | financial | S | — | Relaxar union + CHECK (migration aditiva). |
| #207 | Conciliação "Por" mostra UUID cru — falta nome do usuário | **P2** | financial+auth | S-M | ~~#200~~ ✅ (desbloqueado) | Reusa lookup de usuário cross-módulo (public-api). |
| #191 | Lookup de conciliação ativa retorna **503** para `ManualEntry` | **P3** | financial | S | — | Gap de mapeamento. **Sem labels — triar.** |

### Fase C — Conciliação: enriquecimento
| # | Demanda | Prio | Módulo | Esforço | Depende | Por que |
| --- | --- | --- | --- | --- | --- | --- |
| #111 | Backfill `fin_supplier_view` (nome/documento do fornecedor vêm null) | **P3** | financial | S-M | — | Desbloqueia nomes no grid. Operacional (disparar backfill + worker). |
| #172 | Enriquecer sugestões e títulos Pagos com nome do fornecedor + nº doc | s/label | financial | M | #111 | Depende do read-model populado. **Triar prio.** |
| #203 | Reabrir período de conciliação (reopen) — hoje só fecha | **P3** | financial | M | — | Nova transição de domínio + endpoint. |

### Fase D — Lançar Documento: finalização
| # | Demanda | Prio | Módulo | Esforço | Depende | Por que |
| --- | --- | --- | --- | --- | --- | --- |
| #95 | Enriquecer `GET /documents/:id` (drawer) com labels (id→nome) | **P2** | financial | M | #111 | Refs já expostos; falta resolver category/costCenter/program/payee. |
| #197 | Create: competência (MM/AAAA) + conta-débito | **P3** | financial | S-M | — | Follow-up do #48; campo aditivo. |
| #115 | Create: aceitar chave de acesso (44 díg.) p/ DANFE | **P3** | financial | S | — | Campo aditivo. |
| #201 | Listagem de Contas a Pagar orientada a TÍTULO (pai + filhos) | **P2** | financial | M-L | — | Novo read-model; complementa o grid por-documento. |
| #162 | Alteração de VENCIMENTO em LOTE (bulk due-date) | **P3** | financial | M | — | Operação em lote. |
| #164 | Filtros avançados + ordenação + visões salvas | **P3** | financial | M-L | — | UX da listagem. |
| #167 | Busca textual (full-text) na listagem | **P3** | financial | M | #111 | FULLTEXT (permitido por ADR-0020). |

### Fase E — Conciliação: roadmap (fatias do épico #64)
| # | Demanda | Prio | Módulo | Esforço | Depende | Por que |
| --- | --- | --- | --- | --- | --- | --- |
| #58 | Fatia 3 — transmissão bancária (CNAB 240 Bradesco) + retorno | **P1/roadmap** | financial | L | #127 | Núcleo do "pagar". Emite eventos → exige #127. |
| #59 | Fatia 4 — extrato D+1 + confirmação de pagamento | **P2** | financial | L | #58 | |
| #61 | Fatia 6 — desfazimento de pagamento e conciliação | **P3** | financial | L | #59 | |
| #141 | Conciliação parcial + tratamento da diferença | **P2** | financial | M-L | — | Juros/multa/desconto/tarifa/parcial. |
| #146 | Export CSV da conciliação no layout Nibo | **P2** | financial | M | — | |
| #143 / #144 / #145 | Inter-contas / export PDF / import PDF-OCR | **P3** | financial | M-L | — | Agrupar; #145 = OCR (ver #62). |

### Fase F — Front v2: paridade com o legado (épico #169)
| # | Demanda | Prio | Módulo | Esforço | Por que |
| --- | --- | --- | --- | --- | --- |
| #112 | Dashboard (portar `/statistics/dashboard`) | **P2** | statistics (novo) | L | Front bloqueado sem mock. |
| #113 | Plano Orçamentário (Planejamento + Consolidado ABC) | **P2** | budget-plans (novo) | L | Fonte canônica do `budgetPlanRef`; destrava recebíveis adiados. |
| #114 | Relatórios (9 slices) | **P2** | reports (novo) | L | Front bloqueado sem mock. |
| #179 | Slices de recebíveis (adiados) | **P3/deferred** | receivables (novo) | L | Só após módulo `receivables` existir. |

### Fase G — Notifications (épico #170)
| # | Demanda | Prio | Esforço | Por que |
| --- | --- | --- | --- | --- |
| #135 | Provisionar e-mail no deploy (SMTP + SPF/DKIM/DMARC + migration + CI) | **P2** | M | Operacional; habilita o #117 (núcleo entregue) em produção. |
| #131 / #132 / #133 | Observabilidade do outbox / bounce handling / rate-limit | **P3** | S-M | Hardening de e-mail. |
| #117 | Núcleo SMTP/Umbler (EmailPort + outbox + DKIM) | **P3** | — | Núcleo entregue; falta operacional (#135). |

### Fase H — Débito técnico & estratégico
| # | Demanda | Prio | Esforço | Por que |
| --- | --- | --- | --- | --- |
| #53 | Isolar leituras por organização (multi-tenant) em `fin_documents` | **P2/seg** | L | **Estratégico** — pode subir se multi-tenant for requisito de produção. |
| #130 | `fin_document_timeline` desvia do ADR-0022 (síncrona vs projeção) | **P3** | M | Alinhar com a reestruturação de arquitetura. |
| #129 / #110 | Reconciler/backfill do `par_contract_count_view` | **P3** | S-M | Drift do contador. |
| #161 | Validar/truncar bounds varchar no `statement.mapper` | **P3** | S | Defesa. |

### Fase I — Roadmap longo
| # | Demanda | Prio | Esforço | Nota |
| --- | --- | --- | --- | --- |
| #62 | Fatia 7 — ingestão via OCR + enriquecimento | **P3** | L | = feature 018 (já planejada). Cobre #145. |
| #63 | Fatia 8 — integração cross-módulo (Contratos + Orçamento) | **P3** | L | Depende de #113 (Orçamento). |

---

## 5. Grafo de dependências (o que destrava o quê)

Legenda: `A → B` = A precisa sair antes de B · 🔓 raiz (nada o bloqueia) · ✅ já entregue.

### Financial — Conciliação & Lançar Documento
```
✅ fundações entregues: #138 (cedente) · #139 (extrato) · #160 · #163 (issueDate) · #176 · #178 · #142
✅ sessão 2026-06-22: #200 (reference:read) · #204 (CONCILIADO no grid) — MERGED

#127 ⏳ (outbox atômico — L, +fin_outbox) ──→ #58 (Fatia 3) ──→ #59 (Fatia 4) ──→ #61 (Fatia 6)
                          └─→ consumidores cross-módulo confiáveis (#63, #171)   [em voo, branch 024]
#207 🔓 (nome do usuário na conciliação)   [desbloqueado: #200 ✅]
#111 🔓 (supplier read-model) ──→ #95 (drawer) · #172 (sugestões) · #167 (busca)
#205 🔓 (saldo do período)   #206 🔓 (tipo de conta)
independentes: #141 #143 #144 #146 #161 #162 #164 #191 #197 #201 #203
```

### Contracts
```
✅ #202 (authorize na listagem) — MERGED (PR #213)
```

### Notifications (épico #170)
```
#117 ✅(núcleo) ──→ #135 (deploy/infra) ──→ #131 · #132 · #133
```

### Front v2 (épico #169) — módulos greenfield, 100% paralelizáveis entre si
```
#112 (statistics) ⟂ #113 (budget-plans) ⟂ #114 (reports)
#113 ──→ #63 (cross-módulo Orçamento) · #179 (recebíveis, após módulo novo)
```

> **Paralelismo seguro só entre módulos diferentes** (ADR-0014 — isolamento por prefixo).
> Dentro do `financial`, tarefas que geram migration são **serializadas** para não colidir na numeração.

---

## 6. Próximos 3 (recomendação) — pós-Fase A

1. **#127** (P2/bug, **L**) — **em voo** (branch `024`, SDD+W0 fundação): terminar o W0 (RED das 2 fatias + integração Docker) → W1 (migration `fin_outbox` + 2 repos + 10 use-cases) → W2 → W3. É a peça mais alavancada (destrava #58/Fatia 3 + consumidores cross-módulo).
2. **#206** (P2, **S**) — quick win: relaxar o enum de tipo de conta-cedente (union + CHECK, migration aditiva). ⚠️ serializar a migration após a `fin_outbox` do #127 (mesma numeração `fin_*`).
3. **#207** (P2, S-M) — **desbloqueado pelo #200** (merged): nome do usuário na conciliação via lookup cross-módulo (public-api). + **#191** (P3, S) é outro quick win encaixável (503 ManualEntry).

---

## 7. Épicos (fecham quando os filhos fecharem)

| Épico | Tema | Filhos abertos relevantes |
| --- | --- | --- |
| #64 | Financeiro (contas a pagar) | #58 #59 #61 #62 #63 (fatias de roadmap) |
| #89 | Lançar Documento | #95 #115 #162 #164 #167 #197 #201 (resto é front) |
| #169 | Front v2 (paridade legado) | #112 #113 #114 #179 |
| #170 | Notifications (e-mail) | #117 #131 #132 #133 #135 |
| #171 | Conciliação — gaps | enriquecimento + roadmap das fatias |

---

## 8. Pendências de triagem (sem labels no GitHub)

- **#172** e **#191** estão sem `type`/`priority` → aplicar ao decidir executá-las.
