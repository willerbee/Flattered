/*
 * Flattered - A VS Code extension to make any theme flat
 * Copyright (c) 2025 Wilmon Agulo
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { gzip, gunzip } from 'node:zlib';
import { promisify } from 'node:util';

const gzipPromise = promisify(gzip);
const gunzipPromise = promisify(gunzip);

async function compressString(input: string): Promise<string> {
  const compressedBuffer = await gzipPromise(input);
  return compressedBuffer.toString('base64');
}

async function decompressString(compressedBase64: string): Promise<string> {
  const compressedBuffer = Buffer.from(compressedBase64, 'base64');
  const decompressedBuffer = await gunzipPromise(compressedBuffer);
  return decompressedBuffer.toString('utf8');
}

function resetFlattered() {
  const config = vscode.workspace.getConfiguration();

  const backupColorCustomizations = config.get<Record<string, string>>('flattered.backupColorCustomizations') || {};
  const workbenchColorCustomizations = config.get<Record<string, string>>('workbench.colorCustomizations') || {};
  const flatteredMadeSetting = workbenchColorCustomizations['flattered-made'];

  if (Object.keys(backupColorCustomizations).length === 0 && !flatteredMadeSetting) {
    return;
  }

  const newWorkbenchColorCustomizations = { ...workbenchColorCustomizations };

  const applyTo = vscode.workspace.getConfiguration('flattered.applyTo');
  const overrides = buildFlatteredColors('false', applyTo);

  for (const [key, value] of Object.entries(workbenchColorCustomizations)) {
    if (key !== 'flattered-made' && backupColorCustomizations[key]) {
      newWorkbenchColorCustomizations[key] = backupColorCustomizations[key];
    } else if (key === 'flattered-made' || overrides.hasOwnProperty(key)) {
      delete newWorkbenchColorCustomizations[key];
    }
  }

  if (Object.keys(newWorkbenchColorCustomizations).length === 0) {
    config.update('workbench.colorCustomizations', undefined, vscode.ConfigurationTarget.Global);
  } else {
    config.update('workbench.colorCustomizations', newWorkbenchColorCustomizations, vscode.ConfigurationTarget.Global);
  }

  config.update('flattered.backupColorCustomizations', undefined, vscode.ConfigurationTarget.Global);
}

function buildFlatteredColors(baseColor: string, applyTo: vscode.WorkspaceConfiguration) {
  const colors: Record<string, string> = {};
  const applyBorders = applyTo.get('borders');
  let apply;

  colors['editor.background'] = baseColor;
  colors['editorGutter.background'] = baseColor;

  apply = applyTo.get('sideBar');
  colors['sideBar.background'] = apply ? baseColor : 'false';
  colors['sideBar.border'] = apply && applyBorders ? baseColor : 'false';

  apply = applyTo.get('minimap');
  colors['minimap.background'] = apply ? baseColor : 'false';

  apply = applyTo.get('sideBarSectionHeader');
  colors['sideBarSectionHeader.background'] = apply ? baseColor : 'false';

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

export function activate(context: vscode.ExtensionContext) {
  const applyFlattered = async () => {
    if (!vscode.workspace.getConfiguration('flattered').get<boolean>('enabled')) {
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
    const themeName = workbenchConfig.get<string>('colorTheme');

    if (!themeName) {
      vscode.window.showWarningMessage('No active theme detected.');
      return;
    }

    const allExts = vscode.extensions.all;
    const themeExt = allExts.find((ext) =>
      ext.packageJSON.contributes?.themes?.some((t: any) => t.label === themeName || t.id === themeName),
    );
    if (!themeExt) {
      vscode.window.showWarningMessage(`Could not find theme file for "${themeName}"`);
      return;
    }
    const themeInfo = themeExt.packageJSON.contributes.themes.find(
      (t: any) => t.label === themeName || t.id === themeName,
    );
    const themePath = path.join(themeExt.extensionPath, themeInfo.path);
    let themeData: any;
    try {
      const raw = fs.readFileSync(themePath, 'utf-8');
      themeData = JSON.parse(raw);
    } catch (err) {
      vscode.window.showErrorMessage('Failed to read theme file.');
      return;
    }

    const customColor = vscode.workspace.getConfiguration('flattered').get<string>('customColor');
    const baseColor =
      (customColor && customColor.trim() !== '' ? customColor.trim() : null) ||
      themeData.colors?.['editor.background'] ||
      '#1e1e1e';

    const applyTo = vscode.workspace.getConfiguration('flattered.applyTo');
    const overrides = buildFlatteredColors(baseColor, applyTo);

    const currentColors =
      vscode.workspace.getConfiguration().get<Record<string, string>>('workbench.colorCustomizations') || {};
    const backupColorCustomizations =
      vscode.workspace.getConfiguration().get<Record<string, string | null>>('flattered.backupColorCustomizations') ||
      {};
    const backupIsEmpty = Object.keys(backupColorCustomizations).length === 0;

    const newColors = { ...currentColors };
    const newBackup = { ...backupColorCustomizations };
    const flatteredMadeRaw = currentColors['flattered-made'];
    const flatteredMadeSplit = flatteredMadeRaw?.split('please-dont-touch-me');
    const isNewFlatteredMade = flatteredMadeSplit && flatteredMadeSplit.length === 2 && flatteredMadeSplit[0] === '';
    const flatteredMade = isNewFlatteredMade
      ? (await decompressString(flatteredMadeSplit[1])).split(',')
      : flatteredMadeRaw?.split(',');
    const newFlatterdMade = [];

    for (const [key, value] of Object.entries(overrides)) {
      if (
        currentColors[key] !== undefined &&
        newBackup[key] === undefined &&
        currentColors[key] !== value &&
        backupIsEmpty &&
        (!flatteredMadeRaw || flatteredMade.indexOf(key) < 0)
      ) {
        newBackup[key] = currentColors[key];
      }

      if (overrides[key] === 'false') {
        delete newColors[key];
      } else {
        newColors[key] = value;
        newFlatterdMade.push(key);
      }
    }

    newColors['flattered-made'] = 'please-dont-touch-me' + (await compressString(newFlatterdMade.join(',')));

    vscode.workspace
      .getConfiguration()
      .update('workbench.colorCustomizations', newColors, vscode.ConfigurationTarget.Global);
    vscode.workspace
      .getConfiguration()
      .update(
        'flattered.backupColorCustomizations',
        Object.keys(newBackup).length === 0 ? undefined : newBackup,
        vscode.ConfigurationTarget.Global,
      );

    vscode.window.showInformationMessage(`Flattered ${customColor ? ' Custom ' : ''}applied to theme: ${themeName}`);
  };

  context.subscriptions.push(
    vscode.commands.registerCommand('flattered.apply', () => {
      resetFlattered();
      applyFlattered();
    }),
    vscode.commands.registerCommand('flattered.reset', () => {
      resetFlattered();
      vscode.window.showInformationMessage('Flattered reset: overrides removed.');
    }),
  );

  vscode.workspace.onDidChangeConfiguration((e) => {
    const autoApply = vscode.workspace.getConfiguration('flattered').get<boolean>('autoApply');
    const enabled = vscode.workspace.getConfiguration('flattered').get<boolean>('enabled');
    if (!autoApply) {
      return;
    }

    if (
      e.affectsConfiguration('workbench.colorTheme') ||
      e.affectsConfiguration('flattered.autoApply') ||
      e.affectsConfiguration('flattered.applyTo') ||
      e.affectsConfiguration('flattered.customColor') ||
      e.affectsConfiguration('flattered.enabled')
    ) {
      resetFlattered();
      if (enabled) {
        applyFlattered();
      }
    }
  });
}

export function deactivate() {
  resetFlattered();
}
