# Inquiry-0002: Arquitetura real da integração Bradesco (VAN + REST)

- **Status:** Decided
- **Opened:** 2026-04-22
- **Closed/Decided:** 2026-04-27
- **Opened by:** Alessandra Castro (P.O.)
- **Asked to:** Carlos Eduardo "Cadu" Nunes (Going2 — time do legado)
- **Impact:** [ADR-0008](../architecture/adr/0008-bradesco-integration-architecture.md), atualização de `infrastructure/01-infra-handoff.md`

---

## 1. Contexto

Antes de implementar o BC Bradesco no `core-api`, era necessário entender exatamente como o legado se comunica com o banco hoje. A documentação interna divergia da documentação padrão da API. Tema crítico para handoff de infra (provisionamento de Windows VM, certificados, portas).

---

## 2. Pergunta(s) feita(s)

E-mail original de Alessandra para Cadu (2026-04-22):

```
1. Protocolo de Comunicação: o código atual utiliza SSL/SSH, mas a
   documentação da API menciona TCP assinado. Pode confirmar qual é o
   padrão aceito pelo banco/VAN?

2. Infraestrutura da VAN: confirmamos que a VAN está instalada em uma VM
   Windows. Existe alguma dependência de firewall ou porta específica
   que precisamos replicar no novo ambiente (GCP)?

3. Certificação Digital: como está sendo feita a chamada do certificado
   digital hoje? Ele fica instalado no repositório, na máquina da VAN
   ou em um Key Vault?
```

---

## 3. Respostas / Investigação

### 2026-04-22 — Resposta de Cadu

**1. Protocolo de comunicação:**
- O código implementa **SSH2 com subsistema SFTP** usando lib `ssh2` do Node.js.
- Autenticação SSH por **usuário/senha** (não por chave).
- Conexão SSH na **porta 22** (configurável via `SSH_PORT`).
- Dentro da sessão SSH, abre subsistema SFTP para transferência.
- Executa `stcpclt.exe` via `ssh.exec()` para disparar comunicação VAN ↔ Bradesco.
- **Sem túnel adicional** — aplicação se conecta direto à VM Windows via SSH.

**2. Infraestrutura da VAN:**
- Porta 22 aberta na VM Windows para receber SSH do backend.
- VM Windows hospeda STCPCLT.exe e configurações Odette.

**3. Certificado digital — DUAS camadas:**

**REST API Bradesco (saldo/extrato):**
- Chaves em variáveis de ambiente, encodadas em Base64:
  - `BRADESCO_PRIVATE_KEY` (PEM base64)
  - `BRADESCO_PUBLIC_KEY` (PEM base64)
  - `BRADESCO_CLIENT_KEY` (Client ID)
  - `BRADESCO_CLIENT_SECRET`

**VAN (CNAB):**
- Autenticação feita pelo próprio STCPCLT na VM Windows.
- Certificado e credencial configurados **NA VM**, fora do escopo do backend.
- Além do certificado, configura-se também **Odette ID e senha**.

### 2026-04-27 — Análise do código fonte legado
Confirmação visual em `legacy_project/src/modules/apiBradesco/http.service.ts` e `legacy_project/src/common/gateways/transfer-file-sftp/transfer-file-sftp.gateway.ts`.

---

## 4. Análise interna

### A integração tem DUAS camadas físicas distintas

```
core-api → HTTPS+mTLS → Bradesco REST API   (saldo/extrato)
core-api → SSH/SFTP → Windows VM → STCPCLT.exe → Odette → VAN → Bradesco   (CNAB)
```

### Implicações para o `core-api` novo

- Módulo `contexts/banco/` precisa de **dois adapters**:
  - `BradescoRestAdapter` (REST API) — usa `fetch` + `https.Agent` para mTLS.
  - `BradescoVanRelayAdapter` (CNAB via VAN) — usa `ssh2` para SFTP + `ssh.exec`.
- A Windows VM é **dependência operacional externa**, não serviço nosso. Mas precisa ser provisionada/mantida pela infra.

### Riscos identificados

| Risco | Severidade | Notas |
| :--- | :---: | :--- |
| SSH com user/senha (sem chave) | 🔴 Alta | Vetor fraco; recomendar chave SSH no novo |
| Windows VM como SPOF do CNAB | 🟡 Média | Se VM cai, nenhum CNAB sai/volta |
| Cert mora SÓ na VM | 🟡 Média | Sem backup = chamado com banco se VM destruída |
| STCPCLT é caixa-preta | 🟡 Média | Software de terceiro via `ssh.exec` |
| Licença STCPCLT | 🟠 Operacional | Precisa confirmar com infra |

---

## 5. Decisão final

**Arquitetura da integração Bradesco preservada do legado**, com hardening incremental:

1. ✅ Manter padrão dual (REST + VAN/STCPCLT).
2. ✅ Migrar SSH user/senha → chave SSH no `core-api` novo (oportunidade de hardening).
3. ✅ Implementar como dois adapters distintos no módulo `contexts/banco/`.
4. ⏳ Decidir com Codebit se VM Windows fica em AWS (junto do legado) ou move para GCP.

---

## 6. Saídas

- [x] [ADR-0008](../architecture/adr/0008-bradesco-integration-architecture.md) criado.
- [x] Mensagem ampliada enviada para Codebit ([Inquiry-0003](./0003-multi-cloud-strategy.md)) com 8 perguntas adicionais sobre VM Windows.
- [x] `infrastructure/01-infra-handoff.md` atualizado com Windows VM como componente.

---

## 7. Referências

- E-mail completo arquivado em `domain_questions/` (se aplicável) ou nas mensagens do projeto.
- Código fonte: `legacy_project/src/modules/apiBradesco/http.service.ts`.
- Código fonte: `legacy_project/src/common/gateways/transfer-file-sftp/transfer-file-sftp.gateway.ts`.
