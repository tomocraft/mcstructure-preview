# MCStructure Preview

[![Visual Studio Marketplace](https://img.shields.io/visual-studio-marketplace/v/Tomocraft.mcstructure-preview?style=for-the-badge&label=VS%20Marketplace&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=Tomocraft.mcstructure-preview)
[![Open VSX Downloads](https://img.shields.io/badge/dynamic/json?url=https://open-vsx.org/api/Tomocraft/mcstructure-preview&query=$.downloadCount&label=Open%20VSX%20Downloads&style=for-the-badge&logo=eclipseide)](https://open-vsx.org/extension/Tomocraft/mcstructure-preview)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/Tomocraft.mcstructure-preview?style=for-the-badge)](https://marketplace.visualstudio.com/items?itemName=Tomocraft.mcstructure-preview)
[![Join my Discord](https://img.shields.io/badge/Discord-Join%20Chat-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/3Fdp6vBxtb)
[![License](https://img.shields.io/github/license/tomocraft/mcstructure-preview?style=for-the-badge)](https://github.com/tomocraft/mcstructure-preview/blob/main/LICENSE)

MCStructure Preview is a Visual Studio Code extension that provides an interactive 3D preview for Minecraft Bedrock Edition `.mcstructure` files.

## Preview

![Preview a Minecraft Bedrock .mcstructure file](https://raw.githubusercontent.com/tomocraft/mcstructure-preview/main/images/demo.png)

## Features

- Render `.mcstructure` files in a custom 3D editor inside VS Code
- Mouse controls for rotate, pan, and zoom (three.js OrbitControls)
- Map Bedrock block IDs and states to Java edition block models for rendering
- Resolve models and textures from the `minecraft-assets` package
- JSON editing: use the `Edit JSON` button to edit and save structure data

Preview toolbar

- Reset View
- Auto Rotate
- Toggle Grid
- Toggle Axes
- Toggle Wireframe
- Edit JSON

## Installation

### Option 1: Visual Studio Marketplace

Install from Marketplace once published:

- Open Extensions in VS Code and search for `mcstructure preview`
- Or open the Marketplace page: https://marketplace.visualstudio.com/items?itemName=Tomocraft.mcstructure-preview

### Option 2: GitHub Release (.vsix)

1. Open the latest GitHub Release.
2. Download the .vsix asset.
3. In VS Code, run Extensions: Install from VSIX....
4. Select the downloaded .vsix file.

## Quick start

- Open a `.mcstructure` file in VS Code to launch the `MCStructure 3D Preview` custom editor.
- Adjust the view using the toolbar and mouse controls.
- Click `Edit JSON` to modify the structure data and save changes back to the `.mcstructure` file.

## Dependencies

- `minecraft-assets`
- `three`
- `prismarine-nbt`

See `package.json` for exact dependency versions.

## Important Notes

- This project is not yet complete.
- Some blocks are not currently supported by this extension.
- I am looking for someone to take over development of this extension.
- If you are interested, please let me know.
- You can contact me on Discord: `awfulbread`.

## Feedback

Please file issues for bug reports or feature requests.

