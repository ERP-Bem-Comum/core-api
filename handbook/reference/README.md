# `handbook/reference/` — cache de documentação de terceiros

**Isto não é conhecimento do projeto.** É cópia offline de documentação externa, mantida para o agente
consultar sem depender de rede. O conhecimento próprio do repo vive nas outras pastas do `handbook/`.

## Fontes com `llms.txt` oficial — prefira a URL

Estas tecnologias publicam documentação em formato próprio para LLM. **A URL é a fonte de verdade**;
a cópia local pode estar defasada. Verificadas em 2026-07-31.

| Tech | `llms.txt` | Variante completa | Cópia local |
| --- | --- | --- | --- |
| `claude-code` | <https://code.claude.com/docs/llms.txt> | — | 139 arq · 4,2 MB ⚠️ **defasada** (sem `workflows.md`) |
| `nodejs` | <https://nodejs.org/llms.txt> | — | 66 arq · 4,1 MB |
| `drizzle` | <https://orm.drizzle.team/llms.txt> | `llms-full.txt` (3,5 MB) | 172 arq · 2,9 MB |
| `bruno` | <https://docs.usebruno.com/llms.txt> | — | 191 arq · 1,1 MB |
| `fastify` | <https://fastify.dev/llms.txt> | `llms-full.txt` (11 MB) | 42 arq · 688 KB |
| `docker` | <https://docs.docker.com/llms.txt> | — | 7 arq · 160 KB |
| `zod` | <https://zod.dev/llms.txt> | `llms-full.txt` (254 KB) | 1 arq · 4 KB |

**Como usar:** `WebFetch` na URL do `llms.txt` para o índice, depois na página específica. Custa uma
chamada de rede e traz a versão atual — a cópia local traz a versão de quando foi baixada.

**Quando a cópia local ainda ganha:** sessão sem rede, ou quando a versão que você usa difere da
documentada online (o `llms.txt` reflete sempre a versão corrente do projeto upstream).

## Fontes sem `llms.txt` — a cópia local é a única opção

Verificado em 2026-07-31: os endpoints `llms.txt` destes projetos retornam 404.

| Tech | Local | Observação |
| --- | --- | --- |
| `mysql` | 78 arq · 13 MB | Refman 8.4 da Oracle, 63 chunks por capítulo. Ver `mysql-refman-8.4--oracle/INDEX.md` |
| `magalu-cloud` | 169 arq · 800 KB | Object storage S3-compat (ADR-0019/0021) |
| `pnpm` | 122 arq · 644 KB | Inclui `settings.md`, normativo para o ADR-0029 |
| `nodemailer` | 37 arq · 572 KB | Adapter SMTP (ADR-0010) |
| `typescript` | 18 arq · 296 KB | Handbook oficial |
| `mysql2` | 6 arq · 96 KB | Driver — changelog e `caching_sha2_password` |
| `fastify-plugins` | 5 arq · 92 KB | `@fastify/swagger`, `cors`, `helmet`, `rate-limit` |
| `ia-tooling` | 3 arq · 196 KB | Cookbooks da Anthropic — memória de agente, context engineering e workflows multi-LLM. Veio de `research/` em 2026-08-07: é material de terceiro, e `research/` é para trabalho autoral |

## `skills-base/` — livros canônicos

4 arquivos · 2,3 MB. Referência do MCP `acdg-skills` (Evans, Vernon, Newman, OWASP). Não há
equivalente online — são obras com direito autoral, mantidas para citação literal via
`skills_buscar`/`skills_citar`.

## Política

- **Cache, não fonte.** Se a doc online e a cópia divergirem, a online vence — salvo quando a versão
  em uso for a antiga, e nesse caso registre a divergência.
- **Não versionar fonte de build.** O `.tex` do Refman MySQL (13 MB) foi removido em 2026-07-31: os 63
  chunks `.md` gerados dele são o que se lê.
- **Não crescer por reflexo.** Antes de baixar doc nova, verifique se a tecnologia publica `llms.txt` —
  nesse caso, um ponteiro basta.
