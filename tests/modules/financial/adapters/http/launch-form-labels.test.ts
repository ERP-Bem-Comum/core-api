import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { LAUNCH_FORMS } from '#src/modules/financial/adapters/cnab/batch-profile.ts';
import { remittancePreviewToDto } from '#src/modules/financial/adapters/http/dto.ts';
import type { RemittancePreview } from '#src/modules/financial/application/use-cases/preview-remittance.ts';

/*
 * Toda forma que o emissor escreve tem rótulo legível na tela de confirmação.
 *
 * ⚠️ ESTE TESTE NASCEU DE UMA LACUNA QUE A HOMOLOGAÇÃO NÃO PODIA PEGAR, e a distinção é a lição:
 * o `45` do Pix sempre saiu correto no ARQUIVO — é o que passou no Validador Universal e ganhou o
 * laudo escrito do banco em 05/09/2026. O que faltava era a tradução na BORDA, que nenhuma validação
 * de arquivo alcança.
 *
 * E ela ficou invisível por uma segunda razão, que vale registrar: o rótulo só apareceria numa tela
 * de pré-voo com título Pix APROVADO, e não havia nenhum na base. A ausência de dado escondeu a
 * ausência de rótulo. Um teste é o que não depende de existir dado.
 *
 * O fallback de `dto.ts` continua certo e não é substituído por isto — forma desconhecida deve mesmo
 * cair no próprio código, porque um traço esconderia que o emissor ganhou uma rota que a borda não
 * acompanhou. O que este caso cobra é que nenhuma forma CONHECIDA dependa dele.
 */

const previewWith = (launchForm: string): RemittancePreview => ({
  lines: [],
  readyCount: 0,
  blockedCount: 0,
  noIssuerCount: 0,
  outOfVanCount: 0,
  notFoundCount: 0,
  notApprovedCount: 0,
  transmittedCount: 0,
  readyTotalCents: 0,
  blockedTotalCents: 0,
  batches: [{ launchForm, payeeBankCode: null, count: 1, totalCents: 100 }],
  unplannedCount: 0,
  unplannedTotalCents: 0,
});

describe('rótulo da forma de lançamento — a tela não mostra código cru', () => {
  it('toda forma que o emissor pode escrever tem rótulo legível', () => {
    for (const form of LAUNCH_FORMS) {
      const dto = remittancePreviewToDto(previewWith(form));
      const label = dto.batches[0]?.launchFormLabel;

      assert.ok(label !== undefined, `forma ${form} não produziu rótulo`);
      assert.notEqual(
        label,
        form,
        `forma ${form} caiu no fallback e sairia como código cru na tela`,
      );
    }
  });

  // O código cru viaja JUNTO, e não é redundância: é o que o operador confere contra o arquivo
  // transmitido. Um rótulo sozinho impede a conferência.
  it('o código cru continua na resposta, ao lado do rótulo', () => {
    for (const form of LAUNCH_FORMS) {
      const dto = remittancePreviewToDto(previewWith(form));
      assert.equal(dto.batches[0]?.launchForm, form);
    }
  });

  // A garantia inversa: o fallback continua vivo para o que a borda REALMENTE não conhece. Sem este
  // caso, alguém poderia "consertar" o fallback para um traço e o teste acima seguiria verde.
  it('forma desconhecida continua caindo no próprio código, não num traço', () => {
    const dto = remittancePreviewToDto(previewWith('99'));
    assert.equal(dto.batches[0]?.launchFormLabel, '99');
  });
});
