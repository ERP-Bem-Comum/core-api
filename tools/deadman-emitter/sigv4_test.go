package main

import (
	"encoding/hex"
	"testing"
)

// RFC 4231 Test Case 2 — vetor padrão de HMAC-SHA256 (prova a primitiva da qual toda a
// cadeia SigV4 — signing key + signature — é composta). A correção end-to-end do SigV4
// (canonical request exato) é validada contra o MinIO/S3 na integração: assinatura errada → 403.
func TestHMACSHA256_RFC4231(t *testing.T) {
	got := hex.EncodeToString(hmacSHA256([]byte("Jefe"), []byte("what do ya want for nothing?")))
	const want = "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843"
	if got != want {
		t.Fatalf("hmac-sha256 = %s, quer %s", got, want)
	}
}

func TestSHA256Hex_EmptyPayload(t *testing.T) {
	const want = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
	if got := sha256Hex([]byte("")); got != want {
		t.Fatalf("sha256(\"\") = %s, quer %s", got, want)
	}
}

func TestDeriveSigningKey_DeterministicAndDistinct(t *testing.T) {
	a := deriveSigningKey("secret", "20260616", "us-east-1", "s3")
	b := deriveSigningKey("secret", "20260616", "us-east-1", "s3")
	if len(a) != 32 {
		t.Fatalf("signing key = %d bytes, quer 32 (SHA-256)", len(a))
	}
	if hex.EncodeToString(a) != hex.EncodeToString(b) {
		t.Fatal("deriveSigningKey não-determinístico")
	}
	if hex.EncodeToString(deriveSigningKey("secret", "20260616", "sa-east-1", "s3")) == hex.EncodeToString(a) {
		t.Fatal("signing key não mudou com a região (cadeia HMAC quebrada)")
	}
}

func TestSignature_Format(t *testing.T) {
	key := deriveSigningKey("secret", "20260616", "us-east-1", "s3")
	sig := signature(key, "string-to-sign")
	if len(sig) != 64 {
		t.Fatalf("signature = %d chars, quer 64 (hex de SHA-256)", len(sig))
	}
	if signature(key, "outro") == sig {
		t.Fatal("signature não variou com o stringToSign")
	}
}
