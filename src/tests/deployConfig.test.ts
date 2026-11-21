import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

const REPO_ROOT = path.resolve(__dirname, '../..');

const DEPLOY_FILES = [
  'Dockerfile',
  '.dockerignore',
  'docker/nginx.conf',
  'deploy/docker-compose.yml',
  'deploy/nginx-vhost-http.conf',
  'deploy/nginx-vhost.conf',
  '.github/workflows/docker-publish.yml',
] as const;

function readRepoFile(relPath: string): string {
  const fullPath = path.join(REPO_ROOT, relPath);
  expect(fs.existsSync(fullPath), `Missing expected deploy file: ${relPath}`).toBe(true);
  return fs.readFileSync(fullPath, 'utf8');
}

describe('Docker, GHCR CI & VPS Deployment Configuration (SPEC-008 T1)', () => {
  it('R1/U1: Dockerfile uses multi-stage node:24-alpine -> nginx:1.27-alpine non-root port 8080 with /healthz', () => {
    const dockerfile = readRepoFile('Dockerfile');

    expect(dockerfile).toMatch(/^FROM\s+node:24-alpine\s+AS\s+builder/im);
    expect(dockerfile).toMatch(/pnpm@12\.14\.0/);
    expect(dockerfile).toMatch(/pnpm\s+install\s+--frozen-lockfile/);
    expect(dockerfile).toMatch(/pnpm\s+build/);
    expect(dockerfile).toMatch(/^FROM\s+nginx:1\.27-alpine/im);
    expect(dockerfile).toMatch(/COPY\s+docker\/nginx\.conf\s+\/etc\/nginx\/nginx\.conf/);
    expect(dockerfile).toMatch(/COPY\s+--from=builder\s+--chown=nginx:nginx\s+\/app\/dist\s+\/usr\/share\/nginx\/html/);
    expect(dockerfile).toMatch(/^USER\s+nginx$/m);
    expect(dockerfile).toMatch(/^EXPOSE\s+8080$/m);
    expect(dockerfile).toMatch(/^HEALTHCHECK[\s\S]*http:\/\/127\.0\.0\.1:8080\/healthz/m);
  });

  it('R1/R3.b/U2: .dockerignore excludes build artifacts, tests, deploy configs, macOS clutter, and env secrets', () => {
    const dockerignore = readRepoFile('.dockerignore');
    const lines = dockerignore
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#'));

    const requiredExcludes = [
      'node_modules',
      'dist',
      'dist-ssr',
      '.git',
      '.github',
      'deploy',
      'e2e',
      'test-results',
      'playwright-report',
      'coverage',
      '.pnpm-store',
      '.vite',
      '*.tsbuildinfo',
      '.DS_Store',
      '.env*',
    ];

    for (const pattern of requiredExcludes) {
      expect(lines, `.dockerignore missing exclusion: ${pattern}`).toContain(pattern);
    }
  });

  it('R1/R1.a/R1.b: docker/nginx.conf supports read-only filesystem, SPA fallback, gzip, cache rules, and retains all 3 security headers in every location with add_header', () => {
    const nginxConf = readRepoFile('docker/nginx.conf');

    // Read-only filesystem paths & container stdio logging
    expect(nginxConf).toMatch(/pid\s+\/tmp\/nginx\.pid;/);
    expect(nginxConf).toMatch(/client_body_temp_path\s+\/tmp\/client_temp;/);
    expect(nginxConf).toMatch(/proxy_temp_path\s+\/tmp\/proxy_temp;/);
    expect(nginxConf).toMatch(/fastcgi_temp_path\s+\/tmp\/fastcgi_temp;/);
    expect(nginxConf).toMatch(/uwsgi_temp_path\s+\/tmp\/uwsgi_temp;/);
    expect(nginxConf).toMatch(/scgi_temp_path\s+\/tmp\/scgi_temp;/);
    expect(nginxConf).toMatch(/access_log\s+\/dev\/stdout/);
    expect(nginxConf).toMatch(/error_log\s+\/dev\/stderr/);

    // Unprivileged listener, relative redirects (no internal :8080 leak) & gzip
    expect(nginxConf).toMatch(/listen\s+8080;/);
    expect(nginxConf).not.toMatch(/listen\s+80;/);
    expect(nginxConf).toMatch(/absolute_redirect\s+off;/);
    expect(nginxConf).toMatch(/gzip\s+on;/);
    expect(nginxConf).toMatch(/application\/javascript/);

    // Healthcheck, SPA fallback & cache headers (long-TTL public caches MUST omit `always` so 404/5xx are never cached)
    expect(nginxConf).toMatch(/location\s+=\s*\/healthz\s*\{[\s\S]*?return\s+200\s+"ok\\n";/);
    expect(nginxConf).toMatch(/try_files\s+\$uri\s+\$uri\/\s+\/index\.html;/);
    expect(nginxConf).toMatch(/location\s+\^~\s+\/assets\/\s*\{[\s\S]*?add_header\s+Cache-Control\s+"public, max-age=31536000, immutable";/);
    expect(nginxConf).not.toMatch(/Cache-Control\s+"public,[^"]*"\s+always;/);
    expect(nginxConf).toMatch(/location\s+\^~\s+\/textures\/\s*\{[\s\S]*?add_header\s+Cache-Control\s+"public, max-age=2592000";/);

    // Security headers must be present at server level AND repeated in every location block that uses add_header
    const requiredSecurityHeaders = [
      /add_header\s+X-Content-Type-Options\s+"nosniff"\s+always;/,
      /add_header\s+X-Frame-Options\s+"SAMEORIGIN"\s+always;/,
      /add_header\s+Referrer-Policy\s+"strict-origin-when-cross-origin"\s+always;/,
    ];

    for (const hdr of requiredSecurityHeaders) {
      expect(nginxConf).toMatch(hdr);
    }

    const locationBlocks = nginxConf.match(/location[^{]*\{[^}]*\}/g) ?? [];
    expect(locationBlocks.length).toBeGreaterThanOrEqual(4);

    for (const block of locationBlocks) {
      if (/add_header\s+/.test(block)) {
        for (const hdr of requiredSecurityHeaders) {
          expect(block, `location block with add_header dropped security header:\n${block}`).toMatch(hdr);
        }
      }
    }
  });

  it('R2/R2.b/R3.a: GitHub Actions workflow pins Node 24 + pnpm 12.14.0 in verify and gates linux/amd64 GHCR push via needs: verify', () => {
    const workflow = readRepoFile('.github/workflows/docker-publish.yml');

    expect(workflow).toMatch(/branches:\s*\n\s*-\s*main|branches:\s*\[\s*main\s*\]/);
    expect(workflow).toMatch(/workflow_dispatch:/);
    expect(workflow).toMatch(/verify:/);
    expect(workflow).toMatch(/actions\/setup-node@v4/);
    expect(workflow).toMatch(/node-version:\s*['"]?24['"]?/);
    expect(workflow).toMatch(/pnpm\/action-setup@v4/);
    expect(workflow).toMatch(/version:\s*['"]?12\.14\.0['"]?/);
    expect(workflow).toMatch(/pnpm\s+install\s+--frozen-lockfile/);
    expect(workflow).toMatch(/pnpm\s+typecheck/);
    expect(workflow).toMatch(/pnpm\s+lint/);
    expect(workflow).toMatch(/pnpm\s+test/);

    expect(workflow).toMatch(/build-and-push:/);
    expect(workflow).toMatch(/needs:\s*verify/);
    expect(workflow).toMatch(/contents:\s*read/);
    expect(workflow).toMatch(/packages:\s*write/);
    expect(workflow).toMatch(/registry:\s*ghcr\.io/);
    expect(workflow).toMatch(/secrets\.GITHUB_TOKEN/);
    expect(workflow).toMatch(/ghcr\.io\/lucasvu1302\/universe-engine/);
    expect(workflow).toMatch(/platforms:\s*linux\/amd64/);
    expect(workflow).toMatch(/type=sha,prefix=sha-/);
    expect(workflow).toMatch(/type=raw,value=latest/);
  });

  it('R3/R3.a/U1: deploy/docker-compose.yml runs hardened loopback-only container pulling GHCR latest', () => {
    const compose = readRepoFile('deploy/docker-compose.yml');

    expect(compose).toMatch(/image:\s*ghcr\.io\/lucasvu1302\/universe-engine:latest/);
    expect(compose).toMatch(/container_name:\s*universe-engine/);
    expect(compose).toMatch(/restart:\s*unless-stopped/);
    expect(compose).toMatch(/["']127\.0\.0\.1:18210:8080["']/);
    expect(compose).toMatch(/read_only:\s*true/);
    expect(compose).toMatch(/tmpfs:\s*\n\s*-\s*\/tmp\s*\n\s*-\s*\/var\/cache\/nginx/);
    expect(compose).toMatch(/no-new-privileges:true/);
    expect(compose).toMatch(/cap_drop:\s*\n\s*-\s*ALL/);
    expect(compose).toMatch(/driver:\s*json-file/);
    expect(compose).toMatch(/max-size:\s*["']10m["']/);
    expect(compose).toMatch(/max-file:\s*["']3["']/);
    expect(compose).not.toMatch(/env_file:/);
  });

  it('R3/R3.a/R4.b: deploy/nginx-vhost-http.conf is a safe Phase 1 HTTP-only bootstrap without ssl_certificate', () => {
    const httpVhost = readRepoFile('deploy/nginx-vhost-http.conf');

    expect(httpVhost).toMatch(/listen\s+80;/);
    expect(httpVhost).toMatch(/listen\s+\[::\]:80;/);
    expect(httpVhost).toMatch(/server_name\s+universe\.lucasvu\.io\.vn;/);
    expect(httpVhost).toMatch(/location\s+\/\.well-known\/acme-challenge\/\s*\{[\s\S]*?root\s+\/var\/www\/certbot;/);
    expect(httpVhost).toMatch(/proxy_pass\s+http:\/\/127\.0\.0\.1:18210;/);
    expect(httpVhost).not.toMatch(/ssl_certificate/);
    expect(httpVhost).not.toMatch(/listen\s+443/);
  });

  it('R3/R3.a: deploy/nginx-vhost.conf configures HTTPS TLS 1.2/1.3, Cloudflare real-IP, and avoids duplicating container security headers', () => {
    const httpsVhost = readRepoFile('deploy/nginx-vhost.conf');

    expect(httpsVhost).toMatch(/server_name\s+universe\.lucasvu\.io\.vn;/);
    expect(httpsVhost).toMatch(/return\s+301\s+https:\/\/\$host\$request_uri;/);
    expect(httpsVhost).toMatch(/listen\s+443\s+ssl;/);
    expect(httpsVhost).toMatch(/http2\s+on;/);
    expect(httpsVhost).toMatch(/ssl_certificate\s+\/etc\/letsencrypt\/live\/universe\.lucasvu\.io\.vn\/fullchain\.pem;/);
    expect(httpsVhost).toMatch(/ssl_certificate_key\s+\/etc\/letsencrypt\/live\/universe\.lucasvu\.io\.vn\/privkey\.pem;/);
    expect(httpsVhost).toMatch(/ssl_protocols\s+TLSv1\.2\s+TLSv1\.3;/);
    expect(httpsVhost).toMatch(/set_real_ip_from\s+173\.245\.48\.0\/20;/);
    expect(httpsVhost).toMatch(/set_real_ip_from\s+2c0f:f248::\/32;/);
    expect(httpsVhost).toMatch(/real_ip_header\s+CF-Connecting-IP;/);
    expect(httpsVhost).toMatch(/proxy_pass\s+http:\/\/127\.0\.0\.1:18210;/);

    // Container owns security headers so edge proxy must not duplicate them
    expect(httpsVhost).not.toMatch(/X-Content-Type-Options/i);
    expect(httpsVhost).not.toMatch(/X-Frame-Options/i);
    expect(httpsVhost).not.toMatch(/Referrer-Policy/i);
  });

  it('R3.b (neg): none of the 7 deploy or CI files leak secrets or expose 0.0.0.0:18210', () => {
    const forbiddenPatterns = [
      /ghp_[A-Za-z0-9]{20,}/,
      /github_pat_[A-Za-z0-9_]{20,}/,
      /AKIA[0-9A-Z]{16}/,
      /BEGIN\s+(RSA|EC|OPENSSH|PRIVATE)\s+KEY/,
      /0\.0\.0\.0:18210/,
      /(?<![A-Z0-9_])(PAT|TOKEN|PASSWORD)\s*[:=]\s*['"]?[A-Za-z0-9_-]{12,}/,
    ];

    for (const relPath of DEPLOY_FILES) {
      const content = readRepoFile(relPath);
      for (const pattern of forbiddenPatterns) {
        expect(content, `Forbidden pattern ${pattern} matched in ${relPath}`).not.toMatch(pattern);
      }
    }
  });
});
