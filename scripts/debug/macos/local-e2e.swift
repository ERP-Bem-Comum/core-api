#!/usr/bin/env swift
//
// Orquestrador do ciclo E2E local: sobe a stack, espera cada etapa ficar PRONTA, obtém os 8 tokens
// e roda a suíte Hurl. Uma etapa só começa quando a anterior é observável — nunca por tempo fixo.
//
// Uso:   swift scripts/debug/macos/local-e2e.swift            sobe, autentica e roda a suíte
//        swift scripts/debug/macos/local-e2e.swift --reset    idem, recriando o database antes (⚠️ DESTRUTIVO)
//        swift scripts/debug/macos/local-e2e.swift --no-suite sobe e autentica, sem rodar a suíte
//        swift scripts/debug/macos/local-e2e.swift --down     só derruba
//
// ⚠️ `--reset` apaga o database `core` inteiro. É banco de DESENVOLVIMENTO — nada ali existe em
// homologação ou produção, e o `core_replay_0010` ao lado não é tocado. Use-o quando a suíte
// precisar de banco limpo: o CPF e os nomes são fixos nos `.hurl`, então o segundo run colide no
// índice único e devolve 409 em toda criação.
//
// POR QUE ESPERAR POR CONDIÇÃO, E NÃO POR `sleep`. Um `sleep 3` acerta na máquina de quem escreve
// e falha na máquina ocupada — e falha tarde, como "o seed não rodou", longe da causa. Cada
// `aguardar` abaixo tem uma pergunta verificável e um teto de tentativas; estourar o teto é
// diagnóstico ("a borda não respondeu em N tentativas"), não um erro adiante.
//
// AS TRÊS ARMADILHAS DE AMBIENTE QUE ESTE CICLO JÁ CUSTOU, todas medidas em 14/10/2026:
//   1. O overmind usa o diretório do Procfile como cwd (`--root`, default). Com o Procfile em
//      `.tmp/`, `src/server.ts` virou `.tmp/src/server.ts` e o `.nvmrc` ficou fora de alcance —
//      até a versão do Node mudou. Daí o `-d .`.
//   2. `--env-file` do Node NÃO sobrescreve env de processo, e o overmind injeta o `.env` como env
//      de processo. O `.env` gerado traz `AUTH_SEED_JSON=""`, então o seed ficava inerte, SEM ERRO.
//      Daí o `run-http.sh` com `set -a; . arquivo` (source sobrescreve).
//   3. Há DOIS rate limits independentes: login (5/min) e geral (100/janela). Subir um não afeta o
//      outro — com 185 requests em 1s, 142 voltaram 429 depois de o de login já estar resolvido.

import Foundation

// ─── Infraestrutura ─────────────────────────────────────────────────────────────────────────────

/// A raiz do checkout em que este arquivo está — quatro níveis acima de `scripts/debug/macos/`.
let raiz = URL(fileURLWithPath: #filePath)
    .deletingLastPathComponent()  // scripts/debug/macos/
    .deletingLastPathComponent()  // scripts/debug/
    .deletingLastPathComponent()  // scripts/
    .deletingLastPathComponent()  // raiz
let base = "http://127.0.0.1:3000"
let senhaE2E = "E2eLocal!2026"

/// A raiz do checkout COMPARTILHADO, que pode não ser `raiz`.
///
/// `api-collections-hurl/` está no `.gitignore` — existe só na árvore principal, nunca numa
/// worktree. Rodando de uma worktree, o glob da suíte não encontra nada e o Hurl devolve
/// "No such file or directory", que parece erro de digitação e é erro de localização.
///
/// Resolvido perguntando ao git (`--git-common-dir` aponta para o `.git` do checkout principal,
/// mesmo de dentro de uma worktree), e não contando níveis de `..` — contar quebraria se a
/// worktree mudasse de lugar.
let raizCompartilhada: URL = {
    let p = Process()
    p.executableURL = URL(fileURLWithPath: "/usr/bin/env")
    p.arguments = ["git", "rev-parse", "--path-format=absolute", "--git-common-dir"]
    p.currentDirectoryURL = raiz
    let tubo = Pipe()
    p.standardOutput = tubo
    p.standardError = FileHandle.nullDevice
    guard (try? p.run()) != nil else { return raiz }
    let dados = tubo.fileHandleForReading.readDataToEndOfFile()
    p.waitUntilExit()
    let texto = (String(data: dados, encoding: .utf8) ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
    guard !texto.isEmpty else { return raiz }
    // `<principal>/.git` → `<principal>`
    return URL(fileURLWithPath: texto).deletingLastPathComponent()
}()

enum Cor {
    static let verde = "\u{1B}[0;32m", vermelho = "\u{1B}[0;31m", amarelo = "\u{1B}[0;33m"
    static let fraco = "\u{1B}[2m", off = "\u{1B}[0m"
}

func ok(_ m: String) { print("\(Cor.verde)✔\(Cor.off) \(m)") }
func ruim(_ m: String) { print("\(Cor.vermelho)✖\(Cor.off) \(m)") }
func alerta(_ m: String) { print("\(Cor.amarelo)⚠\(Cor.off)  \(m)") }
func etapa(_ m: String) { print("\n\(Cor.fraco)▶ \(m)\(Cor.off)") }

struct Falha: Error { let motivo: String }

/// Executa um comando e devolve saída combinada e código de saída.
@discardableResult
func rodar(
    _ executavel: String,
    _ args: [String],
    em diretorio: URL? = nil,
    emSegundoPlano: Bool = false,
    mostrarSaida: Bool = false
) throws -> (saida: String, codigo: Int32) {
    let p = Process()
    p.executableURL = URL(fileURLWithPath: executavel)
    p.arguments = args
    p.currentDirectoryURL = diretorio ?? raiz

    if emSegundoPlano {
        // Desacopla do nosso stdout: o overmind daemonizado escreve no tmux, e os logs físicos já
        // vão para .tmp/logs/*.jsonl pelo `tee` do Procfile.
        p.standardOutput = FileHandle.nullDevice
        p.standardError = FileHandle.nullDevice
        try p.run()
        return ("", 0)
    }

    let tubo = Pipe()
    p.standardOutput = tubo
    p.standardError = tubo
    try p.run()

    // Ler ANTES do waitUntilExit: com saída grande, esperar primeiro enche o buffer do pipe e o
    // processo trava para sempre. É a armadilha clássica de Process + Pipe.
    let dados = tubo.fileHandleForReading.readDataToEndOfFile()
    p.waitUntilExit()

    let texto = String(data: dados, encoding: .utf8) ?? ""
    if mostrarSaida, !texto.isEmpty { print(texto, terminator: texto.hasSuffix("\n") ? "" : "\n") }
    return (texto, p.terminationStatus)
}

/// Repete `pergunta` até devolver true, com teto. O nome da condição entra na mensagem de falha.
func aguardar(
    _ oQue: String,
    tentativas: Int = 60,
    intervaloMs: UInt64 = 500,
    _ pergunta: () async -> Bool
) async throws {
    for n in 1...tentativas {
        if await pergunta() {
            ok("\(oQue) — pronto na tentativa \(n)")
            return
        }
        try await Task.sleep(nanoseconds: intervaloMs * 1_000_000)
    }
    throw Falha(motivo: "\(oQue): não ficou pronto em \(tentativas) tentativas")
}

// ─── Perguntas verificáveis ─────────────────────────────────────────────────────────────────────

func httpStatus(_ caminho: String) async -> Int? {
    guard let url = URL(string: base + caminho) else { return nil }
    var req = URLRequest(url: url)
    req.timeoutInterval = 2
    do {
        let (_, resp) = try await URLSession.shared.data(for: req)
        return (resp as? HTTPURLResponse)?.statusCode
    } catch {
        return nil
    }
}

func bordaResponde() async -> Bool { await httpStatus("/health") == 200 }

func socketDoOvermindExiste() -> Bool {
    FileManager.default.fileExists(atPath: raiz.appendingPathComponent(".overmind.sock").path)
}

/// Quantos usuários o seed criou. Pergunta ao banco, que é onde o efeito do seed de fato aparece.
func usuariosNoBanco() -> Int {
    guard
        let r = try? rodar("/usr/bin/env", [
            "docker", "exec", "dev-infra-mysql-1",
            "mysql", "-N", "-udev", "-pdev", "core",
            "-e", "SELECT COUNT(*) FROM auth_user;",
        ])
    else { return -1 }
    let linha = r.saida.split(separator: "\n").first { Int($0.trimmingCharacters(in: .whitespaces)) != nil }
    return Int(linha?.trimmingCharacters(in: .whitespaces) ?? "") ?? -1
}

// ─── Perfis ─────────────────────────────────────────────────────────────────────────────────────

/// Perfil → nome da variável de token em `_vars.env`. Os e-mails seguem `e2e-<perfil>@local.test`.
let perfis: [(perfil: String, varToken: String)] = [
    ("admin", "token"),
    ("bare", "bareToken"),
    ("bareUser", "bareUserToken"),
    ("partnersOperator", "partnersOperatorToken"),
    ("contractsOperator", "contractsOperatorToken"),
    ("programsOperator", "programsOperatorToken"),
    ("budgetPlansOperator", "budgetPlansOperatorToken"),
    ("reader", "readerToken"),
]

func emailDe(_ perfil: String) -> String { "e2e-\(perfil.lowercased())@local.test" }

struct Login: Decodable { let accessToken: String }

func autenticar(_ email: String) async -> String? {
    guard let url = URL(string: base + "/api/v2/auth/login") else { return nil }
    var req = URLRequest(url: url)
    req.httpMethod = "POST"
    req.setValue("application/json", forHTTPHeaderField: "content-type")
    req.httpBody = try? JSONSerialization.data(withJSONObject: ["email": email, "password": senhaE2E])
    req.timeoutInterval = 10
    do {
        let (dados, resp) = try await URLSession.shared.data(for: req)
        let codigo = (resp as? HTTPURLResponse)?.statusCode ?? 0
        guard codigo == 200 else {
            ruim("\(email.padding(toLength: 36, withPad: " ", startingAt: 0)) HTTP \(codigo)")
            return nil
        }
        return try JSONDecoder().decode(Login.self, from: dados).accessToken
    } catch {
        ruim("\(email) erro de rede: \(error.localizedDescription)")
        return nil
    }
}

// ─── Etapas ─────────────────────────────────────────────────────────────────────────────────────

func derrubar() async throws {
    etapa("Derrubando a stack, se estiver de pé")
    guard socketDoOvermindExiste() else {
        ok("nada rodando")
        return
    }
    try rodar("/usr/bin/env", ["overmind", "quit"])
    // Espera por EFEITO: o socket sumir. Um `sleep` fixo aqui erraria nas duas direções.
    try await aguardar("socket do overmind liberado", tentativas: 40) { !socketDoOvermindExiste() }
}

/// Quantas linhas as tabelas com conteúdo têm, para dizer o que o `--reset` vai apagar.
func resumoDoBanco() -> [String] {
    guard
        let r = try? rodar("/usr/bin/env", [
            "docker", "exec", "dev-infra-mysql-1",
            "mysql", "-N", "-udev", "-pdev", "core",
            "-e", """
            SELECT CONCAT(table_name, ': ', table_rows) FROM information_schema.tables
            WHERE table_schema = 'core' AND table_rows > 0 ORDER BY table_rows DESC LIMIT 8;
            """,
        ])
    else { return [] }
    return r.saida
        .split(separator: "\n")
        .map { $0.trimmingCharacters(in: .whitespaces) }
        .filter { !$0.isEmpty && !$0.contains("Warning") }
}

/// Recria o database do zero e reaplica schema e catálogo.
///
/// POR QUE RECRIAR E NÃO TRUNCAR. `fin_categories` e `fin_cost_centers` carregam SEED DE MIGRATION
/// — `.claude/rules/testing.md` registra que apagá-las não as repõe, porque a migration já está
/// aplicada, e que isso já derrubou uma suíte: um arquivo fez `delete` sem `WHERE` e a falha
/// apareceu em OUTRO arquivo, que lia o seed. Com `DROP` + `CREATE` + `migrate`, as migrations
/// rodam do zero e os seeds voltam. Recriar é mais seguro que truncar, ao contrário da intuição.
///
/// Fecha também os 23 × 409 da suíte: o CPF e os nomes são fixos nos arquivos `.hurl`, então o
/// segundo run colide no índice único. O README da suíte é explícito — ela roda contra banco limpo.
func recriarBanco() throws {
    etapa("Recriando o database `core` (--reset)")

    let antes = resumoDoBanco()
    if antes.isEmpty {
        ok("banco já está vazio")
    } else {
        alerta("vai apagar:")
        for linha in antes { print("     \(linha)") }
    }

    let drop = try rodar("/usr/bin/env", [
        "docker", "exec", "dev-infra-mysql-1", "mysql", "-udev", "-pdev",
        "-e", """
        DROP DATABASE IF EXISTS core;
        CREATE DATABASE core CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
        """,
    ])
    guard drop.codigo == 0 else { throw Falha(motivo: "DROP/CREATE falhou:\n\(drop.saida)") }
    ok("database recriado, vazio")

    for (rotulo, entrada) in [
        ("migrations", "src/jobs/migrate/run.ts"),
        ("catálogo de permissões", "src/jobs/auth/sync-permissions/run.ts"),
    ] {
        let r = try rodar("/usr/bin/env", [
            "node", "--env-file=.env", "--enable-source-maps", entrada,
        ])
        guard r.codigo == 0 else { throw Falha(motivo: "\(rotulo) falhou:\n\(r.saida)") }
        ok("\(rotulo) aplicado")
    }
}

func prepararAmbienteE2E() throws {
    etapa("Regerando .tmp/e2e.env (perfis, tetos de rate limit)")
    let r = try rodar("/usr/bin/env", [
        "node", "--enable-source-maps", "scripts/debug/e2e-profiles.ts",
    ])
    guard r.codigo == 0 else { throw Falha(motivo: "e2e-profiles.ts falhou:\n\(r.saida)") }
    ok("ambiente E2E regerado")
}

func zerarLogs() throws {
    etapa("Zerando .tmp/logs/*.jsonl")
    let dir = raiz.appendingPathComponent(".tmp/logs")
    try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    for nome in ["http", "worker-outbox", "worker-projections", "worker-email", "worker-van"] {
        try Data().write(to: dir.appendingPathComponent("\(nome).jsonl"))
    }
    ok("logs zerados")
}

func subir() async throws {
    etapa("Subindo a stack (daemonizada, logs em .tmp/logs/)")
    // `-D` daemoniza: sem isso o processo bloquearia aqui e as etapas seguintes nunca rodariam.
    // `-d .` é a armadilha nº 1 do cabeçalho — sem ela todo caminho relativo resolve de `.tmp/`.
    try rodar(
        "/usr/bin/env",
        ["overmind", "start", "-D", "-f", "scripts/debug/Procfile.logged", "-d", "."],
        emSegundoPlano: true
    )
    try await aguardar("borda HTTP escutando (GET /health → 200)") { await bordaResponde() }
}

func esperarSeed() async throws {
    etapa("Esperando o seed E2E aplicar os 8 perfis")
    // O seed roda no boot da BORDA, a partir do AUTH_SEED_JSON — então o efeito aparece no banco,
    // não no log. Perguntar ao banco é o que distingue "ainda não rodou" de "rodou inerte".
    try await aguardar("8 usuários no banco", tentativas: 40) { usuariosNoBanco() >= 8 }
}

func obterTokens() async throws {
    etapa("Autenticando os 8 perfis")
    var linhas = ["base=\(base)", "E2E_SEED_PASSWORD=\(senhaE2E)"]
    var autenticados = 0

    for (perfil, varToken) in perfis {
        let email = emailDe(perfil)
        linhas.append("\(perfil)Email=\(email)")
        guard let token = await autenticar(email) else { continue }
        linhas.append("\(varToken)=\(token)")
        autenticados += 1
        print("   \(email.padding(toLength: 36, withPad: " ", startingAt: 0)) ok (\(varToken), \(token.count) chars)")
    }

    // A suíte mistura duas convenções de nome para os mesmos perfis.
    linhas.append("adminEmail=\(emailDe("admin"))")
    linhas.append("bareEmail=\(emailDe("bare"))")

    let arquivo = raiz.appendingPathComponent(".tmp/hurl-vars.txt")
    try (linhas.joined(separator: "\n") + "\n").write(to: arquivo, atomically: true, encoding: .utf8)
    try FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: arquivo.path)

    guard autenticados == perfis.count else {
        throw Falha(motivo: "\(autenticados)/\(perfis.count) perfis autenticados — o seed rodou?")
    }
    ok("\(autenticados)/\(perfis.count) perfis autenticados · .tmp/hurl-vars.txt (tokens não impressos)")
}

func rodarSuite() throws {
    etapa("Suíte Hurl (23 arquivos)")
    // `--jobs 1` é obrigatório: `--test` paraleliza por default e o rate limit de login é
    // compartilhado. `--continue-on-error` porque o Hurl para no primeiro assert falho do arquivo.
    // `--file-root .` porque há upload com caminho relativo — sem isso, "unauthorized file access".
    let suite = raizCompartilhada.appendingPathComponent("api-collections-hurl")
    guard FileManager.default.fileExists(atPath: suite.path) else {
        throw Falha(motivo: "api-collections-hurl/ não existe em \(raizCompartilhada.path) — ela é gitignored; copie `_vars.env.example` e preencha, ou rode com --no-suite")
    }

    // Roda da raiz COMPARTILHADA, porque é lá que a suíte vive. O `--variables-file` é absoluto:
    // os tokens ficam na worktree, que é outro diretório.
    let vars = raiz.appendingPathComponent(".tmp/hurl-vars.txt").path
    let r = try rodar(
        "/usr/bin/env",
        [
            "hurl", "--test", "--jobs", "1", "--continue-on-error", "--file-root", ".",
            "--variables-file", vars,
            "--glob", "api-collections-hurl/casos/**/*.hurl",
        ],
        em: raizCompartilhada
    )

    for linha in r.saida.split(separator: "\n") where linha.hasPrefix("Executed")
        || linha.hasPrefix("Succeeded") || linha.hasPrefix("Failed") || linha.hasPrefix("Duration")
    {
        print("   \(linha)")
    }

    let erros = r.saida.split(separator: "\n").filter { $0.hasPrefix("error: ") }
    let porTipo = Dictionary(grouping: erros, by: { String($0) }).mapValues(\.count)
    if !porTipo.isEmpty {
        print("\n   Erros por tipo:")
        for (tipo, n) in porTipo.sorted(by: { $0.value > $1.value }) {
            print("     \(String(n).leftPadded(to: 4))×  \(tipo.replacingOccurrences(of: "error: ", with: ""))")
        }
    }
}

func analisarLog() throws {
    etapa("Status por rota (correlacionado por reqId)")
    let r = try rodar("/usr/bin/env", [
        "node", "--enable-source-maps", "scripts/debug/analyze-http-log.ts",
    ])
    print(r.saida)
}

extension String {
    func leftPadded(to n: Int) -> String {
        count >= n ? self : String(repeating: " ", count: n - count) + self
    }
}

// ─── Fluxo ──────────────────────────────────────────────────────────────────────────────────────

let args = CommandLine.arguments.dropFirst()

do {
    if args.contains("--down") {
        try await derrubar()
        ok("stack derrubada")
        exit(0)
    }

    try await derrubar()
    // Depois de derrubar, por obrigação: recriar o schema com a aplicação de pé deixaria o pool
    // apontando para tabelas que sumiram, e o sintoma seria erro de driver em consulta aleatória.
    if args.contains("--reset") { try recriarBanco() }
    try prepararAmbienteE2E()
    try zerarLogs()
    try await subir()
    try await esperarSeed()
    try await obterTokens()

    if args.contains("--no-suite") {
        alerta("--no-suite: suíte não executada")
    } else {
        try rodarSuite()
        try analisarLog()
    }

    print("")
    ok("ciclo completo")
    print("""

      A stack continua de pé (daemonizada).
        parar:         swift scripts/debug/macos/local-e2e.swift --down
        banco limpo:   swift scripts/debug/macos/local-e2e.swift --reset
        ver um proc:   overmind connect http
        seguir log:    tail -f .tmp/logs/http.jsonl

    """)
} catch let e as Falha {
    print("")
    ruim(e.motivo)
    alerta("a stack pode estar de pé — `swift scripts/debug/macos/local-e2e.swift --down` para derrubar")
    exit(1)
} catch {
    print("")
    ruim("erro inesperado: \(error)")
    exit(1)
}
