---
name: g059-fixa-layout-interno-do-codigo-de-barras
description: A tabela G059 (p.109-110) fixa as posições internas do código de barras do boleto, que o G063 não descreve — use-a para confirmar conversão de linha digitável sem depender da FEBRABAN
metadata:
  type: reference
---

O `G063` (manual p.118) **não descreve o layout interno** dos 44 dígitos: só diz que o campo segue
as especificações do Bloqueto de Cobrança – Ficha de Compensação (CADOC 24044-4, Carta-Circular
Bacen 2.926). Quem fixa as posições é a **tabela de ocorrências G059, p.109-110**, ao dizer onde
olhar quando cada crítica dispara. Como o G063 ocupa 18-61 do Segmento J, **posição no registro − 17
= posição no código de barras**:

| Âncora | Posições do registro | Deriva |
| :--- | :--- | :--- |
| G059 §`CB` p.109 | 18-20 | barcode 1-3 = banco |
| G059 §`CC` p.109 | 22 | barcode 5 = **DV geral** |
| G059 §`CD` p.109 | 27-36 | barcode 10-19 = valor |
| G059 §`CE` p.110 | 37-61 | barcode 20-44 = campo livre (25 pos.) |

Por eliminação: barcode 4 = moeda, barcode 6-9 = fator de vencimento.

**Por que guardar:** é fonte **primária e local** para validar conversão de linha digitável (47) →
código de barras (44), sem depender de documento FEBRABAN que não está no acervo. Usado em 25/08/2026
para confirmar o mapeamento da #788 — o §`CC` confirma sozinho o movimento mais arriscado da
conversão (linha 33 → barcode 5, muda de lugar e não de valor).

⚠️ **O G063 é de COBRANÇA, e só.** Código de barras de arrecadação/tributo (produto `8`) é outra
espécie e não conforma ao CADOC 24044-4 — 44 dígitos numéricos passam pelo `isBarcode` do emissor
sem nada acusar. Ver [[tax-guide-sem-emissor-queima-nsa]].

⚠️ **`referencias/01-regras-gerais.md` cita "pág. 9" para a tabela de segmentos por modalidade, e a
p.9 do PDF não a contém.** A skill é mapa, não território — conferir a página antes de citá-la.
