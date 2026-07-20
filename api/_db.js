const { Pool } = require('pg');

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING;

let pool;
function getPool() {
  if (!pool) {
    if (!connectionString) throw new Error('Banco não configurado (defina DATABASE_URL nas env vars da Vercel).');
    pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  }
  return pool;
}

let schemaReady;
function ensureSchema() {
  if (!schemaReady) {
    schemaReady = getPool().query(`
      CREATE TABLE IF NOT EXISTS page_views (
        id BIGSERIAL PRIMARY KEY,
        path TEXT NOT NULL,
        referrer TEXT,
        ip TEXT NOT NULL,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS page_views_criado_em_idx ON page_views (criado_em);

      CREATE TABLE IF NOT EXISTS leads (
        id BIGSERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        whatsapp TEXT,
        cidade TEXT,
        mensagem TEXT,
        ip TEXT,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS leads_criado_em_idx ON leads (criado_em);

      CREATE TABLE IF NOT EXISTS ignored_ips (
        ip TEXT PRIMARY KEY,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS liderancas (
        id BIGSERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        numero TEXT,
        bairro TEXT,
        nome_mae TEXT,
        data_nascimento DATE,
        endereco TEXT,
        ip TEXT,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS liderancas_criado_em_idx ON liderancas (criado_em);
      ALTER TABLE liderancas ADD COLUMN IF NOT EXISTS nome_mae TEXT;
      ALTER TABLE liderancas ADD COLUMN IF NOT EXISTS data_nascimento DATE;
      ALTER TABLE liderancas ADD COLUMN IF NOT EXISTS endereco TEXT;
    `);
  }
  return schemaReady;
}

function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return req.socket && req.socket.remoteAddress || 'desconhecido';
}

module.exports = { getPool, ensureSchema, getClientIp };
