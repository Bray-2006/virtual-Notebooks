import { DOCUMENT } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { definePreset, updatePreset, updatePrimaryPalette } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import Lara from '@primeuix/themes/lara';
import Nora from '@primeuix/themes/nora';
import { ButtonModule } from 'primeng/button';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SelectModule } from 'primeng/select';

@Component({
  selector: 'app-side-menu-header',
  imports: [FormsModule, ButtonModule, SelectButtonModule, SelectModule],
  templateUrl: './side-menu-header.html',
})

export class SideMenuHeader {
  private readonly document = inject(DOCUMENT);


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
    { name: 'Esmeralda', value: 'emerald', palette: this.palette('emerald'), hex: '#10b981' }
  ];

  selectedMode = 'light';
  selectedPreset = 'aura';
  selectedPrimary = 'indigo';

  constructor() {
    this.setMode(this.selectedMode);
  }

  setMode(mode: string): void {
    this.selectedMode = mode;
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

  private palette(name: 'indigo' | 'violet' | 'emerald'): Record<string, string> {
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
