import { type Result, ok, err } from '../../../../shared/primitives/result.ts';

// A conta-cedente está apta a GERAR remessa? (#722)
//
// O convênio é OPCIONAL no cadastro e OBRIGATÓRIO na remessa, e essa assimetria não é descuido: a
// conta serve à conciliação bancária sem ele. Mas é do convênio que sai o nome do arquivo, e é pelo
// nome que o banco identifica o tipo e a fila de destino.
//
// Sem esta verificação, a falha acontece três camadas adiante — no montador do nome — e chega ao
// operador como 503 genérico. Ele não descobre que falta um campo, nem em qual tela preenchê-lo, e
// abre chamado para um dado que preencheria sozinho.
//
// ⚠️ Onde ela é chamada importa tanto quanto o que ela verifica: **antes de alocar o NSA**. O número
// não volta depois de consumido, então validar depois queimaria um da sequência a cada tentativa
// frustrada — e a sequência é o que o banco usa para detectar retransmissão.
//
// Isto NÃO substitui a validação do montador do nome (`remittance-file-name.ts`), que segue como
// última barreira. São camadas com propósitos distintos: aqui, dizer ao operador o que corrigir;
// lá, impedir que um nome inválido chegue ao banco. É a mesma dupla verificação que o ADR-0027
// declara intencional na borda HTTP.

export type CedenteRemittanceGap = 'cedente-convenio-missing' | 'cedente-convenio-malformed';

// O convênio identifica o contrato de prestação de serviço junto ao banco e é numérico. Ausente e
// malformado são desfechos separados porque a ação do operador difere: um pede preenchimento, o
// outro pede correção do que já está lá — a mesma distinção que `PayoutGapReason` faz no payout.
const NUMERIC_ONLY = /^\d+$/;

export const checkCedenteRemittanceReadiness = (
  account: Readonly<{ convenio: string }>,
): Result<void, CedenteRemittanceGap> => {
  // Espaço em volta não é erro do operador: o cadastro aceita e o dado continua legível.
  const convenio = account.convenio.trim();

  if (convenio === '') return err('cedente-convenio-missing');
  if (!NUMERIC_ONLY.test(convenio)) return err('cedente-convenio-malformed');

  return ok(undefined);
};
