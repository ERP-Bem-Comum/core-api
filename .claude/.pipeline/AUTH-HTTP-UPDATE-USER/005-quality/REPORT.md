# W3 — Gate de Qualidade · AUTH-HTTP-UPDATE-USER

**Agente:** ts-quality-checker · **Outcome:** GREEN

| Comando | Resultado |
|---|---|
| `pnpm run typecheck` | ✅ `tsc --noEmit` sem erros (após propagar `updateUserProfile` aos 3 testes HTTP irmãos) |
| `pnpm run format:check` | ✅ All matched files use Prettier code style |
| `pnpm run lint` | ✅ sem erros |
| `pnpm test` | ✅ 2356 pass · 0 fail · 17 skipped (integração opt-in) |

US4 entregue end-to-end na borda HTTP. Pendência: coleção Bruno `users/update/` (T036) + integração real.
