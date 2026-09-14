import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  computed,
  signal,
} from '@angular/core';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import {
  NotebookTool,
  NotebookToolbarComponent,
} from '../../components/notebook-toolbar/notebook-toolbar';
import { ButtonModule } from 'primeng/button';

type ElementType = Exclude<NotebookTool, 'hand' | 'select' | 'eraser'>;
type ToolType = NotebookTool;
type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

interface Point {
  x: number;
  y: number;
}

interface NotebookElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  imageUrl?: string;
}

interface NotebookPage {
  id: number;
  content: string;
  elements: NotebookElement[];
}

interface SelectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DrawInteraction {
  kind: 'draw';
  pageIndex: number;
  start: Point;
  initialPages: NotebookPage[];
}

interface MoveInteraction {
  kind: 'move';
  pageIndex: number;
  start: Point;
  elementIds: string[];
  initialElements: NotebookElement[];
  initialPages: NotebookPage[];
}

interface ResizeInteraction {
  kind: 'resize';
  pageIndex: number;
  elementId: string;
  handle: ResizeHandle;
  initialElement: NotebookElement;
  initialPages: NotebookPage[];
}

interface MarqueeInteraction {
  kind: 'marquee';
  pageIndex: number;
  start: Point;
  initialSelection: string[];
}

type Interaction = DrawInteraction | MoveInteraction | ResizeInteraction | MarqueeInteraction;

@Component({
  selector: 'app-notebooks-template',
  imports: [ButtonModule, NotebookToolbarComponent, PaginatorModule],
  templateUrl: './notebooks-template.html',
  styleUrl: './notebooks-template.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class NotebooksTemplate {
  @ViewChild('imageInput') private imageInput?: ElementRef<HTMLInputElement>;

  readonly resizeHandles: ResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
  readonly notebookTitle = signal('Mi cuaderno');
  readonly activeTool = signal<ToolType>('select');
  readonly canvasLocked = signal(false);
  readonly currentSpread = signal(0);
  readonly selectedPageIndex = signal(0);
  readonly selectedElementIds = signal<string[]>([]);
  readonly draftElement = signal<NotebookElement | null>(null);
  readonly selectionBox = signal<SelectionBox | null>(null);

  readonly pages = signal<NotebookPage[]>([
    { id: 1, content: '', elements: [] },
    { id: 2, content: '', elements: [] },
    { id: 3, content: '', elements: [] },
    { id: 4, content: '', elements: [] },
    { id: 5, content: '', elements: [] },
  ]);

  readonly history = signal<NotebookPage[][]>([]);
  readonly redoHistory = signal<NotebookPage[][]>([]);
  readonly canUndo = computed(() => this.history().length > 0);
  readonly canRedo = computed(() => this.redoHistory().length > 0);
  readonly visiblePages = computed(() => [
    this.pages()[this.currentSpread() * 2] ?? null,
    this.pages()[this.currentSpread() * 2 + 1] ?? null,
  ]);
  readonly spreadCount = computed(() => Math.ceil(this.pages().length / 2));
  readonly selectedPage = computed(() => this.pages()[this.selectedPageIndex()] ?? null);

  private nextElementId = 1;
  private interaction: Interaction | null = null;
  private pendingImagePlacement: { pageIndex: number; point: Point } | null = null;

  onPageChange(event: PaginatorState): void {
    const spread = event.page ?? 0;
    this.currentSpread.set(spread);
    this.selectedPageIndex.set(spread * 2);
    this.selectedElementIds.set([]);
  }

  updateTitle(event: Event): void {
    this.notebookTitle.set((event.target as HTMLInputElement).value);
  }

  updatePageContent(event: Event, pageIndex: number): void {
    const content = (event.target as HTMLTextAreaElement).value;
    this.pages.update((pages) =>
      pages.map((page, index) => (index === pageIndex ? { ...page, content } : page)),
    );
  }

  setActiveTool(tool: ToolType): void {
    this.activeTool.set(tool);
    this.draftElement.set(null);
    this.selectionBox.set(null);
  }

  toggleCanvasLock(): void {
    this.canvasLocked.update((locked) => !locked);
    this.interaction = null;
    this.draftElement.set(null);
    this.selectionBox.set(null);
  }

  selectPage(pageIndex: number): void {
    this.selectedPageIndex.set(pageIndex);
  }

  isSelected(elementId: string): boolean {
    return this.selectedElementIds().includes(elementId);
  }

  onCanvasPointerDown(event: PointerEvent, pageIndex: number): void {
    if (this.canvasLocked()) return;

    const target = event.target as HTMLElement;
    const tool = this.activeTool();

    if (target.closest('.canvas-element')) return;
    if (target.closest('.writing-area') && tool !== 'select' && tool !== 'hand') {
      event.preventDefault();
    }

    this.selectPage(pageIndex);
    const point = this.getCanvasPoint(event, event.currentTarget as HTMLElement);

    if (tool === 'image') {
      this.pendingImagePlacement = { pageIndex, point };
      this.imageInput?.nativeElement.click();
      return;
    }

    if (tool === 'eraser') return;

    if (tool === 'select' || tool === 'hand') {
      if (!event.shiftKey && !event.ctrlKey && !event.metaKey) this.selectedElementIds.set([]);
      this.interaction = {
        kind: 'marquee',
        pageIndex,
        start: point,
        initialSelection: this.selectedElementIds(),
      };
      this.setPointerCapture(event);
      return;
    }

    this.interaction = { kind: 'draw', pageIndex, start: point, initialPages: this.clonePages() };
    this.draftElement.set({
      ...this.createElement(tool, point.x, point.y, 1, 1),
      content: tool === 'text' ? '' : undefined,
    });
    this.setPointerCapture(event);
  }

  onElementPointerDown(event: PointerEvent, pageIndex: number, element: NotebookElement): void {
    if (this.canvasLocked()) return;

    event.stopPropagation();
    this.selectPage(pageIndex);

    if (this.activeTool() === 'eraser') {
      this.deleteElement(pageIndex, element.id);
      return;
    }
    if (this.activeTool() !== 'select' && this.activeTool() !== 'hand') return;

    const isToggle = event.shiftKey || event.ctrlKey || event.metaKey;
    const currentSelection = this.selectedElementIds();
    if (isToggle) {
      this.selectedElementIds.set(
        currentSelection.includes(element.id)
          ? currentSelection.filter((id) => id !== element.id)
          : [...currentSelection, element.id],
      );
      return;
    }

    const elementIds = currentSelection.includes(element.id) ? currentSelection : [element.id];
    this.selectedElementIds.set(elementIds);
    this.interaction = {
      kind: 'move',
      pageIndex,
      start: this.getCanvasPoint(event, this.getCanvasElement(event)),
      elementIds,
      initialElements: this.cloneElements(this.pages()[pageIndex].elements),
      initialPages: this.clonePages(),
    };
    this.setPointerCapture(event);
  }

  onResizePointerDown(
    event: PointerEvent,
    pageIndex: number,
    element: NotebookElement,
    handle: ResizeHandle,
  ): void {
    event.stopPropagation();
    if (this.canvasLocked()) return;

    if (this.activeTool() !== 'select') return;

    this.selectedElementIds.set([element.id]);
    this.interaction = {
      kind: 'resize',
      pageIndex,
      elementId: element.id,
      handle,
      initialElement: { ...element },
      initialPages: this.clonePages(),
    };
    this.setPointerCapture(event);
  }

  onPointerMove(event: PointerEvent): void {
    const interaction = this.interaction;
    if (!interaction) return;

    const point = this.getCanvasPoint(event, this.getCanvasElement(event));
    if (interaction.kind === 'draw') {
      this.draftElement.update((draft) =>
        draft ? { ...draft, ...this.getBounds(interaction.start, point) } : null,
      );
      return;
    }

    if (interaction.kind === 'marquee') {
      this.selectionBox.set(this.getBounds(interaction.start, point));
      return;
    }

    if (interaction.kind === 'move') {
      const delta = { x: point.x - interaction.start.x, y: point.y - interaction.start.y };
      this.pages.update((pages) =>
        pages.map((page, index) =>
          index === interaction.pageIndex
            ? {
                ...page,
                elements: page.elements.map((element) => {
                  if (!interaction.elementIds.includes(element.id)) return element;
                  const original = interaction.initialElements.find(
                    (candidate) => candidate.id === element.id,
                  );
                  return original
                    ? { ...element, x: Math.max(0, original.x + delta.x), y: Math.max(0, original.y + delta.y) }
                    : element;
                }),
              }
            : page,
        ),
      );
      return;
    }

    const resized = this.resizeElement(interaction.initialElement, interaction.handle, point);
    this.pages.update((pages) =>
      pages.map((page, index) =>
        index === interaction.pageIndex
          ? {
              ...page,
              elements: page.elements.map((element) =>
                element.id === interaction.elementId ? resized : element,
              ),
            }
          : page,
      ),
    );
  }

  onPointerUp(event: PointerEvent): void {
    const interaction = this.interaction;
    if (!interaction) return;

    if (interaction.kind === 'draw') {
      const draft = this.draftElement();
      this.draftElement.set(null);
      if (draft && draft.width >= 8 && draft.height >= 8) {
        const nextPages = this.clonePages();
        nextPages[interaction.pageIndex].elements.push(draft);
        this.commitPages(nextPages, interaction.initialPages);
        this.selectedElementIds.set([draft.id]);
      }
      this.activeTool.set('select');
    } else if (interaction.kind === 'marquee') {
      const box = this.selectionBox();
      if (box) {
        const matchingIds = this.pages()[interaction.pageIndex].elements
          .filter((element) => this.intersects(box, element))
          .map((element) => element.id);
        this.selectedElementIds.set(
          event.shiftKey ? [...new Set([...interaction.initialSelection, ...matchingIds])] : matchingIds,
        );
      }
      this.selectionBox.set(null);
    } else {
      const changed = JSON.stringify(interaction.initialPages) !== JSON.stringify(this.pages());
      if (changed) {
        this.history.update((snapshots) => [...snapshots, interaction.initialPages]);
        this.redoHistory.set([]);
      }
    }

    this.interaction = null;
    this.releasePointerCapture(event);
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const placement = this.pendingImagePlacement;
    if (this.canvasLocked() || !file || !placement) {
      input.value = '';
      return;
    }

    const image = this.createElement('image', placement.point.x, placement.point.y, 180, 140);
    image.imageUrl = URL.createObjectURL(file);
    const nextPages = this.clonePages();
    nextPages[placement.pageIndex].elements.push(image);
    this.commitPages(nextPages);
    this.selectedPageIndex.set(placement.pageIndex);
    this.selectedElementIds.set([image.id]);
    this.activeTool.set('select');
    this.pendingImagePlacement = null;
    input.value = '';
  }

  deleteSelected(): void {
    const selectedIds = this.selectedElementIds();
    if (!selectedIds.length) return;

    const nextPages = this.clonePages();
    nextPages[this.selectedPageIndex()].elements = nextPages[this.selectedPageIndex()].elements.filter(
      (element) => !selectedIds.includes(element.id),
    );
    this.commitPages(nextPages);
    this.selectedElementIds.set([]);
  }

  deleteElement(pageIndex: number, elementId: string): void {
    const nextPages = this.clonePages();
    nextPages[pageIndex].elements = nextPages[pageIndex].elements.filter(
      (element) => element.id !== elementId,
    );
    this.commitPages(nextPages);
    this.selectedElementIds.update((ids) => ids.filter((id) => id !== elementId));
  }

  updateElementText(event: Event, pageIndex: number, elementId: string): void {
    const content = (event.target as HTMLTextAreaElement).value;
    this.pages.update((pages) =>
      pages.map((page, index) =>
        index === pageIndex
          ? {
              ...page,
              elements: page.elements.map((element) =>
                element.id === elementId ? { ...element, content } : element,
              ),
            }
          : page,
      ),
    );
  }

  undo(): void {
    const snapshots = this.history();
    const previous = snapshots.at(-1);
    if (!previous) return;

    this.redoHistory.update((redo) => [...redo, this.clonePages()]);
    this.pages.set(this.clonePages(previous));
    this.history.set(snapshots.slice(0, -1));
    this.selectedElementIds.set([]);
  }

  redo(): void {
    const snapshots = this.redoHistory();
    const next = snapshots.at(-1);
    if (!next) return;

    this.history.update((history) => [...history, this.clonePages()]);
    this.pages.set(this.clonePages(next));
    this.redoHistory.set(snapshots.slice(0, -1));
    this.selectedElementIds.set([]);
  }

  addPage(): void {
    const nextPages = this.clonePages();
    nextPages.push({ id: nextPages.length + 1, content: '', elements: [] });
    this.commitPages(nextPages);
    const pageIndex = nextPages.length - 1;
    this.currentSpread.set(Math.floor(pageIndex / 2));
    this.selectedPageIndex.set(pageIndex);
  }

  goToPreviousPage(): void {
    this.currentSpread.update((spread) => Math.max(spread - 1, 0));
    this.selectedPageIndex.set(this.currentSpread() * 2);
    this.selectedElementIds.set([]);
  }

  goToNextPage(): void {
    this.currentSpread.update((spread) => Math.min(spread + 1, this.spreadCount() - 1));
    this.selectedPageIndex.set(this.currentSpread() * 2);
    this.selectedElementIds.set([]);
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const editingText = target?.matches('textarea, input, [contenteditable="true"]');
    const modifier = event.ctrlKey || event.metaKey;

    if (modifier && event.key.toLowerCase() === 'z' && !editingText) {
      event.preventDefault();
      event.shiftKey ? this.redo() : this.undo();
      return;
    }
    if (modifier && event.key.toLowerCase() === 'y' && !editingText) {
      event.preventDefault();
      this.redo();
      return;
    }
    if ((event.key === 'Delete' || event.key === 'Backspace') && !editingText) {
      event.preventDefault();
      this.deleteSelected();
    }
    if (event.key === 'Escape') {
      this.interaction = null;
      this.draftElement.set(null);
      this.selectionBox.set(null);
      this.activeTool.set('select');
    }
  }

  private commitPages(nextPages: NotebookPage[], previousPages = this.clonePages()): void {
    this.history.update((snapshots) => [...snapshots, this.clonePages(previousPages)]);
    this.redoHistory.set([]);
    this.pages.set(this.clonePages(nextPages));
  }

  private createElement(type: ElementType, x: number, y: number, width = 1, height = 1): NotebookElement {
    return {
      id: `element-${this.nextElementId++}`,
      type,
      x,
      y,
      width,
      height,
      content: type === 'text' ? '' : undefined,
    };
  }

  private resizeElement(element: NotebookElement, handle: ResizeHandle, point: Point): NotebookElement {
    const minimum = 24;
    let left = element.x;
    let top = element.y;
    let right = element.x + element.width;
    let bottom = element.y + element.height;

    if (handle.includes('w')) left = Math.min(point.x, right - minimum);
    if (handle.includes('e')) right = Math.max(point.x, left + minimum);
    if (handle.includes('n')) top = Math.min(point.y, bottom - minimum);
    if (handle.includes('s')) bottom = Math.max(point.y, top + minimum);

    return {
      ...element,
      x: Math.max(0, left),
      y: Math.max(0, top),
      width: right - left,
      height: bottom - top,
    };
  }

  private getBounds(start: Point, end: Point): SelectionBox {
    return {
      x: Math.min(start.x, end.x),
      y: Math.min(start.y, end.y),
      width: Math.abs(end.x - start.x),
      height: Math.abs(end.y - start.y),
    };
  }

  private intersects(box: SelectionBox, element: NotebookElement): boolean {
    return (
      element.x < box.x + box.width &&
      element.x + element.width > box.x &&
      element.y < box.y + box.height &&
      element.y + element.height > box.y
    );
  }

  private getCanvasPoint(event: PointerEvent, element: HTMLElement): Point {
    const rect = element.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  private getCanvasElement(event: PointerEvent): HTMLElement {
    return (event.target as HTMLElement).closest('.page-canvas') ?? (event.currentTarget as HTMLElement);
  }

  private setPointerCapture(event: PointerEvent): void {
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  private releasePointerCapture(event: PointerEvent): void {
    (event.target as HTMLElement).releasePointerCapture?.(event.pointerId);
  }

  private cloneElements(elements: NotebookElement[]): NotebookElement[] {
    return elements.map((element) => ({ ...element }));
  }

  private clonePages(pages = this.pages()): NotebookPage[] {
    return pages.map((page) => ({ ...page, elements: this.cloneElements(page.elements) }));
  }
}
