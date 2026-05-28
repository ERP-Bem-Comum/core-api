# Inquiry-0019: `TentativaDeExclusaoDetectada` — tripwire sem superfície de ataque

- **Status:** Open
- **Closed/Decided:** —
- **Opened:** 2026-05-25
- **Opened by:** Gabriel Aderaldo (via orquestrador)
- **Asked to:** P.O. + análise interna do handbook + inspeção de `src/`
- **Impact:** decide se/como implementar o evento de segurança do gap #5; cruza com identidade/RBAC e com o canal SIEM (ainda inexistente)

---

## 1. Contexto

O gap #5 do relatório de cobertura pede o evento de segurança documentado em:

- `handbook/domain/contratos/05-timeline-context.md:79` — `TentativaDeExclusaoDetectada`:
  > "Comando de deleção física → Alerta de violação de política."
- `handbook/domain/contratos/06-event-line-context.md:23` — produzido pela Timeline, consumido por **Segurança**:
  > "Alerta de violação da política de imutabilidade."
- `06-event-line-context.md:61` — alvo externo **Segurança / SIEM**.

### Achado da inspeção de `src/` (2026-05-25)

**Não existe nenhuma superfície de exclusão física no sistema:**

- `grep -rniE "hard.?delete|physical|purge"` em `src/modules/contracts/` → **zero** ocorrências.
- `DocumentRepository` (`domain/document/repository.ts:25`) expõe **apenas** `findById`, `list`, `save`.
  Nenhum método destrutivo.
- A exclusão é **100% lógica**: `deleteDocument` → `Document.logicallyDelete` (status
  `Active → LogicallyDeleted`, RN-11), com retenção (R5) e append-only (R1).
- A CLI (`cli/registry.ts`) não tem subcomando de deleção física.

Ou seja: o evento é um **tripwire para um comando que não existe**.

---

## 2. Pergunta(s) feita(s)

```
1. O que constitui uma "tentativa de exclusão física" numa arquitetura CLI-only, sem hard-delete e sem API pública?
2. Onde a violação seria DETECTADA — app (port tripwire), banco (proibido por ADR-0020: sem trigger), ou infra/DBA fora do processo?
3. Para onde o alerta vai? Não há canal SIEM; o outbox (ADR-0015) entrega a outros MÓDULOS, não a Segurança.
4. Faz sentido construir o detector antes de existir a superfície e o ator autenticado (o "Quem" da violação)?
```

---

## 3. Respostas / Investigação

### 2026-05-25 — Análise interna

Implementar agora exigiria três fabricações especulativas, todas contra os princípios do projeto:

1. **Inventar um método `hardDelete` no port só para recusá-lo** — generalidade especulativa
   (DDD interview, bloco "AVOID"; YAGNI). Adiciona um caminho que nenhum caller usa.
2. **Criar um sink "Segurança/SIEM"** ainda não desenhado — o outbox não é esse canal.
3. **Atribuir o "Quem"** da violação sem identidade/RBAC (mesmo bloqueador da [[0018-auditlog-transversal-todos-bcs]]).

---

## 4. Análise interna

### Alternativas avaliadas

| Alternativa | Prós | Contras | Veredito |
| :--- | :--- | :--- | :--- |
| **A. Implementar tripwire agora** (método destrutivo no port que sempre recusa + emite evento) | "Fecha" o gap no papel | Caminho sem caller (YAGNI); sink SIEM inexistente; "Quem" sem RBAC | ❌ rejeitada |
| **B. Detecção fora do app** (auditoria do MySQL / permissões de role no banco; `REVOKE DELETE`) | A política de imutabilidade física é melhor garantida por **permissão do banco** (o app user não tem `DELETE`/`DROP`) do que por evento de domínio | É decisão de **infra/segurança**, não de domínio; fora do escopo de um ticket de código de módulo | ⏳ candidata real |
| **C. Adiar até existir superfície + RBAC + SIEM** | Honesto: sem comando de deleção física, não há o que detectar | Gap segue aberto no papel | ⏳ forte |

### Argumento decisivo (provisório)

A política "documento nunca é apagado fisicamente" (R5) é melhor **prevenida** por
*least privilege* no MySQL (o usuário da aplicação não recebe privilégio `DELETE` nas tabelas
`ctr_*`/`outbox`) do que **detectada** por um evento de domínio. A "tentativa" então vira um
evento do **audit log do MySQL** (Inquiry-0018 / RBAC), não um evento de domínio emitido pela
aplicação. Logo, o gap #5 **não é um ticket de código de módulo** — é uma decisão de
infra/segurança acoplada a 0018 (auditoria) e à futura estratégia de RBAC.

---

## 5. Decisão final

**PENDENTE.** Recomendação interna: **não** implementar como evento de domínio agora (B/C).
Reavaliar quando existir (a) superfície real de deleção física, (b) canal de Segurança/SIEM,
(c) RBAC/identidade. Nada de código até lá.

---

## 6. Saídas (outputs concretos)

- [ ] Decidir prevenção por privilégio MySQL (`REVOKE DELETE` do app user) — decisão de infra.
- [ ] Acoplar "tentativa/violação" ao audit log do banco junto de [[0018-auditlog-transversal-todos-bcs]].
- [ ] Reabrir como ticket só se/quando surgir comando de deleção física no produto.

---

## 7. Referências

- `handbook/domain/contratos/05-timeline-context.md:79` (evento) e `:99` (R5 retenção).
- `handbook/domain/contratos/06-event-line-context.md:23,61` (Segurança/SIEM).
- `src/modules/contracts/domain/document/repository.ts:25` (port sem método destrutivo).
- `handbook/architecture/adr/0020-mysql-only-supersedes-dual-dialect.md` (triggers proibidos).
- Inquiry relacionada: [0018 — AuditLog transversal](./0018-auditlog-transversal-todos-bcs.md).
