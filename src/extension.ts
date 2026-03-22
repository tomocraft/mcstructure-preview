import * as vscode from 'vscode';
import { parseMcstructure } from './mcstructureParser';
import { buildViewerPayload } from './webviewApp';
import { applyEditableJson, buildEditableJson } from './mcstructureJsonEditor';

class McstructureDocument implements vscode.CustomDocument {
  public constructor(public readonly uri: vscode.Uri) { }

  public dispose(): void { }
}

class McstructurePreviewProvider implements vscode.CustomReadonlyEditorProvider<McstructureDocument> {
  public static readonly viewType = 'mcstructure.preview';

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(
      McstructurePreviewProvider.viewType,
      new McstructurePreviewProvider(context),
      {
        webviewOptions: {
          retainContextWhenHidden: true
        },
        supportsMultipleEditorsPerDocument: false
      }
    );
  }

  private constructor(private readonly context: vscode.ExtensionContext) { }

  public async openCustomDocument(
    uri: vscode.Uri,
    _openContext: vscode.CustomDocumentOpenContext,
    _token: vscode.CancellationToken
  ): Promise<McstructureDocument> {
    return new McstructureDocument(uri);
  }

  public async resolveCustomEditor(
    document: McstructureDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, 'media'),
        vscode.Uri.joinPath(this.context.extensionUri, 'node_modules', 'three')
      ]
    };

    webviewPanel.webview.html = this.getHtml(webviewPanel.webview);

    const postError = (message: string): void => {
      void webviewPanel.webview.postMessage({ type: 'error', message });
    };

    const buildPayload = async (fileData: Uint8Array): Promise<unknown> => {
      const parsed = await parseMcstructure(fileData);
      return buildViewerPayload(parsed);
    };

    let cachedFileData: Uint8Array | undefined;
    let cachedJsonText: string | undefined;

    let payload: unknown;
    let loadError: string | undefined;
    try {
      const fileData = await vscode.workspace.fs.readFile(document.uri);
      cachedFileData = fileData;
      payload = await buildPayload(fileData);
      void buildEditableJson(fileData).then((jsonText) => {
        cachedJsonText = jsonText;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      loadError = `Failed to parse .mcstructure file: ${message}`;
    }

    webviewPanel.webview.onDidReceiveMessage(async (message: unknown) => {
      if (typeof message !== 'object' || message === null) {
        return;
      }

      const type = (message as { type?: string }).type;

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
            cachedJsonText = await buildEditableJson(fileData);
          }
          await webviewPanel.webview.postMessage({
            type: 'editJson',
            jsonText: cachedJsonText
          });
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          postError(`Failed to open JSON editor: ${msg}`);
        }
        return;
      }

      if (type === 'applyJson') {
        const jsonText = (message as { jsonText?: unknown }).jsonText;
        if (typeof jsonText !== 'string') {
          postError('Invalid JSON payload.');
          return;
        }

        try {
          const current = cachedFileData ?? await vscode.workspace.fs.readFile(document.uri);
          const updated = await applyEditableJson(current, jsonText);
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
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          postError(`Failed to apply JSON changes: ${msg}`);
        }
      }
    });
  }

  private getHtml(webview: vscode.Webview): string {
    const viewerScriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'media', 'viewer.bundle.js')
    );
    const threeModuleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'node_modules', 'three', 'build', 'three.module.js')
    );
    const threeAddonsBaseUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'node_modules', 'three', 'examples', 'jsm')
    );

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
      #jsonEditorHost {
        width: 100%;
        height: 100%;
        flex: 1;
        min-height: 0;
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
              <button id="btnJsonFormat">Format</button>
              <button id="btnJsonExpandAll">Expand All</button>
              <button id="btnJsonApply">Apply</button>
              <button id="btnJsonClose">Close</button>
            </div>
          </div>
          <div id="jsonEditorHost"></div>
        </div>
      </div>
      <div id="status">Waiting for structure data...</div>
    </div>
    <script type="module" nonce="${nonce}" src="${viewerScriptUri}"></script>
  </body>
</html>`;
  }
}

function getNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let value = '';
  for (let i = 0; i < 32; i += 1) {
    value += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return value;
}

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(McstructurePreviewProvider.register(context));
}

export function deactivate(): void { }

