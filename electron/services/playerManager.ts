import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as zlib from 'zlib';

export interface PlayerItem {
  slot: number;
  id: string;
  displayName: string;
  count: number;
  damage?: number;
  maxDamage?: number;
  customName?: string;
  enchantments?: { id: string; name: string; level: number }[];
  raw?: any;
}

export interface PlayerEquipment {
  head?: PlayerItem;
  chest?: PlayerItem;
  legs?: PlayerItem;
  feet?: PlayerItem;
  offhand?: PlayerItem;
}

export interface PlayerSummary {
  uuid: string;
  name: string;
  health: number;
  maxHealth: number;
  food: number;
  xpLevel: number;
  gamemode: number; // 0=Survival, 1=Creative, 2=Adventure, 3=Spectator
  dimension: string;
  pos: [number, number, number];
  itemCount: number;
  enderCount: number;
  lastModified: number;
}

export interface PlayerInventoryDetails extends PlayerSummary {
  equipment: PlayerEquipment;
  inventory: PlayerItem[]; // Slots 0-35 (Hotbar 0-8, Main 9-35)
  enderChest: PlayerItem[]; // Slots 0-26
}

// Minimal, fast NBT parser for Minecraft player .dat files
function parseNBT(buf: Buffer): any {
  let offset = 0;

  function readByte(): number {
    return buf.readInt8(offset++);
  }

  function readShort(): number {
    const val = buf.readInt16BE(offset);
    offset += 2;
    return val;
  }

  function readInt(): number {
    const val = buf.readInt32BE(offset);
    offset += 4;
    return val;
  }

  function readLong(): string {
    const val = buf.readBigInt64BE(offset);
    offset += 8;
    return val.toString();
  }

  function readFloat(): number {
    const val = buf.readFloatBE(offset);
    offset += 4;
    return val;
  }

  function readDouble(): number {
    const val = buf.readDoubleBE(offset);
    offset += 8;
    return val;
  }

  function readString(): string {
    const len = buf.readUInt16BE(offset);
    offset += 2;
    const str = buf.toString('utf8', offset, offset + len);
    offset += len;
    return str;
  }

  function readTag(type: number): any {
    switch (type) {
      case 0:
        return null;
      case 1:
        return readByte();
      case 2:
        return readShort();
      case 3:
        return readInt();
      case 4:
        return readLong();
      case 5:
        return readFloat();
      case 6:
        return readDouble();
      case 7: {
        const len = readInt();
        const arr = [];
        for (let i = 0; i < len; i++) arr.push(readByte());
        return arr;
      }
      case 8:
        return readString();
      case 9: {
        const itemType = readByte();
        const len = readInt();
        const list = [];
        for (let i = 0; i < len; i++) {
          list.push(readTag(itemType));
        }
        return list;
      }
      case 10: {
        const comp: Record<string, any> = {};
        while (offset < buf.length) {
          const tType = readByte();
          if (tType === 0) break;
          const name = readString();
          comp[name] = readTag(tType);
        }
        return comp;
      }
      case 11: {
        const len = readInt();
        const arr = [];
        for (let i = 0; i < len; i++) arr.push(readInt());
        return arr;
      }
      case 12: {
        const len = readInt();
        const arr = [];
        for (let i = 0; i < len; i++) arr.push(readLong());
        return arr;
      }
      default:
        throw new Error('Unknown NBT tag type: ' + type + ' at ' + offset);
    }
  }

  const rootType = readByte();
  if (rootType !== 10) throw new Error('Expected root compound in NBT');
  readString(); // skip root name
  return readTag(10);
}

// Convert "minecraft:diamond_sword" to "Diamond Sword"
function formatItemName(id: string): string {
  if (!id) return 'Unknown Item';
  const clean = id.replace(/^minecraft:/i, '').replace(/_/g, ' ');
  return clean
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Convert roman numeral for enchant level
function toRoman(num: number): string {
  const roman: Record<string, number> = {
    M: 1000,
    CM: 900,
    D: 500,
    CD: 400,
    C: 100,
    XC: 90,
    L: 50,
    XL: 40,
    X: 10,
    IX: 9,
    V: 5,
    IV: 4,
    I: 1,
  };
  let str = '';
  for (const i of Object.keys(roman)) {
    const q = Math.floor(num / roman[i]);
    num -= q * roman[i];
    str += i.repeat(q);
  }
  return str || String(num);
}

// Format an item from raw NBT
function formatItem(raw: any, slotOverride?: number): PlayerItem | null {
  if (!raw || !raw.id) return null;

  const id = String(raw.id);
  const count = Number(raw.count || raw.Count || 1);
  const slot = slotOverride !== undefined ? slotOverride : Number(raw.Slot ?? 0);

  let customName: string | undefined;
  let damage: number | undefined;
  const enchants: { id: string; name: string; level: number }[] = [];

  // Check 1.20.5+ components
  if (raw.components) {
    if (raw.components['minecraft:custom_name']) {
      try {
        const parsed = JSON.parse(raw.components['minecraft:custom_name']);
        customName = typeof parsed === 'string' ? parsed : parsed.text || parsed.translate;
      } catch {
        customName = String(raw.components['minecraft:custom_name']).replace(/^"|"$/g, '');
      }
    }
    if (raw.components['minecraft:damage'] !== undefined) {
      damage = Number(raw.components['minecraft:damage']);
    }
    const enchObj =
      raw.components['minecraft:enchantments'] ||
      raw.components['minecraft:stored_enchantments'];
    if (enchObj && typeof enchObj === 'object') {
      const levels = enchObj.levels || enchObj;
      for (const [k, v] of Object.entries(levels)) {
        const cleanName = formatItemName(k);
        const lvl = Number(v) || 1;
        enchants.push({
          id: k,
          name: `${cleanName} ${toRoman(lvl)}`,
          level: lvl,
        });
      }
    }
  }

  // Check legacy tag (pre-1.20.5)
  if (raw.tag) {
    if (raw.tag.display && raw.tag.display.Name) {
      try {
        const parsed = JSON.parse(raw.tag.display.Name);
        customName = typeof parsed === 'string' ? parsed : parsed.text || parsed.translate;
      } catch {
        customName = String(raw.tag.display.Name).replace(/^"|"$/g, '');
      }
    }
    if (raw.tag.Damage !== undefined) {
      damage = Number(raw.tag.Damage);
    }
    const legacyEnchs = raw.tag.Enchantments || raw.tag.StoredEnchantments || [];
    if (Array.isArray(legacyEnchs)) {
      for (const e of legacyEnchs) {
        const cleanName = formatItemName(e.id);
        const lvl = Number(e.lvl || 1);
        enchants.push({
          id: String(e.id),
          name: `${cleanName} ${toRoman(lvl)}`,
          level: lvl,
        });
      }
    }
  }

  return {
    slot,
    id,
    displayName: formatItemName(id),
    count,
    damage,
    customName,
    enchantments: enchants.length > 0 ? enchants : undefined,
  };
}

export class PlayerManager {
  private static instance: PlayerManager;

  public static getInstance(): PlayerManager {
    if (!PlayerManager.instance) {
      PlayerManager.instance = new PlayerManager();
    }
    return PlayerManager.instance;
  }

  private getServersDir(): string {
    return path.join(os.homedir(), 'MC-ForgeDesk', 'servers');
  }

  private getPlayerDataDir(serverDir: string): string | null {
    // Possible locations for player .dat files across server loaders and worlds
    const candidates = [
      path.join(serverDir, 'world', 'players', 'data'),
      path.join(serverDir, 'world', 'playerdata'),
      path.join(serverDir, 'world', 'players'),
    ];

    // Check level-name from server.properties if available
    const propsPath = path.join(serverDir, 'server.properties');
    if (fs.existsSync(propsPath)) {
      try {
        const lines = fs.readFileSync(propsPath, 'utf8').split('\n');
        for (const line of lines) {
          const match = line.match(/^\s*level-name\s*=\s*(.+)$/);
          if (match && match[1].trim()) {
            const worldName = match[1].trim();
            candidates.unshift(path.join(serverDir, worldName, 'players', 'data'));
            candidates.unshift(path.join(serverDir, worldName, 'playerdata'));
          }
        }
      } catch {
        // ignore
      }
    }

    for (const c of candidates) {
      if (fs.existsSync(c)) {
        return c;
      }
    }
    return null;
  }

  private getUserCache(serverDir: string): Map<string, string> {
    const map = new Map<string, string>();
    const ucPath = path.join(serverDir, 'usercache.json');
    if (fs.existsSync(ucPath)) {
      try {
        const entries = JSON.parse(fs.readFileSync(ucPath, 'utf8'));
        if (Array.isArray(entries)) {
          for (const item of entries) {
            if (item.uuid && item.name) {
              map.set(item.uuid.toLowerCase(), item.name);
            }
          }
        }
      } catch (err) {
        console.error('Failed to parse usercache.json:', err);
      }
    }
    return map;
  }

  public getPlayers(serverId: string): PlayerSummary[] {
    const serverDir = path.join(this.getServersDir(), serverId);
    if (!fs.existsSync(serverDir)) return [];

    const pDataDir = this.getPlayerDataDir(serverDir);
    if (!pDataDir || !fs.existsSync(pDataDir)) return [];

    const usercache = this.getUserCache(serverDir);
    const files = fs.readdirSync(pDataDir);
    const result: PlayerSummary[] = [];

    for (const f of files) {
      if (!f.endsWith('.dat') || f.endsWith('.dat_old')) continue;
      const uuid = f.replace('.dat', '').toLowerCase();
      const filePath = path.join(pDataDir, f);

      try {
        const stat = fs.statSync(filePath);
        const uncompressed = zlib.gunzipSync(fs.readFileSync(filePath));
        const nbt = parseNBT(uncompressed);

        const pos: [number, number, number] = [0, 0, 0];
        if (Array.isArray(nbt.Pos) && nbt.Pos.length >= 3) {
          pos[0] = Math.round(Number(nbt.Pos[0]));
          pos[1] = Math.round(Number(nbt.Pos[1]));
          pos[2] = Math.round(Number(nbt.Pos[2]));
        }

        const name = usercache.get(uuid) || `Player-${uuid.slice(0, 8)}`;
        const health = Math.round(Number(nbt.Health ?? 20));
        const food = Number(nbt.foodLevel ?? 20);
        const xpLevel = Number(nbt.XpLevel ?? 0);
        const gamemode = Number(nbt.playerGameType ?? 0);
        const dimension = String(nbt.Dimension || 'minecraft:overworld').replace('minecraft:', '');
        const itemCount = Array.isArray(nbt.Inventory) ? nbt.Inventory.length : 0;
        const enderCount = Array.isArray(nbt.EnderItems) ? nbt.EnderItems.length : 0;

        result.push({
          uuid,
          name,
          health,
          maxHealth: 20,
          food,
          xpLevel,
          gamemode,
          dimension,
          pos,
          itemCount,
          enderCount,
          lastModified: stat.mtimeMs,
        });
      } catch (err) {
        console.error(`Failed to parse player data for ${f}:`, err);
      }
    }

    return result.sort((a, b) => b.lastModified - a.lastModified);
  }

  public getPlayerInventory(serverId: string, uuid: string): PlayerInventoryDetails | null {
    const serverDir = path.join(this.getServersDir(), serverId);
    const pDataDir = this.getPlayerDataDir(serverDir);
    if (!pDataDir) return null;

    const normalizedUuid = uuid.toLowerCase();
    const filePath = path.join(pDataDir, `${normalizedUuid}.dat`);
    if (!fs.existsSync(filePath)) return null;

    try {
      const stat = fs.statSync(filePath);
      const usercache = this.getUserCache(serverDir);
      const uncompressed = zlib.gunzipSync(fs.readFileSync(filePath));
      const nbt = parseNBT(uncompressed);

      const name = usercache.get(normalizedUuid) || `Player-${normalizedUuid.slice(0, 8)}`;
      const health = Math.round(Number(nbt.Health ?? 20));
      const food = Number(nbt.foodLevel ?? 20);
      const xpLevel = Number(nbt.XpLevel ?? 0);
      const gamemode = Number(nbt.playerGameType ?? 0);
      const dimension = String(nbt.Dimension || 'minecraft:overworld').replace('minecraft:', '');

      const pos: [number, number, number] = [0, 0, 0];
      if (Array.isArray(nbt.Pos) && nbt.Pos.length >= 3) {
        pos[0] = Math.round(Number(nbt.Pos[0]));
        pos[1] = Math.round(Number(nbt.Pos[1]));
        pos[2] = Math.round(Number(nbt.Pos[2]));
      }

      const equipment: PlayerEquipment = {};
      const inventory: PlayerItem[] = [];
      const enderChest: PlayerItem[] = [];

      // Modern 1.20+ equipment compound
      if (nbt.equipment && typeof nbt.equipment === 'object') {
        if (nbt.equipment.head) equipment.head = formatItem(nbt.equipment.head, 103) || undefined;
        if (nbt.equipment.chest) equipment.chest = formatItem(nbt.equipment.chest, 102) || undefined;
        if (nbt.equipment.legs) equipment.legs = formatItem(nbt.equipment.legs, 101) || undefined;
        if (nbt.equipment.feet) equipment.feet = formatItem(nbt.equipment.feet, 100) || undefined;
        if (nbt.equipment.offhand) equipment.offhand = formatItem(nbt.equipment.offhand, -106) || undefined;
      }

      // Inventory list
      if (Array.isArray(nbt.Inventory)) {
        for (const rawItem of nbt.Inventory) {
          const slot = Number(rawItem.Slot);
          const item = formatItem(rawItem);
          if (!item) continue;

          // Armor slots in legacy or standard Inventory
          if (slot === 103 && !equipment.head) {
            equipment.head = item;
          } else if (slot === 102 && !equipment.chest) {
            equipment.chest = item;
          } else if (slot === 101 && !equipment.legs) {
            equipment.legs = item;
          } else if (slot === 100 && !equipment.feet) {
            equipment.feet = item;
          } else if (slot === -106 && !equipment.offhand) {
            equipment.offhand = item;
          } else if (slot >= 0 && slot <= 35) {
            inventory.push(item);
          }
        }
      }

      // Ender Chest list (slots 0-26)
      if (Array.isArray(nbt.EnderItems)) {
        for (const rawItem of nbt.EnderItems) {
          const item = formatItem(rawItem);
          if (item) enderChest.push(item);
        }
      }

      return {
        uuid: normalizedUuid,
        name,
        health,
        maxHealth: 20,
        food,
        xpLevel,
        gamemode,
        dimension,
        pos,
        itemCount: inventory.length,
        enderCount: enderChest.length,
        lastModified: stat.mtimeMs,
        equipment,
        inventory: inventory.sort((a, b) => a.slot - b.slot),
        enderChest: enderChest.sort((a, b) => a.slot - b.slot),
      };
    } catch (err) {
      console.error(`Failed to parse inventory for ${uuid}:`, err);
      return null;
    }
  }
}

