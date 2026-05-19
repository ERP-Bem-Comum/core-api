# Inquiry-0010: Correção de assunção — engine real é MySQL 8, não PostgreSQL

- **Status:** Decided
- **Opened:** 2026-04-28
- **Closed/Decided:** 2026-04-28
- **Opened by:** Gabriel Aderaldo
- **Asked to:** Análise interna (revisão crítica de premissas)
- **Impact:** [ADR-0013](../architecture/adr/0013-mysql-database-engine.md), [ADR-0014](../architecture/adr/0014-mysql-database-isolation.md), [ADR-0015](../architecture/adr/0015-mysql-outbox-pattern.md). Supersedes parcialmente ADRs 0003, 0004, 0008.

---

## 1. Contexto

Durante toda a fase de modelagem arquitetural inicial (ADRs 0001-0012, conversa de 2026-04-27 e manhã de 2026-04-28), assumi-se que o engine de banco de dados era **PostgreSQL**.

Em revisão crítica iniciada por questionamento direto de Gabriel ("Outra coisa, o banco é o MYSQL... por que estamos usando Postgres?"), confirmou-se que **a assunção era incorreta**.

---

## 2. Como a assunção entrou no projeto

A referência a PostgreSQL apareceu nas primeiras conversas técnicas sem ter sido validada com o time. Não houve fonte externa que afirmasse PostgreSQL — foi um **viés de hábito** do consultor (assistente IA), provavelmente por:

- PostgreSQL ser default comum em discussões DDD/Modular Monolith em 2026.
- ADRs anteriores (0003 outbox, 0004) terem trazido detalhes específicos de PostgreSQL.
- Ausência de check explícito do `package.json` do legado nas primeiras horas de modelagem.

Gabriel seguiu a linha sem questionar pois confiava no framing inicial — o que é razoável até que algo chame atenção.

---

## 3. Verdade do projeto

### Confirmação documental

```json
// legacy_project/package.json
"mysql2": "^3.6.1",
"typeorm": "^0.3.17"
```

```markdown
// legacy_project/CLAUDE.md
"ERP financeiro brasileiro construído com NestJS 10 + TypeORM 0.3 + MySQL 8."
```

Engine real: **MySQL 8.x**. Driver: **`mysql2`**.

---

## 4. Análise interna (a decisão)

### Alternativas reavaliadas

| Alternativa | Custo | Risco | Veredito |
| -------- | -------- | -------- | -------- |
| A. Migrar tudo para PostgreSQL | Conversão MySQL→PostgreSQL é projeto à parte; tipos, sintaxe, índices diferem | Alto — bugs sutis em queries financeiras | ❌ Rejeitada |
| B. Heterogêneo (legado MySQL + core PostgreSQL) | Dois engines em prod simultaneamente; outbox cross-engine | Muito alto — operação dupla sem benefício | ❌ Rejeitada |
| C. **Manter MySQL em ambos** | Zero conversão; mantém expertise; honra ADR-0001 (uma briga de cada vez) | Baixo | ✅ **Escolhida** |

### Argumentos decisivos para manter MySQL

1. **ADR-0001 (Strangler Fig) alerta contra batalhas simultâneas.** Trocar engine durante migração de paradigma + arquitetura + cultura de código = risco multiplicado.
2. **Não há requisito de domínio** que MySQL 8 não atenda.
3. **Time + Codebit já operam MySQL** — sem reinvestimento operacional.
4. **Drizzle ORM funciona perfeitamente** com `drizzle-orm/mysql2`.
5. **Outbox pattern é engine-agnóstico em conceito** — adapta-se a MySQL sem perder propriedades fundamentais.

---

## 5. Decisão final

**MySQL 8 como engine único** para legado e `core-api` novo.

Adaptações necessárias documentadas em:
- [ADR-0013](../architecture/adr/0013-mysql-database-engine.md) — escolha do engine.
- [ADR-0014](../architecture/adr/0014-mysql-database-isolation.md) — isolamento por database (supersedes ADR-0003).
- [ADR-0015](../architecture/adr/0015-mysql-outbox-pattern.md) — outbox em MySQL (supersedes ADR-0004).

---

## 6. Impacto e correções aplicadas

### ADRs afetados

| ADR | Antes | Depois |
| -------- | -------- | -------- |
| ADR-0003 | Accepted (PostgreSQL schemas) | Superseded by ADR-0014 |
| ADR-0004 | Accepted (Postgres Outbox) | Superseded by ADR-0015 |
| ADR-0008 | Mencionava driver `pg` | Conteúdo arquitetural mantido; driver real é `mysql2` |

### Documentos atualizados

- `architecture/02-system-topology.md` — diagrama com MySQL.
- `architecture/03-data-architecture.md` — reescrito para MySQL.
- `architecture/04-integration-events.md` — outbox em MySQL com `JSON`, índice composto, `CHAR(36)`.
- `infrastructure/01-infra-handoff.md` — provisionamento MySQL com `utf8mb4`.
- `infrastructure/03-secrets-catalog.md` — formato de DATABASE_URL para MySQL.
- `infrastructure/04-observability-baseline.md` — auditoria via plugin MySQL em vez de pgaudit.

### Inquiries afetadas

- [Inquiry-0008](./0008-postgres-driver-pg-vs-postgres.md) — marcada como **OBSOLETA**. Driver real é `mysql2`.

### Ticket Codebit

- A versão preparada do ticket mencionava PostgreSQL. Antes de enviar, **trocar PostgreSQL por MySQL 8** e remover seção sobre "conversão MySQL → PostgreSQL" (que não existirá).

---

## 7. Lição aprendida

Validar **premissas técnicas fundamentais com o código real** logo no início da modelagem. O `package.json` do legado deveria ter sido lido antes do primeiro ADR sobre persistência. **Custo da correção foi baixo porque foi pega cedo** (antes de implementação real); seria muito caro se tivesse sido pega após provisionamento de infra.

Convenção a partir de agora: **antes de decidir sobre stack, confirmar com fontes documentais do projeto** (`package.json`, `CLAUDE.md`, código existente).

---

## 8. Saídas concretas

- [x] [ADR-0013](../architecture/adr/0013-mysql-database-engine.md) criado.
- [x] [ADR-0014](../architecture/adr/0014-mysql-database-isolation.md) criado (supersedes ADR-0003).
- [x] [ADR-0015](../architecture/adr/0015-mysql-outbox-pattern.md) criado (supersedes ADR-0004).
- [x] ADR-0003 e ADR-0004 com status atualizado para `Superseded by`.
- [x] `architecture/03-data-architecture.md` reescrito.
- [x] `architecture/04-integration-events.md` reescrito.
- [x] `architecture/02-system-topology.md` ajustado.
- [x] `infrastructure/01-infra-handoff.md` ajustado.
- [x] `infrastructure/03-secrets-catalog.md` ajustado.
- [x] `infrastructure/04-observability-baseline.md` ajustado.
- [x] [Inquiry-0008](./0008-postgres-driver-pg-vs-postgres.md) marcada como OBSOLETA.
- [x] CHANGELOG atualizado.
- [ ] Atualizar versão do ticket da Codebit antes de enviar.

---

## 9. Referências

- `legacy_project/package.json` — fonte da verdade.
- `legacy_project/CLAUDE.md` — confirmação textual.
- [ADR-0001](../architecture/adr/0001-strangler-fig-over-rewrite.md) — princípio de uma briga de cada vez.
