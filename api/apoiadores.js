const { getPool, ensureSchema, getClientIp } = require('./_db');

function normalizarNumero(s) {
  return String(s || '').replace(/\D/g, '');
}

const CAMPOS_APOIADOR = `id, nome, numero, bairro, nome_mae, to_char(data_nascimento,'YYYY-MM-DD') AS data_nascimento, endereco`;

function paraResposta(a) {
  return { id: a.id, nome: a.nome, numero: a.numero, bairro: a.bairro, mae: a.nome_mae, nascimento: a.data_nascimento, endereco: a.endereco };
}

module.exports = async (req, res) => {
  try {
    await ensureSchema();

    if (req.method === 'GET') {
      // verificação de duplicidade: o nome ou o WhatsApp digitados já batem com
      // algum cadastro existente? só dispara com nome exato ou número com pelo
      // menos 8 dígitos, pra não confundir gente ainda digitando o formulário
      const nome = String(req.query.nome || '').trim();
      const numeroNorm = normalizarNumero(req.query.numero);
      const condicoes = [];
      const params = [];
      if (numeroNorm.length >= 8) {
        params.push(numeroNorm);
        condicoes.push(`regexp_replace(numero, '\\D', '', 'g') = $${params.length}`);
      }
      if (nome) {
        params.push(nome.toLowerCase());
        condicoes.push(`lower(trim(nome)) = $${params.length}`);
      }
      if (!condicoes.length) return res.status(200).json({ encontrado: false });

      const { rows } = await getPool().query(
        `SELECT ${CAMPOS_APOIADOR} FROM apoiadores WHERE ${condicoes.join(' OR ')} ORDER BY criado_em DESC LIMIT 1`,
        params
      );
      if (!rows.length) return res.status(200).json({ encontrado: false });
      return res.status(200).json({ encontrado: true, apoiador: paraResposta(rows[0]) });
    }

    if (req.method === 'PUT') {
      // edição feita pelo próprio apoiador (via caixinha "já é cadastrado?") —
      // só autoriza se ele souber o nome OU o WhatsApp que já estava no
      // cadastro original, senão qualquer um poderia alterar dados só
      // adivinhando o id (que é sequencial)
      const body = req.body || {};
      const id = Number(body.id);
      const chaveNumero = normalizarNumero(body.chaveNumero);
      const chaveNome = String(body.chaveNome || '').trim().toLowerCase();
      if (!id || (!chaveNumero && !chaveNome)) {
        return res.status(400).json({ error: 'Não foi possível confirmar o cadastro original.' });
      }
      const nome = String(body.nome || '').trim().slice(0, 200);
      const numero = String(body.numero || '').trim().slice(0, 40);
      const bairro = String(body.bairro || '').trim().slice(0, 200);
      const mae = String(body.mae || '').trim().slice(0, 200);
      const nascimento = String(body.nascimento || '').trim().slice(0, 10);
      const endereco = String(body.endereco || '').trim().slice(0, 300);
      if (!nome || !numero || !bairro || !mae || !nascimento || !endereco) {
        return res.status(400).json({ error: 'Nome, WhatsApp, bairro, nome da mãe, data de nascimento e endereço são obrigatórios.' });
      }
      const r = await getPool().query(
        `UPDATE apoiadores SET nome=$1, numero=$2, bairro=$3, nome_mae=$4, data_nascimento=$5, endereco=$6
         WHERE id = $7 AND (
           ($8 <> '' AND regexp_replace(numero, '\\D', '', 'g') = $8) OR
           ($9 <> '' AND lower(trim(nome)) = $9)
         ) RETURNING id`,
        [nome, numero, bairro, mae, nascimento, endereco, id, chaveNumero, chaveNome]
      );
      if (!r.rows.length) return res.status(403).json({ error: 'Não foi possível confirmar que esse cadastro é seu.' });
      return res.status(200).json({ ok: true });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

    const body = req.body || {};
    const nome = String(body.nome || '').trim().slice(0, 200);
    const numero = String(body.numero || '').trim().slice(0, 40);
    const bairro = String(body.bairro || '').trim().slice(0, 200);
    const mae = String(body.mae || '').trim().slice(0, 200);
    const nascimento = String(body.nascimento || '').trim().slice(0, 10);
    const endereco = String(body.endereco || '').trim().slice(0, 300);
    const indicadoPor = String(body.indicadoPor || '').trim().slice(0, 200);
    const indicadoPorId = Number(body.indicadoPorId) || null;
    if (!nome || !numero || !bairro || !mae || !nascimento || !endereco) {
      return res.status(400).json({ error: 'Nome, WhatsApp, bairro, nome da mãe, data de nascimento e endereço são obrigatórios.' });
    }

    // trava de segurança contra duplicata mesmo se o aviso do formulário for
    // burlado (JS desativado, requisição direta etc.) — só bloqueia por
    // WhatsApp igual, porque nome repetido sozinho é comum e não é prova de
    // que seja a mesma pessoa
    const numeroNorm = normalizarNumero(numero);
    if (numeroNorm.length >= 8) {
      const existente = await getPool().query(
        `SELECT ${CAMPOS_APOIADOR} FROM apoiadores WHERE regexp_replace(numero, '\\D', '', 'g') = $1 ORDER BY criado_em DESC LIMIT 1`,
        [numeroNorm]
      );
      if (existente.rows.length) {
        return res.status(409).json({ error: 'Já existe um cadastro com esse WhatsApp.', apoiador: paraResposta(existente.rows[0]) });
      }
    }

    const ip = getClientIp(req);
    await getPool().query(
      'INSERT INTO apoiadores (nome, numero, bairro, nome_mae, data_nascimento, endereco, ip, indicado_por, indicado_por_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [nome, numero, bairro, mae, nascimento, endereco, ip, indicadoPor || null, indicadoPorId]
    );
    res.status(201).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
