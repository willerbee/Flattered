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
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
function resetFlattered() {
    const config = vscode.workspace.getConfiguration();
    const backupColorCustomizations = config.get('flattered.backupColorCustomizations') || {};
    if (Object.keys(backupColorCustomizations).length === 0) {
        return;
    }
    const colors = config.get('workbench.colorCustomizations') || {};
    const newColors = { ...colors };
    const applyTo = vscode.workspace.getConfiguration('flattered.applyTo');
    const overrides = buildFlatteredColors('false', applyTo);
    for (const [key, value] of Object.entries(colors)) {
        if (backupColorCustomizations[key]) {
            newColors[key] = backupColorCustomizations[key];
        }
        else if (overrides.hasOwnProperty(key)) {
            delete newColors[key];
        }
    }
    if (Object.keys(newColors).length === 0) {
        config.update('workbench.colorCustomizations', undefined, vscode.ConfigurationTarget.Global);
    }
    else {
        config.update('workbench.colorCustomizations', newColors, vscode.ConfigurationTarget.Global);
    }
    config.update('flattered.backupColorCustomizations', undefined, vscode.ConfigurationTarget.Global);
}
function buildFlatteredColors(baseColor, applyTo) {
    const colors = {};
    const applyBorders = applyTo.get('borders');
    let apply;
    colors['editor.background'] = baseColor;
    colors['editorGutter.background'] = baseColor;
    apply = applyTo.get('sideBar');
    colors['sideBar.background'] = apply ? baseColor : 'false';
    colors['sideBar.border'] = apply && applyBorders ? baseColor : 'false';
    apply = applyTo.get('activityBar');
    colors['activityBar.background'] = apply ? baseColor : 'false';
    colors['activityBar.border'] = apply && applyBorders ? baseColor : 'false';
    apply = applyTo.get('titleBar');
    colors['titleBar.activeBackground'] = apply ? baseColor : 'false';
    colors['titleBar.inactiveBackground'] = apply ? baseColor : 'false';
    colors['titleBar.border'] = apply && applyBorders ? baseColor : 'false';
    apply = applyTo.get('statusBar');
    colors['statusBar.background'] = apply ? baseColor : 'false';
    colors['statusBar.noFolderBackground'] = apply ? baseColor : 'false';
    colors['statusBar.debuggingBackground'] = apply ? baseColor : 'false';
    colors['statusBar.border'] = apply && applyBorders ? baseColor : 'false';
    colors['statusBar.focusBorder'] = apply && applyBorders ? baseColor : 'false';
    colors['statusBar.noFolderBorder'] = apply && applyBorders ? baseColor : 'false';
    apply = applyTo.get('panel');
    colors['panel.background'] = apply ? baseColor : 'false';
    colors['panel.border'] = apply && applyBorders ? baseColor : 'false';
    apply = applyTo.get('terminal');
    colors['terminal.background'] = apply ? baseColor : 'false';
    colors['terminal.border'] = apply && applyBorders ? baseColor : 'false';
    apply = applyTo.get('tabs');
    colors['tab.activeBackground'] = apply ? baseColor : 'false';
    colors['tab.inactiveBackground'] = apply ? baseColor : 'false';
    colors['tab.unfocusedActiveBackground'] = apply ? baseColor : 'false';
    colors['tab.unfocusedInactiveBackground'] = apply ? baseColor : 'false';
    colors['editorGroupHeader.tabsBackground'] = apply ? baseColor : 'false';
    colors['breadcrumb.background'] = apply ? baseColor : 'false';
    colors['editorStickyScroll.background'] = apply ? baseColor : 'false';
    colors['tab.border'] = apply && applyBorders ? baseColor : 'false';
    colors['editorStickyScroll.border'] = apply && applyBorders ? baseColor : 'false';
    return colors;
}
function activate(context) {
    const applyFlattered = () => {
        if (!vscode.workspace.getConfiguration('flattered').get('enabled')) {
            vscode.window.showInformationMessage('Flattered is disabled.', 'Enable').then((selection) => {
                if (selection === 'Enable') {
                    vscode.workspace
                        .getConfiguration('flattered')
                        .update('enabled', undefined, vscode.ConfigurationTarget.Global);
                }
            });
            return;
        }
        const workbenchConfig = vscode.workspace.getConfiguration('workbench');
        const themeName = workbenchConfig.get('colorTheme');
        if (!themeName) {
            vscode.window.showWarningMessage('No active theme detected.');
            return;
        }
        const allExts = vscode.extensions.all;
        const themeExt = allExts.find((ext) => ext.packageJSON.contributes?.themes?.some((t) => t.label === themeName || t.id === themeName));
        if (!themeExt) {
            vscode.window.showWarningMessage(`Could not find theme file for "${themeName}"`);
            return;
        }
        const themeInfo = themeExt.packageJSON.contributes.themes.find((t) => t.label === themeName || t.id === themeName);
        const themePath = path.join(themeExt.extensionPath, themeInfo.path);
        let themeData;
        try {
            const raw = fs.readFileSync(themePath, 'utf-8');
            themeData = JSON.parse(raw);
        }
        catch (err) {
            vscode.window.showErrorMessage('Failed to read theme file.');
            return;
        }
        const customColor = vscode.workspace.getConfiguration('flattered').get('customColor');
        const baseColor = (customColor && customColor.trim() !== '' ? customColor.trim() : null) ||
            themeData.colors?.['editor.background'] ||
            '#1e1e1e';
        const applyTo = vscode.workspace.getConfiguration('flattered.applyTo');
        const overrides = buildFlatteredColors(baseColor, applyTo);
        const currentColors = vscode.workspace.getConfiguration().get('workbench.colorCustomizations') || {};
        const backupColorCustomizations = vscode.workspace.getConfiguration().get('flattered.backupColorCustomizations') ||
            {};
        const backupIsEmpty = Object.keys(backupColorCustomizations).length === 0;
        const newColors = { ...currentColors };
        const newBackup = { ...backupColorCustomizations };
        for (const [key, value] of Object.entries(overrides)) {
            if (currentColors[key] !== undefined &&
                newBackup[key] === undefined &&
                currentColors[key] !== value &&
                backupIsEmpty) {
                newBackup[key] = currentColors[key];
            }
            if (overrides[key] === 'false') {
                delete newColors[key];
            }
            else {
                newColors[key] = value;
            }
        }
        vscode.workspace
            .getConfiguration()
            .update('workbench.colorCustomizations', newColors, vscode.ConfigurationTarget.Global);
        vscode.workspace
            .getConfiguration()
            .update('flattered.backupColorCustomizations', newBackup, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage(`Flattered ${customColor ? ' Custom ' : ''}applied to theme: ${themeName}`);
    };
    context.subscriptions.push(vscode.commands.registerCommand('flattered.apply', () => {
        resetFlattered();
        applyFlattered();
    }), vscode.commands.registerCommand('flattered.reset', () => {
        resetFlattered();
        vscode.window.showInformationMessage('Flattered reset: overrides removed.');
    }));
    vscode.workspace.onDidChangeConfiguration((e) => {
        const autoApply = vscode.workspace.getConfiguration('flattered').get('autoApply');
        const enabled = vscode.workspace.getConfiguration('flattered').get('enabled');
        if (!autoApply) {
            return;
        }
        if (e.affectsConfiguration('workbench.colorTheme') ||
            e.affectsConfiguration('flattered.autoApply') ||
            e.affectsConfiguration('flattered.applyTo') ||
            e.affectsConfiguration('flattered.customColor') ||
            e.affectsConfiguration('flattered.enabled')) {
            resetFlattered();
            if (enabled) {
                applyFlattered();
            }
        }
    });
}
function deactivate() {
    resetFlattered();
}
//# sourceMappingURL=extension.js.map