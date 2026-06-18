// Converte string monetária "(-)123.45" em centavos com sinal. Retorna null se não-numérica.
// Sem float: parte inteira × 100 + 2 casas decimais (padding/truncamento determinístico).
export const parseAmountCents = (raw: string): number | null => {
  const s = raw.trim();
  if (!/^-?\d+(\.\d{1,2})?$/.test(s)) return null;
  const negative = s.startsWith('-');
  const [intPart = '0', fracPart = ''] = s.replace('-', '').split('.');
  const cents = Number(intPart) * 100 + Number(`${fracPart}00`.slice(0, 2));
  return negative ? -cents : cents;
};
