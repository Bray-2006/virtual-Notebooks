import { Component } from '@angular/core';
import { SplitterModule } from 'primeng/splitter';
import { Button, ButtonDirective } from "primeng/button";
@Component({
  selector: 'app-notebooks-template',
  imports: [SplitterModule, Button, ButtonDirective],
  templateUrl: './notebooks-template.html',
})
export default class NotebooksTemplate {}
