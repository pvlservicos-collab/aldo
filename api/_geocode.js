// Geocodifica endereço + bairro via Nominatim (OpenStreetMap), filtrando
// resultados fora de Macapá. Usado tanto no cadastro público (api/lideranca.js)
// quanto no script de reparo (scripts/geocode-liderancas.js), pra ter uma
// única lógica de geocodificação em vez de duas cópias divergentes.

const BOUNDS = { latMin: -0.2, latMax: 0.42, lngMin: -51.4, lngMax: -50.9 };
function dentroDosLimites(lat, lng) {
  return lat >= BOUNDS.latMin && lat <= BOUNDS.latMax && lng >= BOUNDS.lngMin && lng <= BOUNDS.lngMax;
}

function limpa(s) {
  return String(s || '').replace(/\s+/g, ' ').trim();
}

async function consultaNominatim(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=3&countrycodes=br&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'AldoMauricioMapaLiderancas/1.0 (uso interno)' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const bons = data.filter(r => dentroDosLimites(Number(r.lat), Number(r.lon)));
  return bons[0] || null;
}

async function geocodeEnderecoBairro(endereco, bairro) {
  const end = limpa(endereco);
  const bai = limpa(bairro);
  if (!end || !bai) return null;
  const tentativas = [
    `${end}, ${bai}, Macapá, Amapá, Brasil`,
    `${end}, Macapá, Amapá, Brasil`,
    `${bai}, Macapá, Amapá, Brasil`,
  ];
  for (const query of tentativas) {
    try {
      const r = await consultaNominatim(query);
      if (r) return { lat: Number(r.lat), lng: Number(r.lon) };
    } catch {
      // tenta a próxima estratégia
    }
  }
  return null;
}

module.exports = { geocodeEnderecoBairro };
