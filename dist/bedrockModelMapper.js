"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapBedrockBlockToJavaModel = mapBedrockBlockToJavaModel;
function stateOf(states, key) {
    return states[`minecraft:${key}`] ?? states[key];
}
function boolFrom(value) {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'number') {
        return value !== 0;
    }
    if (typeof value === 'string') {
        return value === 'true' || value === '1';
    }
    return false;
}
function numFrom(value, fallback = 0) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === 'string') {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }
    return fallback;
}
function strFrom(value, fallback = '') {
    if (typeof value === 'string') {
        return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }
    return fallback;
}
function mirrorNorthSouth(facing) {
    if (facing === 'north') {
        return 'south';
    }
    if (facing === 'south') {
        return 'north';
    }
    return facing;
}
function facingFromBedrockDirection(direction) {
    switch (direction) {
        case 2:
            return 'north';
        case 3:
            return 'south';
        case 4:
            return 'west';
        case 5:
            return 'east';
        default:
            return 'north';
    }
}
function weirdoToFacing(direction) {
    switch (direction) {
        case 0:
            return 'east';
        case 1:
            return 'west';
        case 2:
            return 'south';
        case 3:
            return 'north';
        default:
            return 'north';
    }
}
function torchFacing(value) {
    if (value === 'top') {
        return {
            javaId: 'torch',
            state: {}
        };
    }
    // Parser applies Z-mirror for Bedrock viewer orientation, so north/south must be swapped
    // before mapping attached-side semantics to Java wall_torch facing.
    const mirrored = mirrorNorthSouth(value);
    // Bedrock torch_facing_direction indicates the attached block side.
    // Java wall_torch.facing indicates the direction the torch points away from wall.
    let facing = 'north';
    switch (mirrored) {
        case 'north':
            facing = 'south';
            break;
        case 'south':
            facing = 'north';
            break;
        case 'east':
            facing = 'west';
            break;
        case 'west':
            facing = 'east';
            break;
        default:
            facing = 'north';
            break;
    }
    return {
        javaId: 'wall_torch',
        state: { facing }
    };
}
function slabTypeFromBedrockVerticalHalf(verticalHalf, blockId) {
    const type = strFrom(verticalHalf, 'bottom') === 'top' ? 'top' : 'bottom';
    const javaId = blockId.replace(/^minecraft:/, '');
    return {
        javaId,
        state: { type }
    };
}
function stairStateFromBedrock(states) {
    const upsideDown = boolFrom(stateOf(states, 'upside_down_bit'));
    const direction = numFrom(stateOf(states, 'weirdo_direction'), 3);
    const facing = weirdoToFacing(direction);
    const mirroredFacing = mirrorNorthSouth(facing);
    return {
        half: upsideDown ? 'top' : 'bottom',
        shape: 'straight',
        facing: mirroredFacing
    };
}
function wallSideFromBedrock(value) {
    const raw = strFrom(value, 'none');
    if (raw === 'short' || raw === 'low') {
        return 'low';
    }
    if (raw === 'tall') {
        return 'tall';
    }
    return 'none';
}
function standingSignSpec(states) {
    const woodType = strFrom(stateOf(states, 'wood_type'), 'oak');
    const planksByWood = {
        oak: 'oak_planks',
        spruce: 'spruce_planks',
        birch: 'birch_planks',
        jungle: 'jungle_planks',
        acacia: 'acacia_planks',
        dark_oak: 'dark_oak_planks',
        crimson: 'crimson_planks',
        warped: 'warped_planks',
        mangrove: 'mangrove_planks',
        bamboo: 'bamboo_planks',
        cherry: 'cherry_planks',
        pale_oak: 'pale_oak_planks'
    };
    return {
        javaId: planksByWood[woodType] ?? 'oak_planks',
        state: {}
    };
}
function mapBedrockBlockToJavaModel(bedrockId, states) {
    const cleanId = bedrockId.replace(/^minecraft:/, '');
    switch (cleanId) {
        case 'air':
            return { javaId: 'air', state: {} };
        case 'grass_block':
            return { javaId: 'grass_block', state: { snowy: 'false' } };
        case 'stone':
        case 'dirt':
        case 'chiseled_stone_bricks':
        case 'red_wool':
        case 'iron_block':
        case 'oak_fence':
        case 'stone_bricks':
        case 'obsidian':
        case 'light_gray_wool':
        case 'gray_wool':
        case 'light_blue_wool':
        case 'sand':
        case 'cobblestone':
        case 'gold_block':
        case 'structure_block':
            return { javaId: cleanId, state: {} };
        case 'smooth_stone_slab':
            return slabTypeFromBedrockVerticalHalf(stateOf(states, 'vertical_half'), cleanId);
        case 'smooth_stone_double_slab':
            return { javaId: 'smooth_stone_slab', state: { type: 'double' } };
        case 'brick_slab':
            return slabTypeFromBedrockVerticalHalf(stateOf(states, 'vertical_half'), cleanId);
        case 'brick_double_slab':
            return { javaId: 'brick_slab', state: { type: 'double' } };
        case 'stone_brick_slab':
            return slabTypeFromBedrockVerticalHalf(stateOf(states, 'vertical_half'), cleanId);
        case 'stone_brick_stairs':
            return {
                javaId: cleanId,
                state: stairStateFromBedrock(states)
            };
        case 'sticky_piston':
            return {
                javaId: cleanId,
                state: {
                    extended: 'false',
                    facing: mirrorNorthSouth(facingFromBedrockDirection(numFrom(stateOf(states, 'facing_direction'), 2)))
                }
            };
        case 'stone_button':
            {
                const facing = facingFromBedrockDirection(numFrom(stateOf(states, 'facing_direction'), 2));
                const mirroredFacing = mirrorNorthSouth(facing);
                return {
                    javaId: cleanId,
                    state: {
                        powered: boolFrom(stateOf(states, 'button_pressed_bit')) ? 'true' : 'false',
                        face: 'wall',
                        facing: mirroredFacing
                    }
                };
            }
        case 'tuff_brick_wall':
            return {
                javaId: 'tuff_brick_wall',
                state: {
                    north: wallSideFromBedrock(stateOf(states, 'wall_connection_type_north')),
                    east: wallSideFromBedrock(stateOf(states, 'wall_connection_type_east')),
                    south: wallSideFromBedrock(stateOf(states, 'wall_connection_type_south')),
                    west: wallSideFromBedrock(stateOf(states, 'wall_connection_type_west')),
                    up: boolFrom(stateOf(states, 'wall_post_bit'))
                }
            };
        case 'standing_sign':
            return standingSignSpec(states);
        case 'exposed_copper_golem_statue':
            return { javaId: 'exposed_copper', state: {} };
        case 'element_25':
            return { javaId: 'iron_block', state: {} };
        case 'torch':
            return torchFacing(strFrom(stateOf(states, 'torch_facing_direction'), 'top'));
        default:
            return { javaId: cleanId, state: {} };
    }
}
//# sourceMappingURL=bedrockModelMapper.js.map