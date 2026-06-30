# W2 — Code Review (read-only) — AUTH-USECASE-CREATE-USER

**Wave:** W2 · **Outcome:** APPROVED · **Round:** 1 · **Data:** 2026-06-07

Design e checklist de segurança pelo `security-backend-expert` (OWASP ASVS V2.1).

| Item | Veredito |
|------|----------|
| Domínio puro: `User.create` retorna `{user, event}`, sem throw/classe | ✅ |
| Placeholder não toca o agregado (passwordHash não-nullable preservado) | ✅ |
| `unusablePasswordHash` nunca logado/exposto; ausente do payload do evento (CA7) | ✅ |
| Convite fail-closed dentro do use case; URL de config, não header Host (CA3) | ✅ |
| Unicidade de email antes do save (sem side-effect parcial, CA4) | ✅ |
| `UserCreated` só metadados (DD-USER-05) | ✅ |
| Erros string-literal union EN kebab-case; mapeamento HTTP definido (409/422/502/503) | ✅ |
| Port `InviteMailer` segregado (ISP) — template convite ≠ reset | ✅ |

## Observações
- Atomicidade: criar-sem-convite é estado válido (spec.md:202); reenvio = ticket futuro. Documentado.
- Permission `user:create` provisória (consolidar com `006`).

**Resultado:** APPROVED.
