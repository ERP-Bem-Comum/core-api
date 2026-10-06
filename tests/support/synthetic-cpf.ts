/**
 * Gerador de CPF SINTETICO valido para fixtures de teste.
 *
 * Existe por causa do UNIQUE auth_user_cpf_idx (migration 0010, achado F7): a partir dele, uma
 * fixture que cria N usuarios com o MESMO cpf colide — e 18 testes de borda do auth falharam
 * exatamente assim, com `409 !== 201`. A correcao e a fixture respeitar o invariante que a
 * producao passou a exigir (um cpf por usuario), nao afrouxar o assert.
 *
 * Por que gerar em vez de listar numeros: fixture e o caminho por onde dado de cadastro REAL
 * entra num repositorio publico. Um numero derivado de um seed nao vem de lugar nenhum — nao ha
 * como ser o cpf de alguem por copia. O digito verificador e calculado pelo mesmo modulo 11 do
 * VO (`src/modules/auth/domain/identity/cpf.ts`), entao o resultado sempre passa no `Cpf.parse`.
 *
 * Nao e util em producao e nao tem par em `src/`: pertence a `tests/support/` por natureza
 * (helper de suite), nao por espelho de caminho. ASCII puro.
 */

// Digito verificador modulo 11 — mesma formula do VO: resto < 2 => 0, senao 11 - resto.
const checkDigit = (base: string, factorStart: number): string => {
  let sum = 0;
  let factor = factorStart;
  for (const ch of base) {
    sum += Number(ch) * factor;
    factor -= 1;
  }
  const rest = sum % 11;
  return String(rest < 2 ? 0 : 11 - rest);
};

const allDigitsEqual = (digits: string): boolean => /^(\d)\1*$/.test(digits);

/**
 * CPF valido e estavel para um `seed` inteiro: o mesmo seed devolve sempre o mesmo cpf, e seeds
 * diferentes devolvem cpfs diferentes (os 9 digitos base sao o proprio seed, zero-padded).
 *
 * Determinismo e deliberado: fixture com valor aleatorio torna a falha irreproduzivel, e um teste
 * que falha so as vezes e indistinguivel de flake.
 *
 * ⚠️ Base com os 9 digitos IGUAIS e descartada, e nao por estetica: para `d` repetido nove vezes
 * os dois DVs tambem saem `d` (a soma ponderada da sempre resto 11 - d), produzindo exatamente as
 * sequencias que o VO rejeita como `cpf-invalid-checksum` — `11111111111` e irmas. O seed e
 * entao deslocado em 1. Sem este guard, 9 seeds da faixa gerariam cpf invalido.
 */
export const syntheticCpf = (seed: number): string => {
  let normalized = (Math.trunc(Math.abs(seed)) % 999_999_999) + 1;
  if (allDigitsEqual(String(normalized).padStart(9, '0'))) normalized += 1;

  const base = String(normalized).padStart(9, '0');
  const dv1 = checkDigit(base, 10);
  return base + dv1 + checkDigit(base + dv1, 11);
};
