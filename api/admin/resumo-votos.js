const { getPool } = require('../_db');
const { isAuthenticated } = require('../_auth');

// mesma normalização usada no mapa.html — sem isso, "Novo Horizonte",
// "NOVO HORIZONTE" e "Novo horizonte" contavam como 3 bairros diferentes
function normBairro(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'não autenticado' });
  try {
    const [liderancasRes, eleitoresRes, bairrosRes] = await Promise.all([
      getPool().query('SELECT count(*)::int AS n FROM liderancas'),
      getPool().query('SELECT count(*)::int AS n FROM eleitores'),
      getPool().query("SELECT bairro FROM liderancas WHERE bairro IS NOT NULL AND bairro <> ''"),
    ]);
    const liderancas = liderancasRes.rows[0].n;
    const eleitoresIndividuais = eleitoresRes.rows[0].n;
    const bairrosNormalizados = new Set(bairrosRes.rows.map(r => normBairro(r.bairro)).filter(Boolean));
    const bairros = bairrosNormalizados.size;
    const votosPrevistos = liderancas * 30 + eleitoresIndividuais;
    res.status(200).json({ liderancas, eleitoresIndividuais, bairros, votosPrevistos });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
