const { getPool, ensureSchema, getClientIp } = require('../_db');
const { isAuthenticated } = require('../_auth');

module.exports = async (req, res) => {
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'não autenticado' });
  try {
    await ensureSchema();
    const mine = getClientIp(req);

    if (req.method === 'GET') {
      const { rows } = await getPool().query('SELECT ip FROM ignored_ips ORDER BY criado_em');
      return res.status(200).json({ mine, ignored: rows.map(r => r.ip) });
    }

    if (req.method === 'POST') {
      await getPool().query('INSERT INTO ignored_ips (ip) VALUES ($1) ON CONFLICT (ip) DO NOTHING', [mine]);
      return res.status(201).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const ip = String(req.query.ip || '');
      if (!ip) return res.status(400).json({ error: 'ip inválido' });
      await getPool().query('DELETE FROM ignored_ips WHERE ip = $1', [ip]);
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Método não permitido' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
