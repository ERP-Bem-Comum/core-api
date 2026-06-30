package main

import (
	"os"
	"strconv"
	"testing"
	"time"
)

// Integração end-to-end do SigV4 PUT contra um S3-compat (MinIO). Gated por opt-in
// (convenção do repo). Um PUT 2xx PROVA a assinatura: o MinIO rejeitaria SigV4 inválido
// com 403 SignatureDoesNotMatch. Rodar via `tools/deadman-emitter/it.sh`.
func TestPutObject_Integration_MinIO(t *testing.T) {
	if os.Getenv("DEADMAN_S3_INTEGRATION") != "1" {
		t.Skip("DEADMAN_S3_INTEGRATION!=1 — requer MinIO (rode tools/deadman-emitter/it.sh)")
	}
	fps, _ := strconv.ParseBool(os.Getenv("S3_FORCE_PATH_STYLE"))
	s := S3Config{
		Endpoint:        os.Getenv("S3_ENDPOINT"),
		Region:          getenv("S3_REGION", "us-east-1"),
		AccessKeyID:     os.Getenv("S3_ACCESS_KEY_ID"),
		SecretAccessKey: os.Getenv("S3_SECRET_ACCESS_KEY"),
		Bucket:          os.Getenv("S3_BUCKET"),
		ForcePathStyle:  fps,
	}

	key := "status/it-emitter/" + strconv.FormatInt(time.Now().UnixNano(), 10) + ".jsonl"
	line, err := NewPing("it-emitter", 1, KindPing, time.Now()).Line([]byte("it-key"))
	if err != nil {
		t.Fatal(err)
	}

	if err := s.PutObject(key, []byte(line), time.Now()); err != nil {
		t.Fatalf("PutObject contra MinIO falhou (SigV4 inválido?): %v", err)
	}
	t.Logf("PUT %s/%s OK — SigV4 validado pelo MinIO (status 2xx)", s.Bucket, key)

	// Assinatura errada DEVE ser rejeitada (403) — prova que o MinIO de fato valida.
	bad := s
	bad.SecretAccessKey = "chave-errada-de-proposito"
	if err := bad.PutObject(key, []byte(line), time.Now()); err == nil {
		t.Fatal("PUT com secret errado deveria falhar (403), mas passou")
	}
}
