import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: resolve(fileURLToPath(new URL('.', import.meta.url)), 'index.html'),
        app: resolve(fileURLToPath(new URL('.', import.meta.url)), 'app.html'),
        tutorial: resolve(fileURLToPath(new URL('.', import.meta.url)), 'tutorial.html'),
        acknowledgments: resolve(fileURLToPath(new URL('.', import.meta.url)), 'acknowledgments.html'),
        privacy: resolve(fileURLToPath(new URL('.', import.meta.url)), 'privacy.html'),
        terms: resolve(fileURLToPath(new URL('.', import.meta.url)), 'terms.html'),
        gpxDownloadGuide: resolve(fileURLToPath(new URL('.', import.meta.url)), 'gpx-download-guide.html')
      },
      output: {
        manualChunks: {
          'maplibre': ['maplibre-gl'],
          'three': ['three'],
          'turf': ['@turf/turf']
        }
      }
    }
  },
  server: {
    port: 3000,
    open: true
  },
  optimizeDeps: {
    include: ['maplibre-gl', 'three', '@turf/turf']
  },
  plugins: [
    {
      name: 'dev-api',
      configureServer(server) {
        const parseJson = (req) => new Promise((resolve) => {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', () => {
            try { resolve(JSON.parse(body || '{}')); } catch { resolve({}); }
          });
        });
        const send = (res, code, obj) => {
          res.statusCode = code;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify(obj));
        };
        const handleOptions = (req, res) => {
          res.statusCode = 204;
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
          res.end();
        };
        server.middlewares.use('/api/strava/token', async (req, res, next) => {
          if (req.method === 'OPTIONS') return handleOptions(req, res);
          if (req.method !== 'POST') return next();
          const { code, redirectUri } = await parseJson(req);
          const client_id = process.env.STRAVA_CLIENT_ID || process.env.VITE_STRAVA_CLIENT_ID;
          const client_secret = process.env.STRAVA_CLIENT_SECRET || process.env.VITE_STRAVA_CLIENT_SECRET;
          if (!client_id || !client_secret) return send(res, 500, { error: 'Missing STRAVA_CLIENT_ID/SECRET in env' });
          try {
            console.log('[dev] Strava token exchange start', { hasCode: !!code, redirectUri, clientIdLen: String(client_id).length });
            const params = new URLSearchParams();
            params.set('client_id', client_id);
            params.set('client_secret', client_secret);
            params.set('code', code || '');
            params.set('grant_type', 'authorization_code');
            if (redirectUri) params.set('redirect_uri', redirectUri);
            const resp = await fetch('https://www.strava.com/oauth/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: params.toString()
            });
            const raw = await resp.text();
            let data = {};
            try { data = JSON.parse(raw); } catch {}
            if (!resp.ok) {
              console.error('[dev] Strava token exchange failed', resp.status, raw);
              return send(res, resp.status, { error: data?.message || raw || 'Token exchange failed' });
            }
            return send(res, 200, {
              access_token: data.access_token,
              refresh_token: data.refresh_token,
              expires_at: data.expires_at,
              athlete: data.athlete
            });
          } catch (e) {
            console.error('[dev] Strava token exchange error', e);
            return send(res, 500, { error: 'Server error' });
          }
        });
        server.middlewares.use('/api/strava/refresh', async (req, res, next) => {
          if (req.method === 'OPTIONS') return handleOptions(req, res);
          if (req.method !== 'POST') return next();
          const { refresh_token } = await parseJson(req);
          const client_id = process.env.STRAVA_CLIENT_ID || process.env.VITE_STRAVA_CLIENT_ID;
          const client_secret = process.env.STRAVA_CLIENT_SECRET || process.env.VITE_STRAVA_CLIENT_SECRET;
          if (!client_id || !client_secret) return send(res, 500, { error: 'Missing STRAVA_CLIENT_ID/SECRET in env' });
          try {
            const params = new URLSearchParams();
            params.set('client_id', client_id);
            params.set('client_secret', client_secret);
            params.set('refresh_token', refresh_token || '');
            params.set('grant_type', 'refresh_token');
            const resp = await fetch('https://www.strava.com/oauth/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: params.toString()
            });
            const raw = await resp.text();
            let data = {};
            try { data = JSON.parse(raw); } catch {}
            if (!resp.ok) {
              console.error('[dev] Strava refresh failed', resp.status, raw);
              return send(res, resp.status, { error: data?.message || raw || 'Refresh failed' });
            }
            return send(res, 200, {
              access_token: data.access_token,
              refresh_token: data.refresh_token,
              expires_at: data.expires_at
            });
          } catch (e) {
            console.error('[dev] Strava refresh error', e);
            return send(res, 500, { error: 'Server error' });
          }
        });
        server.middlewares.use('/api/strava/deauthorize', async (req, res, next) => {
          if (req.method === 'OPTIONS') return handleOptions(req, res);
          if (req.method !== 'POST') return next();
          const { access_token } = await parseJson(req);
          try {
            const resp = await fetch('https://www.strava.com/oauth/deauthorize', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${access_token || ''}` }
            });
            if (!resp.ok) {
              const data = await resp.json().catch(() => ({}));
              return send(res, resp.status, { error: data?.message || 'Deauthorize failed' });
            }
            return send(res, 200, { ok: true });
          } catch (e) {
            return send(res, 500, { error: 'Server error' });
          }
        });

        // Feedback endpoint for dev
        server.middlewares.use('/api/contact', async (req, res, next) => {
          if (req.method === 'OPTIONS') return handleOptions(req, res);
          if (req.method !== 'POST') return next();
          const { name = '', email = '', message = '', website = '', meta = {} } = await parseJson(req);
          if (website) return send(res, 200, { ok: true });
          if (!message || String(message).trim().length < 5) return send(res, 400, { error: 'Invalid message' });
          const RESEND_API_KEY = process.env.RESEND_API_KEY;
          const TO_EMAIL = process.env.FEEDBACK_TO_EMAIL || 'alexalmansa5@gmail.com';
          const from = 'TrailReplay Feedback <feedback@trailreplay.com>';
          if (!RESEND_API_KEY) {
            console.warn('[dev] RESEND_API_KEY not set, simulating email send. Payload:', { name, email, message, meta });
            return send(res, 200, { ok: true, simulated: true });
          }
          try {
            const resp = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                from,
                to: [TO_EMAIL],
                subject: `New TrailReplay feedback from ${name || 'Anonymous'}`,
                text: `Name: ${name || 'Anonymous'}\nEmail: ${email || 'N/A'}\nPath: ${meta?.path || '/'}; UA: ${(meta?.ua || '').slice(0, 300)}\n\n${message}`,
                reply_to: email || undefined
              })
            });
            if (!resp.ok) {
              const data = await resp.json().catch(() => ({}));
              return send(res, 502, { error: data?.message || 'Email send failed' });
            }
            return send(res, 200, { ok: true });
          } catch (e) {
            return send(res, 500, { error: 'Server error' });
          }
        });
      }
    }
  ]
}); 
