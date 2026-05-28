# Inquiry-0018: `AuditLogGenerated` — trilha de auditoria transversal a todos os BCs

- **Status:** Decided (deferred)
- **Opened:** 2026-05-25
- **Closed/Decided:** 2026-05-26
- **Opened by:** Gabriel Aderaldo (via orquestrador)
- **Asked to:** P.O. + análise interna do handbook
- **Impact:** [ADR-0022](../architecture/adr/0022-read-models-via-projection-over-event-stream.md) (padrão de projeção decidido; materialização diferida até RBAC)

---

## 1. Contexto

`handbook/domain/contratos/06-event-line-context.md:24` documenta, na matriz de eventos:

| Evento | Produzido por | Consumido por | Impacto |
| :--- | :--- | :--- | :--- |
| `AuditLogGenerated` | **Qualquer BC** | Governança | Registra "Quem, Quando, De, Para" (Time Travel). |

Hoje os eventos de domínio existem (e vão ao outbox), mas **não há trilha de auditoria
consolidada** que responda "quem mudou o quê, quando, de qual valor para qual valor" de
forma transversal. O relatório de cobertura marca isto como 🟡 (`AuditLogGenerated` sem
agregado/log dedicado).

### Tensão central

`AuditLogGenerated` é explicitamente **"Qualquer BC"** — transversal. Isso conflita com
**ADR-0006** (isolamento de módulos: domínio de um módulo não conhece o de outro) e
**ADR-0014** (isolamento por prefixo `ctr_*`/`fin_*`). Uma trilha que registra ações de
Contracts **e** Financial não pode morar no domínio de nenhum dos dois.

### Bloqueador de identidade

A coluna **"Quem"** exige um **ator autenticado**. Hoje o sistema **não tem
autenticação/RBAC** — existe só o VO `src/shared/kernel/user-ref.ts`, sem enforcement
(o relatório de cobertura marca RBAC como Fase 2+, `07-external-context.md:40-49`). Logo,
um AuditLog completo depende de uma decisão de identidade ainda inexistente.

---

## 2. Pergunta(s) feita(s)

```
1. Onde mora uma trilha de auditoria transversal sem violar o isolamento de módulos (ADR-0006/0014)?
2. AuditLog é um write-path próprio ou é derivado do stream de eventos já existente?
3. Faz sentido construir "Quem/Quando/De/Para" antes de existir identidade/RBAC (Fase 2+)?
```

---

## 3. Respostas / Investigação

### 2026-05-25 — Análise interna (pendente)

A pergunta 3 sugere fortemente **adiar**: sem ator autenticado, o "Quem" seria sempre o
`UserRef` passado manualmente na borda (CLI), de valor de auditoria limitado. Vários eventos
**já carregam** ator e timestamp parciais (ex.: `AmendmentHomologated` carrega `homologatedBy`
+ `occurredAt`), o que favorece **derivar** em vez de criar write-path novo.

---

## 4. Análise interna

### Alternativas avaliadas

| Alternativa | Prós | Contras | Veredito |
| :--- | :--- | :--- | :--- |
| **A. Concern transversal no shared kernel** (tabela `audit_log` fora dos prefixos de módulo; cada módulo emite entradas via port comum) | Trilha única; respeita isolamento ao não tocar domínio alheio | Novo write-path; "De/Para" exige snapshot antes/depois; sem identidade real o "Quem" é fraco | ⏳ |
| **B. Derivar do event-store/outbox** (auditoria = projeção do stream de eventos; muitos eventos já têm ator+timestamp+snapshot — ex.: `ContractStateUpdated.newCurrentValue`) | Zero duplicação; sinergia com [[0017-timeline-read-model-vs-adr-0020]] (mesmo event-store) | Cobertura de "De→Para" depende do payload de cada evento; alguns não têm snapshot anterior | ⏳ candidata (sinergia Inquiry-0017 Alt. C) |
| **C. Módulo de auditoria dedicado** (BC próprio consumindo eventos de todos via public-api) | Mais escalável; consumidor explícito | Peso grande para Fase 1; exige public-api de todos os módulos | — |
| **D. Adiar até identidade/RBAC (Fase 2+)** | Honesto: "Quem" só tem valor com ator autenticado; evita auditoria de fachada | UC de governança seguem ausentes | ⏳ forte |

### Argumento decisivo (provisório)

Auditoria sem identidade autenticada é auditoria de fachada. O caminho de maior valor é:
(1) decidir o **event-store append-only** junto com a Inquiry-0017 (Alt. C compartilhada);
(2) **adiar** a materialização da trilha "Quem/De/Para" até a decisão de identidade/RBAC,
quando o "Quem" passa a ser confiável.

---

## 5. Decisão final

**DECIDIDA-DIFERIDA (2026-05-26) → [ADR-0022](../architecture/adr/0022-read-models-via-projection-over-event-stream.md).**

- **Padrão decidido:** AuditLog será um **read-model projetado** sobre o stream de eventos (mesmo
  mecanismo da Timeline — [Inquiry-0017](./0017-timeline-read-model-vs-adr-0020.md)), **transversal**
  (fora dos prefixos de módulo). O outbox já é o log append-only — sem event-store novo.
- **Materialização DIFERIDA** até existir identidade/RBAC: sem ator autenticado, o "Quem" é de
  fachada. **Reabrir** quando a inquiry/ADR de identidade & RBAC for decidida.

---

## 6. Saídas (outputs concretos)

- [ ] Decidir event-store compartilhado com [[0017-timeline-read-model-vs-adr-0020]].
- [ ] Abrir inquiry/ADR de identidade & RBAC (pré-requisito do "Quem").
- [ ] Novo ADR de auditoria transversal (após identidade).
- [ ] Mapear quais eventos atuais já carregam ator/snapshot (cobertura de "Quem/De/Para").

---

## 7. Referências

- `handbook/domain/contratos/06-event-line-context.md:24` (linha do `AuditLogGenerated`).
- `handbook/domain/contratos/07-external-context.md:40-49` (RBAC — Gestor/Operador/Auditor).
- `handbook/architecture/adr/0006-modular-monolith-core-api.md` (isolamento de módulos).
- `handbook/architecture/adr/0014-mysql-database-isolation.md` (prefixos `ctr_*`/`fin_*`).
- `src/shared/kernel/user-ref.ts` (VO de ator, sem enforcement).
- Inquiry relacionada: [0017 — Timeline read-model](./0017-timeline-read-model-vs-adr-0020.md).
