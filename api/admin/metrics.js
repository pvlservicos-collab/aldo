const { getPool, ensureSchema } = require('../_db');
const { isAuthenticated } = require('../_auth');

const DAYS_BY_PERIOD = { hoje: 1, '7d': 7, '30d': 30 };

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'não autenticado' });
  try {
    await ensureSchema();
    const period = String(req.query.period || '7d');
    const days = DAYS_BY_PERIOD[period] || 7;

    const { rows } = await getPool().query(
      `WITH dias AS (
         SELECT generate_series(
           (CURRENT_DATE - ($1::int - 1) * interval '1 day')::date,
           CURRENT_DATE, interval '1 day'
         )::date AS dia
       ),
       visitas AS (
         SELECT date_trunc('day', criado_em)::date AS dia, count(*) AS n
         FROM page_views
         WHERE criado_em >= CURRENT_DATE - ($1::int - 1) * interval '1 day'
           AND ip NOT IN (SELECT ip FROM ignored_ips)
         GROUP BY 1
       ),
       leads_dia AS (
         SELECT date_trunc('day', criado_em)::date AS dia, count(*) AS n
         FROM leads
         WHERE criado_em >= CURRENT_DATE - ($1::int - 1) * interval '1 day'
           AND (ip IS NULL OR ip NOT IN (SELECT ip FROM ignored_ips))
         GROUP BY 1
       )
       SELECT dias.dia, COALESCE(visitas.n,0) AS site_view, COALESCE(leads_dia.n,0) AS leads
       FROM dias
       LEFT JOIN visitas ON visitas.dia = dias.dia
       LEFT JOIN leads_dia ON leads_dia.dia = dias.dia
       ORDER BY dias.dia`,
      [days]
    );

    const serie = rows.map(r => ({
      data: r.dia.toISOString().slice(0, 10),
      site_view: Number(r.site_view),
      leads: Number(r.leads),
    }));
    const site_view = serie.reduce((s, r) => s + r.site_view, 0);
    const leads = serie.reduce((s, r) => s + r.leads, 0);

    res.status(200).json({ site_view, leads, serie });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
