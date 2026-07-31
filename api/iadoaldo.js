// GET público: devolve a conversa da IA do Aldo (o que foi salvo no painel,
// ou o conteúdo padrão enquanto nada foi salvo).

const { getPool, ensureSchema } = require('./_db');
const { DEFAULT_CONFIG, sanitizeConfig } = require('./_iadoaldo');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });
  res.setHeader('Cache-Control', 'no-store'); // editou no painel = já vale na página
  try {
    await ensureSchema();
    const { rows } = await getPool().query('SELECT data FROM iadoaldo_config WHERE id = 1');
    const cfg = rows.length ? sanitizeConfig(rows[0].data) : DEFAULT_CONFIG;
    return res.status(200).json({ config: cfg });
  } catch (e) {
    // banco fora do ar não pode derrubar a página: entrega o padrão
    return res.status(200).json({ config: DEFAULT_CONFIG, aviso: 'usando conteúdo padrão (' + e.message + ')' });
  }
};
