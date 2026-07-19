const { getPool, ensureSchema, getClientIp } = require('./_db');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
  try {
    await ensureSchema();
    const body = req.body || {};
    const nome = String(body.nome || '').trim().slice(0, 200);
    const whatsapp = String(body.whatsapp || '').trim().slice(0, 40);
    const cidade = String(body.cidade || '').trim().slice(0, 200);
    const mensagem = String(body.mensagem || '').trim().slice(0, 4000);
    if (!nome || !mensagem) return res.status(400).json({ error: 'Nome e mensagem são obrigatórios.' });
    const ip = getClientIp(req);
    await getPool().query(
      'INSERT INTO leads (nome, whatsapp, cidade, mensagem, ip) VALUES ($1,$2,$3,$4,$5)',
      [nome, whatsapp || null, cidade || null, mensagem, ip]
    );
    res.status(201).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
