[← Voltar para ADRs](./README.md)

# ADR-0068: FAIL-FAST em toda variável de ambiente, em **todo** ambiente — in-memory só como double de teste injetado (revoga o FR-007 do #456)

- **Status:** Accepted
- **Date:** 2026-08-31 (política ditada pelo dono do repositório na mesma data)
- **Deciders:** Gabriel Aderaldo (Tech Lead) — a política e a escolha da alternativa · agente assistente — medição, redação e execução
- **Revoga:** o **FR-007** da issue [#456](https://github.com/ERP-Bem-Comum/core-api/issues/456), citado literalmente em `src/shared/persistence/module-driver-config.ts:197`. Não supersede ADR algum — o #456 nunca virou ADR, e é essa a lacuna que este documento fecha.
- **Fecha:** [#799](https://github.com/ERP-Bem-Comum/core-api/issues/799) — "estender o fail-fast além da produção"
- **Origem:** [Inquiry-0034](../../inquiries/0034-in-memory-fora-de-local-custo-na-piramide.md) §4 e §5

---

## Contexto

### A pergunta estava aberta desde a #456

A guarda de boot dos sete módulos de persistência (`readModuleDriverConfigs`) nasceu com uma política assimétrica, escrita no docblock `:7-9`:

> _"em producao configuracao ausente/invalida derruba o boot; fora de producao degrada para memoria com um aviso que nomeia o modulo"_

Ela curou três incidentes de produção com a mesma causa — **#374** (tabelas `bgp_*` servidas vazias com o banco cheio), **#444** (relatórios vazios com HTTP 200) e **#474** (e-mails parando de sair, engolindo e reportando sucesso). Todos por **omissão de configuração**, todos silenciosos.

Mas a assimetria deixou a pergunta aberta, e a #799 a registrou: se a omissão é perigosa a ponto de derrubar produção, por que ela é aceitável em qualquer outro lugar?

### O fato operacional que decide, e que não está no código

**As variáveis de ambiente de homologação e de produção são postas manualmente, na console da AWS, por um funcionário da Codebit.** Os dois ambientes são operados por terceiro, provisionados por _taskdef_, e não são configuráveis nem alcançáveis por este time — `docker-compose`, `Dockerfile` e `Makefile` deste repositório só valem para ambientes **locais**.

Num arranjo assim, degradar graciosamente não protege ninguém: um erro de digitação numa console vira comportamento silencioso, e a pessoa que poderia corrigi-lo é justamente a que não recebe o sinal. O modo de falha barato — o processo não sobe e diz qual campo falta — é o único que chega a quem tem a mão no problema.

### A degradação silenciosa já custou caro fora de produção também

O padrão não é hipotético em ambiente não-produtivo: o storage de logo do `programs` serviu arquivo de um store volátil **em produção e em QA ao mesmo tempo**, sem que ninguém fosse avisado (#516), e o storage da VAN aceitava remessa que não chegava a bucket nenhum (#798).

---

## Decisão

**Toda variável de ambiente lida pelo código é obrigatória, em todo ambiente. Ausente ou recusada, o processo não sobe.**

1. **Sem exceção por ambiente.** Vale para produção, homologação e **local**. Local que degrada deixa de espelhar hml/prod, e é justamente aí que um defeito de configuração passa despercebido até o deploy.
2. **Sem exceção por natureza do erro.** "Não configurei" e "configurei errado" recebem o mesmo desfecho: recusa, com mensagem que nomeia o campo.
3. **`in-memory` deixa de ser alcançável por configuração.** `X_DRIVER=memory` não é mais um valor aceito. O único valor de driver é `mysql`.
4. **O adapter in-memory continua existindo — como _double de teste injetado_.** Isso não é exceção à regra: é outra coisa. A regra fala de **ambiente**; um teste que passa `{ driver: 'memory' }` por parâmetro para `build<Módulo>HttpDeps` não configura ambiente algum.
5. **Localmente, quem provê o serviço é o orquestrador de containers**, não um ramo no TypeScript. Rodar sem MySQL deixa de ser um valor de env e passa a ser subir (ou não subir) o container.

### O que isto revoga, explicitamente

O **FR-007** do #456 dizia que `memory` declarado sobe em produção _"sem falhar e sem exigir configuracao adicional"_. **Isso deixa de valer.** A revogação é deliberada: o requisito foi escrito quando "declarei memory" ainda era uma intenção legítima de operação; sob a decisão 3, não é mais — não há como declará-lo.

---

## Alternativas consideradas

| Alternativa | Veredito |
| :--- | :--- |
| **Manter a assimetria (status quo)** — fail-fast só em produção | ❌ Deixa local e homologação degradando em silêncio, e é homologação que a Codebit opera sem poder ver o aviso |
| **Fail-fast na fronteira de env** — `ModuleDriverConfig` perde a variante `memory`; os tipos por módulo a mantêm, para injeção em teste | ✅ **Escolhida** |
| **Remover `driver: 'memory'` também dos seis tipos por módulo** | ❌ Custo medido: **179** arquivos de teste migrariam para integração e o `pnpm test` passaria a exigir Docker — hoje roda 11.500 testes em ~111s sem container nenhum. E o ganho de segurança sobre a escolhida é **zero**: em hml e produção a única porta para o in-memory é a env, que a escolhida já fecha |

### Por que a terceira é inútil, e não apenas cara

A medição da Inquiry-0034 mostrou **duas fronteiras de configuração com tipos distintos**:

| fronteira | tipo | entrada | consumidores |
| :--- | :--- | :--- | ---: |
| env → config | `ModuleDriverConfig` | `process.env` | **1** — `src/server.ts` |
| config → deps do módulo | `FinancialCompositionConfig` e cinco irmãos | parâmetro de função | **179** — testes |

Os 179 entram pela **segunda**. Nenhum deles passa pela leitura de env. Fechada a primeira, o in-memory já não é alcançável em hml/prod por caminho nenhum — não existe caller que passe `{ driver: 'memory' }` fora do `server.ts` e dos testes.

A alternativa rejeitada também contraria a pirâmide de testes na fonte canônica (Ham Vocke, _The Practical Test Pyramid_): teste de integração exige rodar o componente real — _"If you're testing the integration with a database you need to run a database when running your tests"_ — e a regra é _"Push your tests as far down the test pyramid as you can"_. Migrar 179 arquivos os empurraria pirâmide **acima**.

---

## Consequências

### Positivas

- Um erro de configuração em homologação ou produção deixa de ser invisível: o processo não sobe e o `stderr` nomeia o campo.
- **Local passa a falhar como hml e prod falham** — o defeito aparece na máquina de quem escreveu, não no deploy.
- Some a classe de bug dos incidentes #374, #444 e #474 em **todos** os ambientes, não só em produção.
- A base da pirâmide de testes fica intacta: `pnpm test` segue sem Docker.

### Negativas, e são reais

- **Todo dev precisa declarar as envs** no próprio `.env` ou compose. Subir a API sem configurar nada deixa de funcionar. É o preço declarado de local espelhar produção.
- **Um ambiente sem as envs para de subir.** Se a homologação não tiver, por exemplo, as `VAN_S3_*`, a API não sobe lá até que a Codebit as configure. É o sinal que a política quer — ruído no boot em vez de remessa fantasma (#860) —, mas é ruído que aparece de uma vez.
- Os seis tipos por módulo continuam declarando a variante `'memory'`, agora inalcançável por configuração. Isso **exige comentário** em cada um dizendo por quê — variante que só o teste usa, e que a leitura de env não produz, lê-se como resíduo por quem não conhece a decisão.

### Escopo — o que este ADR **não** decide

Não trata de `*_READER_URL` (ADR-0026) nem da composição de programa em contratos (ADR-0032), que o #456 registrou como exclusões deliberadas por ADR aceito. Endurecê-las contradiria decisão vigente e exige ADR próprio.

---

## Conformidade

Verificável por leitura de `src/shared/persistence/module-driver-config.ts` e `src/modules/programs/adapters/http/logo-storage-config.ts`: nenhum caminho de leitura de env pode devolver configuração volátil, em ambiente algum. Um `grep` por `isProductionEnv` nesses dois arquivos deve voltar vazio — a política não distingue mais ambiente.

---

## Referências

- [Inquiry-0034](../../inquiries/0034-in-memory-fora-de-local-custo-na-piramide.md) — a medição que rejeitou a alternativa mais estrita
- Issues [#456](https://github.com/ERP-Bem-Comum/core-api/issues/456) (a guarda original) · [#516](https://github.com/ERP-Bem-Comum/core-api/issues/516) (logo do `programs`) · [#799](https://github.com/ERP-Bem-Comum/core-api/issues/799) (a pergunta que este ADR responde) · [#798](https://github.com/ERP-Bem-Comum/core-api/issues/798) (storage da VAN)
- Incidentes por omissão de configuração: #374, #444, #474
- Ham Vocke, _The Practical Test Pyramid_ (martinfowler.com) — linhas 341 e 1003, via `acdg-skills`
