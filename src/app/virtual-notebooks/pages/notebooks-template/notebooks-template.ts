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
import type {
  ElementType,
  Interaction,
  NotebookElement,
  NotebookPage,
  Point,
  ResizeHandle,
  SelectionBox,
} from './interfaces/notebook-template.interface';
import {
  cloneElements,
  clonePages,
  constrainPoint,
  getAngle,
  getBounds,
  getCanvasPoint,
  intersectsSelectionBox,
  resizeElement,
} from './utils/notebooks-template.utils';

type ToolType = NotebookTool;

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
  readonly pageLineColor = 'var(--p-primary-color)';
  readonly notebookTitle = signal('Mi cuaderno');
  readonly activeTool = signal<ToolType>('select');
  readonly canvasLocked = signal(false);
  readonly currentSpread = signal(0);
  readonly selectedPageIndex = signal(0);
  readonly selectedElementIds = signal<string[]>([]);
  readonly draftElement = signal<NotebookElement | null>(null);
  readonly draftPageIndex = signal<number | null>(null);
  readonly selectionBox = signal<SelectionBox | null>(null);
  readonly selectionBoxPageIndex = signal<number | null>(null);

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
    this.selectionBoxPageIndex.set(null);
  }

  updateTitle(event: Event): void {
    this.notebookTitle.set((event.target as HTMLInputElement).value);
  }

  updatePageContent(event: Event, pageIndex: number): void {
    const textarea = event.target as HTMLTextAreaElement;
    const originalContent = textarea.value;
    let visibleContent = originalContent;

    textarea.style.overflowY = 'hidden';
    textarea.style.height = 'auto';

    while (textarea.scrollHeight > textarea.clientHeight && visibleContent.length > 0) {
      visibleContent = visibleContent.slice(0, -1);
      textarea.value = visibleContent;
      textarea.style.height = 'auto';
    }

    const overflow = originalContent.slice(visibleContent.length);

    this.pages.update((pages) =>
      pages.map((page, index) =>
        index === pageIndex ? { ...page, content: visibleContent } : page,
      ),
    );

    if (!overflow) return;

    const nextPageIndex = pageIndex + 1;
    this.pages.update((pages) => {
      const nextPages = [...pages];

      if (!nextPages[nextPageIndex]) {
        nextPages.push({
          id: nextPages.length + 1,
          content: '',
          elements: [],
        });
      }

      nextPages[nextPageIndex] = {
        ...nextPages[nextPageIndex],
        content: overflow + nextPages[nextPageIndex].content,
      };

      return nextPages;
    });

    this.currentSpread.set(Math.floor(nextPageIndex / 2));
    this.selectedPageIndex.set(nextPageIndex);
    this.focusWritingArea(nextPageIndex);
  }

  setActiveTool(tool: ToolType): void {
    this.activeTool.set(tool);
    this.draftElement.set(null);
    this.draftPageIndex.set(null);
    this.selectionBox.set(null);
    this.selectionBoxPageIndex.set(null);
  }

  toggleCanvasLock(): void {
    this.canvasLocked.update((locked) => !locked);
    this.interaction = null;
    this.draftElement.set(null);
    this.draftPageIndex.set(null);
    this.selectionBox.set(null);
    this.selectionBoxPageIndex.set(null);
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
    if (target.closest('.writing-area') && tool !== 'select') {
      event.preventDefault();
    }

    this.selectPage(pageIndex);
    const point = getCanvasPoint(event, event.currentTarget as HTMLElement);

    if (tool === 'image') {
      this.pendingImagePlacement = { pageIndex, point };
      this.imageInput?.nativeElement.click();
      return;
    }

    if (tool === 'eraser') return;

    if (tool === 'select') {
      if (!event.shiftKey && !event.ctrlKey && !event.metaKey) this.selectedElementIds.set([]);
      this.interaction = {
        kind: 'marquee',
        pageIndex,
        start: point,
        initialSelection: this.selectedElementIds(),
      };
      this.selectionBoxPageIndex.set(pageIndex);
      this.setPointerCapture(event);
      return;
    }

    this.interaction = { kind: 'draw', pageIndex, start: point, initialPages: clonePages(this.pages()) };
    this.draftElement.set({
      ...this.createElement(tool, point.x, point.y, 1, 1),
      content: tool === 'text' ? '' : undefined,
    });
    this.draftPageIndex.set(pageIndex);
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
    if (this.activeTool() !== 'select') return;

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
        start: getCanvasPoint(event, this.getCanvasElement(event)),
      elementIds,
      initialElements: cloneElements(this.pages()[pageIndex].elements),
      initialPages: clonePages(this.pages()),
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
      initialPages: clonePages(this.pages()),
    };
    this.setPointerCapture(event);
  }

  onRotatePointerDown(event: PointerEvent, pageIndex: number, element: NotebookElement): void {
    event.stopPropagation();
    if (this.canvasLocked() || this.activeTool() !== 'select') return;

    const canvas = this.getCanvasElement(event);
    const point = getCanvasPoint(event, canvas);
    const center = {
      x: element.x + element.width / 2,
      y: element.y + element.height / 2,
    };

    this.selectedElementIds.set([element.id]);
    this.interaction = {
      kind: 'rotate',
      pageIndex,
      elementId: element.id,
      startAngle: getAngle(center, point),
      center,
      initialElement: { ...element },
      initialPages: clonePages(this.pages()),
    };
    this.setPointerCapture(event);
  }

  onPointerMove(event: PointerEvent): void {
    const interaction = this.interaction;
    if (!interaction) return;

    const canvas = this.getCanvasElement(event);
    const point = constrainPoint(getCanvasPoint(event, canvas), canvas);
    if (interaction.kind === 'draw') {
      this.draftElement.update((draft) =>
          draft ? { ...draft, ...getBounds(interaction.start, point) } : null,
      );
      return;
    }

    if (interaction.kind === 'marquee') {
      this.selectionBox.set(getBounds(interaction.start, point));
      return;
    }

    if (interaction.kind === 'move') {
      const delta = { x: point.x - interaction.start.x, y: point.y - interaction.start.y };
      const canvas = this.getCanvasElement(event);
      const canvasWidth = canvas.clientWidth;
      const canvasHeight = canvas.clientHeight;
      const selectedElements = interaction.initialElements.filter((element) =>
        interaction.elementIds.includes(element.id),
      );
      const minX = Math.min(...selectedElements.map((element) => element.x));
      const minY = Math.min(...selectedElements.map((element) => element.y));
      const maxX = Math.max(...selectedElements.map((element) => element.x + element.width));
      const maxY = Math.max(...selectedElements.map((element) => element.y + element.height));
      const constrainedDelta = {
        x: Math.min(Math.max(delta.x, -minX), Math.max(0, canvasWidth - maxX)),
        y: Math.min(Math.max(delta.y, -minY), Math.max(0, canvasHeight - maxY)),
      };
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
                    ? {
                        ...element,
                        x: original.x + constrainedDelta.x,
                        y: original.y + constrainedDelta.y,
                      }
                    : element;
                }),
              }
            : page,
        ),
      );
      return;
    }

    if (interaction.kind === 'rotate') {
      const angle = getAngle(interaction.center, point);
      const rotation = interaction.initialElement.rotation +
        ((angle - interaction.startAngle) * 180) / Math.PI;
      this.pages.update((pages) =>
        pages.map((page, index) =>
          index === interaction.pageIndex
            ? {
                ...page,
                elements: page.elements.map((element) =>
                  element.id === interaction.elementId ? { ...element, rotation } : element,
                ),
              }
            : page,
        ),
      );
      return;
    }

    const resized = resizeElement(
      interaction.initialElement,
      interaction.handle,
      point,
      this.getCanvasElement(event).clientWidth,
      this.getCanvasElement(event).clientHeight,
    );
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
      this.draftPageIndex.set(null);
      if (draft && draft.width >= 8 && draft.height >= 8) {
        const nextPages = clonePages(this.pages());
        nextPages[interaction.pageIndex].elements.push(draft);
        this.commitPages(nextPages, interaction.initialPages);
        this.selectedElementIds.set([draft.id]);
      }
      this.activeTool.set('select');
    } else if (interaction.kind === 'marquee') {
      const box = this.selectionBox();
      if (box) {
        const matchingIds = this.pages()[interaction.pageIndex].elements
          .filter((element) => intersectsSelectionBox(box, element))
          .map((element) => element.id);
        this.selectedElementIds.set(
          event.shiftKey ? [...new Set([...interaction.initialSelection, ...matchingIds])] : matchingIds,
        );
      }
      this.selectionBox.set(null);
      this.selectionBoxPageIndex.set(null);
    } else if (interaction.kind === 'move' || interaction.kind === 'resize' || interaction.kind === 'rotate') {
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
    const canvas = this.getVisibleCanvas(placement.pageIndex);
    if (canvas) {
      image.x = Math.min(image.x, Math.max(0, canvas.clientWidth - image.width));
      image.y = Math.min(image.y, Math.max(0, canvas.clientHeight - image.height));
    }
    image.imageUrl = URL.createObjectURL(file);
    const nextPages = clonePages(this.pages());
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

    const nextPages = clonePages(this.pages());
    nextPages[this.selectedPageIndex()].elements = nextPages[this.selectedPageIndex()].elements.filter(
      (element) => !selectedIds.includes(element.id),
    );
    this.commitPages(nextPages);
    this.selectedElementIds.set([]);
  }

  deleteElement(pageIndex: number, elementId: string): void {
    const nextPages = clonePages(this.pages());
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

    this.redoHistory.update((redo) => [...redo, clonePages(this.pages())]);
    this.pages.set(clonePages(previous));
    this.history.set(snapshots.slice(0, -1));
    this.selectedElementIds.set([]);
  }

  redo(): void {
    const snapshots = this.redoHistory();
    const next = snapshots.at(-1);
    if (!next) return;

    this.history.update((history) => [...history, clonePages(this.pages())]);
    this.pages.set(clonePages(next));
    this.redoHistory.set(snapshots.slice(0, -1));
    this.selectedElementIds.set([]);
  }

  addPage(): void {
    const nextPages = clonePages(this.pages());
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
      this.draftPageIndex.set(null);
      this.selectionBox.set(null);
      this.activeTool.set('select');
    }
  }

  private commitPages(nextPages: NotebookPage[], previousPages = clonePages(this.pages())): void {
    this.history.update((snapshots) => [...snapshots, clonePages(previousPages)]);
    this.redoHistory.set([]);
    this.pages.set(clonePages(nextPages));
  }

  private createElement(type: ElementType, x: number, y: number, width = 1, height = 1): NotebookElement {
    return {
      id: `element-${this.nextElementId++}`,
      type,
      x,
      y,
      width,
      height,
      rotation: 0,
      content: type === 'text' ? '' : undefined,
    };
  }

  private getVisibleCanvas(pageIndex: number): HTMLElement | null {
    const visibleIndex = pageIndex - this.currentSpread() * 2;
    return document.querySelectorAll<HTMLElement>('.page-canvas')[visibleIndex] ?? null;
  }

  private getCanvasElement(event: PointerEvent): HTMLElement {
    return (event.target as HTMLElement).closest('.page-canvas') ?? (event.currentTarget as HTMLElement);
  }

  private focusWritingArea(pageIndex: number): void {
    requestAnimationFrame(() => {
      const visibleIndex = pageIndex - this.currentSpread() * 2;
      const writingArea = document.querySelectorAll<HTMLTextAreaElement>('.writing-area')[visibleIndex];

      writingArea?.focus();
      writingArea?.setSelectionRange(writingArea.value.length, writingArea.value.length);
    });
  }

  private setPointerCapture(event: PointerEvent): void {
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  private releasePointerCapture(event: PointerEvent): void {
    (event.target as HTMLElement).releasePointerCapture?.(event.pointerId);
  }

}
