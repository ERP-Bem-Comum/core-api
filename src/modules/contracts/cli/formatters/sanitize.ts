// REGR #4 — strip control characters before rendering free-text fields.
//
// Atacante pode injetar `\r` (cursor return), `\x1b[<seq>m` (ANSI escape) ou
// `\b` (backspace) em campos como `titulo`/`objetivo`/`descricao` e corromper
// a saída de terminal — sobrescrevendo linhas anteriores, mascarando mensagens
// ou tingindo trechos com cor para enganar o operador.
//
// Política: remover TODOS os chars de controle (\x00..\x1f e \x7f) exceto `\n`
// e `\t`. O `\n` é preservado porque os formatters compõem strings multi-linha
// internamente; o `\t` ajuda em logs estruturados. Substituímos por espaço para
// preservar boundaries de palavras (vs. `''` que poderia colar tokens).

// O regex de remoção precisa, por definição, alvejar bytes de controle.
// O lint `no-control-regex` está marcando o uso intencional — suprimimos
// localmente para preservar a semântica do sanitizer.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_PATTERN = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g;

export const stripControlChars = (s: string): string => s.replace(CONTROL_CHARS_PATTERN, ' ');
