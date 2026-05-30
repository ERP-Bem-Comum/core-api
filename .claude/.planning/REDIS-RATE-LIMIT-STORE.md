# Design — Store compartilhado para rate-limit (Redis/Valkey?)

> **Status:** discussão aberta (2026-05-30) · **Decisão:** pendente do dono · **Origem:** follow-up do épico
> `EPIC-AUTH-SECURITY-HARDENING` (BE-REC-001). Documento-base para `AskUserQuestion`.

## 1. Problema

Após `CTR-AUTH-LOCKOUT-PERSISTENCE`, o **account lockout persiste no MySQL**. A única peça de
segurança ainda **in-memory** é o **rate-limit** (`@fastify/rate-limit`, global 200/min + dedicado
5/min em login/refresh). In-memory significa:

- **Por instância:** com N réplicas atrás de um LB, o limite real é `N × max` (cada uma conta só o
  próprio tráfego). Um atacante distribuído entre conexões que caem em réplicas diferentes dilui o limite.
- **Zera no restart:** deploy/restart limpa os contadores.

O comentário `src/shared/http/app.ts:111` já antecipa: *"in-memory; producao sobrepoe com store Redis"*.

## 2. Quando isso importa (gatilho real)

Só vira problema **com múltiplas instâncias do core-api**. Hoje a topologia (ADR-0005 BFF burro →
core-api) não declara escala horizontal do core-api. **Se o core-api roda single-instance**, o
in-memory é funcionalmente correto; o BFF ainda throttla por origem (defense-in-depth, spec 003 FR-015).

→ **A decisão real é: já vamos rodar o core-api multi-instância?** Se não, isto é YAGNI por ora.

## 3. Opções

| # | Opção | Prós | Contras |
| - | --- | --- | --- |
| A | **Valkey** (engine) via **ioredis** (cliente) — suporte nativo do `@fastify/rate-limit` (`redis:` option) | Padrão de mercado; destrava multi-instância; reaproveitável (cache/sessão futura); plugin nativo (`skipOnError`, `nameSpace`) | Nova dep (`ioredis` — ADR-0011); novo serviço de infra (compose dev + ElastiCache/Magalu prod); custo operacional; **novo ADR** |
| B | **Custom `store` sobre MySQL** (já temos) | Zero nova infra/dep | Rate-limit é **alta frequência** (cada request) → escrita/leitura no RDBMS a cada hit = carga e latência indevidas; subótimo (RDBMS não é feito p/ isso) |
| C | **Manter in-memory** + BFF throttle (FR-015) + documentar | Zero custo; lockout por conta já persiste (defesa principal mantida) | Não escala horizontalmente; teto real = N×max |
| D | **Adiar** até existir requisito de multi-instância | Não paga custo antes da hora (YAGNI) | Dívida explícita; precisa lembrar de fechar antes de escalar |

## 4. Considerações se for A (Valkey/Redis)

- **Engine:** **Valkey** (fork OSS pela Linux Foundation após Redis mudar para RSALv2/SSPL em 2024).
  Wire-compatible → `ioredis` funciona sem mudança. Evita risco de licença num ERP.
- **Cliente:** `ioredis` é **exigido** pelo plugin (`redis:` option). Pin de versão (ADR-0011 §3) +
  checklist de adoção de dep (ADR-0011 §5).
- **Infra dev:** serviço `valkey` no `compose.yaml`, **image pinada por digest** (como minio/mysql),
  healthcheck, sem auth em dev / senha via secret em prod.
- **Infra prod:** AWS ElastiCache (Valkey/Redis) — ADR-0021 (AWS primária) — ou equivalente Magalu.
  `connectTimeout` + `maxRetriesPerRequest` ajustados (recomendação do plugin); `skipOnError: true`
  (rate-limit não deve derrubar o serviço se o store cair — fail-open com log).
- **Escopo do ADR:** decidir se é *"Valkey só para rate-limit"* (mínimo) ou *"Valkey como store
  compartilhado do core-api"* (cache, sessão, rate-limit) — o segundo amortiza o custo de infra.

## 5. Recomendação técnica

- **Se o core-api ainda é single-instance:** **Opção C/D** — manter in-memory, documentar a dívida,
  e abrir o ADR de Valkey **no momento** em que a escala horizontal entrar no roadmap. O lockout (por
  conta, em MySQL) já cobre o vetor de brute force/spraying mesmo single-instance.
- **Se já vamos escalar horizontalmente (ou é iminente):** **Opção A com Valkey + ioredis**, escopo
  "store compartilhado" (não só rate-limit), via novo ADR + ticket de infra (compose + secrets) +
  ticket de wiring (`redis:` no `@fastify/rate-limit`, `skipOnError`).
- **Opção B (MySQL store)** só se houver veto duro a um novo serviço — é o caminho subótimo.

## 6. Decisões para o dono (AskUserQuestion)

1. O core-api roda (ou rodará em breve) **multi-instância**? → define se é agora ou adiar.
2. Se adotar: **engine** (Valkey recomendado vs Redis) e **escopo** (só rate-limit vs store geral).
