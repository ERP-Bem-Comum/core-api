package main

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// uriEncodePath — RFC 3986 unreserved + '/' preservado (S3 canonical URI). Para keys
// seguras (kebab + dígitos + '/.-') é no-op; defensivo para o resto.
func uriEncodePath(p string) string {
	var b strings.Builder
	for i := 0; i < len(p); i++ {
		ch := p[i]
		switch {
		case ch >= 'A' && ch <= 'Z', ch >= 'a' && ch <= 'z', ch >= '0' && ch <= '9',
			ch == '-', ch == '.', ch == '_', ch == '~', ch == '/':
			b.WriteByte(ch)
		default:
			fmt.Fprintf(&b, "%%%02X", ch)
		}
	}
	return b.String()
}

// PutObject grava `body` em `key` no bucket via SigV4 (service "s3"). Path-style quando
// ForcePathStyle (MinIO/R2); senão virtual-host. Erro se o status não for 2xx — em
// particular, **assinatura inválida → 403** (o que prova o SigV4 end-to-end na integração).
func (s S3Config) PutObject(key string, body []byte, now time.Time) error {
	u, err := url.Parse(strings.TrimRight(s.Endpoint, "/"))
	if err != nil {
		return fmt.Errorf("S3_ENDPOINT inválido: %w", err)
	}

	host := u.Host
	canonicalURI := "/" + s.Bucket + "/" + key
	fullURL := u.String() + "/" + s.Bucket + "/" + key
	if !s.ForcePathStyle {
		host = s.Bucket + "." + u.Host
		canonicalURI = "/" + key
		fullURL = u.Scheme + "://" + host + "/" + key
	}
	canonicalURI = uriEncodePath(canonicalURI)

	amzDate, dateStamp := amzTimes(now)
	payloadHash := sha256Hex(body)

	// Canonical request (query vazia; 3 signed headers em ordem alfabética).
	canonicalHeaders := "host:" + host + "\n" +
		"x-amz-content-sha256:" + payloadHash + "\n" +
		"x-amz-date:" + amzDate + "\n"
	const signedHeaders = "host;x-amz-content-sha256;x-amz-date"
	canonicalRequest := strings.Join([]string{
		http.MethodPut, canonicalURI, "", canonicalHeaders, signedHeaders, payloadHash,
	}, "\n")

	scope := dateStamp + "/" + s.Region + "/s3/aws4_request"
	stringToSign := strings.Join([]string{
		algorithm, amzDate, scope, sha256Hex([]byte(canonicalRequest)),
	}, "\n")
	sig := signature(deriveSigningKey(s.SecretAccessKey, dateStamp, s.Region, "s3"), stringToSign)

	authz := fmt.Sprintf("%s Credential=%s/%s, SignedHeaders=%s, Signature=%s",
		algorithm, s.AccessKeyID, scope, signedHeaders, sig)

	req, err := http.NewRequest(http.MethodPut, fullURL, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Host = host
	req.Header.Set("X-Amz-Date", amzDate)
	req.Header.Set("X-Amz-Content-Sha256", payloadHash)
	req.Header.Set("Authorization", authz)
	req.Header.Set("Content-Type", "application/x-ndjson")

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("PUT %s: %w", key, err)
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		b, _ := io.ReadAll(io.LimitReader(resp.Body, 2048))
		return fmt.Errorf("PUT %s: status %d: %s", key, resp.StatusCode, strings.TrimSpace(string(b)))
	}
	return nil
}
