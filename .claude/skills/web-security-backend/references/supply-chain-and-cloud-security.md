# Supply-Chain (pnpm) & Cloud/Storage (Magalu · S3) Security Spec

> Regras `SC-NNN` (supply-chain) e `CL-NNN` (cloud/storage). Ancorado em ADR-0011/0012 e
> `handbook/reference/pnpm/` + `handbook/reference/magalu-cloud/`. Adaptado de openai/skills `security-best-practices`.

---

## A) Supply-chain — pnpm (ADR-0011/0012)

Ref: `handbook/reference/pnpm/{supply-chain-security,only-allow-pnpm,npmrc,continuous-integration}.md`.

- **SC-001 (MUST):** **`pnpm` sempre, `npm`/`yarn` nunca.** `only-allow=pnpm` no `.npmrc` + hook `block-npm.sh`. Qualquer `npm install`/`npm run` em doc/script/PR ⇒ finding **Alta** (converter).
- **SC-002 (MUST):** **`approve-builds`** — scripts de lifecycle (`postinstall` etc.) de dependências só rodam se explicitamente aprovados. Dependência nova com build script não-aprovado ⇒ revisar antes (vetor clássico de supply-chain attack).
- **SC-003 (MUST):** **lockfile congelado em CI** (`pnpm install --frozen-lockfile`); `pnpm-lock.yaml` commitado e revisado. Drift de lockfile ⇒ build não-reprodutível.
- **SC-004 (MUST):** **versões pinadas** para deps sensíveis (exatas, sem `^`/`~` quando o ADR exigir); dep nova **auditada** (origem, manutenção, alternativa nativa) antes de entrar — ver Inquiry-0005.
- **SC-005 (SHOULD):** **corepack** fixa a versão do pnpm (`packageManager` no `package.json`). Sem isso, versão do gerenciador varia entre máquinas.
- **SC-006 (SHOULD):** preferir **API nativa do Node 24** a dep externa quando equivalente (menos superfície). Ex.: `node:crypto` em vez de lib de hash; `Result` homemade em vez de neverthrow.
- **SC-007 (MUST):** nenhum secret no `package.json`/scripts/`.npmrc` commitado (token de registry privado vai em env/`.npmrc` local fora do git).

*Detecção:* `git diff` em `package.json`/`pnpm-lock.yaml` adicionando dep desconhecida; `postinstall` novo; `npm` em qualquer arquivo; `^`/`latest` em dep de segurança.

---

## B) Cloud & Object Storage — Magalu Cloud / AWS S3 (ADR-0019/0021)

Ref: `handbook/reference/magalu-cloud/{security,object-storage}/`. Cliente único: `@aws-sdk/client-s3` (S3-compat).

- **CL-001 (MUST):** **bucket privado por default.** Nenhuma ACL pública (`public-read`) acidental. Objeto sensível (documento de contrato) **nunca** com URL pública permanente. ⇒ exposição pública = **Crítica**.
- **CL-002 (MUST):** acesso a objeto via **URL pré-assinada** com **expiração curta** (minutos), gerada server-side sob authz. Não vazar a URL em log.
- **CL-003 (MUST):** **credenciais** (access key/secret) lidas de env/secret-file, nunca hardcoded nem no bundle; rotacionáveis; least-privilege (a credencial do core só pode no(s) bucket(s) que precisa).
- **CL-004 (MUST):** **chave de objeto (`StorageKey`)** derivada de input é validada (sem path traversal, sem sobrescrita cross-tenant). Prefixo por tenant/escopo previne enumeração/colisão.
- **CL-005 (SHOULD):** habilitar **encryption at rest** (SSE) no bucket; **versionamento** se o domínio exigir trilha; **lifecycle** para expirar artefatos temporários.
- **CL-006 (MUST):** **SSRF** — qualquer fetch a endpoint de storage/metadata derivado de input com allowlist; bloquear `169.254.169.254` e ranges privados (proteção de credencial de instância). Ver `BE-070`.
- **CL-007 (SHOULD):** validar **content-type e tamanho** no upload (server-side), não confiar no header do cliente; antivírus/scan se o domínio exigir.

*Detecção:* `PutObjectCommand` com `ACL:'public-read'`; access key em literal; pré-assinatura com expiração longa/ausente; key montada com input sem sanitização; endpoint S3 derivado de input do usuário.

---

## Falsos-positivos comuns

- "Bucket sem TLS" → o SDK S3 usa HTTPS por default ao endpoint Magalu/AWS; não é o caso do "TLS no BFF" (isso é o edge HTTP do core). Confirmar o endpoint antes de reportar.
- "Versão `^x` numa devDependency de build" → menos crítico que numa dependency de runtime; priorizar runtime.
