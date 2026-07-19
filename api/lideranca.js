const { getPool, ensureSchema, getClientIp } = require('./_db');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
  try {
    await ensureSchema();
    const body = req.body || {};
    const nome = String(body.nome || '').trim().slice(0, 200);
    const numero = String(body.numero || '').trim().slice(0, 40);
    const bairro = String(body.bairro || '').trim().slice(0, 200);
    if (!nome || !numero || !bairro) return res.status(400).json({ error: 'Nome, WhatsApp e bairro são obrigatórios.' });
    const ip = getClientIp(req);
    await getPool().query(
      'INSERT INTO liderancas (nome, numero, bairro, ip) VALUES ($1,$2,$3,$4)',
      [nome, numero, bairro, ip]
    );
    res.status(201).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
