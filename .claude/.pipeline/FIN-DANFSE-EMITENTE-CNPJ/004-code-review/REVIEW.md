# W2 — code review (self, read-only) — FIN-DANFSE-EMITENTE-CNPJ

**Veredito: APPROVED.**

- **Causa-raiz endereçada**: o `structureText` (native-pdf/unpdf) extraía o CNPJ só com `/CNPJ:\s*(\d+)/`
  (rótulo "CNPJ:" + dígitos bare). O DANFSe usa "CNPJ / CPF / NIF" + CNPJ mascarado → não casava → o
  #FIN-OCR-AUTOFILL-SUPPLIER (já na dev) não tinha `taxId` p/ resolver → fornecedor manual.
- **Isolamento EMITENTE vs TOMADOR**: fatia o bloco do emitente (`EMITENTE ...` → `TOMADOR ...`) ANTES de
  buscar CNPJ/nome — nunca pega o CNPJ do tomador (o DANFSe traz os dois). Sem os marcadores → texto inteiro
  (layout genérico intacto).
- **Aditivo, sem regressão**: os padrões antigos (`Prestador:` / `CNPJ:`) continuam primeiro (fallback);
  os do DANFSe entram só quando os antigos não casam. CNPJ mascarado → 14 dígitos (`\D` removido), igual ao
  leitor XML. Nome sem o IM numérico à esquerda.
- **Construção do supplier relaxada**: exige só `taxId` (legalName → '' se ausente) — a resolução do
  fornecedor precisa só do CNPJ; antes exigia ambos e perdia o supplier se o nome falhasse.
- **Prova**: gabarito = a nota fictícia da P.O. (fixture). E2E no PDF real → `{legalName:'ALESSANDRA CASTRO
  DE OLIVEIRA', taxId:'64894238000190'}`, resolvedVia unpdf. Suíte dos readers verde (sem regressão).

## Achado fora de escopo (registrado à parte)
Neste DANFSe o `documentNumber` sai errado (`45:25`, do horário) — bug do rótulo do número, separado do
fornecedor. Vai como issue própria (não mexo aqui — anti-scope-creep).

Sem Blocker/Major/Minor. 1 round.
