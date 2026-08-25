/**
 * FIN-DANFSE-TAXID-ALFANUMERICO — W0 (RED) — o reader deve extrair CNPJ alfanumérico (ADR-0044) do
 * bloco EMITENTE **sem** corromper o CPF do emitente pessoa física.
 *
 * O bloco DANFSe rotula o campo `CNPJ / CPF / NIF` justamente porque admite os dois. A captura de
 * HEAD é `(\d[\d.\-/\s]{9,24})` — só dígitos e máscara — e por isso devolve `undefined` para um CNPJ
 * com letras. Alargar a classe de caracteres é a correção óbvia, e foi REPROVADA em W2 no ciclo
 * anterior (`tests/reports/W2-2026-08-04-cnpj-alfanumerico-REPROVADO.md`): o ramo numérico legado de
 * `normalizeTaxId` continua derivando `digits` do MESMO `raw`, agora mais largo, e o CPF de 11
 * dígitos virava 14 caracteres montados com dígitos do texto vizinho (`52998224725001`).
 *
 * Os dois casos de CPF abaixo passam em HEAD **por desenho** — são characterization, não o RED. A
 * função deles é ficar vermelho no instante em que a implementação alargar a captura sem estreitar o
 * consumidor. Ambos são traps de verdade: a janela `{9,24}` só alcança dígitos ADJACENTES, então um
 * `IM 0012345` colado no identificador entra na captura, e um `Insc. Estadual 0987654321` (fora da
 * janela) NÃO entraria — escrever esse último seria um verde decorativo, do mesmo tipo que a cedilha
 * de `Inscrição` produziu na fixture real.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { structureText } from '#src/modules/financial/adapters/document-reader/native-pdf.ts';

// CNPJ alfanumérico válido pelo kernel (ADR-0044): 12 alfanuméricos + 2 DVs numéricos.
const ALPHANUMERIC = `EMITENTE DA NFS-e
Prestador do Serviço CNPJ / CPF / NIF 12.ABC.345/01DE-35
Inscrição Municipal - Telefone (85) 9725-2001
Nome / Nome Empresarial ACME SERVICOS DIGITAIS LTDA E-mail contato@acme.com
TOMADOR DO SERVIÇO CNPJ / CPF / NIF 35.400.736/0001-31`;

// Emitente pessoa física (MEI) com Inscrição Municipal preenchida logo após o CPF.
const CPF_BARE_THEN_IM = `EMITENTE DA NFS-e
Prestador do Serviço CNPJ / CPF / NIF 52998224725 IM 0012345 Telefone (85) 9725-2001
Nome / Nome Empresarial MARIA DE SOUZA E-mail maria@exemplo.com
TOMADOR DO SERVIÇO CNPJ / CPF / NIF 35.400.736/0001-31`;

// O mesmo, com o CPF mascarado — exercita o caminho da máscara, não só o bare.
const CPF_MASKED_THEN_IM = `EMITENTE DA NFS-e
Prestador do Serviço CNPJ / CPF / NIF 529.982.247-25 IM 0012345 Telefone (85) 9725-2001
Nome / Nome Empresarial MARIA DE SOUZA E-mail maria@exemplo.com
TOMADOR DO SERVIÇO CNPJ / CPF / NIF 35.400.736/0001-31`;

// Sem os marcadores EMITENTE/TOMADOR o bloco cai no texto inteiro e os dois rótulos convivem.
// Achado do /w2-review: a classe alargada passou a CASAR o campo preenchido com texto, consumindo a
// 1ª ocorrência e escondendo a 2ª — HEAD devolvia o CNPJ válido, e a mudança devolvia `undefined`.
const GARBAGE_LABEL_THEN_VALID = `NOTA FISCAL DE SERVICO
CNPJ / CPF / NIF NAO INFORMADO 123
CNPJ / CPF / NIF 64.894.238/0001-90`;

describe('structureText — DANFSe: CNPJ alfanumérico sem corromper o CPF', () => {
  it('extrai o CNPJ alfanumérico do emitente (ADR-0044), mascarado e seguido de texto', () => {
    const r = structureText(ALPHANUMERIC, 'unpdf');
    assert.equal(r.ok, true, JSON.stringify(r));
    if (!r.ok) return;
    assert.equal(r.value.supplier?.taxId, '12ABC34501DE35');
  });

  it('CPF bare seguido de "IM 0012345" sai íntegro (11), nunca 14 montados', () => {
    const r = structureText(CPF_BARE_THEN_IM, 'unpdf');
    assert.equal(r.ok, true, JSON.stringify(r));
    if (!r.ok) return;
    assert.equal(r.value.supplier?.taxId, '52998224725');
    assert.equal(r.value.supplier?.taxId?.length, 11);
  });

  it('CPF mascarado seguido de "IM 0012345" sai íntegro (11)', () => {
    const r = structureText(CPF_MASKED_THEN_IM, 'unpdf');
    assert.equal(r.ok, true, JSON.stringify(r));
    if (!r.ok) return;
    assert.equal(r.value.supplier?.taxId, '52998224725');
    assert.equal(r.value.supplier?.taxId?.length, 11);
  });

  it('rótulo preenchido com texto não apaga o identificador válido da ocorrência seguinte', () => {
    const r = structureText(GARBAGE_LABEL_THEN_VALID, 'unpdf');
    assert.equal(r.ok, true, JSON.stringify(r));
    if (!r.ok) return;
    assert.equal(r.value.supplier?.taxId, '64894238000190');
  });
});
