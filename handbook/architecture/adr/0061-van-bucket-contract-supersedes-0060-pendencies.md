[← Voltar para ADRs](./README.md)

# ADR-0061: O contrato do bucket da VAN — cinco prefixos, `status/` como única janela, caixa compartilhada por convênio (supersede parcial do ADR-0060)

- **Status:** Accepted
- **Date:** 2026-08-10
- **Deciders:** Infra (Codebit) — desenho e implementação do agente · Gabriel Aderaldo (Tech Lead) — aceite do contrato e fronteira da aplicação
- **Supersedes (parcial):** [ADR-0060](./0060-van-transport-via-s3-bucket-supersedes-0008-relay.md) — a tabela de prefixos (`:41-46`) e as pendências 1, 2 e 3 (`:94-97`), **respondidas**. A decisão de rota do 0060 (transporte por bucket, aplicação nunca toca a instância) **permanece vigente e inalterada** — é a premissa deste ADR.
- **Relacionado:** [ADR-0019](./0019-document-storage-s3-with-minio-dev.md) (port/adapter S3) · [ADR-0006](./0006-modular-monolith-core-api.md) (ACL) · [ADR-0022](./0022-read-models-via-projection-over-event-stream.md) (consumo assíncrono)
- **Insumo:** devolutiva de infra no chamado, 2026-08-10 · manual do STCP OFTP Client v5.3 (`handbook/guidelines/.../van_guide/`, local-only)

---

## Contexto

O [ADR-0060](./0060-van-transport-via-s3-bucket-supersedes-0008-relay.md) decidiu a rota — bucket em vez de SSH — e listou quatro pendências que bloqueavam a implementação. Em 2026-08-10 a infra respondeu três delas e entregou o agente escrito e testado ponta a ponta (com a transmissão desligada).

Este ADR registra o contrato resultante. Ele também **corrige três afirmações do 0060** que a resposta desmentiu — e que, enquanto estiverem de pé, induzem a construir errado.

### Estado da integração em 2026-08-10

**A conexão com o banco está validada:** em 05/08 o STCPCLT conectou, autenticou e recebeu 35 arquivos. Isso prova licença, rede, certificado e identificação Odette.

⚠️ **A transmissão nunca foi exercitada.** Todos os eventos até hoje são de **recepção**. A única conexão existente é a de produção, no convênio real — um arquivo de remessa enviado para teste **vira pagamento de verdade**.

---

## Decisão

### 1. Cinco prefixos, e o estado da remessa é a localização do objeto

| Prefixo | Significado | Acesso da aplicação |
| :--- | :--- | :--- |
| `saida/` | na fila, **ainda não transmitido** | escrita |
| `processados/` | transmitido **com confirmação** | leitura |
| `falhas/` | sem confirmação, **aguarda revisão humana**; não é retransmitido automaticamente | leitura |
| `retorno/` | arquivos recebidos do banco | leitura |
| `status/` | resultado de cada execução | leitura |

**O agente nunca apaga:** o objeto muda de prefixo, e o versionamento do bucket preserva o histórico. O estado de uma remessa é legível pela **localização** do objeto; o detalhe fica no `status/`.

`sandbox/` **existe apenas no bucket de homologação** — o de produção não tem esse prefixo. Escrever no lugar errado exige trocar o **nome do bucket**, não apenas o prefixo.

### 2. `status/` — a única janela

O agente publica, por execução, um envelope JSON (UTF-8 **sem BOM**) com o veredito dele mais as linhas cruas do log de transferência.

Três formatos de chave, e o segundo é o que exige atenção:

| Chave | Quando |
| :--- | :--- |
| `status/<nome>.json` | resultado normal, um por remessa |
| `status/<nome>.duplicado-<carimbo>.json` | tentativa com nome já processado, **não transmitida** |
| `status/recepcao-<carimbo>.json` | recepção, **somente** quando houve arquivo recebido ou erro |

Três invariantes de leitura, implementadas em `adapters/van/status-envelope.ts`:

- **A chave do duplicado é distinta de propósito.** Se sobrescrevesse o status original, uma remessa **já transmitida** passaria a constar como não transmitida — a conclusão oposta. `duplicate` **nunca** conta como transmissão, ainda que declare `situacao: transmitido`: significa que o agente reconheceu o nome e **não acionou** o STCPCLT.
- **A ausência de `recepcao-*` significa "rodou e não havia nada a receber"**, não "não rodou". O agente executa a cada 5 minutos; publicar sempre geraria centenas de objetos vazios por dia. **Ler silêncio como falha é erro de interpretação, não defeito do agente.**
- **O veredito vem de evidência física** — o arquivo sair da pasta de saída e aparecer em BACKUP —, que é mais forte que código de retorno. Por isso `situacao` decide e `exitCode` não.

**Latência esperada:** até 5 minutos para a execução começar, mais o tempo da transmissão.

`codigoStcp` é declarado pela infra como **diagnóstico auxiliar, fora do contrato** — não entra no tipo, e depender dele acoplaria o backend a algo que pode sumir.

### 3. ⚠️ A caixa postal é do CONVÊNIO, não do nosso sistema

**Este é o requisito de desenho mais importante deste ADR.**

Chegam em `retorno/` arquivos referentes a operações feitas **fora da integração**, sem correspondência com remessa alguma que o backend enviou — os 35 já recebidos são exatamente isso.

O processamento de retorno **MUST**:

1. processar o que casa com remessa conhecida;
2. **segregar e alertar** o que não casa;
3. **nunca falhar o lote inteiro** por causa de uma referência desconhecida.

Todos os arquivos ficam arquivados em `retorno/`, processáveis ou não. Tratar referência desconhecida como erro fatal quebraria o processamento **no primeiro dia de produção**, e por um caso que é esperado.

### 4. Idempotência — garantida do lado do agente

O agente ignora nome já processado e **grava a intenção antes de transmitir**: se a execução morrer no meio, o arquivo não é retentado sozinho — fica marcado para revisão humana. Em pagamento, erra-se para menos.

Validado por teste: subindo o mesmo nome duas vezes, o STCPCLT **não é acionado** na segunda. Não há caminho para transmissão dupla.

### 5. Bucket e credencial

Versionamento **ligado** · criptografia em repouso **ligada** · bloqueio de acesso público **ligado** · buckets **separados** para homologação e produção.

A credencial do agente é **role da própria instância** — sem chave de acesso na máquina, rotacionada pela AWS. Isto responde a ressalva que o laudo de segurança de 2026-08-07 deixou aberta: o ganho de eliminar a execução remota **não** foi anulado por uma chave estática do outro lado. **É o cenário bom.**

O nome do bucket **não é registrado neste documento** e **não pertence ao código**: entra por variável de ambiente na task, junto das demais configurações.

---

## Correções ao ADR-0060

Três afirmações do 0060 não sobreviveram à resposta da infra. Ficam registradas aqui porque ADR aceito não se edita:

| Afirmação no 0060 | Correção |
| :--- | :--- |
| *"O `CLCP.ERR.TXT` **não existe** no manual v5.3"* (`:95`) | **O arquivo existe** na instalação; o manual é que não o documenta. A afirmação estava certa sobre o manual e errada sobre o mundo. Segue **fora do contrato** por decisão da infra |
| *"o nome é limitado a **26 caracteres** (erro 1101)"* (`:96`) | **Não se aplica.** O perfil está configurado com **128**, e os arquivos que o banco já envia por esse perfil têm 34 caracteres |
| Tabela de **quatro** prefixos (`:41-46`) | São **cinco** — entram `processados/` e `falhas/`; `sandbox/` só existe em homologação |

> O teto de **seis dígitos do NSA** (VO `Nsa`) **não** é afetado: ele vem do campo 158-163 do header de arquivo, que é coisa distinta do nome do arquivo.

---

## Consequências

### Positivas

- O backend consegue decidir a transição de `Transmitted` a partir de um contrato explícito, em vez de inferir de log bruto.
- O estado da remessa é legível sem consultar nada além da localização do objeto.
- Idempotência e ausência de transmissão dupla são garantidas **do lado do agente**, e testadas lá.
- A credencial temporária por role confirma o ganho de segurança da rota S3.

### Negativas

- **Dependência de um componente que não é nosso.** O agente vive no repositório `ERP-INFRA`, com handover previsto; um defeito nele é indistinguível, do nosso lado, de um defeito do banco.
- **Latência de até 5 minutos** entre depositar a remessa e ter qualquer sinal.
- **A caixa compartilhada exige tolerância a ruído** no processamento de retorno — complexidade que não existiria numa caixa dedicada.

### Neutras

- O domínio segue sem conhecer transporte; tudo isto é adapter.

---

## O que continua em aberto

1. **Nomenclatura do arquivo de remessa** — o nome **não é livre**: o banco identifica tipo e fila por ele. Sugestão preliminar da infra: `PAG_<convenio>.<timestamp>_<NSA>.REM`, a confirmar com o banco.
2. **Caixa/ambiente de homologação para pagamento** — sem ela, a transmissão não pode ser exercitada sem virar pagamento real. A extensão `.TST` aparece em material de homologação de **cobrança** e é tratada como **pista, não definição**.
3. **Layout e versão do CNAB em uso no convênio** — o tradutor fixa `089` (arquivo) e `045` (lote), lidos do PDF de jun/2019. Versão diferente muda constantes e possivelmente posições.
4. **Terminador de linha** — o layout não especifica; o montador adota CRLF sem terminador final, fixado em teste.

---

## Referências

- [ADR-0060](./0060-van-transport-via-s3-bucket-supersedes-0008-relay.md) — decisão de rota, vigente; prefixos e pendências 1-3 superseded aqui.
- `src/modules/financial/adapters/van/status-envelope.ts` — implementação da leitura do `status/`.
- `src/modules/financial/adapters/cnab/` — tradutor (envelope, Segmentos A/B, montador).
- Issue #604 (topologia) · #58 (fatia funcional CNAB 240).
- `handbook/guidelines/bradesco_guideline/van_guide/` — manual do STCP OFTP Client v5.3 (local-only).
