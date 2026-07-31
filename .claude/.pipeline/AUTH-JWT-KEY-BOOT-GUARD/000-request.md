# AUTH-JWT-KEY-BOOT-GUARD — escopo

**Issue:** [#515](https://github.com/ERP-Bem-Comum/core-api/issues/515) · **Size:** M · **Branch:** `fix/515-auth-jwt-key-boot-guard`
**Bloqueia:** Fase 3 do [ADR-0055](../../../handbook/architecture/adr/0055-cognito-external-idp-supersedes-0024-authn.md) (cutover do Cognito) · **Épico:** [#603](https://github.com/ERP-Bem-Comum/core-api/issues/603)

---

## Problema

`loadOrGenerateKeys` (`src/modules/auth/adapters/http/composition.ts:273-285`) trata "chave de assinatura
não configurada" como caminho **normal**: se `AUTH_JWT_PRIVATE_KEY`/`AUTH_JWT_PUBLIC_KEY` estão ausentes ou
vazias, gera um par ES256 efêmero em memória e o boot segue — **inclusive com `NODE_ENV=production`**, sem
erro e sem aviso.

O `if` só testa presença e comprimento; não existe ramo que consulte o ambiente. Produção e dev seguem
exatamente o mesmo caminho. É a assinatura estrutural do fallback silencioso — a mesma classe da #456.

## Por que agora

Além do impacto próprio, isto é **dependência bloqueante do cutover do Cognito**. Na Fase 3 a infraestrutura
remove `AUTH_JWT_*` do gerenciador de segredos. Com o fallback vivo, o `core-api` **sobe normalmente gerando
par novo** — mascarando exatamente o sinal que a operação precisa para confirmar que o caminho legado foi
desativado. Registrado como bloqueante nº 1 no ADR-0055.

## Impacto atual (disponibilidade, não vazamento)

1. Toda sessão emitida morre no restart (chave nova a cada boot).
2. O BFF valida com a chave pública configurada nele → passa a **rejeitar todo token novo**. O sintoma que
   chega ao usuário é "login não funciona", sem nenhuma pista no `core-api`.
3. Com mais de uma instância, cada uma assina com chave diferente → comportamento intermitente por réplica.

Não há vazamento de segredo. Severidade **média** por isso.

## Escopo

**Dentro:**

- Guarda de boot para `AUTH_JWT_PRIVATE_KEY` / `AUTH_JWT_PUBLIC_KEY`, no padrão já estabelecido no repo
  (`module-driver-config.ts` / `email-link-base-urls.ts`): falha em produção, degrada com aviso fora dela.
- Erro de importação de chave malformada convertido em erro de configuração tipado, não exceção genérica.
- Saída com `EX_CONFIG` (78), nomeando a variável faltante, **antes** de abrir a porta HTTP.

**Fora:**

- Rotação de chave, custódia em KMS/HSM, mudança de algoritmo.
- Os demais fallbacks silenciosos do módulo `auth` (S3 de foto de perfil, rate-limit) — issue própria.
- Qualquer alteração no emissor ES256 em si.

## Critérios de aceite

| # | Dado | Quando | Então |
|---|---|---|---|
| **CA1** | `NODE_ENV=production`, `AUTH_JWT_PRIVATE_KEY` ausente | a aplicação inicia | encerra com código **78**, erro nomeia a variável, **porta não abre** |
| **CA2** | `NODE_ENV=production`, apenas **uma** das duas presente | a aplicação inicia | boot falha nomeando a que falta (par incompleto não é config válida) |
| **CA3** | `NODE_ENV=production`, chave presente porém **malformada** | a aplicação inicia | boot falha com 78 identificando a variável inválida |
| **CA4** | ambiente **não**-produção, variáveis ausentes | a aplicação inicia | sobe com par efêmero **e** emite aviso explícito |
| **CA5** | `NODE_ENV=production`, ambas válidas | a aplicação inicia | sobe normalmente, sem mudança de comportamento |
| **CA6** | a suíte atual | executa | nenhum teste passa a exigir chave configurada |

## Definition of Done

- [ ] W0 RED cobrindo CA1–CA6 antes de tocar `src/`
- [ ] W1 GREEN com implementação mínima
- [ ] W2 read-only aprovado (`security-backend-expert` — é ticket de segurança)
- [ ] W3 verde: `typecheck` + `format:check` + `lint` + `test`
- [ ] Contagem de testes ≥ baseline (regressão zero)
- [ ] Mesmo código de saída (78) usado por `email-link-base-urls.ts`
- [ ] ⚠️ Variável documentada no material de deploy **antes do merge** — ambientes que hoje dependem do
      fallback vão parar de subir. É o efeito pretendido, mas o risco de deploy não é zero.

## Notas de execução

- **Reaproveitar**, não inventar: o repo já tem dois moldes para esta exata classe. A spec
  `specs/037-persistence-driver-boot-guard/` resolveu o caso dos 7 módulos de persistência e registra
  este achado em "Fora de escopo" (FR-011).
- O erro sai com `process.exitCode` + `return`, **nunca** `process.exit()` — em container o stderr é pipe
  assíncrono e a mensagem se perderia (`handbook/reference/nodejs/Process.md`).
- Nenhuma mensagem de erro pode ecoar o valor da variável.
