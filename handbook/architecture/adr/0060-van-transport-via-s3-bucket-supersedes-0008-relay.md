[← Voltar para ADRs](./README.md)

# ADR-0060: Transporte da VAN Bradesco por bucket S3 com agente na instância — supersede parcial do ADR-0008 (Adapter B)

- **Status:** Accepted — **a tabela de prefixos e as pendências 1-3 foram superseded pelo [ADR-0061](./0061-van-bucket-contract-supersedes-0060-pendencies.md)**
- **Superseded by (parcial):** [ADR-0061](./0061-van-bucket-contract-supersedes-0060-pendencies.md) (2026-08-10) — caem a tabela de prefixos (`:41-46`, são **cinco**, não quatro) e as pendências 1, 2 e 3 (`:94-97`), respondidas pela infra. **A decisão de rota permanece vigente e inalterada:** transporte por bucket, agente na instância, a aplicação nunca toca a máquina. ⚠️ Duas afirmações deste documento estão **erradas** e corrigidas no 0061: o `CLCP.ERR.TXT` **existe** (o manual é que não o documenta) e o teto de **26 caracteres no nome do arquivo não se aplica** (o perfil usa 128).
- **Date:** 2026-08-10
- **Deciders:** Infra (Codebit) — desenho do transporte, devolutiva do chamado em 2026-08-07 · Gabriel Aderaldo (Tech Lead) — aceite e fronteira da aplicação
- **Supersedes (parcial):** [ADR-0008](./0008-bradesco-integration-architecture.md) — §"Adapter B — `BradescoVanRelayAdapter`" e suas variáveis de ambiente (`:47-68`), mais as linhas de risco e consequência que derivam de SSH (`:85`, `:93`, `:95`, `:107`). **O Adapter A (`BradescoRestAdapter` — saldo e extrato via REST/mTLS) permanece vigente e inalterado**, com todas as suas envs `BRADESCO_*`.
- **Relacionado:** [ADR-0019](./0019-document-storage-s3-with-minio-dev.md) (port/adapter de storage S3 reaproveitado) · [ADR-0011](./0011-supply-chain-hardening.md) (dependência nova que deixa de entrar) · [ADR-0006](./0006-modular-monolith-core-api.md) (módulo, ACL) · [ADR-0052](./0052-rbac-bypass-flag.md) (bypass ligado — condição de exposição da rota de disparo)
- **Insumo:** devolutiva de infra no chamado (2026-08-07) · issue #604 (topologia e incógnitas) · issue #58 (fatia funcional CNAB 240)

---

## Contexto

O [ADR-0008](./0008-bradesco-integration-architecture.md) especificou o transporte da VAN como **SSH/SFTP para uma VM Windows** (`ssh2`), com `ssh.exec()` disparando o `stcpclt.exe` e `readdir`/`readFile` coletando retornos.

Nada disso foi construído. A varredura registrada na #604 confirma: não existe módulo `banco`/`banking`, não há serializador posicional em `src/`, `ssh2` não está no `package.json` e nenhuma env `VAN_*`/`STCPCLT_*` existe fora de documentação. **O ADR-0008 descreve, nesta parte, uma intenção — não um sistema.**

Em 2026-08-07 a infra que opera a instância Windows devolveu um desenho diferente e o adotou: **a aplicação não se conecta à instância em momento algum.** A troca é mediada por um bucket.

Este ADR registra essa mudança porque, enquanto o 0008 estiver de pé sem ressalva, ele instrui a construir a rota descartada.

---

## Decisão

**O transporte de remessa e retorno da VAN é mediado por um bucket dedicado. A fronteira do `core-api` termina no bucket.**

O fluxo:

1. O backend grava o arquivo de remessa no prefixo de saída.
2. Um **agente que roda dentro da própria instância Windows** — operado pela infra, **fora da nossa fronteira** — sincroniza esse prefixo para a pasta de saída do STCP, executa o cliente localmente e devolve retorno e status para o bucket.
3. O backend lê o retorno e o status no bucket.

**Invariante de fronteira:** o `core-api` não abre conexão com a instância, não depende de porta de entrada nela e não conhece caminho de sistema de arquivos do STCP. O agente, seu agendamento e sua manutenção **não são artefatos deste repositório**.

### Prefixos (contrato de transporte)

| Prefixo    | Sentido                                           | Acesso da aplicação |
| :--------- | :------------------------------------------------ | :------------------ |
| `saida/`   | remessa que a aplicação deposita para transmissão | escrita             |
| `retorno/` | arquivo de retorno depositado pelo agente         | leitura             |
| `status/`  | resultado da execução do STCPCLT                  | leitura             |
| `sandbox/` | rascunho e teste — **não sincronizado com nada**  | escrita e leitura   |

`sandbox/` é o único prefixo seguro para exercício do nosso lado: **gravar em `saida/` com o agente no ar equivale a depositar arquivo na pasta de transmissão.**

### Configuração

**Saem** as nove envs do ADR-0008 `:59-67` — `VAN_VM_SSH_HOST`, `_PORT`, `_USER`, `_PRIVATE_KEY` e as cinco `STCPCLT_*`. Caminho de executável e pasta de trabalho do STCP passam a ser assunto do agente.

**Entra** um conjunto `VAN_S3_*` próprio. Ele **não reaproveita o singleton `S3_*`** existente: o bucket da VAN é distinto do bucket de documentos e possivelmente de outra conta.

**Credencial por provider chain (IAM), sem chave estática.** O adapter atual já suporta isso sem código novo — `s3-config-aws.ts:15-16` documenta que, ausentes `S3_ACCESS_KEY_ID` e `S3_SECRET_ACCESS_KEY`, a resolução cai no provider chain (IAM Role ECS/IMDS). O mesmo desenho vale para `VAN_S3_*`.

**Permissão mínima:** escrita restrita ao prefixo de saída (e `sandbox/`), leitura restrita a retorno e status.

### O que deixa de existir

`ssh2` como dependência · chave privada SSH da aplicação e sua rotação · `VAN_VM_SSH_HOST_FINGERPRINT` (env de pinning proposta em laudo de segurança — morre antes de nascer) · `command=` forçado no `authorized_keys` · verificação de host key com `timingSafeEqual`.

---

## Consequências

### Positivas

- **A superfície de CWE-78 deixa de existir — não é mitigada, some.** O achado mais sério do laudo de 2026-08-07 era `ssh2.exec()` enviando string ao shell remoto (RFC 4254 não tem variante argv, e quoting de `cmd.exe`/PowerShell é inconsistente o bastante para "escapar" não ser mitigação real). Sem execução remota do nosso lado, não há o que mitigar.
- **Some uma classe inteira de segredo** — chave privada, passphrase, fingerprint. Credencial temporária por IAM substitui material de longa duração.
- **Sem rota de rede e sem porta de entrada** entre a aplicação e a instância.
- **Reaproveita o que existe.** O adapter S3 já é multi-endpoint por desenho (`s3-config-aws.ts:6` — _"Um adapter + N endpoints (AWS S3, MinIO, Magalu)"_).
- **A responsabilidade operacional da VM sai da nossa fronteira**, junto com a manutenção do agente.

### Negativas

- **Perde-se o resultado síncrono.** No desenho SSH, o `exec()` devolvia o exit code do STCPCLT na hora. Agora a execução acontece fora do nosso alcance e o resultado chega por sinal assíncrono. **Gravar no bucket não é transmitir ao banco.**
- **A transição para `Transmitted` passa a depender de sinal externo.** O estado já existe reservado no domínio (`financial/domain/document/types.ts:31,38` — _"reservados (sem transição)"_); o que muda é que o momento da transição deixa de ser síncrono.
- **Observabilidade fica limitada ao contrato.** Sem acesso à instância — que é o ponto do desenho — o que não estiver em `status/` não existe para nós. Um retorno ambíguo não pode ser investigado lendo log na máquina.
- **Risco de duplicidade de remessa.** Reprocessamento do mesmo arquivo pelo agente, ou regravação pela aplicação, pode resultar em transmissão dupla ao banco. Em contexto de pagamento, é o risco mais caro deste desenho.
- **A instância é de produção.** Não há ambiente de homologação próprio para a integração; teste real depende do processo de homologação do banco.

### Neutras

- **O domínio não muda de forma.** O gerador de CNAB 240 não conhece transporte — a ACL do ADR-0006 é preservada tanto por SSH quanto por bucket.
- A VM Windows continua sendo SPOF do CNAB (ADR-0008 `:91`), agora fora da nossa fronteira operacional.

---

## Pendências que bloqueiam a implementação (não a decisão)

A rota está decidida. Estes quatro pontos precisam ser fechados com a infra antes de o adapter ser considerado completo:

1. **Contrato de `status/`** — o que o agente deposita ali e com que latência. **O formato não precisa ser inventado:** o cliente já mantém um log de transferências **posicional** (manual do STCP OFTP Client v5.3, §12) cujos campos incluem timestamp, código da operação (fim de transmissão), **resultado** e **nome do arquivo** — o suficiente para correlacionar com a remessa e decidir a transição. O que falta combinar é o agente **entregar** esse registro no bucket. **Sem isso não há como transicionar `Transmitted`, nem distinguir "ainda não rodou" de "rodou e falhou".**
   > ⚠️ O `CLCP.ERR.TXT` citado no pedido de acesso original **não existe** no manual v5.3 — a afirmação não sobreviveu à fonte primária e não deve ser propagada.
2. **Idempotência por NSA, dentro do limite de nome do protocolo** — o NSA (`fin_cedente_accounts.next_nsa`, com CHECK `>= 1`) deve compor o nome do arquivo, e o agente deve ser idempotente por nome. **Restrição do protocolo:** o nome é limitado a **26 caracteres** (erro 1101; nome longo depende de habilitação **e** de o parceiro incorporar a opção) e não aceita espaço nem caractere inválido (erro 1102). O gerador de nome nasce com esse teto, não o descobre em produção.
3. **Ciclo de vida em `saida/`** — do lado do Windows a regra já é do cliente: **tudo que estiver na pasta de saída é enviado**, e o que sai com sucesso é removido dela e movido para BACKUP (manual §5). Falta definir o reflexo disso **no bucket** — o agente apaga o objeto de `saida/`, move para um prefixo de processados, ou deixa? Sem regra, não há como saber o que já foi.
4. **Homologação** — em levantamento pela infra junto ao banco.

O nome do bucket **não é registrado neste documento**: o repositório é público.

---

## Alternativas Consideradas

### A. Manter o SSH/SFTP do ADR-0008

**Rejeitada.** Um laudo de segurança de 2026-08-07 chegou a recomendar SSH sobre S3, mas por um motivo que deixou de valer: o salto bucket→VM estava então **indefinido**, e o laudo registrou que "comparar risco totalmente mapeado com risco não-especificado não é comparar risco menor com maior". Com o salto especificado e sob operação da infra, o argumento cai — e o ganho de eliminar execução remota do nosso lado passa a não ter contrapartida.

### B. VAN terceirizada

**Segue não decidida**, herdada do ADR-0008 §B. Não é afetada por esta mudança.

---

## Quando Re-avaliar

- Se o agente virar fonte recorrente de incidente sem diagnóstico possível pelo `status/`.
- Se o banco publicar API REST para operações CNAB.
- Em qualquer dos casos: ADR novo `supersedes` este.

---

## Referências

- [ADR-0008](./0008-bradesco-integration-architecture.md) — parte superseded (Adapter B); o Adapter A segue vigente.
- Issues #604 (topologia e incógnitas), #58 (fatia funcional CNAB 240), #634 (bypass de RBAC — condição para expor rota de disparo).
- `src/modules/contracts/adapters/storage/s3-config-aws.ts` — resolução de credencial e multi-endpoint.
- `src/modules/financial/domain/document/types.ts:31,38` — estado `Transmitted` reservado.
- `handbook/guidelines/bradesco_guideline/jun-19-layout-multipag.pdf` — layout **multipag** (pagamento); fonte primária para o arquivo, que este ADR não altera.
- `handbook/guidelines/bradesco_guideline/van_guide/` — manual do **BRADESCO STCP OFTP Client v5.3 (06/2023)**; fonte primária do transporte. Dele saem os fatos usados aqui: o layout posicional do log de transferências (§12), o teto de 26 caracteres no nome do arquivo (erro 1101) e a remoção automática da pasta de saída após envio bem-sucedido (§5). Sob restrição de redistribuição — **consultar localmente, não copiar trecho para arquivo commitável**.
