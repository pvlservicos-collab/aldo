const { getPool, ensureSchema, getClientIp } = require('./_db');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
  try {
    await ensureSchema();
    const body = req.body || {};
    const path = String(body.path || '/').slice(0, 300);
    const referrer = body.referrer ? String(body.referrer).slice(0, 300) : null;
    const ip = getClientIp(req);
    await getPool().query(
      'INSERT INTO page_views (path, referrer, ip) VALUES ($1,$2,$3)',
      [path, referrer, ip]
    );
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
