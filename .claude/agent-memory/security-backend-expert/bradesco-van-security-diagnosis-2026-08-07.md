---
name: bradesco-van-security-diagnosis-2026-08-07
description: laudo de viabilidade + hardening da VAN Bradesco entregue em 2026-08-07 — ⚠️ o veredito P4 (SSH sobre S3) CAIU em 2026-08-10 (ADR-0060); os achados de hardening seguem válidos
metadata:
  type: project
---

> ⚠️ **ERRATA — 2026-08-10.** O **veredito P4 deste laudo não vale mais.** Ele recomendou SSH sobre
> S3, e o próprio texto declarou o motivo: o salto bucket→VM estava **indefinido**, e "comparar risco
> totalmente mapeado com risco não-especificado não é comparar risco menor com maior". Em 2026-08-07
> a infra especificou esse salto (agente rodando dentro da instância, operado por eles) e adotou a
> rota S3 — registrada no **ADR-0060**, que supersede parcialmente o ADR-0008.
>
> **O que caiu junto:** as decisões de algoritmo (Ed25519/RSA), o molde `VAN_VM_SSH_*`, o TOFU de
> host key fora de banda e a mitigação de CWE-78 — todas pressupõem que a aplicação abre conexão SSH,
> e ela **nunca** toca a instância no desenho vigente.
>
> **O que continua valendo, e é o motivo de este arquivo não ser apagado:** o diagnóstico de
> viabilidade (primitivos certos já existem no repo), o **bloqueio de go-live da #634**
> (`AUTH_RBAC_MODE=bypass` — vale para a rota de disparo independente do transporte), o molde de
> secret por arquivo (`<NOME>` XOR `<NOME>_FILE`) e o boot-guard fail-closed. O raciocínio abaixo fica
> como evidência histórica de por que a comparação foi feita — não como instrução de implementação.

Diagnóstico de viabilidade entregue ao team-lead em 2026-08-07 (par com `van-dominio`,
`van-persistencia`, `van-transporte` avaliando outras fatias da mesma feature — ADR-0008). Veredito:
**viável com lacunas**, não inviável — os primitivos certos já existem no repo (Result-na-borda,
boot-guard fail-closed, outbox imutável, RBAC nomeado, processo de dependência do ADR-0011); o que
falta é greenfield (módulo `banco/` não existe) mais um punhado de pré-condições concretas.

**Bloqueio real de go-live, não item de backlog independente:** `AUTH_RBAC_MODE=bypass` está LIGADO em
`compose.yaml:301` (issue #634, OPEN) — com isso, qualquer usuário autenticado dispara qualquer rota,
inclusive uma futura rota de envio de remessa. Reverter #634 precisa acontecer ANTES de expor a rota
de disparo, não depois. Ver também [[secrets-file-convention]] para o padrão de segredo recomendado
para a chave privada SSH da VAN.

Achados que não estavam no ADR-0008 e valem a pena revisitar quando o módulo `banco/` for desenhado:
`ssh2.exec()` manda STRING pro shell remoto da VM Windows (não é `execFile` local — CWE-78 se algum
argumento vier de input externo concatenado), falta env de fingerprint de host key no próprio ADR, e
não há gate mecânico (lint/semgrep) para a regra "try/catch só em adapters/" — é convenção documentada
em `.claude/rules/adapters.md:26`, não enforced.

**Why:** registrar para não re-investigar do zero se outra sessão for revisar a implementação real
quando o módulo `banco/` nascer — o laudo completo (com CWE/OWASP por achado) foi mandado por
SendMessage ao team-lead, não ficou em arquivo.

**How to apply:** ao revisar/implementar `src/modules/banco/`, checar se #634 foi resolvida primeiro;
se ainda não, qualquer rota de escrita desse módulo herda o mesmo risco que toda rota de escrita atual
já tem enquanto o bypass estiver ligado.

## Follow-up 2026-08-07 (mesmo dia) — laudo P1-P4 sobre a conexão SSH em si

Segundo pedido do team-lead, mais profundo: assumindo a rota SSH escolhida, como fazer a conexão em si
com segurança (chave, host key, superfície do `exec()`), e comparação honesta contra uma alternativa
S3+sync+scheduled-task-na-VM sem SSH do nosso lado. Decisões que valem a pena não re-derivar:

- **Algoritmo:** Ed25519 primário (nonce determinístico, imune à classe de bug que ECDSA já vazou
  chave por RNG fraco); RSA ≥3072 como fallback SE o sshd Windows do operador não suportar Ed25519 —
  isso precisa ser confirmado com quem opera a VM, não presumido.
- **Molde de segredo:** `VAN_VM_SSH_PRIVATE_KEY`/`_FILE` + `VAN_VM_SSH_PASSPHRASE`/`_FILE` (par
  opcional), espelhando `sweeper/config.ts:50-66`. **Diverge de propósito do molde de
  `jwt-key-config.ts`**: lá existe fallback são (par ES256 efêmero em dev); aqui NÃO existe — uma
  chave efêmera nunca vai bater com o `authorized_keys` remoto, então o boot-guard deve ser
  fail-closed em TODO ambiente onde o adapter for instanciado, não só produção. Não copiar a
  assimetria "warning fora de prod / erro em prod" 1:1.
- **Host key:** TOFU "puro" (cliente aceita e cacheia na primeira conexão automática) foi rejeitado —
  degrada pra "sempre confia" num serviço desassistido que reinicia com frequência. O TOFU correto é
  feito por um HUMANO, fora do canal SSH (console/RDP da nuvem do operador), fixando um fingerprint
  SHA-256 que o `hostVerifier` do `ssh2` compara com `timingSafeEqual` (idioma já existe em
  `password-hasher.fake.ts:24-26`). Env nova a propor pro ADR-0008: `VAN_VM_SSH_HOST_FINGERPRINT`.
- **CWE-78 do `ssh.exec()`:** RFC 4254 não tem variante argv, só string — "escapar direito" não é
  mitigação real (regras de quoting do `cmd.exe`/PowerShell são inconsistentes). A mitigação real é
  comando FIXO (constante, montado só de `STCPCLT_*` do boot, nunca de dado por-remessa) + pedir
  `command=` forçado no `authorized_keys` do lado servidor (controle server-side, não depende de
  disciplina do nosso código).
- **Veredito P4:** SSH (com as três mitigações acima) é a rota recomendável HOJE porque está
  totalmente especificada e dentro da nossa fronteira de revisão. A alternativa S3+sync elimina
  execução remota de comando do nosso lado (ganho real, blast radius menor) MAS não elimina o
  problema — só move pro salto bucket→VM, que está indefinido; se esse salto também for SSH, ou se
  for a VM puxando via credencial de nuvem estática, o problema não encolheu, só trocou de dono e
  perdeu visibilidade nossa. Comparar risco totalmente mapeado com risco não-especificado não é
  comparar risco menor com maior.

**Why:** para não redescobrir estas cinco decisões (algoritmo, molde de secret, TOFU fora de banda,
mitigação real de CWE-78, veredito SSH-vs-S3) quando `src/modules/banco/` nascer de fato.

**How to apply:** ao desenhar `BradescoVanRelayAdapter`, partir daqui em vez de zero; ainda falta
confirmar com o operador da VM (sshd exato, suporte a Ed25519, viabilidade de `command=` forçado) —
sem essas três respostas, a implementação não deveria prosseguir para produção.
