import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';

interface NotebookPage {
  id: number;
  content: string;
}

@Component({
  selector: 'app-notebooks-template',
  imports: [ButtonModule, PaginatorModule],
  templateUrl: './notebooks-template.html',
  styleUrl: './notebooks-template.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class NotebooksTemplate {
  readonly notebookTitle = signal('Mi cuaderno');
  readonly pages = signal<NotebookPage[]>([
    { id: 1, content: '' },
    { id: 2, content: '' },
    { id: 3, content: '' },
    { id: 4, content: '' },
    { id: 5, content: '' },
  ]);
  readonly currentSpread = signal(0);

  readonly visiblePages = computed(() => [
    this.pages()[this.currentSpread() * 2] ?? null,
    this.pages()[this.currentSpread() * 2 + 1] ?? null,
  ]);
  readonly spreadCount = computed(() => Math.ceil(this.pages().length / 2));

  onPageChange(event: PaginatorState): void {
    this.currentSpread.set(event.page ?? 0);
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

  addPage(): void {
    this.pages.update((pages) => [...pages, { id: pages.length + 1, content: '' }]);
    this.currentSpread.set(this.spreadCount() - 1);
  }

  goToPreviousPage(): void {
    this.currentSpread.update((spread) => Math.max(spread - 1, 0));
  }

  goToNextPage(): void {
    this.currentSpread.update((spread) => Math.min(spread + 1, this.spreadCount() - 1));
  }
}
