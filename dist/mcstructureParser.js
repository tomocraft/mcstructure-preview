"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseMcstructure = parseMcstructure;
const nbt = __importStar(require("prismarine-nbt"));
function asRecord(value, label) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new Error(`Expected ${label} to be an object.`);
    }
    return value;
}
function asArray(value, label) {
    if (!Array.isArray(value)) {
        throw new Error(`Expected ${label} to be an array.`);
    }
    return value;
}
function asNumber(value, label) {
    if (typeof value === 'number') {
        return value;
    }
    throw new Error(`Expected ${label} to be a number.`);
}
function normalizeStateValue(value) {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return value;
    }
    return String(value);
}
async function parseMcstructure(data) {
    const { parsed } = await nbt.parse(Buffer.from(data), 'little');
    const simplified = nbt.simplify(parsed);
    const root = asRecord(simplified, 'root');
    const rawSize = asArray(root.size, 'size');
    if (rawSize.length !== 3) {
        throw new Error('Expected size to contain exactly 3 values.');
    }
    const size = [
        asNumber(rawSize[0], 'size[0]'),
        asNumber(rawSize[1], 'size[1]'),
        asNumber(rawSize[2], 'size[2]')
    ];
    const structure = asRecord(root.structure, 'structure');
    const paletteRoot = asRecord(structure.palette, 'structure.palette');
    const defaultPalette = asRecord(paletteRoot.default, 'structure.palette.default');
    const blockPalette = asArray(defaultPalette.block_palette, 'structure.palette.default.block_palette');
    const palette = blockPalette.map((entry, index) => {
        const record = asRecord(entry, `block_palette[${index}]`);
        const statesRaw = asRecord(record.states ?? {}, `block_palette[${index}].states`);
        const states = {};
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
    const placements = [];
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
//# sourceMappingURL=mcstructureParser.js.map