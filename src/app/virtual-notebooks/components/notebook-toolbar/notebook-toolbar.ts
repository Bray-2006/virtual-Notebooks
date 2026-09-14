import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ToolbarModule } from 'primeng/toolbar';
import { TooltipModule } from 'primeng/tooltip';

export type NotebookTool =
  | 'hand'
  | 'select'
  | 'text'
  | 'image'
  | 'rectangle'
  | 'ellipse'
  | 'line'
  | 'arrow'
  | 'eraser';

@Component({
  selector: 'app-notebook-toolbar',
  imports: [ButtonModule, ToolbarModule, TooltipModule],
  templateUrl: './notebook-toolbar.html',
  styleUrl: './notebook-toolbar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotebookToolbarComponent {
  readonly activeTool = input.required<NotebookTool>();
  readonly canvasLocked = input(false);
  readonly canUndo = input(false);
  readonly canRedo = input(false);
  readonly selectedPageId = input<number | null>(null);
  readonly selectedCount = input(0);

  readonly toolSelected = output<NotebookTool>();
  readonly lockToggled = output<void>();
  readonly undoRequested = output<void>();
  readonly redoRequested = output<void>();
  readonly deleteRequested = output<void>();

  selectTool(tool: NotebookTool): void {
    this.toolSelected.emit(tool);
  }

  toggleLock(): void {
    this.lockToggled.emit();
  }

  requestUndo(): void {
    this.undoRequested.emit();
  }

  requestRedo(): void {
    this.redoRequested.emit();
  }

  requestDelete(): void {
    this.deleteRequested.emit();
  }
}
