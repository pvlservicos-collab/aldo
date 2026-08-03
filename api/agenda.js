const { getPool, ensureSchema } = require('./_db');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });
  try {
    await ensureSchema();
    const { rows } = await getPool().query(
      `SELECT titulo, to_char(data,'YYYY-MM-DD') AS data, hora, duracao, local, obs, criado_por
       FROM agenda_publica ORDER BY data, hora`
    );
    res.status(200).json({ itens: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
