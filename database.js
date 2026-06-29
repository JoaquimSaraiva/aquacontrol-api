const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'aquacontrol.db'));

// Criar tabelas se não existirem
db.exec(`
    CREATE TABLE IF NOT EXISTS leituras (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        deposito_id TEXT    NOT NULL,
        distancia   INTEGER NOT NULL,
        media       REAL    NOT NULL,
        nivel       REAL    NOT NULL,
        estado      TEXT    NOT NULL,
        rssi        INTEGER,
        criado_em   DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS depositos (
        id          TEXT PRIMARY KEY,
        nome        TEXT,
        ultimo_nivel REAL,
        ultimo_estado TEXT,
        ultima_leitura DATETIME
    );
`);

// ---- Leituras ----

function inserirLeitura(dados) {
    const stmt = db.prepare(`
        INSERT INTO leituras (deposito_id, distancia, media, nivel, estado, rssi)
        VALUES (@deposito_id, @distancia, @media, @nivel, @estado, @rssi)
    `);
    const info = stmt.run(dados);

    // Atualizar registo do depósito
    db.prepare(`
        INSERT INTO depositos (id, ultimo_nivel, ultimo_estado, ultima_leitura)
        VALUES (@id, @nivel, @estado, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
            ultimo_nivel    = @nivel,
            ultimo_estado   = @estado,
            ultima_leitura  = CURRENT_TIMESTAMP
    `).run({ id: dados.deposito_id, nivel: dados.nivel, estado: dados.estado });

    return info.lastInsertRowid;
}

function obterHistorico(deposito_id, limite = 100) {
    return db.prepare(`
        SELECT * FROM leituras
        WHERE deposito_id = ?
        ORDER BY criado_em DESC
        LIMIT ?
    `).all(deposito_id, limite);
}

function obterUltimaLeitura(deposito_id) {
    return db.prepare(`
        SELECT * FROM leituras
        WHERE deposito_id = ?
        ORDER BY criado_em DESC
        LIMIT 1
    `).get(deposito_id);
}

function obterTodosDepositos() {
    return db.prepare(`SELECT * FROM depositos ORDER BY ultima_leitura DESC`).all();
}

function obterEstatisticas(deposito_id) {
    return db.prepare(`
        SELECT
            COUNT(*)        AS total_leituras,
            MIN(nivel)      AS nivel_minimo,
            MAX(nivel)      AS nivel_maximo,
            AVG(nivel)      AS nivel_medio,
            MIN(criado_em)  AS primeira_leitura,
            MAX(criado_em)  AS ultima_leitura
        FROM leituras
        WHERE deposito_id = ?
    `).get(deposito_id);
}

module.exports = {
    inserirLeitura,
    obterHistorico,
    obterUltimaLeitura,
    obterTodosDepositos,
    obterEstatisticas
};
