import { Component, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { SideMenuFoldersAccorditions } from "./side-menu-folders-accorditions/side-menu-folders-accorditions";
import { NotebooksOptions } from './interfaces/notebooks-options.interface';
@Component({
  selector: 'app-side-menu-options',
  imports: [ButtonModule, SideMenuFoldersAccorditions],
  templateUrl: './side-menu-options.html',
})
export class SideMenuOptions {
   readonly NotebooksOptions = signal<NotebooksOptions[]>([
    {
      id: 1,
      carpetName: 'Mi carpeta',
      notebooks: [
        {
          id: 1,
          icon: 'pi pi-file',
          name: 'Mi cuaderno',
        },
        {
          id: 2,
          icon: 'pi pi-file',
          name: 'Mi cuaderno 2',
        },
      ],
    }
  ])
}
