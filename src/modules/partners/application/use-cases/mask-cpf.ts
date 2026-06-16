/**
 * `maskCpf` — mascara um CPF (11 dígitos) para o preview público do autocadastro (#43, CA2).
 *
 * Revela apenas os 3 últimos dígitos (1 do corpo + 2 do DV) no formato `***.***.**X-XX`. Puro,
 * sem IO. Nunca expõe o CPF completo no corpo da resposta. Defesa contra enumeração/PII leak.
 */

const CPF_LENGTH = 11;

export const maskCpf = (cpf: string): string => {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== CPF_LENGTH) return '***.***.***-**';
  const ninth = digits.charAt(8);
  const dv = digits.slice(9);
  return `***.***.**${ninth}-${dv}`;
};
