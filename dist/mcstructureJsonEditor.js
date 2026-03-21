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
exports.buildEditableJson = buildEditableJson;
exports.applyEditableJson = applyEditableJson;
const nbt = __importStar(require("prismarine-nbt"));
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function asTag(value, path) {
    if (!isRecord(value) || typeof value.type !== 'string' || !('value' in value)) {
        throw new Error(`Invalid NBT tag shape at ${path}.`);
    }
    return {
        type: value.type,
        value: value.value,
        name: typeof value.name === 'string' ? value.name : undefined
    };
}
function asListValue(value, path) {
    if (!isRecord(value) || typeof value.type !== 'string' || !Array.isArray(value.value)) {
        throw new Error(`Expected list value at ${path}.`);
    }
    return {
        type: value.type,
        value: value.value
    };
}
function asObject(value, path) {
    if (!isRecord(value)) {
        throw new Error(`Expected JSON object at ${path}.`);
    }
    return value;
}
function asFiniteNumber(value, path) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new Error(`Expected finite number at ${path}.`);
    }
    return value;
}
function asInteger(value, path) {
    const n = asFiniteNumber(value, path);
    if (!Number.isInteger(n)) {
        throw new Error(`Expected integer at ${path}.`);
    }
    return n;
}
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
function asNumberArray(value, path, map) {
    if (!Array.isArray(value)) {
        throw new Error(`Expected number array at ${path}.`);
    }
    return value.map((entry, index) => map(entry, `${path}[${index}]`));
}
function asLongValue(value, path) {
    if (Array.isArray(value)) {
        if (value.length !== 2) {
            throw new Error(`Expected [lo, hi] array for long tag at ${path}.`);
        }
        const lo = clamp(asInteger(value[0], `${path}[0]`), -2147483648, 2147483647);
        const hi = clamp(asInteger(value[1], `${path}[1]`), -2147483648, 2147483647);
        return BigInt.asIntN(64, (BigInt(hi) << 32n) | BigInt(lo >>> 0));
    }
    if (typeof value === 'bigint') {
        return value;
    }
    if (typeof value === 'number') {
        if (!Number.isFinite(value) || !Number.isInteger(value)) {
            throw new Error(`Expected integer number for long tag at ${path}.`);
        }
        return BigInt(value);
    }
    if (typeof value === 'string') {
        const text = value.trim();
        if (!/^-?\d+$/.test(text)) {
            throw new Error(`Expected decimal string for long tag at ${path}.`);
        }
        return BigInt(text);
    }
    throw new Error(`Expected bigint/number/string for long tag at ${path}.`);
}
function convertPrimitiveByType(tagType, input, path) {
    switch (tagType) {
        case 'byte':
            return clamp(asInteger(input, path), -128, 127);
        case 'short':
            return clamp(asInteger(input, path), -32768, 32767);
        case 'int':
            return clamp(asInteger(input, path), -2147483648, 2147483647);
        case 'float':
        case 'double':
            return asFiniteNumber(input, path);
        case 'string':
            if (typeof input !== 'string') {
                throw new Error(`Expected string at ${path}.`);
            }
            return input;
        case 'long':
            return asLongValue(input, path);
        default:
            throw new Error(`Unsupported primitive list type "${tagType}" at ${path}.`);
    }
}
function convertListEntry(itemType, templateEntry, input, path) {
    if (itemType === 'compound') {
        if (templateEntry === undefined || !isRecord(templateEntry)) {
            throw new Error(`Cannot infer structure for compound item at ${path}.`);
        }
        return convertByTemplate({ type: 'compound', value: templateEntry }, input, path).value;
    }
    if (itemType === 'list') {
        if (templateEntry === undefined || !isRecord(templateEntry)) {
            throw new Error(`Cannot infer structure for nested list item at ${path}.`);
        }
        return convertByTemplate({ type: 'list', value: templateEntry }, input, path).value;
    }
    return convertPrimitiveByType(itemType, input, path);
}
function convertByTemplate(template, input, path) {
    switch (template.type) {
        case 'compound': {
            const templateValue = asObject(template.value, `${path}.value`);
            const inputValue = asObject(input, path);
            const outValue = {};
            for (const [key, child] of Object.entries(templateValue)) {
                if (child === undefined) {
                    continue;
                }
                if (!(key in inputValue)) {
                    throw new Error(`Missing key "${key}" at ${path}.`);
                }
                outValue[key] = convertByTemplate(asTag(child, `${path}.${key}`), inputValue[key], `${path}.${key}`);
            }
            for (const key of Object.keys(inputValue)) {
                if (!(key in templateValue)) {
                    throw new Error(`Unknown key "${key}" at ${path}.`);
                }
            }
            return {
                ...template,
                value: outValue
            };
        }
        case 'list': {
            const templateList = asListValue(template.value, `${path}.value`);
            if (!Array.isArray(input)) {
                throw new Error(`Expected array at ${path}.`);
            }
            if (templateList.type === 'end' && input.length > 0) {
                throw new Error(`Cannot add items to empty-end list at ${path}.`);
            }
            const templateItems = templateList.value;
            const outItems = input.map((entry, index) => convertListEntry(templateList.type, templateItems[index] ?? templateItems[0], entry, `${path}[${index}]`));
            return {
                ...template,
                value: {
                    type: templateList.type,
                    value: outItems
                }
            };
        }
        case 'byteArray':
            return {
                ...template,
                value: asNumberArray(input, path, (entry, entryPath) => clamp(asInteger(entry, entryPath), -128, 127))
            };
        case 'shortArray':
            return {
                ...template,
                value: asNumberArray(input, path, (entry, entryPath) => clamp(asInteger(entry, entryPath), -32768, 32767))
            };
        case 'intArray':
            return {
                ...template,
                value: asNumberArray(input, path, (entry, entryPath) => clamp(asInteger(entry, entryPath), -2147483648, 2147483647))
            };
        case 'longArray': {
            if (!Array.isArray(input)) {
                throw new Error(`Expected long array at ${path}.`);
            }
            return {
                ...template,
                value: input.map((entry, index) => asLongValue(entry, `${path}[${index}]`))
            };
        }
        case 'byte':
        case 'short':
        case 'int':
        case 'float':
        case 'double':
        case 'string':
        case 'long':
            return {
                ...template,
                value: convertPrimitiveByType(template.type, input, path)
            };
        default:
            throw new Error(`Unsupported NBT tag type "${template.type}" at ${path}.`);
    }
}
function toEditableJsonString(value) {
    return JSON.stringify(value, (_key, item) => (typeof item === 'bigint' ? `${item.toString()}n` : item), 2);
}
async function buildEditableJson(data) {
    const { parsed } = await nbt.parse(Buffer.from(data), 'little');
    const simplified = nbt.simplify(parsed);
    return toEditableJsonString(simplified);
}
async function applyEditableJson(originalData, jsonText) {
    let parsedJson;
    try {
        parsedJson = JSON.parse(jsonText);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Invalid JSON: ${message}`);
    }
    const normalizeLongLiterals = (value) => {
        if (Array.isArray(value)) {
            return value.map((entry) => normalizeLongLiterals(entry));
        }
        if (!isRecord(value)) {
            if (typeof value === 'string' && /^-?\d+n$/.test(value.trim())) {
                return BigInt(value.trim().slice(0, -1));
            }
            return value;
        }
        const out = {};
        for (const [k, v] of Object.entries(value)) {
            out[k] = normalizeLongLiterals(v);
        }
        return out;
    };
    const normalizedJson = normalizeLongLiterals(parsedJson);
    const { parsed } = await nbt.parse(Buffer.from(originalData), 'little');
    const templateRoot = asTag(parsed, 'root');
    const updatedRoot = convertByTemplate(templateRoot, normalizedJson, 'root');
    const out = nbt.writeUncompressed(updatedRoot, 'little');
    return new Uint8Array(out);
}
//# sourceMappingURL=mcstructureJsonEditor.js.map