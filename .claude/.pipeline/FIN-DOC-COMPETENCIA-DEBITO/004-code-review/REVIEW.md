# W2 — Code Review · FIN-DOC-COMPETENCIA-DEBITO (#197)

**Veredito:** ✅ APPROVED (1 recorte registrado)

- VO `Competencia` segue o padrão de smart constructor + `Result` do projeto (molde `retention.ts`); persistência char(7) simples (ADR-0020 ok — sem JSON/ENUM).
- Conta-débito validada **by-identity** no use-case (cross-store via `cedenteAccountStore.findById`) — R-1b; refs inválidos/ausentes → 422.
- Nova dependência (`cedenteAccountStore`) wirada na composição reusando o store já criado; sem duplicação.
- Mappers simétricos (VO↔char(7)); Drizzle ↔ in-memory coerentes; migration aditiva nullable.
- **Recorte**: exposição na listagem deferida (detalhe completo). Aceitável para o go-live (tela de edição usa o detalhe); follow-up se a P.O. exigir na lista.
