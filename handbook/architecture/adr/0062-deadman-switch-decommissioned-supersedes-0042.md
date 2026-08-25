[← Voltar para ADRs](./README.md)

# ADR-0062: O dead-man's switch é desativado sem substituto — o ponto cego volta a estar descoberto (supersede do ADR-0042)

- **Status:** Accepted
- **Date:** 2026-08-21
- **Deciders:** Gabriel Aderaldo (Tech Lead) — decisão de desligar · agente assistente — levantamento e redação
- **Supersedes:** [ADR-0042](./0042-deadman-switch-redundant.md) — o mecanismo que ele decidiu está **desligado**. A necessidade que o motivou **permanece**, e sem cobertura.
- **Relacionado:** [ADR-0041](./0041-specialized-workers-and-oneshot-jobs.md) (jobs one-shot via cron — define o gap original) · [Inquiry-0030](../../inquiries/0030-deadman-switch-nunca-vigiou.md) (a investigação que mediu o fim) · issues [#778](https://github.com/ERP-Bem-Comum/core-api/issues/778) e [#796](https://github.com/ERP-Bem-Comum/core-api/issues/796) (os alarmes que ele produzia)

---

## Contexto

O [ADR-0042](./0042-deadman-switch-redundant.md) decidiu um dead-man's switch "cinto e suspensório" para cobrir a quarta camada de confiabilidade dos jobs agendados: **o scheduler morrer e nunca disparar** — o caso em que "sem execução = sem erro = sem alerta".

O mecanismo foi **construído quase por inteiro**: emissor em Go com assinatura HMAC (`tools/deadman-emitter/`), dois workflows de ingestão e auditoria, contratos de dados documentados, script de decisão testado. Tudo isso existe hoje na branch `main`.

**E nunca vigiou nada.** A [Inquiry-0030](../../inquiries/0030-deadman-switch-nunca-vigiou.md) mediu o estado em 2026-08-17 e encontrou o achado que define este ADR:

> `deadman/history.jsonl` — **0 linhas**. Nenhum ping jamais ingerido, por nenhum dos dois planos.

O emissor foi escrito, testado e **nunca implantado em lugar algum**. Os dois planos de ingestão convergiam num arquivo que permaneceu vazio do primeiro dia ao último.

A consequência operacional foi o inverso da pretendida: como a decisão do auditor é por **estado**, e o estado nunca mudou, o cron diário reabria o mesmo alarme todo dia — `DEAD-MAN FIRED — sem sinal há 0h`, com `last_seen=nunca`. As issues #778 e #796 são duas ocorrências consecutivas do mesmo alarme vazio. **Um mecanismo de vigilância virou uma fonte de ruído diário**, e o ruído era indistinguível de um alerta real para quem não conhecesse a história.

---

## Decisão

**1. Os dois workflows estão desativados** (`disabled_manually`, em 2026-08-21):

| Workflow | Gatilho | Estado |
| :--- | :--- | :--- |
| `deadman-audit` | `cron 5 3 * * *` | desativado — era o que abria uma issue por dia |
| `deadman-ingest` | `repository_dispatch: deadman-ping` | desativado — inócuo sem emissor, desligado por coerência |

**2. Os artefatos NÃO foram removidos.** `tools/deadman-emitter/`, `deadman/*.jsonl` e os dois `.yml` seguem na `main`. Remover exigiria PR para a branch protegida e destruiria material que a próxima tentativa pode aproveitar — o emissor Go em particular é código pronto e testado, cujo problema nunca foi a qualidade.

**3. O ADR-0042 é superado, e o que ele decidiu deixa de valer como norma.** Quem ler aquele ADR a partir de hoje deve ler este primeiro.

**4. Não há substituto, e isto é a parte que importa.** O ponto cego original — *um job agendado morre e ninguém percebe* — **volta a estar descoberto**. As outras três camadas do ADR-0041 seguem de pé (exit code, catch-up do timer, rollback + idempotência); a quarta, não.

---

## O que este ADR NÃO decide

Ele **não** desenha o substituto. A [Inquiry-0030](../../inquiries/0030-deadman-switch-nunca-vigiou.md) §5 fixou cinco requisitos que qualquer próxima tentativa precisa satisfazer, e nenhum deles é respondido aqui:

1. provar recebimento antes de valer como vigilância;
2. o vigia precisa de quem o vigie, por caminho distinto do que ele usa para operar;
3. não depender de escrita no repositório;
4. aferição por função ("quando foi o último sinal?"), não por inventário ("os arquivos existem?");
5. custo de operação compatível com o valor — inclusive medir o que um serviço pronto de heartbeat resolveria, revendo a rejeição de SaaS do ADR-0042 à luz de um custo de construção que **não foi pago**.

Aquela inquiry permanece `open`, e o gatilho de fechamento dela é exatamente o desenho que falta.

---

## Consequências

**Positivas:** o ruído diário acaba; o repositório deixa de exibir um alarme que ninguém deve tratar; e a divergência entre decisão registrada e realidade some do ponto mais caro — o de um ADR `Accepted` descrevendo vigilância inexistente.

**Negativas, e a principal é a razão de este ADR existir:** o **risco não coberto fica explícito e sem dono**. Enquanto o ADR-0042 estava de pé, um leitor concluía que havia vigilância; agora o registro diz a verdade, e a verdade é que não há. Isso é melhor que a ilusão anterior — mas não é proteção.

⚠️ **A lição operacional, para o próximo mecanismo de qualquer natureza:** o ADR-0042 foi aferido em 2026-07-31 com veredito `partially-realized`, e aquela aferição **inventariou peças** — emissor, workflows, contratos, script — concluindo que o desenho estava quase todo de pé. Estava mesmo. O que ninguém perguntou foi *"quando foi o último sinal recebido?"*, e essa única pergunta teria revelado, três semanas antes, que o valor entregue era zero. **Inventário de artefatos não mede função**, e a §5.4 da inquiry existe por causa disto.
