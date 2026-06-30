# W2 — Code Review (APPROVED)

Round 1.

## Verificações

- **Testabilidade sem efeito global:** deps injetáveis evitam registrar handlers reais durante os testes (não poluem o runner). Bom design.
- **`processLastResortDeps`:** adapta `process.on` (listener `(...args)` → `(cause)`), `process.exit`, `process.stderr.write` — borda de infra isolada, sem vazar para o helper puro.
- **Ordem correta:** `void shutdown().finally(() => exit(1))` garante drenagem antes do exit (CA3 prova).
- **Idempotência:** `shutdownOnce` cobre o `handle.close()` não-idempotente; sem double-close entre handler e `finally`.
- **Paridade:** ambos os `main.ts` recebem o mesmo wiring; comentário explica o "porquê" do guard.
- **Escopo:** SIGTERM/SIGINT e erro pré-ctx ficaram fora (YAGNI, documentado).

## Veredito

APPROVED — sem issues.
