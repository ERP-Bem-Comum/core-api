// Entrypoint do Emissor (one-shot por disparo — combina com cron, igual ao sweeper).
// Config 12-factor via env. Exit codes sysexits.h (0 ok · 78 EX_CONFIG · 1 runtime).
//
// Escopo deste incremento (#68): monta e ASSINA a linha de ping e a emite em stdout.
// Próximo incremento: dual-write real — append em `status.jsonl` (S3/R2) + `repository_dispatch`.
//   ⚠️ Decisão pendente do #68: S3/R2 NÃO têm append nativo → escolher entre
//      (a) 1 objeto por ping (`status/<emitter>/<seq>.jsonl`) ou (b) read-modify-write.
package main

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

func getenv(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

const exConfig = 78 // sysexits.h — configuração inválida.

func main() {
	emitter := os.Getenv("DEADMAN_EMITTER")
	key := os.Getenv("DEADMAN_HMAC_KEY")
	if emitter == "" || key == "" {
		fmt.Fprintln(os.Stderr, "[emitter] DEADMAN_EMITTER e DEADMAN_HMAC_KEY são obrigatórios")
		os.Exit(exConfig)
	}
	seq, err := strconv.ParseInt(getenv("DEADMAN_SEQ", "0"), 10, 64)
	if err != nil || seq < 0 {
		fmt.Fprintf(os.Stderr, "[emitter] DEADMAN_SEQ inválido: %q\n", os.Getenv("DEADMAN_SEQ"))
		os.Exit(exConfig)
	}
	kind := getenv("DEADMAN_KIND", KindPing)

	line, err := NewPing(emitter, seq, kind, time.Now()).Line([]byte(key))
	if err != nil {
		fmt.Fprintf(os.Stderr, "[emitter] erro ao montar ping: %v\n", err)
		os.Exit(1)
	}
	// Scaffold: stdout. O dual-write (S3 + repository_dispatch) é o próximo incremento (#68).
	fmt.Print(line)
}
