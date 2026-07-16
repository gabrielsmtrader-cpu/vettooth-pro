// Build script: pre-compila JSX do EquiChart para JS puro
// Uso: node build-odonto.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Instala @babel/core e preset-react se necessário
try {
  require('@babel/core');
} catch(e) {
  console.log('Instalando @babel/core...');
  execSync('npm install --no-save @babel/core @babel/preset-react', { stdio: 'inherit' });
}

const babel = require('@babel/core');

const files = [
  'chart-svg.jsx',
  'chart-components.jsx',
  'chart-anatomical.jsx',
  'chart-base-svg.jsx',
  'vt-species-arch.jsx',
  'odonto-ui.jsx',
  'vt-odonto-especie.jsx',
  'vt-odonto-steps.jsx',
  'ui-components.jsx',
  'panels.jsx',
  'app.jsx',
];

const outDir = path.join(__dirname, 'odonto-compiled');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

for (const f of files) {
  const src = path.join(__dirname, f);
  const out = path.join(outDir, f.replace(/\.jsx$/, '.js'));
  const code = fs.readFileSync(src, 'utf8');
  const result = babel.transformSync(code, {
    presets: ['@babel/preset-react'],
    filename: f,
  });
  fs.writeFileSync(out, result.code, 'utf8');
  console.log(`✓ ${f} → odonto-compiled/${f.replace('.jsx','.js')} (${Math.round(result.code.length/1024)}KB)`);
}

console.log('\n✅ Build concluído! Pasta: odonto-compiled/');
