import { DOCUMENT } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { definePreset, updatePreset, updatePrimaryPalette } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import Lara from '@primeuix/themes/lara';
import Nora from '@primeuix/themes/nora';
import { ButtonModule } from 'primeng/button';
import { SelectButtonModule } from 'primeng/selectbutton';
import { PopoverModule } from 'primeng/popover';

@Component({
  selector: 'app-side-menu-header',
  imports: [FormsModule, ButtonModule, SelectButtonModule, PopoverModule],
  templateUrl: './side-menu-header.html',
})

export class SideMenuHeader {
  private readonly document = inject(DOCUMENT);
  private readonly themeKey = 'virtual-notebooks-theme';


  readonly modeOptions = [
    { label: 'Claro', value: 'light', icon: 'pi pi-sun' },
    { label: 'Oscuro', value: 'dark', icon: 'pi pi-moon' }
  ];

  readonly presetOptions = [
    { label: 'Aura', value: 'aura' },
    { label: 'Lara', value: 'lara' },
    { label: 'Nora', value: 'nora' }
  ];

  readonly primaryColors = [
    { name: 'Índigo', value: 'indigo', palette: this.palette('indigo'), hex: '#6366f1' },
    { name: 'Violeta', value: 'violet', palette: this.palette('violet'), hex: '#8b5cf6' },
    { name: 'Esmeralda', value: 'emerald', palette: this.palette('emerald'), hex: '#10b981' },
    { name: 'Lima', value: 'lime', palette: this.palette('lime'), hex: '#84cc16' },
    { name: 'Naranja', value: 'orange', palette: this.palette('orange'), hex: '#f97316' },
    { name: 'Ámbar', value: 'amber', palette: this.palette('amber'), hex: '#f59e0b' },
    { name: 'Amarillo', value: 'yellow', palette: this.palette('yellow'), hex: '#eab308' },
    { name: 'Cian', value: 'cyan', palette: this.palette('cyan'), hex: '#06b6d4' },
    { name: 'Azul', value: 'blue', palette: this.palette('blue'), hex: '#3b82f6' },
    { name: 'Púrpura', value: 'purple', palette: this.palette('purple'), hex: '#a855f7' },
    { name: 'Rosa', value: 'pink', palette: this.palette('pink'), hex: '#ec4899' },
    { name: 'Rojo', value: 'red', palette: this.palette('red'), hex: '#ef4444' },
    { name: 'Blanco', value: 'slate', palette: this.palette('slate'), hex: '#f8fafc' }
  ];

  selectedMode = 'light';
  selectedPreset = 'aura';
  selectedPrimary = 'indigo';

  constructor() {
    const savedMode = this.document.defaultView?.localStorage.getItem(this.themeKey);
    this.setMode(savedMode === 'dark' ? 'dark' : 'light');
  }

  setMode(mode: string): void {
    this.selectedMode = mode;
    this.document.defaultView?.localStorage.setItem(this.themeKey, mode);

    const isDark = mode === 'dark';
    this.document.documentElement.classList.toggle('p-dark', isDark);
    this.document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'cupcake');
  }

  setPreset(preset: string): void {
    this.selectedPreset = preset;
    const base = preset === 'lara' ? Lara : preset === 'nora' ? Nora : Aura;
    const primary = this.primaryColors.find((color) => color.value === this.selectedPrimary)?.palette;

    updatePreset(
      definePreset(base, {
        semantic: {
          primary
        }
      })
    );
  }

  setPrimaryColor(color: string): void {
    this.selectedPrimary = color;
    const selected = this.primaryColors.find((item) => item.value === color);

    if (selected) {
      updatePrimaryPalette(selected.palette);
    }
  }

  private palette(name: string): Record<string, string> {
    return {
      50: `{${name}.50}`,
      100: `{${name}.100}`,
      200: `{${name}.200}`,
      300: `{${name}.300}`,
      400: `{${name}.400}`,
      500: `{${name}.500}`,
      600: `{${name}.600}`,
      700: `{${name}.700}`,
      800: `{${name}.800}`,
      900: `{${name}.900}`,
      950: `{${name}.950}`
    };
  }
}
