/**
 * Cloudflare Pages Function: forwards /idc-library/* to the Spring Boot backend, so the portal and its API
 * share one address (no CORS, same as the dev proxy in proxy.conf.json).
 * Set BACKEND_URL in wrangler.toml [vars], e.g. https://library-qwyt.onrender.com (no trailing slash).
 * PROXY_KEY (a Pages secret, never in git) is sent as X-Proxy-Key; with APP_PROXY_KEY set to the same value the
 * backend refuses anything that didn't come through here.
 */
export async function onRequest({ request, env }) {
  if (!env.BACKEND_URL) {
    return new Response('BACKEND_URL is not set', { status: 500 });
  }
  const url = new URL(request.url);
  const target = env.BACKEND_URL + url.pathname + url.search;

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.set('X-Forwarded-For', request.headers.get('CF-Connecting-IP') ?? '');
  headers.set('X-Forwarded-Proto', 'https');
  headers.set('X-Forwarded-Host', url.host);
  headers.delete('X-Proxy-Key');
  if (env.PROXY_KEY) headers.set('X-Proxy-Key', env.PROXY_KEY);

  return fetch(target, {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    redirect: 'manual',
  });
}
