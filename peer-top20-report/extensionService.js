import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ZipArchive } from 'archiver';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXTENSION_BUILD_DIR = path.resolve(__dirname, '../peer-top20-extension/build');

export function getExtensionBuildDir() {
  return EXTENSION_BUILD_DIR;
}

export function isExtensionBuildAvailable() {
  return fs.existsSync(path.join(EXTENSION_BUILD_DIR, 'manifest.json'));
}

export function compareExtensionVersions(current, latest) {
  const parseParts = (value) =>
    String(value || '0')
      .trim()
      .split('.')
      .map((part) => Number.parseInt(part, 10) || 0);
  const left = parseParts(current);
  const right = parseParts(latest);
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const a = left[index] || 0;
    const b = right[index] || 0;
    if (a > b) return 1;
    if (a < b) return -1;
  }
  return 0;
}

export function isExtensionOutdated(current, latest) {
  if (!latest) {
    return false;
  }
  return compareExtensionVersions(current, latest) < 0;
}

function readExtensionManifest() {
  const manifestPath = path.join(EXTENSION_BUILD_DIR, 'manifest.json');
  const manifestStat = fs.statSync(manifestPath);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  return { manifest, manifestPath, builtAt: manifestStat.mtime.toISOString() };
}

export function getExtensionInfo() {
  if (!isExtensionBuildAvailable()) {
    return {
      available: false,
      message: '插件尚未构建，请先在 peer-top20-extension 目录执行 npm run build',
    };
  }

  const { manifest, builtAt } = readExtensionManifest();
  const version = manifest.version;

  return {
    available: true,
    name: manifest.name,
    version,
    builtAt,
    description: manifest.description,
    downloadUrl: `/api/extension/download?v=${encodeURIComponent(version)}&t=${encodeURIComponent(builtAt)}`,
    fileName: `ai-copilot-extension-v${version}.zip`,
  };
}

export function watchExtensionBuild(onChange) {
  if (typeof onChange !== 'function') {
    return () => {};
  }

  const manifestPath = path.join(EXTENSION_BUILD_DIR, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    return () => {};
  }

  let debounceTimer = null;
  const watcher = fs.watch(manifestPath, () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      try {
        onChange(getExtensionInfo());
      } catch (error) {
        console.warn('[extension] manifest watch callback failed:', error.message);
      }
    }, 150);
  });

  return () => {
    clearTimeout(debounceTimer);
    watcher.close();
  };
}

export function streamExtensionZip(res) {
  const info = getExtensionInfo();
  if (!info.available) {
    throw new Error(info.message);
  }

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${info.fileName}"`);

  const archive = new ZipArchive({ zlib: { level: 9 } });
  archive.on('error', (error) => {
    throw error;
  });
  archive.pipe(res);
  archive.directory(EXTENSION_BUILD_DIR, false);
  return archive.finalize();
}
