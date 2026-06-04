const fs = require('fs');
const path = require('path');

const root = __dirname;
const packagesPath = path.join(root, 'packages.json');
const indexPath = path.join(root, 'index.html');

function supportLabel(value) {
  switch (value) {
    case 'full':
      return '✓ Supported';
    case 'partial':
      return '~ Partial';
    case 'no':
      return '✗ Broken';
    default:
      return value;
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildRows(pkgs) {
  return pkgs.map(pkg => {
    const rsLabel = supportLabel(pkg.rs);
    const bnLabel = supportLabel(pkg.bn);
    const dnLabel = supportLabel(pkg.dn);
    return `    <tr data-rs="${escapeHtml(pkg.rs)}" data-bn="${escapeHtml(pkg.bn)}" data-dn="${escapeHtml(pkg.dn)}" data-cat="${escapeHtml(pkg.cat)}">
      <td><div class="pkg-name">${escapeHtml(pkg.n)}</div><div class="pkg-desc">${escapeHtml(pkg.d)}</div></td>
      <td>${rsLabel}</td>
      <td>${bnLabel}</td>
      <td>${dnLabel}</td>
      <td><div class="pkg-date">${escapeHtml(pkg.dt)}</div></td>
    </tr>`;
  }).join('\n');
}

function injectRows(html, rowsHtml) {
  const regex = /<tbody[^>]*id=["']compatBody["'][^>]*>\s*<\/tbody>/i;
  if (!regex.test(html)) {
    throw new Error('Could not find <tbody id="compatBody"></tbody> in index.html');
  }
  return html.replace(regex, `<tbody id="compatBody">\n${rowsHtml}\n  </tbody>`);
}

try {
  const packagesJson = fs.readFileSync(packagesPath, 'utf8');
  const packages = JSON.parse(packagesJson);
  const indexHtml = fs.readFileSync(indexPath, 'utf8');

  const rowsHtml = buildRows(packages);
  const updatedHtml = injectRows(indexHtml, rowsHtml);

  fs.writeFileSync(indexPath, updatedHtml, 'utf8');
  console.log(`Injected ${packages.length} package rows into index.html`);
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}
