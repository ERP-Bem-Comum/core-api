# Spec Card — Contratos: Aditivos, Distrato, Documentos

**Tipo:** Card de contexto (resumo da validação em tela + alinhamento com o backend)
**Módulo:** Contratos (web-app v2)
**Data:** 2026-06-08
**Status geral:** 🟢 Front pronto e validado em tela · 🟥 Itens marcados dependem do core-api

---

## Objetivo
Registrar, num só lugar, **tudo que foi corrigido/implementado no front** durante a validação do detalhe
de contrato (aditivos, distrato, documentos) e **o que precisa ser alinhado/implementado no backend**.

---

## ✅ Feito no front (pronto, validado em tela)

**Aditivos**
- Criar aditivo voltou a funcionar (bug: header `Content-Type` duplicado → 415; corrigido em `createAmendment` e `update`).
- **Valor / Supressão**: o sinal define o tipo — acréscimo → `Addition`, supressão → `Suppression` (valor absoluto). Exibe "+ R$" (verde) / "− R$" (vermelho).
- **Prazo**: impacto na tabela = "+ DD/MM/AAAA" (nova vigência); a vigência atual reflete a data estendida.
- **Numeração** padrão `AD NN-XXXX/ANO` (sequência por criação) na tabela, composição e timeline.
- Permite criar **vários aditivos** sem recarregar (reset do comando ao reabrir o modal).
- Modal: descrição obrigatória; **campo de valor formata moeda enquanto digita**; resumo em largura cheia.
- Datas exibidas em UTC (corrige off-by-one de 1 dia).

**Distrato** (encerramento antecipado) — **gambiarra temporária no front** (ver seção abaixo)
- Aparece como **linha de aditivo** (badge "DISTRATO", impacto "DISTRATO").
- **Sem efeito ao criar**; só **encerra o contrato ao homologar** (anexar documento + assinatura → status Distrato).

**Documentos (tabela)**
- Badge **BASE preta**; badges de tipo **UPPERCASE, sem arredondamento**, fonte Inter.
- Badge **"Homologado" branca**; status em pílula; cores no padrão do cliente.
- Ícones padrão de **olho** (preview em modal, sem sair da página) e **download**.

**Grid (lista)**
- Coluna **Aditivos** mostra a **quantidade** de aditivos do contrato.
- Vigência do grid reflete a data estendida por aditivo de prazo.
- **Status real** do contrato (Distrato deixa de ser mascarado pelo aditivo mais recente).
- Coluna **Ações** por status: **Pendente → Excluir**; **demais → Histórico Financeiro + Termo de Quitação**.
  ⚠️ Os botões aparecem por status, mas ainda **não executam ação real** (placeholders — ver gaps).

---

## 🟥 Precisa alinhar/implementar no BACKEND

| # | Tema | O que falta | Ticket |
|---|------|-------------|--------|
| 1 | **Distrato rico** ✅ | `/end` deve aceitar **data efetiva** + **documento assinado** + **motivo** (hoje encerra com `endedAt = now`, sem doc/data). E ter um **`kind` distrato** (hoje colapsa em `Misc` → o front usa gambiarra de marcador). | [CTR-HTTP-DISTRATO-DOCUMENTO](../done/CTR-HTTP-DISTRATO-DOCUMENTO.md) |
| 2 | **Conteúdo do documento** ✅ | Não há rota que devolva os **bytes/URL** do documento → **preview e download** ficam desabilitados (mesmo em aditivos homologados, que têm doc). Detalhe não associa **documento ↔ aditivo**. | [CTR-HTTP-DOCUMENT-CONTENT](../done/CTR-HTTP-DOCUMENT-CONTENT.md) |
| 3 | **`signed_at` do aditivo** | `ctr_amendments` não persiste data de assinatura → coluna "Assinatura" da tabela fica vazia. | (incluir no ticket de aditivos) |
| 4 | **Subtipos de aditivo** | escopo/outro/distrato colapsam em `Misc` → na releitura perde-se o subtipo (distrato só funciona via gambiarra). | (CTR-HTTP-DISTRATO-DOCUMENTO) |
| 5 | **Metadados do contrato** | programa, categoria, centro de custo, plano orçamentário, classificação (CT/OS) não são persistidos → aparecem como "—". | (a abrir) |
| 6 | **Ações do grid** | os 3 itens do menu aparecem por status, mas não têm efeito: **Excluir** (precisa de endpoint DELETE de contrato Pendente), **Histórico Financeiro** (depende do módulo Financeiro), **Termo de Quitação** (feature/documento a definir). | (a abrir) |

---

## ⚙️ Como o distrato funciona HOJE (gambiarra — remover quando o backend tiver o kind)
- **Escrita:** distrato → aditivo `Misc` com a descrição **marcada** (`DISTRATO_MARKER`), contido no BFF.
- **Leitura:** descrição marcada → o front trata como `type: 'distrato'` (descrição já limpa na UI).
- **Homologação:** ao anexar doc + assinatura (não-futura) e homologar, o front **encadeia `POST /:id/end`** → contrato vira Distrato.
- **Limitações:** `endedAt = now` (ignora a data efetiva preenchida); marcador é frágil sem um `kind` próprio.

---

## 📌 Observações de teste
- **Assinatura não pode ser data futura** (validação de borda) — usar hoje ou data passada.
- Contratos já distratados no teste: 221/2026, 718/2026, 712/2026.

## Próximos passos
1. Revisar este card + os 2 tickets com o tech lead.
2. Backend implementa itens 🟥 → front troca a gambiarra do distrato pelo `kind` real e liga preview/download/assinatura.
3. (Front) commit do que já está pronto e validado.
