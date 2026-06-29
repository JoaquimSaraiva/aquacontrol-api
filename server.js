require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const db      = require('./database');
const { processarAlertas } = require('./alerts');

const app  = express();
const PORT = process.env.PORT || 3000;

// ---- Middleware ----

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---- Autenticação dispositivo ----

function autenticarDispositivo(req, res, next) {
    const deviceId     = req.headers['x-device-id'];
    const deviceSecret = req.headers['x-device-secret'];

    if (!deviceId || !deviceSecret) {
        return res.status(401).json({ erro: 'Headers de autenticação em falta' });
    }

    if (deviceSecret !== process.env.DEVICE_SECRET) {
        return res.status(403).json({ erro: 'Chave inválida' });
    }

    req.deviceId = deviceId;
    next();
}

// ====================================================
// ROTAS IoT (ESP32)
// ====================================================

// POST /api/iot/readings — receber leitura do ESP32
app.post('/api/iot/readings', autenticarDispositivo, async (req, res) => {
    const { deposito_id, distancia, media, nivel, estado, rssi } = req.body;

    // Validação básica
    if (!deposito_id || nivel === undefined || !estado) {
        return res.status(400).json({ erro: 'Campos obrigatórios em falta' });
    }

    if (nivel < 0 || nivel > 100) {
        return res.status(400).json({ erro: 'Nível fora do intervalo válido (0-100)' });
    }

    try {
        const id = db.inserirLeitura({
            deposito_id,
            distancia: distancia || 0,
            media:     parseFloat(media)     || 0,
            nivel:     parseFloat(nivel),
            estado,
            rssi:      rssi || null
        });

        console.log(`[${new Date().toISOString()}] ${deposito_id} — Nível: ${nivel}% — ${estado}`);

        // Processar alertas de forma assíncrona (não bloqueia resposta)
        processarAlertas({ deposito_id, nivel, estado }).catch(console.error);

        res.status(201).json({ ok: true, id });

    } catch (err) {
        console.error('Erro ao guardar leitura:', err.message);
        res.status(500).json({ erro: 'Erro interno do servidor' });
    }
});

// ====================================================
// ROTAS API (Dashboard)
// ====================================================

// GET /api/depositos — listar todos os depósitos
app.get('/api/depositos', (req, res) => {
    const depositos = db.obterTodosDepositos();
    res.json(depositos);
});

// GET /api/depositos/:id — estado atual de um depósito
app.get('/api/depositos/:id', (req, res) => {
    const ultima = db.obterUltimaLeitura(req.params.id);
    if (!ultima) return res.status(404).json({ erro: 'Depósito não encontrado' });
    res.json(ultima);
});

// GET /api/depositos/:id/historico — histórico de leituras
app.get('/api/depositos/:id/historico', (req, res) => {
    const limite = parseInt(req.query.limite) || 100;
    const dados  = db.obterHistorico(req.params.id, limite);
    res.json(dados);
});

// GET /api/depositos/:id/estatisticas — estatísticas
app.get('/api/depositos/:id/estatisticas', (req, res) => {
    const stats = db.obterEstatisticas(req.params.id);
    res.json(stats);
});

// ====================================================

app.listen(PORT, () => {
    console.log('');
    console.log('=================================');
    console.log(' AquaControl API');
    console.log(` Porta: ${PORT}`);
    console.log('=================================');
    console.log('');
});
