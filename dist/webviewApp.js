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
exports.buildViewerPayload = buildViewerPayload;
const bedrockModelMapper_1 = require("./bedrockModelMapper");
const path = __importStar(require("path"));
const FACE_DEFS = {
    north: {
        normal: [0, 0, -1],
        corners: [
            [0, 0, 0],
            [0, 1, 0],
            [1, 1, 0],
            [1, 0, 0]
        ],
        fallbackUv: [0, 0, 16, 16]
    },
    south: {
        normal: [0, 0, 1],
        corners: [
            [1, 0, 1],
            [1, 1, 1],
            [0, 1, 1],
            [0, 0, 1]
        ],
        fallbackUv: [0, 0, 16, 16]
    },
    west: {
        normal: [-1, 0, 0],
        corners: [
            [0, 0, 1],
            [0, 1, 1],
            [0, 1, 0],
            [0, 0, 0]
        ],
        fallbackUv: [0, 0, 16, 16]
    },
    east: {
        normal: [1, 0, 0],
        corners: [
            [1, 0, 0],
            [1, 1, 0],
            [1, 1, 1],
            [1, 0, 1]
        ],
        fallbackUv: [0, 0, 16, 16]
    },
    up: {
        normal: [0, 1, 0],
        corners: [
            [0, 1, 0],
            [0, 1, 1],
            [1, 1, 1],
            [1, 1, 0]
        ],
        fallbackUv: [0, 0, 16, 16]
    },
    down: {
        normal: [0, -1, 0],
        corners: [
            [0, 0, 1],
            [0, 0, 0],
            [1, 0, 0],
            [1, 0, 1]
        ],
        fallbackUv: [0, 0, 16, 16]
    }
};
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
function toHex(bytes) {
    const hex = [];
    for (const b of bytes) {
        hex.push(b.toString(16).padStart(2, '0'));
    }
    return hex.join('');
}
function normalizeTextureRef(value) {
    let texture = value.trim();
    if (texture.startsWith('minecraft:')) {
        texture = texture.slice('minecraft:'.length);
    }
    if (texture.startsWith('block/')) {
        texture = texture.slice('block/'.length);
    }
    if (texture.startsWith('blocks/')) {
        texture = texture.slice('blocks/'.length);
    }
    return texture;
}
function normalizeModelRef(value) {
    let model = value.trim();
    if (model.startsWith('minecraft:')) {
        model = model.slice('minecraft:'.length);
    }
    if (model.startsWith('block/')) {
        model = model.slice('block/'.length);
    }
    if (model.startsWith('blocks/')) {
        model = model.slice('blocks/'.length);
    }
    return model;
}
function canonicalStateKey(state) {
    const keys = Object.keys(state).sort();
    return keys.map((key) => `${key}=${String(state[key])}`).join(',');
}
function parseVariantKey(variantKey) {
    const out = {};
    if (!variantKey) {
        return out;
    }
    for (const chunk of variantKey.split(',')) {
        const [rawK, rawV] = chunk.split('=');
        if (!rawK || rawV === undefined) {
            continue;
        }
        const key = rawK.trim();
        const v = rawV.trim();
        if (v === 'true' || v === 'false') {
            out[key] = v;
            continue;
        }
        const num = Number(v);
        if (Number.isFinite(num) && `${num}` === v) {
            out[key] = num;
            continue;
        }
        out[key] = v;
    }
    return out;
}
function blockNameWithoutNamespace(blockId) {
    return blockId.replace(/^minecraft:/, '');
}
function textureColorFallback(textureName) {
    let hash = 2166136261;
    const data = Buffer.from(textureName, 'utf8');
    for (const byte of data) {
        hash ^= byte;
        hash = Math.imul(hash, 16777619);
    }
    const r = 90 + (hash & 0x7f);
    const g = 90 + ((hash >> 8) & 0x7f);
    const b = 90 + ((hash >> 16) & 0x7f);
    return [r, g, b];
}
function mapVariantStateKeysForBlock(javaId, rawState) {
    const state = { ...rawState };
    const mirrorNorthSouth = (facing) => facing === 'north' ? 'south' : facing === 'south' ? 'north' : facing;
    switch (javaId) {
        case 'stone_brick_slab':
        case 'brick_slab':
        case 'smooth_stone_slab': {
            if ('type' in state) {
                return state;
            }
            const candidate = state['minecraft:vertical_half'] ?? state.vertical_half;
            if (candidate === 'top') {
                state.type = 'top';
            }
            else if (candidate === 'bottom') {
                state.type = 'bottom';
            }
            return state;
        }
        case 'stone_brick_stairs': {
            if ('half' in state && 'facing' in state) {
                return state;
            }
            const halfRaw = state.upside_down_bit;
            if (halfRaw !== undefined) {
                const asBool = halfRaw === true || halfRaw === 1 || halfRaw === '1' || halfRaw === 'true';
                state.half = asBool ? 'top' : 'bottom';
            }
            const direction = Number(state.weirdo_direction);
            if (Number.isFinite(direction) && state.facing === undefined) {
                switch (direction) {
                    case 0:
                        state.facing = mirrorNorthSouth('east');
                        break;
                    case 1:
                        state.facing = mirrorNorthSouth('west');
                        break;
                    case 2:
                        state.facing = mirrorNorthSouth('south');
                        break;
                    case 3:
                        state.facing = mirrorNorthSouth('north');
                        break;
                    default:
                        state.facing = mirrorNorthSouth('north');
                        break;
                }
            }
            if (!('shape' in state)) {
                state.shape = 'straight';
            }
            return state;
        }
        default:
            return state;
    }
}
function stateMatches(whenState, blockState) {
    for (const [key, value] of Object.entries(whenState)) {
        const cur = blockState[key];
        if (cur === undefined) {
            return false;
        }
        if (String(cur) !== String(value)) {
            return false;
        }
    }
    return true;
}
function rotationMatrixFromEulerDegrees(xDeg = 0, yDeg = 0, zDeg = 0) {
    const x = (xDeg * Math.PI) / 180;
    const y = (yDeg * Math.PI) / 180;
    const z = (zDeg * Math.PI) / 180;
    const cx = Math.cos(x);
    const sx = Math.sin(x);
    const cy = Math.cos(y);
    const sy = Math.sin(y);
    const cz = Math.cos(z);
    const sz = Math.sin(z);
    const rx = [1, 0, 0, 0, cx, -sx, 0, sx, cx];
    const ry = [cy, 0, sy, 0, 1, 0, -sy, 0, cy];
    const rz = [cz, -sz, 0, sz, cz, 0, 0, 0, 1];
    const mul = (a, b) => [
        a[0] * b[0] + a[1] * b[3] + a[2] * b[6],
        a[0] * b[1] + a[1] * b[4] + a[2] * b[7],
        a[0] * b[2] + a[1] * b[5] + a[2] * b[8],
        a[3] * b[0] + a[4] * b[3] + a[5] * b[6],
        a[3] * b[1] + a[4] * b[4] + a[5] * b[7],
        a[3] * b[2] + a[4] * b[5] + a[5] * b[8],
        a[6] * b[0] + a[7] * b[3] + a[8] * b[6],
        a[6] * b[1] + a[7] * b[4] + a[8] * b[7],
        a[6] * b[2] + a[7] * b[5] + a[8] * b[8]
    ];
    return mul(ry, mul(rx, rz));
}
function applyRotation(v, m) {
    return [
        v[0] * m[0] + v[1] * m[1] + v[2] * m[2],
        v[0] * m[3] + v[1] * m[4] + v[2] * m[5],
        v[0] * m[6] + v[1] * m[7] + v[2] * m[8]
    ];
}
function axisAngleRotate(point, origin, axis, angleDeg) {
    const rad = (angleDeg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    let x = point[0] - origin[0];
    let y = point[1] - origin[1];
    let z = point[2] - origin[2];
    if (axis === 'x') {
        const ny = y * cos - z * sin;
        const nz = y * sin + z * cos;
        y = ny;
        z = nz;
    }
    else if (axis === 'y') {
        const nx = x * cos + z * sin;
        const nz = -x * sin + z * cos;
        x = nx;
        z = nz;
    }
    else {
        const nx = x * cos - y * sin;
        const ny = x * sin + y * cos;
        x = nx;
        y = ny;
    }
    return [x + origin[0], y + origin[1], z + origin[2]];
}
function uvForFace(faceName, faceUv, faceRotation, faceVertex) {
    const [u1, v1, u2, v2] = faceUv;
    const isSideFace = faceName === 'north' || faceName === 'south' || faceName === 'west' || faceName === 'east';
    const vTop = Math.min(v1, v2);
    const vBottom = Math.max(v1, v2);
    const corners = isSideFace
        ? [
            [u1, vBottom],
            [u1, vTop],
            [u2, vTop],
            [u2, vBottom]
        ]
        : [
            [u1, v1],
            [u1, v2],
            [u2, v2],
            [u2, v1]
        ];
    const rotated = ((Math.round((faceRotation ?? 0) / 90) % 4) + 4) % 4;
    const index = (faceVertex + rotated) % 4;
    const [uPx, vPx] = corners[index];
    return [uPx / 16, 1 - vPx / 16];
}
function readPngSize(data) {
    if (data.length < 24 || data.readUInt32BE(0) !== 0x89504e47) {
        return { width: 16, height: 16 };
    }
    return {
        width: data.readUInt32BE(16),
        height: data.readUInt32BE(20)
    };
}
class AssetResolver {
    constructor() {
        this.textureCache = new Map();
        // Keep to a modern texture set while compatible with package data shape.
        this.mcAssets = require('minecraft-assets')('1.21.11');
    }
    getModel(modelRef) {
        const key = normalizeModelRef(modelRef);
        return this.mcAssets.blocksModels[key];
    }
    getBlockState(blockId) {
        return this.mcAssets.blocksStates[blockId];
    }
    resolveTexturePath(textureRef) {
        const normalized = normalizeTextureRef(textureRef);
        const direct = path.join(this.mcAssets.directory, 'blocks', `${normalized}.png`);
        if (require('fs').existsSync(direct)) {
            return direct;
        }
        const alternate = path.join(this.mcAssets.directory, `${normalized}.png`);
        if (require('fs').existsSync(alternate)) {
            return alternate;
        }
        return direct;
    }
    getTextureData(textureRef) {
        const texName = normalizeTextureRef(textureRef);
        if (this.textureCache.has(texName)) {
            return this.textureCache.get(texName);
        }
        const texturePath = this.resolveTexturePath(texName);
        try {
            const data = require('fs').readFileSync(texturePath);
            this.textureCache.set(texName, data);
            return data;
        }
        catch {
            return undefined;
        }
    }
}
function mergeTextures(parent, current) {
    return { ...parent, ...current };
}
function resolveTexturePointer(textures, token) {
    let current = token;
    if (!current.startsWith('#') && textures[current]) {
        current = textures[current];
    }
    let safety = 0;
    while (current.startsWith('#') && safety < 20) {
        const key = current.slice(1);
        const next = textures[key];
        if (!next) {
            break;
        }
        current = next;
        safety += 1;
    }
    return normalizeTextureRef(current);
}
function resolveModelWithInheritance(resolver, modelRef) {
    const key = normalizeModelRef(modelRef);
    const chain = [];
    let cursor = key;
    for (let i = 0; i < 25 && cursor; i += 1) {
        const model = resolver.getModel(cursor);
        if (!model) {
            break;
        }
        chain.push(model);
        cursor = model.parent ? normalizeModelRef(model.parent) : undefined;
    }
    const textures = {};
    let elements = [];
    for (let i = chain.length - 1; i >= 0; i -= 1) {
        const model = chain[i];
        if (model.textures) {
            Object.assign(textures, mergeTextures(textures, model.textures));
        }
        if (model.elements && model.elements.length > 0) {
            elements = model.elements;
        }
    }
    return { elements, textures };
}
function variantCandidatesFromBlockState(blockState, mappedState) {
    const candidates = [];
    if ('variants' in blockState && typeof blockState.variants === 'object' && blockState.variants !== null) {
        const variants = blockState.variants;
        const stateForMatch = mappedState;
        const variantEntries = Object.entries(variants);
        for (const [variantKey, variantValue] of variantEntries) {
            const whenState = parseVariantKey(variantKey);
            if (!stateMatches(whenState, stateForMatch)) {
                continue;
            }
            if (Array.isArray(variantValue)) {
                const first = variantValue[0];
                if (first && typeof first === 'object') {
                    candidates.push(first);
                }
            }
            else if (variantValue && typeof variantValue === 'object') {
                candidates.push(variantValue);
            }
        }
        if (candidates.length > 0) {
            return candidates;
        }
        // Fallback for malformed/mapped states.
        const exactKey = canonicalStateKey(mappedState);
        if (variants[exactKey] && typeof variants[exactKey] === 'object') {
            candidates.push(variants[exactKey]);
            return candidates;
        }
    }
    if ('multipart' in blockState && Array.isArray(blockState.multipart)) {
        const multipart = blockState.multipart;
        for (const part of multipart) {
            const when = part.when ?? undefined;
            let matches = true;
            if (when) {
                if (Array.isArray(when.OR)) {
                    const orClauses = when.OR;
                    matches = orClauses.some((clause) => {
                        if (!clause || typeof clause !== 'object') {
                            return false;
                        }
                        return stateMatches(clause, mappedState);
                    });
                }
                else {
                    matches = stateMatches(when, mappedState);
                }
            }
            if (!matches) {
                continue;
            }
            const apply = part.apply;
            if (Array.isArray(apply)) {
                const first = apply[0];
                if (first && typeof first === 'object') {
                    candidates.push(first);
                }
            }
            else if (apply && typeof apply === 'object') {
                candidates.push(apply);
            }
        }
    }
    return candidates;
}
function buildElementFaces(element, textures, resolver) {
    const out = {};
    for (const [faceName, faceInfo] of Object.entries(element.faces)) {
        if (!faceInfo) {
            continue;
        }
        const key = faceName;
        const faceDef = FACE_DEFS[key];
        if (!faceDef) {
            continue;
        }
        const textureToken = faceInfo.texture;
        const textureName = resolveTexturePointer(textures, textureToken);
        const texturePath = resolver.resolveTexturePath(textureName);
        const tintIndex = faceInfo.tintindex;
        const tint = tintIndex !== undefined ? [0.56, 0.74, 0.31] : [1, 1, 1];
        const from = element.from;
        const to = element.to;
        const size = [
            (to[0] - from[0]) / 16,
            (to[1] - from[1]) / 16,
            (to[2] - from[2]) / 16
        ];
        const origin = [from[0] / 16, from[1] / 16, from[2] / 16];
        const corners = faceDef.corners.map((c) => [
            origin[0] + c[0] * size[0],
            origin[1] + c[1] * size[1],
            origin[2] + c[2] * size[2]
        ]);
        let normal = [...faceDef.normal];
        if (element.rotation) {
            const r = element.rotation;
            const rotateOrigin = [r.origin[0] / 16, r.origin[1] / 16, r.origin[2] / 16];
            for (let i = 0; i < corners.length; i += 1) {
                corners[i] = axisAngleRotate(corners[i], rotateOrigin, r.axis, r.angle);
            }
            normal = axisAngleRotate([normal[0], normal[1], normal[2]], [0, 0, 0], r.axis, r.angle);
        }
        const uvBase = faceInfo.uv ?? faceDef.fallbackUv;
        const positions = [];
        const normals = [];
        const uvs = [];
        const colors = [];
        const triOrder = [0, 1, 2, 0, 2, 3];
        for (const idx of triOrder) {
            const c = corners[idx];
            positions.push(c[0], c[1], c[2]);
            normals.push(normal[0], normal[1], normal[2]);
            const uv = uvForFace(key, uvBase, faceInfo.rotation, idx);
            uvs.push(uv[0], uv[1]);
            colors.push(tint[0], tint[1], tint[2]);
        }
        const existing = out[texturePath];
        if (existing) {
            existing.positions.push(...positions);
            existing.normals.push(...normals);
            existing.uvs.push(...uvs);
            existing.colors.push(...colors);
        }
        else {
            out[texturePath] = {
                positions,
                normals,
                uvs,
                colors
            };
        }
    }
    return out;
}
function applyBlockRotation(geom, xDeg, yDeg, zDeg) {
    // Variant Y rotation from blockstates needs inverted sign in this coordinate setup.
    const m = rotationMatrixFromEulerDegrees(xDeg, -yDeg, zDeg);
    const pivot = [0.5, 0.5, 0.5];
    for (let i = 0; i < geom.positions.length; i += 3) {
        const p = [
            geom.positions[i] - pivot[0],
            geom.positions[i + 1] - pivot[1],
            geom.positions[i + 2] - pivot[2]
        ];
        const rotated = applyRotation(p, m);
        geom.positions[i] = rotated[0] + pivot[0];
        geom.positions[i + 1] = rotated[1] + pivot[1];
        geom.positions[i + 2] = rotated[2] + pivot[2];
    }
    for (let i = 0; i < geom.normals.length; i += 3) {
        const n = [geom.normals[i], geom.normals[i + 1], geom.normals[i + 2]];
        const rotated = applyRotation(n, m);
        geom.normals[i] = rotated[0];
        geom.normals[i + 1] = rotated[1];
        geom.normals[i + 2] = rotated[2];
    }
}
function translateGeometry(geom, x, y, z) {
    for (let i = 0; i < geom.positions.length; i += 3) {
        geom.positions[i] += x;
        geom.positions[i + 1] += y;
        geom.positions[i + 2] += z;
    }
}
function placementToGeometry(resolver, javaId, javaState) {
    if (javaId === 'air') {
        return [];
    }
    const stateDef = resolver.getBlockState(javaId);
    const effectiveState = mapVariantStateKeysForBlock(javaId, javaState);
    const variants = stateDef ? variantCandidatesFromBlockState(stateDef, effectiveState) : [];
    const candidateVariants = variants.length > 0
        ? variants
        : [{ model: `minecraft:block/${javaId}`, x: 0, y: 0, z: 0 }];
    const geoms = [];
    for (const variant of candidateVariants) {
        const resolved = resolveModelWithInheritance(resolver, variant.model);
        const elements = resolved.elements;
        if (!elements || elements.length === 0) {
            continue;
        }
        const batchByTexture = new Map();
        for (const element of elements) {
            const facesByTexture = buildElementFaces(element, resolved.textures, resolver);
            for (const [texturePath, faceGeom] of Object.entries(facesByTexture)) {
                const slot = batchByTexture.get(texturePath) ?? {
                    texturePath,
                    positions: [],
                    normals: [],
                    uvs: [],
                    colors: []
                };
                slot.positions.push(...faceGeom.positions);
                slot.normals.push(...faceGeom.normals);
                slot.uvs.push(...faceGeom.uvs);
                slot.colors.push(...faceGeom.colors);
                batchByTexture.set(texturePath, slot);
            }
        }
        for (const geom of batchByTexture.values()) {
            applyBlockRotation(geom, variant.x ?? 0, variant.y ?? 0, variant.z ?? 0);
            geoms.push(geom);
        }
    }
    return geoms;
}
async function buildViewerPayload(parsed) {
    const resolver = new AssetResolver();
    const batches = new Map();
    const unresolved = new Map();
    const texturePathsUsed = new Set();
    let renderedBlocks = 0;
    let renderedFaces = 0;
    let renderedVertices = 0;
    for (const placement of parsed.placements) {
        const palette = parsed.palette[placement.paletteIndex];
        if (!palette) {
            continue;
        }
        if (palette.id === 'minecraft:air') {
            continue;
        }
        const mapped = (0, bedrockModelMapper_1.mapBedrockBlockToJavaModel)(palette.id, palette.states);
        const geoms = placementToGeometry(resolver, mapped.javaId, mapped.state);
        if (geoms.length === 0) {
            unresolved.set(palette.id, (unresolved.get(palette.id) ?? 0) + 1);
            continue;
        }
        renderedBlocks += 1;
        for (const geom of geoms) {
            translateGeometry(geom, placement.x, placement.y, placement.z);
            texturePathsUsed.add(geom.texturePath);
            const batch = batches.get(geom.texturePath) ?? {
                positions: [],
                normals: [],
                uvs: [],
                colors: []
            };
            batch.positions.push(...geom.positions);
            batch.normals.push(...geom.normals);
            batch.uvs.push(...geom.uvs);
            batch.colors.push(...geom.colors);
            batches.set(geom.texturePath, batch);
            renderedVertices += geom.positions.length / 3;
            renderedFaces += geom.positions.length / 18;
        }
    }
    const textureBuffers = {};
    const textureSizes = {};
    for (const texPath of texturePathsUsed) {
        let data;
        try {
            data = require('fs').readFileSync(texPath);
        }
        catch {
            data = undefined;
        }
        const key = texPath;
        if (data) {
            textureBuffers[key] = toHex(new Uint8Array(data));
            textureSizes[key] = readPngSize(data);
        }
        else {
            const fallback = textureColorFallback(path.basename(texPath));
            const rgba = Buffer.from([fallback[0], fallback[1], fallback[2], 255]);
            textureBuffers[key] = toHex(new Uint8Array(rgba));
            textureSizes[key] = { width: 1, height: 1 };
        }
    }
    const outBatches = {};
    for (const [texPath, geom] of batches.entries()) {
        outBatches[texPath] = geom;
    }
    const unresolvedBlocks = Array.from(unresolved.entries())
        .map(([id, count]) => ({ id, count }))
        .sort((a, b) => b.count - a.count);
    return {
        size: parsed.size,
        textureBuffers,
        textureSizes,
        batches: outBatches,
        stats: {
            blocks: renderedBlocks,
            faces: renderedFaces,
            vertices: renderedVertices,
            unresolvedBlocks
        }
    };
}
//# sourceMappingURL=webviewApp.js.map