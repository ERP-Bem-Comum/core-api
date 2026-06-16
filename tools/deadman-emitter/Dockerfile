# Emissor do dead-man's switch — binário Go estático em imagem `scratch` (ADR-0042 D1).
# Resultado: ~6 MB, zero runtime, idêntico em `docker run` e compose.

FROM golang:1.26-alpine AS build
RUN apk add --no-cache ca-certificates
WORKDIR /src
COPY go.mod ./
COPY *.go ./
# CGO off → binário estático; -s -w remove símbolos/debug (menor).
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /deadman-emitter .

FROM scratch
# CA certs para o dual-write HTTPS (S3/R2 + GitHub) do próximo incremento.
COPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=build /deadman-emitter /deadman-emitter
# nonroot (nobody) — hardening.
USER 65534:65534
ENTRYPOINT ["/deadman-emitter"]
