# Contrato CLI — Gestão de Usuários (paridade Fase 1)

A CLI é a UX de validação primária da Fase 1; cada use case ganha paridade CLI (adapters in-memory por
default, `--driver mysql` para integração). Strings ao humano em PT (dicionário `cli/formatters/`).

```bash
# Listar (paginação/busca/filtro)
pnpm run cli:auth -- listar-usuarios --page 1 --page-size 5 --status active --search "ana"

# Detalhe
pnpm run cli:auth -- ver-usuario --id <uuid>

# Criar (dispara convite de ativação por email)
pnpm run cli:auth -- criar-usuario --name "Amanda Manoel" --cpf 79779546057 \
  --email amanda@x.com --telephone 15997133502

# Editar perfil
pnpm run cli:auth -- editar-usuario --id <uuid> --telephone 15999990000

# Ativar / Desativar (idempotente)
pnpm run cli:auth -- ativar-usuario --id <uuid>
pnpm run cli:auth -- desativar-usuario --id <uuid>

# Foto
pnpm run cli:auth -- definir-foto-usuario --id <uuid> --file ./foto.png
```

- Saída formata `Result<T,E>` de modo humano (sucesso → tabela/resumo; erro → mensagem PT por campo).
- `--driver memory` (default) usa adapters in-memory; `--driver mysql --connection-string …` exercita
  persistência real (integração, atrás de `*_INTEGRATION=1`).
- Nomes de subcomando em PT (verbo-substantivo), seguindo o padrão de `cli:contracts`.
