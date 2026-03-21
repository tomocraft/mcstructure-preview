import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { foldGutter, foldKeymap, indentOnInput, bracketMatching, syntaxHighlighting, HighlightStyle, unfoldAll } from '@codemirror/language';
import { json } from '@codemirror/lang-json';
import { searchKeymap, highlightSelectionMatches, search, openSearchPanel, closeSearchPanel, findNext, findPrevious } from '@codemirror/search';
import { tags } from '@lezer/highlight';

const vscode = acquireVsCodeApi();

const canvas = document.getElementById('scene');
const statusEl = document.getElementById('status');
const btnReset = document.getElementById('btnReset');
const btnAutoRotate = document.getElementById('btnAutoRotate');
const btnGrid = document.getElementById('btnGrid');
const btnAxes = document.getElementById('btnAxes');
const btnWireframe = document.getElementById('btnWireframe');
const btnEdit = document.getElementById('btnEdit');
const jsonEditor = document.getElementById('jsonEditor');
const jsonEditorHost = document.getElementById('jsonEditorHost');
const btnJsonApply = document.getElementById('btnJsonApply');
const btnJsonClose = document.getElementById('btnJsonClose');
const btnJsonFormat = document.getElementById('btnJsonFormat');
const btnJsonExpandAll = document.getElementById('btnJsonExpandAll');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(window.devicePixelRatio || 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setSize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight, false);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1e1e1e);

const camera = new THREE.PerspectiveCamera(60, 1, 0.01, 4000);
camera.position.set(24, 18, 24);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 1;
controls.maxDistance = 3000;

const hemi = new THREE.HemisphereLight(0xffffff, 0xffffff, 1.05);
scene.add(hemi);

const dir = new THREE.DirectionalLight(0xffffff, 0.8);
dir.position.set(1, 2, 1);
scene.add(dir);

const rotatePivot = new THREE.Group();
scene.add(rotatePivot);

const worldRoot = new THREE.Group();
rotatePivot.add(worldRoot);

const jsonHighlightStyle = HighlightStyle.define([
  { tag: tags.propertyName, color: '#9cdcfe' },
  { tag: tags.string, color: '#ce9178' },
  { tag: tags.number, color: '#b5cea8' },
  { tag: tags.bool, color: '#569cd6' },
  { tag: tags.null, color: '#569cd6' },
  { tag: tags.brace, color: '#d4d4d4' },
  { tag: tags.squareBracket, color: '#d4d4d4' },
  { tag: tags.separator, color: '#d4d4d4' }
]);

const jsonEditorView = new EditorView({
  state: EditorState.create({
    doc: '',
    extensions: [
      lineNumbers(),
      foldGutter(),
      history(),
      indentOnInput(),
      bracketMatching(),
      highlightSelectionMatches(),
      json(),
      syntaxHighlighting(jsonHighlightStyle),
      search(),
      keymap.of([
        { key: 'Mod-f', run: openSearchPanel },
        { key: 'Escape', run: closeSearchPanel },
        ...defaultKeymap,
        ...historyKeymap,
        ...foldKeymap,
        ...searchKeymap
      ]),
      EditorView.theme({
        '&': {
          height: '100%',
          fontSize: '12px',
          backgroundColor: '#111111',
          color: '#d4d4d4'
        },

        '.cm-editor': {
          height: '100%',
          position: 'relative'
        },

        '.cm-scroller': {
          overflow: 'auto',
          fontFamily: 'Consolas, monospace',
          lineHeight: '1.45'
        },

        '.cm-content': {
          padding: '8px 0'
        },

        '.cm-line': {
          paddingLeft: '12px',
          paddingRight: '8px'
        },

        '.cm-gutters': {
          backgroundColor: '#111111',
          color: '#858585',
          borderRight: '1px solid rgba(255, 255, 255, 0.18)'
        },

        '.cm-activeLineGutter': {
          backgroundColor: '#1a1a1a'
        },

        '.cm-activeLine': {
          backgroundColor: 'rgba(255, 255, 255, 0.03)'
        },

        '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection': {
          backgroundColor: 'rgba(38, 79, 120, 0.6)'
        },

        '.cm-cursor': {
          borderLeftColor: '#d4d4d4'
        },

        '.cm-foldPlaceholder': {
          backgroundColor: '#2a2a2a',
          border: 'none',
          color: '#cccccc'
        },

        '.cm-panels': {
          position: 'absolute',
          top: '8px',
          right: '18px',
          left: 'auto',
          bottom: 'auto',
          width: 'auto',
          maxWidth: '420px',
          backgroundColor: 'transparent',
          zIndex: '40',
          pointerEvents: 'none'
        },

        '.cm-panels-bottom, .cm-panels-top': {
          border: 'none'
        },

        '.cm-search': {
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          flexWrap: 'wrap',
          width: '344px',
          padding: '8px',
          backgroundColor: '#252526',
          color: '#d4d4d4',
          border: '1px solid #3c3c3c',
          borderRadius: '6px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.35)',
          fontFamily: 'var(--vscode-font-family, Segoe UI, sans-serif)',
          fontSize: '13px'
        },

        '.cm-search *': {
          boxSizing: 'border-box'
        },

        '.cm-search input[type="text"]': {
          backgroundColor: '#1e1e1e !important',
          color: '#d4d4d4 !important',
          border: '1px solid #3c3c3c',
          borderRadius: '4px',
          padding: '4px 4px',
          boxShadow: 'none',
          outline: 'none',
          appearance: 'none',
          fontSize: '13px'
        },

        '.cm-search input[type="text"]:focus': {
          borderColor: '#007acc'
        },

        '.cm-search input[type="checkbox"]': {
          appearance: 'auto',
          accentColor: '#007acc',
          cursor: 'pointer'
        },

        '.cm-search button, .cm-search input[type="button"]': {
          background: '#2f2f2f !important',
          color: '#d4d4d4 !important',
          border: '1px solid #4a4a4a',
          borderRadius: '4px',
          padding: '4px 4px',
          fontSize: '13px',
          cursor: 'pointer',
          appearance: 'none',
          boxShadow: 'none',
          backgroundImage: 'none',
          textShadow: 'none'
        },

        '.cm-search button:hover, .cm-search input[type="button"]:hover': {
          background: '#3a3a3a !important'
        },

        '.cm-search button:active, .cm-search input[type="button"]:active': {
          background: '#3a3a3a !important'
        },

        '.cm-search button:disabled, .cm-search input[type="button"]:disabled': {
          opacity: '0.5',
          cursor: 'default'
        },

        '.cm-search input[type="checkbox"]': {
          accentColor: '#007acc',
          cursor: 'pointer'
        },

        '.cm-search label': {
          fontSize: '13px',
          color: '#cccccc',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        },

        '.cm-search [name="close"]': {
          background: '#2f2f2f !important',
          color: '#d4d4d4 !important',
          border: '1px solid #4a4a4a',
          borderRadius: '4px',
          padding: '4px 10px',
          fontWeight: 'normal',
          appearance: 'none',
          boxShadow: 'none',
          backgroundImage: 'none',
          textShadow: 'none'
        },

        '.cm-search [name="close"]:hover': {
          background: '#3a3a3a !important'
        },

        '.cm-search .cm-search-count': {
          fontSize: '12px',
          color: '#cccccc'
        }
      }, { dark: true })
    ]
  }),
  parent: jsonEditorHost
});

let gridHelper = null;
let axesHelper = null;
let wireframeEnabled = false;
let gridVisible = true;
let axesVisible = false;
let autoRotate = false;
let currentMeshes = [];

const textureCache = new Map();

function setStatus(text) {
  statusEl.textContent = text;
}

function hexToBytes(hex) {
  const len = Math.floor(hex.length / 2);
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function createFallbackDataTexture(color) {
  const bytes = new Uint8Array([color[0], color[1], color[2], 255]);
  const texture = new THREE.DataTexture(bytes, 1, 1, THREE.RGBAFormat);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function hashColor(seed) {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return [
    90 + (hash & 0x7f),
    90 + ((hash >> 8) & 0x7f),
    90 + ((hash >> 16) & 0x7f)
  ];
}

function loadTextureFromPayload(pathKey, textureBuffers, textureSizes) {
  if (textureCache.has(pathKey)) {
    return Promise.resolve(textureCache.get(pathKey));
  }

  const hex = textureBuffers[pathKey];
  if (!hex) {
    const fallback = createFallbackDataTexture(hashColor(pathKey));
    textureCache.set(pathKey, fallback);
    return Promise.resolve(fallback);
  }

  const bytes = hexToBytes(hex);
  const size = textureSizes[pathKey] || { width: 16, height: 16 };

  // If bytes appear to be raw RGBA fallback pixels, use DataTexture directly.
  if (bytes.length === size.width * size.height * 4) {
    const texture = new THREE.DataTexture(bytes, size.width, size.height, THREE.RGBAFormat);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    texture.colorSpace = THREE.SRGBColorSpace;
    textureCache.set(pathKey, texture);
    return Promise.resolve(texture);
  }

  return new Promise((resolve) => {
    const blob = new Blob([bytes], { type: 'image/png' });
    const objectUrl = URL.createObjectURL(blob);
    const loader = new THREE.TextureLoader();
    loader.load(
      objectUrl,
      (texture) => {
        URL.revokeObjectURL(objectUrl);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.generateMipmaps = false;
        texture.anisotropy = 1;
        texture.colorSpace = THREE.SRGBColorSpace;
        textureCache.set(pathKey, texture);
        resolve(texture);
      },
      undefined,
      () => {
        URL.revokeObjectURL(objectUrl);
        const fallback = createFallbackDataTexture(hashColor(pathKey));
        textureCache.set(pathKey, fallback);
        resolve(fallback);
      }
    );
  });
}

function disposeSceneMeshes() {
  for (const mesh of currentMeshes) {
    worldRoot.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
  }
  currentMeshes = [];
  rotatePivot.rotation.set(0, 0, 0);
}

function updateHelpers(size) {
  if (gridHelper) {
    worldRoot.remove(gridHelper);
  }
  if (axesHelper) {
    worldRoot.remove(axesHelper);
  }

  const extent = Math.max(size[0], size[2], 16);
  const divisions = Math.max(8, Math.min(160, extent));
  gridHelper = new THREE.GridHelper(extent, divisions, 0x666666, 0x333333);
  gridHelper.position.set(size[0] / 2, 0, size[2] / 2);
  gridHelper.visible = gridVisible;
  worldRoot.add(gridHelper);

  axesHelper = new THREE.AxesHelper(Math.max(8, extent * 0.15));
  axesHelper.position.set(0, 0, 0);
  axesHelper.visible = axesVisible;
  worldRoot.add(axesHelper);
}

function frameToObject(object) {
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) {
    controls.target.set(0, 0, 0);
    camera.position.set(20, 16, 20);
    controls.update();
    return;
  }

  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const radius = Math.max(size.x, size.y, size.z) * 0.9;

  controls.target.copy(center);
  const distance = Math.max(radius * 1.8, 12);
  camera.position.set(center.x + distance, center.y + distance * 0.75, center.z + distance);
  camera.near = Math.max(0.01, distance / 2000);
  camera.far = Math.max(4000, distance * 16);
  camera.updateProjectionMatrix();
  controls.update();
}

async function renderPayload(payload) {
  disposeSceneMeshes();

  const textureBuffers = payload.textureBuffers || {};
  const textureSizes = payload.textureSizes || {};
  const batches = payload.batches || {};

  const entries = Object.entries(batches);
  if (entries.length === 0) {
    setStatus('No visible blocks were generated.');
    return;
  }

  const textures = new Map();
  await Promise.all(
    entries.map(async ([texturePath]) => {
      const tex = await loadTextureFromPayload(texturePath, textureBuffers, textureSizes);
      textures.set(texturePath, tex);
    })
  );

  for (const [texturePath, batch] of entries) {
    const positions = new Float32Array(batch.positions || []);
    const normals = new Float32Array(batch.normals || []);
    const uvs = new Float32Array(batch.uvs || []);
    const colors = new Float32Array(batch.colors || []);
    if (positions.length === 0) {
      continue;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeBoundingSphere();

    const material = new THREE.MeshLambertMaterial({
      map: textures.get(texturePath) || null,
      vertexColors: true,
      transparent: true,
      alphaTest: 0.001,
      wireframe: wireframeEnabled
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = true;
    worldRoot.add(mesh);
    currentMeshes.push(mesh);
  }

  updateHelpers(payload.size || [16, 16, 16]);
  const size = payload.size || [16, 16, 16];
  const pivotX = size[0] / 2;
  const pivotY = size[1] / 2;
  const pivotZ = size[2] / 2;
  rotatePivot.position.set(pivotX, pivotY, pivotZ);
  worldRoot.position.set(-pivotX, -pivotY, -pivotZ);
  frameToObject(rotatePivot);

  const unresolved = (payload.stats?.unresolvedBlocks || [])
    .slice(0, 4)
    .map((u) => `${u.id} (${u.count})`)
    .join(', ');
  const unresolvedSuffix = unresolved ? ` | unresolved: ${unresolved}` : '';
  setStatus(
    `blocks: ${payload.stats?.blocks ?? 0}, faces: ${payload.stats?.faces ?? 0}, vertices: ${payload.stats?.vertices ?? 0}${unresolvedSuffix}`
  );
}

function onResize() {
  const width = canvas.clientWidth || window.innerWidth;
  const height = canvas.clientHeight || window.innerHeight;
  camera.aspect = Math.max(0.01, width / Math.max(1, height));
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

btnReset.addEventListener('click', () => frameToObject(rotatePivot));

btnAutoRotate.addEventListener('click', () => {
  autoRotate = !autoRotate;
  btnAutoRotate.textContent = `Auto Rotate: ${autoRotate ? 'On' : 'Off'}`;
});

btnGrid.addEventListener('click', () => {
  gridVisible = !gridVisible;
  if (gridHelper) {
    gridHelper.visible = gridVisible;
  }
  btnGrid.textContent = `Grid: ${gridVisible ? 'On' : 'Off'}`;
});

btnAxes.addEventListener('click', () => {
  axesVisible = !axesVisible;
  if (axesHelper) {
    axesHelper.visible = axesVisible;
  }
  btnAxes.textContent = `Axes: ${axesVisible ? 'On' : 'Off'}`;
});

btnWireframe.addEventListener('click', () => {
  wireframeEnabled = !wireframeEnabled;
  for (const mesh of currentMeshes) {
    mesh.material.wireframe = wireframeEnabled;
  }
  btnWireframe.textContent = `Wireframe: ${wireframeEnabled ? 'On' : 'Off'}`;
});

btnEdit.addEventListener('click', () => {
  setStatus('Preparing JSON editor...');
  vscode.postMessage({ type: 'requestEditJson' });
});

btnJsonClose.addEventListener('click', () => {
  jsonEditor.classList.remove('visible');
});

btnJsonApply.addEventListener('click', () => {
  vscode.postMessage({
    type: 'applyJson',
    jsonText: jsonEditorView.state.doc.toString()
  });
});

btnJsonFormat.addEventListener('click', () => {
  try {
    const currentText = jsonEditorView.state.doc.toString();
    const parsed = JSON.parse(currentText);
    const formatted = JSON.stringify(parsed, null, 2);

    jsonEditorView.dispatch({
      changes: {
        from: 0,
        to: jsonEditorView.state.doc.length,
        insert: formatted
      }
    });

    setStatus('Formatted JSON.');
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    setStatus(`Format failed: ${msg}`);
  }
});

btnJsonExpandAll.addEventListener('click', () => {
  unfoldAll(jsonEditorView);
  jsonEditorView.focus();
});


window.addEventListener('resize', onResize);

window.addEventListener('message', async (event) => {
  const message = event.data;
  if (!message || typeof message !== 'object') {
    return;
  }
  if (message.type === 'error') {
    setStatus(message.message || 'Failed to load preview.');
    return;
  }
  if (message.type === 'status') {
    setStatus(message.message || '');
    return;
  }
  if (message.type === 'editJson') {
    const text = typeof message.jsonText === 'string' ? message.jsonText : '';
    jsonEditorView.dispatch({
      changes: {
        from: 0,
        to: jsonEditorView.state.doc.length,
        insert: text
      }
    });
    jsonEditor.classList.add('visible');
    jsonEditorView.focus();
    return;
  }
  if (message.type === 'payload') {
    await renderPayload(message.payload || {});
  }
});

function animate() {
  requestAnimationFrame(animate);
  if (autoRotate && currentMeshes.length > 0) {
    rotatePivot.rotation.y += 0.003;
  }
  controls.update();
  renderer.render(scene, camera);
}

onResize();
animate();
vscode.postMessage({ type: 'ready' });

