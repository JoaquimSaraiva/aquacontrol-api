const nodemailer = require('nodemailer');
const twilio     = require('twilio');

// ---- Configuração Email ----

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS   // App Password do Gmail
    }
});

// ---- Configuração Twilio WhatsApp ----

const twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

// ---- Controlo anti-spam ----
// Guarda o último estado de cada depósito para não enviar alertas repetidos

const ultimoEstadoAlerta = {};

function deveAlertar(deposito_id, estado) {
    const anterior = ultimoEstadoAlerta[deposito_id];

    // Só alerta se o estado mudou para um estado crítico
    const estadosCriticos = ['CRITICO', 'BAIXO', 'OFFLINE', 'MAXIMO'];

    if (estadosCriticos.includes(estado) && anterior !== estado) {
        ultimoEstadoAlerta[deposito_id] = estado;
        return true;
    }

    // Reset quando voltar ao normal
    if (estado === 'NORMAL') {
        ultimoEstadoAlerta[deposito_id] = estado;
    }

    return false;
}

// ---- Mensagem de alerta ----

function montarMensagem(dados) {
    const emojis = {
        CRITICO:    '🔴',
        BAIXO:      '🟡',
        MAXIMO:     '🔵',
        ENCHIMENTO: '🔵',
        OFFLINE:    '⚫',
        NORMAL:     '🟢'
    };

    const emoji = emojis[dados.estado] || '⚪';
    const hora  = new Date().toLocaleString('pt-PT');

    return `${emoji} *AquaControl — Alerta*\n\n` +
           `Depósito: ${dados.deposito_id}\n` +
           `Estado: ${dados.estado}\n` +
           `Nível: ${dados.nivel}%\n` +
           `Hora: ${hora}`;
}

// ---- Enviar WhatsApp ----

async function enviarWhatsApp(dados) {
    if (!process.env.TWILIO_ACCOUNT_SID) return;

    try {
        await twilioClient.messages.create({
            from: 'whatsapp:' + process.env.TWILIO_WHATSAPP_FROM,
            to:   'whatsapp:' + process.env.WHATSAPP_DESTINO,
            body: montarMensagem(dados)
        });
        console.log(`[Alerta] WhatsApp enviado — ${dados.deposito_id} ${dados.estado}`);
    } catch (err) {
        console.error('[Alerta] Erro WhatsApp:', err.message);
    }
}

// ---- Enviar Email ----

async function enviarEmail(dados) {
    if (!process.env.EMAIL_USER) return;

    const assuntos = {
        CRITICO: `🔴 CRÍTICO — Depósito ${dados.deposito_id} quase vazio (${dados.nivel}%)`,
        BAIXO:   `🟡 AVISO — Depósito ${dados.deposito_id} com nível baixo (${dados.nivel}%)`,
        MAXIMO:  `🔵 INFO — Depósito ${dados.deposito_id} cheio (${dados.nivel}%)`,
        OFFLINE: `⚫ OFFLINE — Depósito ${dados.deposito_id} sem resposta`
    };

    try {
        await transporter.sendMail({
            from:    process.env.EMAIL_USER,
            to:      process.env.EMAIL_DESTINO,
            subject: assuntos[dados.estado] || `AquaControl — ${dados.deposito_id}`,
            text:    montarMensagem(dados).replace(/\*/g, '')
        });
        console.log(`[Alerta] Email enviado — ${dados.deposito_id} ${dados.estado}`);
    } catch (err) {
        console.error('[Alerta] Erro Email:', err.message);
    }
}

// ---- Função principal ----

async function processarAlertas(dados) {
    if (!deveAlertar(dados.deposito_id, dados.estado)) return;

    console.log(`[Alerta] Novo alerta: ${dados.deposito_id} → ${dados.estado}`);

    await Promise.all([
        enviarWhatsApp(dados),
        enviarEmail(dados)
    ]);
}

module.exports = { processarAlertas };
