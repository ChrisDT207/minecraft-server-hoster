import { execSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import AdmZip from 'adm-zip';

export interface JavaInstallation {
  path: string;
  version: string;
  major: number;
  isDefault: boolean;
}

export function detectJavaInstallations(): JavaInstallation[] {
  const installations: JavaInstallation[] = [];
  const checkedPaths = new Set<string>();

  function testJavaBinary(binPath: string, isDefault = false) {
    if (!binPath) return;
    const normalized = path.normalize(binPath).toLowerCase();
    if (checkedPaths.has(normalized)) return;
    checkedPaths.add(normalized);

    if (!fs.existsSync(binPath)) return;

    try {
      const res = spawnSync(binPath, ['-version'], { encoding: 'utf8', timeout: 4000 });
      const output = (res.stderr || res.stdout || '').trim();
      if (!output) return;

      const match = output.match(/version\s+"([^"]+)"/i) || output.match(/version\s+([^\s]+)/i);
      const verStr = match ? match[1] : 'Unknown';
      let major = 0;

      if (verStr.startsWith('1.')) {
        const parts = verStr.split('.');
        major = parseInt(parts[1] || '8', 10);
      } else {
        const parts = verStr.split(/[-._]/);
        major = parseInt(parts[0] || '0', 10);
      }

      installations.push({
        path: binPath,
        version: verStr,
        major,
        isDefault,
      });
    } catch {
      // Ignored
    }
  }

  // 1. Check PATH java
  try {
    const whereRes = execSync('where java', {
      encoding: 'utf8',
      timeout: 3000,
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();
    const lines = whereRes.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    for (let i = 0; i < lines.length; i++) {
      testJavaBinary(lines[i], i === 0);
    }
  } catch {
    // java not in PATH
  }

  // 2. Check JAVA_HOME
  const envJavaHome = process.env.JAVA_HOME;
  if (envJavaHome) {
    testJavaBinary(path.join(envJavaHome, 'bin', 'java.exe'));
  }

  // 3. Scan common Windows directories recursively up to depth 4
  const searchRoots = [
    path.join(os.homedir(), 'MC-ForgeDesk', 'runtimes'),
    'C:\\Program Files\\Android',
    'C:\\Program Files (x86)\\Android',
    'C:\\Program Files\\Java',
    'C:\\Program Files\\Eclipse Adoptium',
    'C:\\Program Files\\Microsoft',
    'C:\\Program Files\\BellSoft',
    'C:\\Program Files\\Zulu',
    'C:\\Program Files (x86)\\Java',
    path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Eclipse Adoptium'),
    path.join(os.homedir(), 'AppData', 'Roaming', '.minecraft', 'runtime'),
  ];

  function searchDir(currentDir: string, depth: number) {
    if (depth > 4 || !fs.existsSync(currentDir)) return;
    try {
      const javaCandidate = path.join(currentDir, 'bin', 'java.exe');
      if (fs.existsSync(javaCandidate)) {
        testJavaBinary(javaCandidate);
      }

      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          searchDir(path.join(currentDir, entry.name), depth + 1);
        }
      }
    } catch {
      // Ignore read errors
    }
  }

  for (const root of searchRoots) {
    searchDir(root, 0);
  }

  return installations.sort((a, b) => b.major - a.major);
}

export function getRequiredJavaMajor(mcVersion: string): number {
  if (!mcVersion) return 21;
  const parts = mcVersion.split('.');

  // e.g. "26.4-snapshot-4" or future versions >= 25
  const top = parseInt(parts[0], 10);
  if (top > 1) {
    return top >= 25 ? 25 : 21;
  }

  const minor = parseInt(parts[1] || '21', 10);
  const patch = parseInt(parts[2] || '0', 10);

  if (minor >= 21 || (minor === 20 && patch >= 5)) {
    return 21;
  }
  if (minor >= 18) {
    return 17;
  }
  if (minor === 17) {
    return 17;
  }
  return 8;
}

export function getRecommendedJava(
  installations: JavaInstallation[],
  mcVersion: string
): string | undefined {
  const targetMajor = getRequiredJavaMajor(mcVersion);

  // Exact match
  const exact = installations.find((i) => i.major === targetMajor);
  if (exact) return exact.path;

  // Compatible (higher version can generally run lower MC version)
  const compatible = installations
    .filter((i) => i.major >= targetMajor)
    .sort((a, b) => a.major - b.major)[0];
  if (compatible) return compatible.path;

  return undefined;
}

// Download and unpack portable Adoptium Temurin JRE if no compatible runtime is found
export async function ensureJavaRuntime(
  targetMajor: number,
  onStatus?: (text: string) => void
): Promise<string> {
  const runtimesDir = path.join(os.homedir(), 'MC-ForgeDesk', 'runtimes');
  fs.mkdirSync(runtimesDir, { recursive: true });

  const targetDir = path.join(runtimesDir, `java-${targetMajor}`);
  const expectedJavaExe = path.join(targetDir, 'bin', 'java.exe');

  if (fs.existsSync(expectedJavaExe)) {
    return expectedJavaExe;
  }

  onStatus?.(`Downloading portable OpenJDK Adoptium JRE ${targetMajor}...`);

  // Download URL
  let downloadUrl = `https://api.adoptium.net/v3/binary/latest/${targetMajor}/ga/windows/x64/jre/hotspot/normal/eclipse`;

  let res = await fetch(downloadUrl);
  if (!res.ok) {
    // Fallback to JDK if JRE is not available for this release
    downloadUrl = `https://api.adoptium.net/v3/binary/latest/${targetMajor}/ga/windows/x64/jdk/hotspot/normal/eclipse`;
    res = await fetch(downloadUrl);
    if (!res.ok) {
      throw new Error(`Failed to download Java ${targetMajor} from Adoptium API (${res.status})`);
    }
  }

  const tempZip = path.join(runtimesDir, `jre_${targetMajor}_temp.zip`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(tempZip, buf);

  onStatus?.(`Extracting portable Java ${targetMajor}...`);
  const zip = new AdmZip(tempZip);
  zip.extractAllTo(targetDir, true);
  fs.unlinkSync(tempZip);

  // If zip extracted into a single wrapper folder (e.g. jre-21.0.2+13 or jdk-25...), unwrap it
  const entries = fs.readdirSync(targetDir);
  const sub = entries.find((e) => {
    const full = path.join(targetDir, e);
    return fs.statSync(full).isDirectory() && fs.existsSync(path.join(full, 'bin', 'java.exe'));
  });

  if (sub) {
    const subPath = path.join(targetDir, sub);
    const subFiles = fs.readdirSync(subPath);
    for (const f of subFiles) {
      fs.renameSync(path.join(subPath, f), path.join(targetDir, f));
    }
    fs.rmdirSync(subPath);
  }

  if (fs.existsSync(expectedJavaExe)) {
    onStatus?.(`Portable Java ${targetMajor} is ready.`);
    return expectedJavaExe;
  }

  throw new Error(`Java binary was not found after extracting to ${targetDir}`);
}
