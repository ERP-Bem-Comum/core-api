---
paths:
  - "src/modules/*/application/**/*.ts"
  - "tests/modules/*/application/**/*.ts"
---

# Regras invariantes — Application

Aplicáveis a tudo sob `src/modules/*/application/`. Application orquestra; não tem regra de negócio nem conhece infra.

- Use cases são **factory functions**: `(deps: Readonly<{...}>) => (input) => Promise<Result<O, E>>`.
- **Ports são `type`**, nunca `interface` com implementação nem `class`. Cada port é um `Readonly<{...}>` de funções.
- Sequência canônica num use case: **validar → fetch → domain → persist → publish event**.
- ⚠️ **"Evento após o save" não basta — tem de ser atômico.** O `INSERT` na outbox ocorre **dentro da mesma transação** do save ([ADR-0015](../../handbook/architecture/adr/0015-mysql-outbox-pattern.md), `appendOutboxInTx`): o evento existe **se e somente se** a operação confirmou. Gravar o evento após o commit deixa janela de inconsistência e viola o ADR, mesmo parecendo cumprir a sequência acima.
- Sem importar de `adapters/`. Application conhece apenas tipos de port.
- Se um `if` decide estado de negócio, ele está no lugar errado — mover para `domain/`.
- **Read-after-write crítico lê do primário**, e a decisão de roteamento é **explícita no use case**, nunca implícita ([ADR-0026](../../handbook/architecture/adr/0026-mysql-read-write-split-connection.md)) — a replicação MySQL é assíncrona.

## E-mail transacional é evento, não chamada ([ADR-0047](../../handbook/architecture/adr/0047-transactional-email-via-producer-domain-event.md))

Operação de negócio que dispara e-mail **grava um evento de domínio no outbox do próprio módulo produtor, na mesma transação do save**. O `notifications` **consome** o evento e envia — nunca é dependência síncrona.

- Chamada síncrona `produtor → notifications` é **rejeitada**: acopla os BCs em runtime, não é atômica, e falha de SMTP derrubaria a operação de negócio.
- O payload carrega o token de uso único → **o outbox é interno e não é logado**.

## Skill canônica

`ports-and-adapters` para definir ports (Repository, EventBus, Storage, Clock). Ver [`.claude/skills/ports-and-adapters/SKILL.md`](../skills/ports-and-adapters/SKILL.md).
