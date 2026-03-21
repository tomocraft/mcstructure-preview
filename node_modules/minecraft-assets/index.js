const mcDataToNode = require('./lib/loader')
const cache = {} // prevent reindexing when requiring multiple time the same version

function getVersion (mcVersion) {
  if (cache[mcVersion]) { return cache[mcVersion] }
  const mcData = data[mcVersion]
  if (mcData == null) { return null }
  const nmcData = mcDataToNode(mcData, mcVersion)
  cache[mcVersion] = nmcData
  return nmcData
}

function toMajor (version) {
  const [a, b] = (version + '').split('.')
  return a + '.' + b
}

function minor (version) {
  const [, , c] = (version + '.0').split('.')
  return parseInt(c, 10)
}

module.exports = function (mcVersion) {
  // Check exact version first
  let assets = getVersion(mcVersion)
  if (assets) { return assets }
  // If not found, resort to the last of major
  assets = getVersion(lastOfMajor[toMajor(mcVersion)])
  return assets
}

const data = {
  '1.21.11': {
    blocksTextures: require('./minecraft-assets/data/1.21.11/blocks_textures'),
    itemsTextures: require('./minecraft-assets/data/1.21.11/items_textures'),
    textureContent: require('./minecraft-assets/data/1.21.11/texture_content'),
    blocksStates: require('./minecraft-assets/data/1.21.11/blocks_states'),
    blocksModels: require('./minecraft-assets/data/1.21.11/blocks_models')
  }
}

module.exports.versions = Object.keys(data)

const lastOfMajor = {}
for (const version in data) {
  const major = toMajor(version)
  if (lastOfMajor[major]) {
    if (minor(lastOfMajor[major]) < minor(version)) {
      lastOfMajor[major] = version
    }
  } else {
    lastOfMajor[major] = version
  }
}
