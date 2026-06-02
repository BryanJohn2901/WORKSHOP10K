/**
 * Build de produção — Workshop 10K
 * Gera dist/ estática pronta para Hostinger.
 */

const fs   = require('fs');
const path = require('path');
const { execSync }      = require('child_process');
const { minify: minifyHTML } = require('html-minifier-terser');
const { minify: minifyJS }   = require('terser');
const CleanCSS               = require('clean-css');
const { optimize: svgoOptimize } = require('svgo');
const sharp = require('sharp');

const ROOT        = __dirname;
const DIST        = path.join(ROOT, 'dist');
const DIST_CSS    = path.join(DIST, 'css');
const DIST_JS     = path.join(DIST, 'js');
const DIST_ASSETS = path.join(DIST, 'assets');
const SRC_ASSETS  = path.join(ROOT, 'assets');

const CANONICAL   = 'https://pos.personaltraineracademy.com.br/';
const DESCRIPTION = 'Workshop 100% online e ao vivo para personal trainers aprenderem a estruturar, vender e faturar os primeiros 10K com consultoria online.';

const TW_CONFIG = `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html'],
  theme: {
    extend: {
      spacing: { '88': '22rem' },
      colors: {
        brand: {
          bg: '#071F16',
          surface: '#0A2D20',
          primary: '#CD9B53',
          primaryHover: '#EBCE85',
          accent: '#B87A40',
          textPrimary: '#FFFFFF',
          textSecondary: '#D0D5DD',
          textMuted: '#98A2B3',
          darkgray: '#03110C',
          success: '#0CC143',
          border: 'rgba(255, 255, 255, 0.05)'
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        oswald: ['Oswald', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer':    'shimmer 2s infinite',
      },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } }
      }
    }
  },
  plugins: [],
};`;

const SEO_TAGS = `
    <meta name="description" content="${DESCRIPTION}">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${CANONICAL}">
    <meta property="og:type" content="website">
    <meta property="og:locale" content="pt_BR">
    <meta property="og:title" content="Workshop 10K com Consultoria Online">
    <meta property="og:description" content="${DESCRIPTION}">
    <meta property="og:image" content="${CANONICAL}assets/web3.webp">
    <meta property="og:url" content="${CANONICAL}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="Workshop 10K com Consultoria Online">
    <meta name="twitter:description" content="${DESCRIPTION}">
    <meta name="twitter:image" content="${CANONICAL}assets/web3.webp">
    <link rel="preconnect" href="https://unpkg.com">
    <link rel="preconnect" href="https://cdnjs.cloudflare.com">
    <link rel="dns-prefetch" href="https://hook.us1.make.com">
    <link rel="dns-prefetch" href="https://chk.eduzz.com">`;

function kb(bytes) { return (bytes / 1024).toFixed(1) + ' KB'; }

async function build() {
  console.log('\n🏗️  Workshop 10K — Build de Produção\n' + '─'.repeat(44));

  // ── 1. Estrutura de pastas ────────────────────────────────────────────────
  if (fs.existsSync(DIST)) fs.rmSync(DIST, { recursive: true });
  [DIST, DIST_CSS, DIST_JS, DIST_ASSETS].forEach(d => fs.mkdirSync(d, { recursive: true }));
  console.log('✔  dist/ criado\n');

  // ── 2. Lê HTML fonte ──────────────────────────────────────────────────────
  let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

  // ── 3. Pré-scan: detecta quais assets serão convertidos ───────────────────
  // SVGs com base64 embutido → WebP; PNGs → WebP
  const assetRemaps = {}; // { 'dourado.svg': 'dourado.webp', ... }
  for (const file of fs.readdirSync(SRC_ASSETS)) {
    const ext  = path.extname(file).toLowerCase();
    const base = path.basename(file, ext);
    if (ext === '.svg') {
      const raw = fs.readFileSync(path.join(SRC_ASSETS, file), 'utf8');
      if (raw.includes('base64')) assetRemaps[file] = base + '.webp';
    } else if (ext === '.png') {
      assetRemaps[file] = base + '.webp';
    }
  }

  // Aplica remaps no HTML ANTES de minificar
  for (const [from, to] of Object.entries(assetRemaps)) {
    html = html.replaceAll(from, to);
  }

  // ── 4. Extrai CSS inline → dist/css/style.css ────────────────────────────
  const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
  if (styleMatch) {
    const minCSS = new CleanCSS({ level: 2 }).minify(styleMatch[1]).styles;
    fs.writeFileSync(path.join(DIST_CSS, 'style.css'), minCSS);
    console.log('✔  style.css  —', kb(Buffer.byteLength(minCSS)));
    const heroFadeChecks = ['hero-mobile-visual', 'hero-mobile-fade', '#0a211a'];
    const missingHeroCss = heroFadeChecks.filter((token) => !minCSS.toLowerCase().includes(token));
    if (missingHeroCss.length) {
      throw new Error(`Build abortada: CSS do hero mobile incompleto (${missingHeroCss.join(', ')})`);
    }
    console.log('✔  hero mobile (fade #0A211A) — incluído em style.css');
  }
  html = html.replace(/<style>[\s\S]*?<\/style>/, '');

  // ── 5. Extrai scripts inline → dist/js/main.js ───────────────────────────
  const scripts = [];
  html = html.replace(/<script(?![^>]*\bsrc\b)[^>]*>([\s\S]*?)<\/script>/g, (match, body) => {
    const trimmed = body.trim();
    if (!trimmed || trimmed.includes('tailwind.config')) return '';
    if (trimmed.includes('googletagmanager') || trimmed.includes('GTM-')) return match;
    scripts.push(trimmed);
    return '';
  });

  if (scripts.length) {
    const combined = scripts.join('\n;\n');
    const result = await minifyJS(combined, {
      compress: { passes: 2 },
      mangle:   { reserved: ['abrirPopup', 'fecharPopup', 'initWorkshopApp', 'buildRedirectUrl', 'buildWebhookUrl'] },
    });
    fs.writeFileSync(path.join(DIST_JS, 'main.js'), result.code);
    console.log('✔  main.js    —', kb(Buffer.byteLength(result.code)));
  }

  // ── 6. Remove Tailwind CDN do HTML ────────────────────────────────────────
  html = html.replace(/<script src="https:\/\/cdn\.tailwindcss\.com[^"]*"><\/script>/g, '');

  // ── 7. Gera CSS Tailwind purged via CLI ───────────────────────────────────
  console.log('\n⚙️  Tailwind CSS (purged + minified)...');
  const tmpConfig = path.join(ROOT, '_tw_config.js');
  const tmpInput  = path.join(ROOT, '_tw_input.css');
  fs.writeFileSync(tmpConfig, TW_CONFIG);
  fs.writeFileSync(tmpInput,  '@tailwind base;\n@tailwind components;\n@tailwind utilities;\n');
  try {
    execSync(
      `"${path.join(ROOT, 'node_modules', '.bin', 'tailwindcss')}" -c "${tmpConfig}" -i "${tmpInput}" -o "${path.join(DIST_CSS, 'tailwind.css')}" --minify`,
      { cwd: ROOT, stdio: 'inherit' }
    );
  } finally {
    fs.unlinkSync(tmpConfig);
    fs.unlinkSync(tmpInput);
  }
  console.log('✔  tailwind.css —', kb(fs.statSync(path.join(DIST_CSS, 'tailwind.css')).size));

  // ── 8. Injeta links CSS + script JS ───────────────────────────────────────
  html = html.replace(
    '</head>',
    '<link rel="stylesheet" href="css/tailwind.css"><link rel="stylesheet" href="css/style.css"></head>'
  );
  html = html.replace('</body>', '<script src="js/main.js"></script></body>');

  // ── 9. Lazy-loading em imagens below-the-fold ─────────────────────────────
  html = html
    .replace(/(<img src="assets\/rafael\.webp")/g, '$1 loading="lazy"')
    .replace(/(<img src="assets\/artur\.webp")/g,  '$1 loading="lazy"');

  // ── 10. SEO tags após </title> ────────────────────────────────────────────
  html = html.replace('</title>', `</title>${SEO_TAGS}`);

  // ── 11. Minifica HTML ─────────────────────────────────────────────────────
  const minHTML = await minifyHTML(html, {
    removeComments:            true,
    collapseWhitespace:        true,
    removeRedundantAttributes: true,
    removeEmptyAttributes:     false,
    useShortDoctype:           true,
    minifyCSS:                 true,
    minifyJS:                  false,
    sortAttributes:            true,
  });
  fs.writeFileSync(path.join(DIST, 'index.html'), minHTML);
  console.log('✔  index.html  —', kb(Buffer.byteLength(minHTML)));
  const heroHtmlChecks = ['hero-mobile-visual', 'hero-mobile-fade', 'profs.webp'];
  const missingHeroHtml = heroHtmlChecks.filter((token) => !minHTML.includes(token));
  if (missingHeroHtml.length) {
    throw new Error(`Build abortada: HTML do hero mobile incompleto (${missingHeroHtml.join(', ')})`);
  }
  if (!minHTML.includes('hero-mobile-critical') || !minHTML.includes('linear-gradient')) {
    throw new Error('Build abortada: CSS crítico do fade do hero ausente em index.html');
  }
  const builtJs = fs.existsSync(path.join(DIST_JS, 'main.js'))
    ? fs.readFileSync(path.join(DIST_JS, 'main.js'), 'utf8')
    : '';
  if (!builtJs.includes('preventDefault') || !builtJs.includes('chk.eduzz.com')) {
    throw new Error('Build abortada: lógica de submit/checkout ausente em main.js');
  }
  if (!builtJs.includes('telefone') || builtJs.includes('phone:') || builtJs.includes('"phone"')) {
    throw new Error('Build abortada: checkout deve usar telefone, não phone');
  }
  console.log('✔  hero mobile (markup + fade inline) — incluído em index.html');
  console.log('✔  form checkout — incluído em main.js');

  // ── 12. Processa assets ────────────────────────────────────────────────────
  console.log('\n🖼️  Assets:');
  for (const file of fs.readdirSync(SRC_ASSETS)) {
    const src   = path.join(SRC_ASSETS, file);
    const ext   = path.extname(file).toLowerCase();
    const base  = path.basename(file, ext);
    const before = fs.statSync(src).size;

    if (assetRemaps[file]) {
      // Converte para WebP
      const destName = assetRemaps[file];
      const dest     = path.join(DIST_ASSETS, destName);
      if (ext === '.svg') {
        const raw = fs.readFileSync(src);
        await sharp(raw, { density: 150 }).webp({ quality: 92 }).toFile(dest);
      } else {
        await sharp(src).webp({ quality: 85 }).toFile(dest);
      }
      const after = fs.statSync(dest).size;
      const saved = Math.round((1 - after / before) * 100);
      console.log(`   ${file.padEnd(22)} → ${destName.padEnd(22)} ${kb(before)} → ${kb(after)}  (−${saved}%)`);
    } else if (ext === '.svg') {
      // SVG vetorial puro → SVGO
      const dest = path.join(DIST_ASSETS, file);
      const raw  = fs.readFileSync(src, 'utf8');
      const opt  = svgoOptimize(raw, {
        plugins: [{ name: 'preset-default' }, { name: 'removeViewBox', active: false }],
      });
      fs.writeFileSync(dest, opt.data);
      const after = fs.statSync(dest).size;
      const saved = Math.round((1 - after / before) * 100);
      console.log(`   ${file.padEnd(22)}   ${kb(before)} → ${kb(after)}  (−${saved}%)`);
    } else {
      // Copia direto
      const dest = path.join(DIST_ASSETS, file);
      fs.copyFileSync(src, dest);
      console.log(`   ${file.padEnd(22)}   ${kb(before)}`);
    }
  }

  // ── 13. Relatório final ───────────────────────────────────────────────────
  const totalDist = parseInt(execSync(`du -sb "${DIST}"`).toString().split('\t')[0]);
  const totalSrc  = parseInt(execSync(`du -sb "${ROOT}/assets" "${ROOT}/index.html"`).toString()
    .split('\n').filter(Boolean).reduce((a, l) => a + parseInt(l.split('\t')[0]), 0));

  console.log('\n' + '─'.repeat(44));
  console.log('🚀 Build concluído!');
  console.log(`   HTML:     ${kb(Buffer.byteLength(minHTML))}`);
  console.log(`   CSS:      ${kb(['tailwind.css','style.css'].reduce((a,f) => { const p = path.join(DIST_CSS,f); return a + (fs.existsSync(p) ? fs.statSync(p).size : 0); }, 0))}`);
  console.log(`   JS:       ${kb(fs.existsSync(path.join(DIST_JS,'main.js')) ? fs.statSync(path.join(DIST_JS,'main.js')).size : 0)}`);
  console.log(`   Total:    ${kb(totalDist)}`);
  console.log(`\n🚀 Pasta dist/ pronta para Hostinger!\n`);
}

build().catch(err => {
  console.error('\n❌ Erro no build:', err.message || err);
  process.exit(1);
});
