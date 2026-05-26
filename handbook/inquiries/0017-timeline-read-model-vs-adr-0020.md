# Inquiry-0017: Timeline (Memória Operacional) — read-model vs. ADR-0020 (sem JSON)

- **Status:** Open
- **Opened:** 2026-05-25
- **Closed/Decided:** —
- **Opened by:** Gabriel Aderaldo (via orquestrador)
- **Asked to:** P.O. + análise interna do handbook
- **Impact:** novo ADR (read-model de Timeline) + possivelmente revisão de UC-02/UC-08; bloqueia ticket `CTR-TIMELINE-READ-MODEL`

---

## 1. Contexto

O BC **Memória Operacional (Timeline)** está integralmente documentado em
`handbook/domain/contratos/05-timeline-context.md` como **agregado raiz**, com dois casos
de uso de leitura ainda ausentes em `src/`:

- **UC-02** — mostrar contrato **com timeline** (hoje `application/use-cases/get-contract.ts:18`
  devolve só o `Contract`, sem histórico).
- **UC-08** — ler a trilha cronológica (`EventoTimeline[]`) de um contrato.

Os eventos de domínio **já são emitidos** e vão ao outbox (ADR-0015). A pergunta é **de onde
a trilha cronológica é lida** — e isso colide com uma restrição dura:

### Tensão central

`05-timeline-context.md:21-30` modela:

```ts
interface EventoTimeline {
  id: EventoID;
  contratoId: ContratoID;
  tipoEvento: TipoEvento;
  descricao: string;
  timestamp: Date;
  autor: UsuarioRef;
  metadata: JSON; // Detalhes do que mudou
}
```

Mas **ADR-0020** lista **coluna JSON nativa como feature proibida** (dialeto MySQL único).
Logo o campo `metadata: JSON` **não pode ser persistido como está** — precisa de decomposição
ou de outra estratégia.

Há ainda uma invariante append-only forte (`05-timeline-context.md:95` R1):
"Evento registrado **nunca** pode ser editado ou excluído."

---

## 2. Pergunta(s) feita(s)

```
1. De onde a Timeline é LIDA: projeção dedicada (write-side novo) ou derivação do fluxo de eventos já existente?
2. Como representar `metadata` sem coluna JSON (ADR-0020)?
3. O outbox (ADR-0015) é fonte durável de histórico, ou é só canal de entrega (entradas podem ser podadas)?
```

A resposta à pergunta 3 é o **fator decisivo** entre as alternativas abaixo.

---

## 3. Respostas / Investigação

### 2026-05-25 — Análise interna (pendente de confirmação)

**Investigação obrigatória antes de decidir:** verificar o ciclo de vida das entradas do
outbox (`src/modules/contracts/adapters/outbox/` + worker `worker/outbox-worker.ts`). Se as
entradas são **deletadas/podadas após publicação**, o outbox **NÃO** serve como event-store
histórico e a Alternativa B fica inviável.

---

## 4. Análise interna

### Alternativas avaliadas

| Alternativa | Prós | Contras | Veredito |
| :--- | :--- | :--- | :--- |
| **A. Projeção dedicada `ctr_timeline_events`** (read-model alimentado por handler dos eventos; `metadata` decomposto em colunas tipadas por `tipoEvento`, ou texto estruturado sem tipo JSON) | CQRS limpo; append-only natural; respeita ADR-0020; leitura O(1) por `contratoId` indexado | Novo write-path + projector; duplica dado que já está nos eventos; precisa backfill | ⏳ candidata forte |
| **B. Derivar on-read do outbox/event-stream** | Zero novo write-path; reusa eventos existentes | Outbox é **canal de entrega**, não store histórico — se poda entradas, perde histórico; acoplა leitura à infra de entrega | ❌ provável (depende da pergunta 3) |
| **C. Event-store append-only dedicado** (tabela `ctr_domain_events` escrita pelos repos junto do state, separada do outbox) | Fonte de verdade histórica real; desacopla de entrega; base também para AuditLog ([[0018-auditlog-transversal]]) | Maior esforço; decide formato de evento serializado sem JSON nativo | ⏳ candidata (sinergia com Inquiry-0018) |
| **D. Adiar** | Foca nas frentes prontas | UC-02/UC-08 seguem ausentes | — |

### Pontos de decomposição do `metadata` (resolve pergunta 2)

- Por `tipoEvento` (discriminated union) → colunas específicas; ou
- `descricao` textual já cobre a narrativa humana (a UI mostra texto + link pro documento);
  `metadata` rico pode ser **derivado do payload do próprio evento** (que já é tipado e
  decomposto — ver `domain/contract/events.ts`, `ContractStateUpdated` carrega snapshot
  `newCurrentValue`/`newCurrentPeriod`).

> Observação: a Alternativa C tem forte sinergia com a Inquiry-0018 (AuditLog) — um único
> event-store append-only poderia servir Timeline (por contrato) **e** trilha de auditoria
> (transversal). Decidir as duas juntas evita dois write-paths concorrentes.

---

## 5. Decisão final

**PENDENTE.** Bloqueador: confirmar o ciclo de vida do outbox (pergunta 3) e a posição do P.O.
sobre A vs. C. Nada de código no BC Timeline até a decisão (regra do orquestrador:
dúvida arquitetural duradoura → inquiry antes de codar).

---

## 6. Saídas (outputs concretos)

- [ ] Investigar poda de entradas do outbox (worker + schema) e registrar aqui.
- [ ] Decidir A (projeção) vs C (event-store) — preferencialmente junto com [[0018-auditlog-transversal]].
- [ ] Novo ADR de read-model de Timeline.
- [ ] Ticket `CTR-TIMELINE-READ-MODEL` (W0→W3) após o ADR.
- [ ] Revisar UC-02 (`get-contract` passa a devolver contrato + trilha) e UC-08.

---

## 7. Referências

- `handbook/domain/contratos/05-timeline-context.md` (BC completo).
- `handbook/architecture/adr/0020-mysql-only-supersedes-dual-dialect.md` (JSON proibido).
- `handbook/architecture/adr/0015-mysql-outbox-pattern.md` (outbox).
- `src/modules/contracts/application/use-cases/get-contract.ts:18`.
- Inquiry relacionada: [0018 — AuditLog transversal](./0018-auditlog-transversal-todos-bcs.md).
