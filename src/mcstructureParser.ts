import * as nbt from 'prismarine-nbt';

export type BlockStateValue = string | number | boolean;

export interface ParsedPaletteEntry {
  id: string;
  states: Record<string, BlockStateValue>;
}

export interface ParsedPlacement {
  x: number;
  y: number;
  z: number;
  paletteIndex: number;
  layer: number;
}

export interface ParsedMcstructure {
  size: [number, number, number];
  palette: ParsedPaletteEntry[];
  placements: ParsedPlacement[];
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Expected ${label} to be an object.`);
  }
  return value as Record<string, unknown>;
}

function asArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`Expected ${label} to be an array.`);
  }
  return value;
}

function asNumber(value: unknown, label: string): number {
  if (typeof value === 'number') {
    return value;
  }
  throw new Error(`Expected ${label} to be a number.`);
}

function normalizeStateValue(value: unknown): BlockStateValue {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  return String(value);
}

export async function parseMcstructure(data: Uint8Array): Promise<ParsedMcstructure> {
  const { parsed } = await nbt.parse(Buffer.from(data), 'little');
  const simplified = nbt.simplify(parsed) as unknown;
  const root = asRecord(simplified, 'root');

  const rawSize = asArray(root.size, 'size');
  if (rawSize.length !== 3) {
    throw new Error('Expected size to contain exactly 3 values.');
  }
  const size: [number, number, number] = [
    asNumber(rawSize[0], 'size[0]'),
    asNumber(rawSize[1], 'size[1]'),
    asNumber(rawSize[2], 'size[2]')
  ];

  const structure = asRecord(root.structure, 'structure');
  const paletteRoot = asRecord(structure.palette, 'structure.palette');
  const defaultPalette = asRecord(paletteRoot.default, 'structure.palette.default');
  const blockPalette = asArray(defaultPalette.block_palette, 'structure.palette.default.block_palette');

  const palette: ParsedPaletteEntry[] = blockPalette.map((entry, index) => {
    const record = asRecord(entry, `block_palette[${index}]`);
    const statesRaw = asRecord(record.states ?? {}, `block_palette[${index}].states`);
    const states: Record<string, BlockStateValue> = {};
    for (const [key, value] of Object.entries(statesRaw)) {
      states[key] = normalizeStateValue(value);
    }
    return {
      id: String(record.name ?? 'minecraft:air'),
      states
    };
  });

  const blockIndicesLayers = asArray(structure.block_indices, 'structure.block_indices');
  const [sizeX, sizeY, sizeZ] = size;

  const placements: ParsedPlacement[] = [];
  for (let layerIndex = 0; layerIndex < blockIndicesLayers.length; layerIndex += 1) {
    const layer = asArray(blockIndicesLayers[layerIndex], `structure.block_indices[${layerIndex}]`);
    for (let i = 0; i < layer.length; i += 1) {
      const paletteIndex = Number(layer[i]);
      if (!Number.isFinite(paletteIndex) || paletteIndex < 0) {
        continue;
      }

      // Bedrock .mcstructure flattening order:
      // index = x * (sizeY * sizeZ) + y * sizeZ + z
      //
      // For preview consistency with in-world Bedrock orientation, we mirror Z.
      // This keeps directional blocks aligned with expected north/south in the viewer.
      const x = Math.floor(i / (sizeY * sizeZ));
      const y = Math.floor(i / sizeZ) % sizeY;
      const z = sizeZ - 1 - (i % sizeZ);
      placements.push({ x, y, z, paletteIndex, layer: layerIndex });
    }
  }

  return { size, palette, placements };
}

