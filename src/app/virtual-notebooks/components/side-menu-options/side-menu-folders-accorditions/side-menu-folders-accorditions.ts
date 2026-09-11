import { Component, input, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NotebooksOptions } from '../interfaces/notebooks-options.interface';



@Component({
  selector: 'app-side-menu-folders-accorditions',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './side-menu-folders-accorditions.html',
  host: {
    class: 'block w-full',
  },
})
export class SideMenuFoldersAccorditions {
  
  readonly notebooksOptions = input.required<NotebooksOptions[]>()
  private readonly openFolders = signal<Set<number>>(new Set());

  isFolderOpen(folderId: number): boolean {
    return this.openFolders().has(folderId);
  }

  toggleFolder(folderId: number): void {
    const folders = new Set(this.openFolders());

    if (folders.has(folderId)) {
      folders.delete(folderId);
    } else {
      folders.add(folderId);
    }

    this.openFolders.set(folders);
  }
}
