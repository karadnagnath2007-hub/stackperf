const fs = require('fs');
const path = require('path');

const root = process.cwd();
const packagesPath = path.join(root, 'packages.json');
const today = new Date().toISOString().slice(0, 10);

function log(message) {
  console.log(message);
}

function parseDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function fetchLatestMetadata(packageName) {
  const encodedName = encodeURIComponent(packageName);
  const url = `https://registry.npmjs.org/${encodedName}/latest`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${packageName}: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function fetchRegistryMetadata(packageName) {
  const encodedName = encodeURIComponent(packageName);
  const url = `https://registry.npmjs.org/${encodedName}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch registry metadata for ${packageName}: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

function extractReleaseDate(packageName, latestMeta, registryMeta) {
  if (latestMeta && typeof latestMeta.date === 'string') {
    return latestMeta.date;
  }

  if (registryMeta) {
    const version = latestMeta && latestMeta.version;
    if (version && registryMeta.time && registryMeta.time[version]) {
      return registryMeta.time[version];
    }
    if (registryMeta.time && typeof registryMeta.time.modified === 'string') {
      return registryMeta.time.modified;
    }
    if (registryMeta.time && typeof registryMeta.time.created === 'string') {
      return registryMeta.time.created;
    }
  }

  return null;
}

async function checkUpdates() {
  const packagesRaw = fs.readFileSync(packagesPath, 'utf8');
  const packages = JSON.parse(packagesRaw);

  let updatedCount = 0;
  let unchangedCount = 0;

  for (const pkg of packages) {
    try {
      const latestMeta = await fetchLatestMetadata(pkg.n);
      let releaseDate = extractReleaseDate(pkg.n, latestMeta, null);

      if (!releaseDate) {
        const registryMeta = await fetchRegistryMetadata(pkg.n);
        releaseDate = extractReleaseDate(pkg.n, latestMeta, registryMeta);
      }

      if (!releaseDate) {
        log(`Skipped ${pkg.n}: release date unavailable`);
        unchangedCount += 1;
        continue;
      }

      const latestDate = parseDate(releaseDate);
      const currentDate = parseDate(pkg.dt);

      if (!latestDate || !currentDate) {
        log(`Skipped ${pkg.n}: invalid date format`);
        unchangedCount += 1;
        continue;
      }

      if (latestDate > currentDate) {
        log(`Updated ${pkg.n}: ${pkg.dt} → ${today}`);
        pkg.dt = today;
        updatedCount += 1;
      } else {
        unchangedCount += 1;
      }
    } catch (error) {
      log(`Skipped ${pkg.n}: ${error.message}`);
      unchangedCount += 1;
    }
  }

  fs.writeFileSync(packagesPath, JSON.stringify(packages, null, 2) + '\n', 'utf8');
  log(`Updated ${updatedCount} packages, ${unchangedCount} unchanged`);
}

checkUpdates().catch(error => {
  console.error('check-updates failed:', error);
  process.exit(1);
});