const { getPool, ensureSchema } = require('./_db');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });
  try {
    await ensureSchema();
    // só entram lideranças com pelo menos 1 apoiador de verdade cadastrado
    // por elas — o JOIN (em vez de LEFT JOIN) já exclui sozinho quem está zerado
    const { rows } = await getPool().query(`
      SELECT l.id, l.nome, l.bairro, count(a.id)::int AS apoiadores
      FROM liderancas l
      JOIN apoiadores a ON a.indicado_por_id = l.id
      GROUP BY l.id, l.nome, l.bairro
      ORDER BY apoiadores DESC, l.nome ASC
    `);
    res.status(200).json({ ranking: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
