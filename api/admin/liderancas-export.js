const { getPool } = require('../_db');
const { isAuthenticated } = require('../_auth');

function buildFiltro(query) {
  const where = [];
  const params = [];
  const q = String(query.q || '').trim();
  if (q) {
    params.push('%' + q + '%');
    where.push(`(nome ILIKE $${params.length} OR numero ILIKE $${params.length} OR bairro ILIKE $${params.length} OR nome_mae ILIKE $${params.length} OR endereco ILIKE $${params.length})`);
  }
  const from = String(query.from || '').trim();
  if (from) {
    params.push(from);
    where.push(`criado_em >= $${params.length}::date`);
  }
  const to = String(query.to || '').trim();
  if (to) {
    params.push(to);
    where.push(`criado_em < ($${params.length}::date + interval '1 day')`);
  }
  return { whereSql: where.length ? 'WHERE ' + where.join(' AND ') : '', params };
}

function csvField(v) {
  const s = v === null || v === undefined ? '' : String(v);
  return '"' + s.replace(/"/g, '""') + '"';
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'não autenticado' });
  try {
    const { whereSql, params } = buildFiltro(req.query);
    const { rows } = await getPool().query(
      `SELECT nome, numero, bairro, nome_mae, data_nascimento, endereco, criado_em FROM liderancas ${whereSql} ORDER BY criado_em DESC`,
      params
    );

    const header = ['Nome', 'WhatsApp', 'Bairro', 'Nome da mãe', 'Data de nascimento', 'Endereço', 'Data'].map(csvField).join(';');
    const linhas = rows.map(l => [
      l.nome, l.numero, l.bairro, l.nome_mae,
      l.data_nascimento ? new Date(l.data_nascimento).toLocaleDateString('pt-BR') : '',
      l.endereco,
      new Date(l.criado_em).toLocaleString('pt-BR'),
    ].map(csvField).join(';'));

    const csv = '﻿' + [header, ...linhas].join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="liderancas.csv"');
    res.status(200).send(csv);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
