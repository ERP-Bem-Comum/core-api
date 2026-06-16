// Entrypoint do Emissor (one-shot por disparo — combina com cron, igual ao sweeper).
// Config 12-factor via env (config.go). Exit codes sysexits.h (0 ok · 78 EX_CONFIG · 1 runtime).
//
// Dual-write (decisão (a) — contratos doc 07): o ping é PUT como 1 objeto em
// `status/<emitter>/<seq>.jsonl` (S3/R2) E disparado via `repository_dispatch` ao GitHub.
// Cada plano é best-effort: falha de um não aborta o outro (o ponto da redundância).
package main

import (
	"fmt"
	"os"
	"time"
)

const exConfig = 78 // sysexits.h — configuração inválida.

func main() {
	cfg, err := LoadConfig()
	if err != nil {
		fmt.Fprintf(os.Stderr, "[emitter] config inválida: %v\n", err)
		os.Exit(exConfig)
	}

	line, err := NewPing(cfg.Emitter, cfg.Seq, cfg.Kind, time.Now()).Line(cfg.Key)
	if err != nil {
		fmt.Fprintf(os.Stderr, "[emitter] erro ao montar ping: %v\n", err)
		os.Exit(1)
	}

	// Incremento 2: config + SigV4 prontos. O PUT/dispatch (que consomem cfg.S3/Dispatch
	// + o SigV4 deste pacote) são o incremento 3 (#68). Por ora, emite a linha em stdout.
	fmt.Print(line)
}
