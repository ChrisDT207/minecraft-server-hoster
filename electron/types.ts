export type ServerEdition = 'java' | 'bedrock';
export type ServerLoader = 'vanilla' | 'paper' | 'fabric' | 'forge' | 'neoforge' | 'bedrock';
export type ServerStatus = 'stopped' | 'starting' | 'running' | 'stopping' | 'error';

export interface ServerConfig {
  id: string;
  name: string;
  edition: ServerEdition;
  loader: ServerLoader;
  version: string;
  loaderVersion?: string;
  port: number;
  minRam: number; // in MB
  maxRam: number; // in MB
  jvmArgs?: string;
  javaPath?: string;
  allowOffline: boolean;
  skinRestorer: boolean;
  eulaAccepted: boolean;
  createdAt: number;
  serverDir: string;
}

export interface ServerStats {
  cpuPercent: number;
  memoryMb: number;
  memoryMaxMb: number;
  playersOnline: number;
  maxPlayers: number;
  uptimeSeconds: number;
}

export interface PlayitStatus {
  installed: boolean;
  running: boolean;
  publicAddress?: string;
  claimUrl?: string;
  latestLog?: string;
  recentLogs?: string[];
}

export interface ModItem {
  filename: string;
  name: string;
  enabled: boolean;
  size: number;
  path: string;
  modifiedAt: number;
}

export interface ModrinthHit {
  project_id: string;
  title: string;
  description: string;
  categories: string[];
  icon_url?: string;
  author: string;
  downloads: number;
  follows: number;
  project_type: 'mod' | 'plugin';
  date_modified?: string;
}

export interface VersionOption {
  id: string;
  type: 'release' | 'snapshot';
  releaseTime?: string;
  url?: string;
}

export interface LoaderVersionOption {
  version: string;
  stable: boolean;
}

export interface SystemInfo {
  totalMemoryMb: number;
  freeMemoryMb: number;
  cpuModel: string;
  cpuCores: number;
  localIp: string;
  radminIp?: string;
  detectedJava: {
    path: string;
    version: string;
    major: number;
  }[];
}
