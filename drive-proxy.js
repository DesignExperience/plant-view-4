export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query;
  if (!id || !/^[a-zA-Z0-9_-]{10,}$/.test(id)) {
    return res.status(400).json({ error: 'ID invalido' });
  }

  const urls = [
    `https://drive.google.com/uc?export=download&id=${id}&confirm=t`,
    `https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`,
  ];

  for (const driveUrl of urls) {
    try {
      const response = await fetch(driveUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PlantView/1.0)' },
        redirect: 'follow',
      });
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        const html = await response.text();
        if (html.includes('Sign in') || html.includes('accounts.google')) {
          return res.status(403).json({ error: 'Archivo no publico.' });
        }
        const confirmMatch = html.match(/confirm=([0-9A-Za-z_-]+)/);
        if (confirmMatch) {
          const r2 = await fetch(
            `https://drive.google.com/uc?export=download&id=${id}&confirm=${confirmMatch[1]}`,
            { headers: { 'User-Agent': 'Mozilla/5.0' }, redirect: 'follow' }
          );
          if (r2.ok) {
            const buf = await r2.arrayBuffer();
            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Cache-Control', 'public, max-age=3600');
            return res.send(Buffer.from(buf));
          }
        }
        continue;
      }
      if (!response.ok) continue;
      const buffer = await response.arrayBuffer();
      res.setHeader('Content-Type', contentType || 'application/octet-stream');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.send(Buffer.from(buffer));
    } catch (e) { continue; }
  }
  return res.status(502).json({ error: 'No se pudo descargar el archivo de Drive.' });
}
