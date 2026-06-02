# Procedência — documentação do Caddy

Material de referência (não-normativo) sobre o servidor **Caddy** (reverse proxy com
HTTPS automático), importado para consulta local. Espelha o nível 6 da hierarquia de
regras do projeto (referência citável, nunca vence ADR/handbook/CLAUDE.md).

## Fonte

- **Repositório:** `git@github.com:caddyserver/website.git`
- **Caminho de origem:** `src/docs/markdown/`
- **Commit:** `378d6d0ace34f8647d93f7e135b7c000898ef6bc`
- **Data do commit:** 2026-05-11
- **Importado em:** 2026-06-02

## Conteúdo

81 arquivos `.md` da documentação oficial do Caddy, com a estrutura de subdiretórios
preservada:

- `caddyfile/` — sintaxe do Caddyfile, matchers, diretivas (`reverse_proxy`, `tls`,
  `forward_auth`, `header`, `encode`, …).
- `extending-caddy/` — namespaces, placeholders, config-adapters.
- `quick-starts/` — HTTPS, reverse-proxy, API, arquivos estáticos.
- Topo: `automatic-https.md`, `api.md`, `command-line.md`, `json.md`, `metrics.md`,
  `logging.md`, `architecture.md`, entre outros.

## Licença

O repositório de origem **não inclui arquivo `LICENSE`**. O conteúdo é a documentação
oficial publicada em [caddyserver.com](https://caddyserver.com). Tratar como material
de terceiros: **consulta e citação literal localmente**, sem redistribuição como obra
própria. Ao citar em código/docs do projeto, referenciar a fonte oficial.

## Como citar

Mesmo padrão dos demais `handbook/reference/<tech>/`: abrir o arquivo com `Read` e citar
o trecho literal no formato `handbook/reference/caddy/<arquivo>.md:LINHA`. Nunca citar
"de memória".
