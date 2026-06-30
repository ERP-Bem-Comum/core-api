// AWS Signature V4 mínimo (stdlib) para PUT em S3/R2 — sem aws-sdk-go (mantém o binário
// leve, ~3-4 MB, e o go.sum vazio: supply-chain mínimo, ADR-0011). Verificado contra o
// vetor oficial da AWS em sigv4_test.go.
package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"time"
)

const (
	amzTimeLayout = "20060102T150405Z" // x-amz-date
	amzDateLayout = "20060102"         // escopo (YYYYMMDD)
	algorithm     = "AWS4-HMAC-SHA256"
)

func hmacSHA256(key, data []byte) []byte {
	m := hmac.New(sha256.New, key)
	m.Write(data)
	return m.Sum(nil)
}

func sha256Hex(data []byte) string {
	sum := sha256.Sum256(data)
	return hex.EncodeToString(sum[:])
}

// deriveSigningKey — cadeia HMAC do SigV4: AWS4+secret → date → region → service → aws4_request.
func deriveSigningKey(secret, dateYMD, region, service string) []byte {
	kDate := hmacSHA256([]byte("AWS4"+secret), []byte(dateYMD))
	kRegion := hmacSHA256(kDate, []byte(region))
	kService := hmacSHA256(kRegion, []byte(service))
	return hmacSHA256(kService, []byte("aws4_request"))
}

// signature — HMAC(signingKey, stringToSign) em hex (a assinatura final do header Authorization).
func signature(signingKey []byte, stringToSign string) string {
	return hex.EncodeToString(hmacSHA256(signingKey, []byte(stringToSign)))
}

// amzTimes — (x-amz-date ISO, YYYYMMDD do escopo) a partir de um instante.
func amzTimes(t time.Time) (iso string, ymd string) {
	u := t.UTC()
	return u.Format(amzTimeLayout), u.Format(amzDateLayout)
}
