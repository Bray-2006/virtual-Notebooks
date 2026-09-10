import { Component } from '@angular/core';
import { RouterOutlet } from "@angular/router";
import { SideMenuHeader } from "../../components/side-menu-header/side-menu-header";
import { SideMenuOptions } from "../../components/side-menu-options/side-menu-options";


@Component({
  selector: 'app-dashboard-page',
  imports: [RouterOutlet, SideMenuHeader, SideMenuOptions],
  templateUrl: './dashboard-page.html',
})
export default class DashboardPage {}
