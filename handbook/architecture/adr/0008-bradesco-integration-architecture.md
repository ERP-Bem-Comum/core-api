[← Voltar para ADRs](./README.md)

# ADR-0008: Arquitetura da Integração Bradesco (REST API + VAN via Windows VM)

- **Status:** Accepted
- **Date:** 2026-04-28
- **Deciders:** Arquiteto técnico (com base em troca de e-mail com Carlos Eduardo / Going2 e análise do código legado)

---

## Contexto

A integração com o Bradesco é parte central do BC `Integração Bancária` (`domain/05-integracao-bancaria-context.md`). O handbook trata o tema em alto nível — Tradutor de Layouts, ACL — mas não especifica os mecanismos físicos.

A análise do legado e a confirmação por e-mail do time que mantém o legado (Cadu / Going2, e-mail de 2026-04-22) revelou que **a integração tem duas camadas físicas distintas**, com tecnologias diferentes:

1. **REST API Bradesco** — para consultas de saldo e extrato.
2. **VAN via Windows VM com STCPCLT** — para envio/recebimento de arquivos CNAB.

Detalhamento completo da investigação em [Inquiry-0002](../../inquiries/0002-bradesco-van-architecture.md).

---

## Decisão

**O módulo `contexts/banco/` no `core-api` implementa DOIS adapters distintos**, cada um para uma camada de integração:

### Adapter A — `BradescoRestAdapter`

**Função:** consulta saldo, consulta extrato (via REST API Bradesco).

**Implementação:**
- HTTP client: `fetch` nativo do Node 24.
- mTLS via `https.Agent` (ou `undici.Agent`) com cert/key/ca em base64 nas variáveis de ambiente.
- OAuth2 client credentials para Client ID / Client Secret.

**Variáveis de ambiente:**
```
BRADESCO_PRIVATE_KEY      (PEM base64)
BRADESCO_PUBLIC_KEY       (PEM base64)
BRADESCO_CA_BASE64        (PEM base64, opcional)
BRADESCO_CLIENT_KEY       (Client ID)
BRADESCO_CLIENT_SECRET
BRADESCO_BASE_URL
```

### Adapter B — `BradescoVanRelayAdapter`

**Função:** envio de remessa CNAB e recebimento de retorno (via VAN/Bradesco).

**Implementação:**
- SSH/SFTP para Windows VM externa via lib `ssh2`.
- SFTP put para enviar arquivo de remessa.
- `ssh.exec()` para disparar `stcpclt.exe` que faz a comunicação Odette com a VAN.
- SFTP readdir + readFile para coletar retornos.

**Variáveis de ambiente:**
```
VAN_VM_SSH_HOST
VAN_VM_SSH_PORT             (default: 22)
VAN_VM_SSH_USER
VAN_VM_SSH_PRIVATE_KEY      ← migrar de password para chave SSH (hardening)
STCPCLT_EXE_PATH
STCPCLT_INI_PATH
STCPCLT_PROFILE
STCPCLT_SAIDA_PATH
STCPCLT_ENTRADA_PATH
```

### O Windows VM com STCPCLT

A Windows VM **não é um serviço nosso** — é dependência operacional externa. Mas precisa ser:
- Provisionada na cloud da Bem Comum (AWS atual ou GCP futuro — a confirmar via [ADR-0007](./0007-multi-cloud-aws-gcp.md)).
- Mantida pela infra (Codebit ou time responsável).
- Backupeada (snapshot + cert + config STCPCLT + Odette ID/senha).

---

## Consequências

### Positivas

- **Separation of concerns dentro do BC Banco** — adapters explícitos por mecanismo de comunicação.
- **Testabilidade** — cada adapter testável isoladamente com mocks ou ambiente de homologação.
- **Caminho para hardening** — migração de SSH user/senha para chave SSH é trivial nesta reescrita.
- **ACL preservada** — domínio (Títulos, Documentos) não conhece detalhes de mTLS, SSH, ou Odette.
- **Evolução futura** — se Bradesco abrir API REST para CNAB no futuro, podemos eliminar o `BradescoVanRelayAdapter` sem mexer em domínio.

### Negativas

- **Windows VM é SPOF do CNAB** — se cai, nenhuma remessa sai/volta. Mitigação: HA / snapshot / runbook de recovery.
- **STCPCLT é caixa-preta** — sem visibilidade interna; debugging via stdout/stderr.
- **Dois caminhos de erro** — REST API erros HTTP, VAN erros via `ssh.exec` exit codes.
- **Cert mora SÓ na VM** — sem backup adequado, recuperar = chamado com banco.
- **Latência de fluxo** SSH+SFTP+exec — sob carga, não escala bem.

### Neutras

- Documentação do CNAB Bradesco (`handbook/guidelines/bradesco_guideline/AI_KNOWLEDGE_BASE/`) já está organizada e disponível para consulta.

---

## Riscos identificados e mitigações

| Risco | Severidade | Mitigação |
| :--- | :---: | :--- |
| SSH com user/senha | 🔴 Alta | Migrar para chave SSH no `core-api` |
| VM Windows como SPOF | 🟡 Média | Backup + runbook + HA quando viável |
| Cert isolado na VM | 🟡 Média | Documentar processo de renovação + backup |
| STCPCLT licenciamento | 🟠 | Pendente confirmação com Codebit / Cadu |
| Latência sob carga | 🟠 | Monitorar; CNAB não é hot path |

---

## Alternativas Consideradas

### A. Implementar protocolo Odette/STCP em Node nativo
**Rejeitada.** Reverso engineering de protocolo bancário proprietário sem documentação aberta. Tempo + risco enormes; STCPCLT já funciona.

### B. Usar VAN terceirizada (Tecnospeed, NDD, RPS)
**Não decidida ainda.** Pode ser caminho futuro se VM Windows virar problema operacional crônico. Trade-off: custo recorrente vs. complexidade de manter VM. Pendente avaliação.

### C. Migrar tudo para REST API quando Bradesco abrir
**Aspiracional.** Bradesco não publicou roadmap completo para CNAB via API. Quando publicar, substituir `BradescoVanRelayAdapter` é reescrita pontual sem afetar domínio.

---

## Quando Re-avaliar

- Quando Bradesco publicar API REST para operações CNAB.
- Se VM Windows virar fonte recorrente de incidentes.
- Se Bem Comum contratar VAN terceirizada e quiser migrar.
- Em qualquer dos casos: ADR novo `supersedes` este.

---

## Referências

- [Inquiry-0002](../../inquiries/0002-bradesco-van-architecture.md) — investigação completa com Cadu.
- [ADR-0007](./0007-multi-cloud-aws-gcp.md) — cloud onde a VM Windows reside (a confirmar).
- [ADR-0011](./0011-supply-chain-hardening.md) — hardening (incluindo cert + SSH).
- `handbook/domain/05-integracao-bancaria-context.md` — modelo de domínio.
- `handbook/guidelines/bradesco_guideline/` — documentação técnica do Bradesco.
- Código fonte legado: `legacy_project/src/modules/apiBradesco/http.service.ts`.
- Código fonte legado: `legacy_project/src/common/gateways/transfer-file-sftp/transfer-file-sftp.gateway.ts`.
