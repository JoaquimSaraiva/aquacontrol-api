# AquaControl API

API para monitorização de depósitos com dashboard web, alertas por email e WhatsApp.

---

## Estrutura

```
aquacontrol-api/
├── server.js       — API Express
├── database.js     — SQLite
├── alerts.js       — Email + WhatsApp
├── public/
│   └── index.html  — Dashboard web
├── .env.example    — Variáveis de ambiente (copiar para .env)
└── package.json
```

---

## Instalar localmente

```bash
npm install
cp .env.example .env
# Editar .env com as tuas credenciais
node server.js
```

Dashboard disponível em: http://localhost:3000

---

## Deploy no Railway (gratuito)

### 1. Criar conta
Vai a https://railway.app e regista-te com o GitHub.

### 2. Criar projeto
- Clica em **New Project → Deploy from GitHub repo**
- Seleciona o repositório com este código
- Railway deteta Node.js automaticamente

### 3. Adicionar variáveis de ambiente
No painel do Railway, vai a **Variables** e adiciona:

| Variável              | Valor                          |
|-----------------------|--------------------------------|
| `DEVICE_SECRET`       | minha-chave-secreta            |
| `EMAIL_USER`          | o_teu@gmail.com                |
| `EMAIL_PASS`          | app_password_do_gmail          |
| `EMAIL_DESTINO`       | destino@gmail.com              |
| `TWILIO_ACCOUNT_SID`  | ACxxxxxxxx...                  |
| `TWILIO_AUTH_TOKEN`   | xxxxxxxx...                    |
| `TWILIO_WHATSAPP_FROM`| +14155238886                   |
| `WHATSAPP_DESTINO`    | +351912345678                  |

### 4. Obter URL
Após o deploy, Railway gera um URL do tipo:
`https://aquacontrol-api-production.up.railway.app`

Copia esse URL e coloca no ESP32 em `API_URL` no ficheiro .ino.

---

## Configurar WhatsApp (Twilio)

1. Cria conta gratuita em https://www.twilio.com
2. Vai a **Messaging → Try it out → Send a WhatsApp message**
3. Segue as instruções para ativar o Sandbox (envias uma mensagem para o número deles)
4. O número `TWILIO_WHATSAPP_FROM` é sempre `+14155238886` (sandbox)
5. `WHATSAPP_DESTINO` é o teu número com código de país (+351...)

---

## Configurar Email (Gmail)

1. Vai a https://myaccount.google.com/apppasswords
2. Cria uma "App Password" para "Mail"
3. Usa essa password em `EMAIL_PASS` (não a tua password normal)

---

## Endpoints da API

| Método | URL                                    | Descrição                    |
|--------|----------------------------------------|------------------------------|
| POST   | /api/iot/readings                      | Receber leitura do ESP32     |
| GET    | /api/depositos                         | Listar todos os depósitos    |
| GET    | /api/depositos/:id                     | Estado atual de um depósito  |
| GET    | /api/depositos/:id/historico?limite=50 | Histórico de leituras        |
| GET    | /api/depositos/:id/estatisticas        | Estatísticas                 |

---

## Exemplo de payload ESP32

```json
{
  "deposito_id": "DEP001",
  "distancia": 1799,
  "media": "1799.0",
  "nivel": "57.2",
  "estado": "NORMAL",
  "rssi": -42
}
```

Headers obrigatórios:
```
Content-Type: application/json
X-Device-Id: ESP32-001
X-Device-Secret: minha-chave-secreta
```
