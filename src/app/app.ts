import { Component, signal, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { Drawer, DrawerModule } from 'primeng/drawer';
import {AvatarModule} from 'primeng/avatar';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ButtonModule, DrawerModule, AvatarModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('virtual-Notebooks');

 
}
