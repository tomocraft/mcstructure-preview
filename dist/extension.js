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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const mcstructureParser_1 = require("./mcstructureParser");
const webviewApp_1 = require("./webviewApp");
const mcstructureJsonEditor_1 = require("./mcstructureJsonEditor");
class McstructureDocument {
    constructor(uri) {
        this.uri = uri;
    }
    dispose() { }
}
class McstructurePreviewProvider {
    static register(context) {
        return vscode.window.registerCustomEditorProvider(McstructurePreviewProvider.viewType, new McstructurePreviewProvider(context), {
            webviewOptions: {
                retainContextWhenHidden: true
            },
            supportsMultipleEditorsPerDocument: false
        });
    }
    constructor(context) {
        this.context = context;
    }
    async openCustomDocument(uri, _openContext, _token) {
        return new McstructureDocument(uri);
    }
    async resolveCustomEditor(document, webviewPanel, _token) {
        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this.context.extensionUri, 'media')
            ]
        };
        webviewPanel.webview.html = this.getHtml(webviewPanel.webview);
        const postError = (message) => {
            void webviewPanel.webview.postMessage({ type: 'error', message });
        };
        const buildPayload = async (fileData) => {
            const parsed = await (0, mcstructureParser_1.parseMcstructure)(fileData);
            return (0, webviewApp_1.buildViewerPayload)(parsed);
        };
        let cachedFileData;
        let cachedJsonText;
        let payload;
        let loadError;
        try {
            const fileData = await vscode.workspace.fs.readFile(document.uri);
            cachedFileData = fileData;
            payload = await buildPayload(fileData);
            void (0, mcstructureJsonEditor_1.buildEditableJson)(fileData).then((jsonText) => {
                cachedJsonText = jsonText;
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            loadError = `Failed to parse .mcstructure file: ${message}`;
        }
        webviewPanel.webview.onDidReceiveMessage(async (message) => {
            if (typeof message !== 'object' || message === null) {
                return;
            }
            const type = message.type;
            if (type === 'ready') {
                if (loadError) {
                    postError(loadError);
                    return;
                }
                void webviewPanel.webview.postMessage({
                    type: 'payload',
                    payload
                });
                return;
            }
            if (type === 'requestEditJson') {
                try {
                    if (!cachedJsonText) {
                        const fileData = cachedFileData ?? await vscode.workspace.fs.readFile(document.uri);
                        cachedFileData = fileData;
                        cachedJsonText = await (0, mcstructureJsonEditor_1.buildEditableJson)(fileData);
                    }
                    await webviewPanel.webview.postMessage({
                        type: 'editJson',
                        jsonText: cachedJsonText
                    });
                }
                catch (error) {
                    const msg = error instanceof Error ? error.message : String(error);
                    postError(`Failed to open JSON editor: ${msg}`);
                }
                return;
            }
            if (type === 'applyJson') {
                const jsonText = message.jsonText;
                if (typeof jsonText !== 'string') {
                    postError('Invalid JSON payload.');
                    return;
                }
                try {
                    const current = cachedFileData ?? await vscode.workspace.fs.readFile(document.uri);
                    const updated = await (0, mcstructureJsonEditor_1.applyEditableJson)(current, jsonText);
                    await vscode.workspace.fs.writeFile(document.uri, updated);
                    cachedFileData = updated;
                    cachedJsonText = jsonText;
                    payload = await buildPayload(updated);
                    loadError = undefined;
                    await webviewPanel.webview.postMessage({
                        type: 'payload',
                        payload
                    });
                    await webviewPanel.webview.postMessage({
                        type: 'status',
                        message: 'Saved JSON changes to .mcstructure.'
                    });
                }
                catch (error) {
                    const msg = error instanceof Error ? error.message : String(error);
                    postError(`Failed to apply JSON changes: ${msg}`);
                }
            }
        });
    }
    getHtml(webview) {
        const viewerScriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'viewer.js'));
        const threeModuleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'vendor', 'three', 'build', 'three.module.js'));
        const threeAddonsBaseUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'vendor', 'three', 'examples', 'jsm'));
        const nonce = getNonce();
        const csp = [
            "default-src 'none'",
            `img-src ${webview.cspSource} blob: data:`,
            `style-src ${webview.cspSource} 'unsafe-inline'`,
            `script-src 'nonce-${nonce}'`,
            `font-src ${webview.cspSource}`
        ].join('; ');
        return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MCStructure Preview</title>
    <style>
      :root {
        color-scheme: dark;
      }
      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: #1e1e1e;
        color: #d4d4d4;
        font-family: var(--vscode-font-family, Segoe UI, sans-serif);
      }
      #app {
        display: grid;
        grid-template-rows: auto 1fr auto;
        width: 100%;
        height: 100%;
      }
      #viewport {
        position: relative;
        width: 100%;
        height: 100%;
      }
      #toolbar {
        display: flex;
        gap: 8px;
        align-items: center;
        padding: 8px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        background: #202020;
      }
      #toolbar button {
        background: #2f2f2f;
        border: 1px solid #4a4a4a;
        color: inherit;
        border-radius: 4px;
        padding: 4px 10px;
        cursor: pointer;
      }
      #toolbar button:hover {
        background: #3a3a3a;
      }
      #scene {
        width: 100%;
        height: 100%;
        display: block;
      }
      #jsonEditor {
        position: absolute;
        inset: 12px;
        border: 1px solid rgba(255, 255, 255, 0.18);
        background: #1b1b1b;
        display: none;
        flex-direction: column;
        gap: 8px;
        padding: 10px;
        z-index: 20;
      }
      #jsonEditor.visible {
        display: flex;
      }
      #jsonEditorHeader {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      #jsonEditorButtons {
        display: flex;
        gap: 8px;
      }
      #jsonTextarea {
        width: 100%;
        height: 100%;
        flex: 1;
        resize: none;
        box-sizing: border-box;
        border: 1px solid rgba(255, 255, 255, 0.18);
        background: #111;
        color: #ddd;
        font-family: Consolas, monospace;
        font-size: 12px;
        line-height: 1.45;
        padding: 8px;
      }
      #status {
        padding: 6px 10px;
        font-size: 12px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        background: #202020;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    </style>
    <script type="importmap" nonce="${nonce}">
      {
        "imports": {
          "three": "${threeModuleUri}",
          "three/addons/": "${threeAddonsBaseUri}/"
        }
      }
    </script>
  </head>
  <body>
    <div id="app">
      <div id="toolbar">
        <button id="btnReset">Reset View</button>
        <button id="btnAutoRotate">Auto Rotate: Off</button>
        <button id="btnGrid">Grid: On</button>
        <button id="btnAxes">Axes: Off</button>
        <button id="btnWireframe">Wireframe: Off</button>
        <button id="btnEdit">Edit JSON</button>
      </div>
      <div id="viewport">
        <canvas id="scene"></canvas>
        <div id="jsonEditor">
          <div id="jsonEditorHeader">
            <span>MCStructure JSON Editor</span>
            <div id="jsonEditorButtons">
              <button id="btnJsonApply">Apply</button>
              <button id="btnJsonClose">Close</button>
            </div>
          </div>
          <textarea id="jsonTextarea" spellcheck="false"></textarea>
        </div>
      </div>
      <div id="status">Waiting for structure data...</div>
    </div>
    <script type="module" nonce="${nonce}" src="${viewerScriptUri}"></script>
  </body>
</html>`;
    }
}
McstructurePreviewProvider.viewType = 'mcstructure.preview';
function getNonce() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let value = '';
    for (let i = 0; i < 32; i += 1) {
        value += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return value;
}
function activate(context) {
    context.subscriptions.push(McstructurePreviewProvider.register(context));
}
function deactivate() { }
//# sourceMappingURL=extension.js.map