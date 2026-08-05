# Inquiry-0026: Assíncrono com humano no meio — o outbox aguenta? E o Drizzle 1.0 muda a resposta?

- **Status:** Open
- **Opened:** 2026-08-05
- **Closed/Decided:** —
- **Opened by:** Claude Code (a pedido do dono do repo, no gate humano da Fase 1 da spec 040)
- **Asked to:** investigação interna medida — sem consulta externa
- **Impact:** ADR-0015 (outbox), ADR-0030 (fila diferida), ADR-0014/ADR-0058 (persistência e política de versão)

---

## 1. Contexto

Duas perguntas nasceram no mesmo dia e têm a mesma raiz: **o que hoje é decidido por argumento e precisa ser decidido por medição.**

**(a) Fluxo assíncrono com humano no meio.** Ao triar as 21 contradições ADR × código, o dono do repo
sinalizou que vêm eventos assíncronos mais complexos que os atuais. O exemplo dado:

> "Fazer solicitação de aprovação para um e-mail, a pessoa no e-mail 'aprova' e o código reage a isso
> mudando um status de uma máquina de estado."

Hoje o repositório tem outbox MySQL + polling ([ADR-0015](../architecture/adr/0015-mysql-outbox-pattern.md)),
e a decisão de **não** adotar fila foi consciente ([ADR-0030](../architecture/adr/0030-valkey-shared-store-deferred.md),
`Proposed`): YAGNI, com gatilho em "3+ jobs com dependência entre si". Há 6 jobs, todos independentes
— a contagem não dispara, mas fanout de aprovação dispararia.

**(b) Drizzle 1.0.** Na mesma sessão perguntou-se se valia migrar. O registry mostra que a linha
estável é `0.45.2` (dist-tag `latest`, publicada 2026-03-27) e a próxima é `1.0.0`, hoje em
**release candidate** (`1.0.0-rc.4`, 2026-06-27, 25 builds de RC e 291 de beta). Não existe `0.98`.

As duas se cruzam porque o mecanismo assíncrono é construído **sobre** o ORM: se o 1.0 mudar
`mysql-core`, `relations-v2` ou o modelo de transação, a resposta de (a) muda junto.

---

## 2. Pergunta(s) feita(s)

1. O outbox + polling atual sustenta um fluxo **human-in-the-loop** — solicitação → e-mail → callback
   externo → transição de máquina de estado — ou o desenho pede fila / workflow engine?
2. Quais das limitações do outbox são reais **neste** volume, e quais são teóricas?
3. O `drizzle-orm@1.0.0` muda alguma premissa de (1)? E o que ele custa em 8 módulos?

---

## 3. Respostas / Investigação

### 2026-08-05 — o que JÁ está medido

Três medições feitas na sessão que abriu esta inquiry, para não serem refeitas:

| Medição | Resultado |
| --- | --- |
| Linha estável do `drizzle-orm` | `0.45.2` é o dist-tag `latest`; **não existe `0.98`**. Próxima linha é `1.0.0`, em `rc.4` |
| `drizzle-kit` | `0.31.10` instalado **é** o latest |
| Collation por coluna no 0.45.2 | **Possível** via `customType` — `dataType()` devolvendo `'varchar(36) COLLATE utf8mb4_bin'` emite verbatim no DDL e a 2ª geração responde "No schema changes" (idempotente). Reproduzido com `drizzle-kit generate` em worktree descartável |

A terceira derruba um argumento que eu mesmo havia escrito: **não é verdade** que expressar collation
exija passo manual permanente. Ver a correção registrada em `context/decisions/ADR-0014.yaml`,
alegação `ADR-0014-C8`.

### O que FALTA medir — (a) assíncrono

- [ ] **Latência aceitável do polling.** Qual o intervalo atual do `runLoop`, e o que o fluxo de
      aprovação tolera? Se a aprovação é humana, minutos podem ser irrelevantes — e aí o outbox basta.
- [ ] **O callback externo.** A aprovação por e-mail chega como request HTTP na borda, não como
      evento. Isso é **entrada**, não saída: o outbox cobre o lado de publicar, e a transição de
      estado é um use case comum. Medir se há problema real ou se o desenho já cabe.
- [ ] **Retry e dead-letter.** O outbox atual tem contagem de tentativa? O que acontece com evento
      que falha N vezes? É aqui que fila costuma ganhar.
- [ ] **Agendamento futuro** ("reenviar em 3 dias se ninguém aprovar"). O outbox não agenda; o cron
      one-shot agenda. Medir se a combinação cobre, ou se falta primitiva.
- [ ] **Multi-instância.** `claimJobRun` já coordena job. O worker de outbox coordena? O
      [ADR-0030](../architecture/adr/0030-valkey-shared-store-deferred.md) tem gatilho em multi-instância.

### O que FALTA medir — (b) Drizzle 1.0

- [ ] **Breaking changes reais** em `mysql-core`: assinatura de coluna, `mysqlTable`, transação.
- [ ] **`relations-v2`** obriga reescrever repositórios? São 8 módulos.
- [ ] **Collation ganhou suporte de primeira classe?** Se sim, o `customType` vira desnecessário.
- [ ] **`drizzle-kit` correspondente** e se o differ mantém as migrations existentes estáveis.

---

## 4. Análise interna

**Não decidir agora é a decisão certa, e ela tem fundamento no próprio acervo.** O
[ADR-0058](../architecture/adr/0058-runtime-tracks-recommended-lts.md) §3, aceito em 2026-08-05,
exige que troca de tecnologia estrutural seja justificada por **inquiry que MEÇA, não que argumente**
— e um major de ORM é tecnologia estrutural. Esta inquiry é o instrumento que aquele ADR nomeia.

Para (b) há ainda a política de supply-chain: `drizzle-orm` é dependência de **produção**, pinada em
versão exata e cobrada por `tests/cleanup/production-deps-pinned.test.ts`. Colocar um **release
candidate** nessa posição contraria `minimumReleaseAge: 1440`, `minimumReleaseAgeStrict: true` e
`trustPolicy: no-downgrade` — a postura que nasceu do comprometimento do `axios` em março/2026.

**Gatilho para medir (b):** o `1.0.0` sair com dist-tag `latest` **e** passar a quarentena de 24h.
Antes disso é medir alvo móvel — 25 builds de RC em ~6 semanas indicam linha em movimento.

**Gatilho para medir (a):** o épico de aprovação entrar no roadmap. Medir antes é especular sobre
requisito que ainda não existe; medir depois de construir é pagar retrabalho.

---

## 5. Decisão / Encaminhamento

Nenhuma decisão tomada. A inquiry existe para que, quando qualquer gatilho disparar, a medição
comece do estado registrado aqui em vez de recomeçar do zero.

**O que NÃO se decide por esta inquiry:** a adoção do `customType` `binId` para identificadores. Ela é
independente do 1.0 (funciona no 0.45.2, medido), tem escopo próprio — toca schema de 8 módulos e
muda comportamento de geração — e merece ciclo próprio.

---

## 6. Referências

- [ADR-0015](../architecture/adr/0015-mysql-outbox-pattern.md) — outbox MySQL, polling como única leitura possível
- [ADR-0030](../architecture/adr/0030-valkey-shared-store-deferred.md) — fila diferida, com gatilho declarado
- [ADR-0058](../architecture/adr/0058-runtime-tracks-recommended-lts.md) §3 — troca estrutural exige inquiry que mede
- [Inquiry-0023](./0023-typescript-7-native-spike.md) — o precedente: mediu Node/Deno/Bun/tsgo em harness executável e **refutou** uma premissa de ADR aceito
- `context/decisions/ADR-0014.yaml`, alegação `ADR-0014-C8` — a medição de collation e a correção do argumento errado
- `.claude/rules/jobs-and-workers.md` — topologia de worker por grupo, e por que a fila segue diferida
