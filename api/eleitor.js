const { getPool, ensureSchema, getClientIp } = require('./_db');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
  try {
    await ensureSchema();
    const body = req.body || {};
    const nome = String(body.nome || '').trim().slice(0, 200);
    const numero = String(body.numero || '').trim().slice(0, 40);
    const bairro = String(body.bairro || '').trim().slice(0, 200);
    const mae = String(body.mae || '').trim().slice(0, 200);
    const nascimento = String(body.nascimento || '').trim().slice(0, 10);
    const endereco = String(body.endereco || '').trim().slice(0, 300);
    if (!nome || !numero || !bairro || !mae || !nascimento || !endereco) {
      return res.status(400).json({ error: 'Nome, WhatsApp, bairro, nome da mãe, data de nascimento e endereço são obrigatórios.' });
    }
    const ip = getClientIp(req);
    await getPool().query(
      'INSERT INTO eleitores (nome, numero, bairro, nome_mae, data_nascimento, endereco, ip) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [nome, numero, bairro, mae, nascimento, endereco, ip]
    );
    res.status(201).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
