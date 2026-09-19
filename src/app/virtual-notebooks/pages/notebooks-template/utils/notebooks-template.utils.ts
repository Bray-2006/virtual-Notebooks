import type {
  NotebookElement,
  NotebookPage,
  Point,
  ResizeHandle,
  SelectionBox,
} from '../interfaces/notebook-template.interface';

/**
 * Calcula el rectángulo normalizado entre dos puntos del canvas.
 *
 * Normalizar significa que el ancho y el alto siempre son positivos, incluso
 * cuando el usuario arrastra desde abajo hacia arriba o de derecha a izquierda.
 */
export function getBounds(start: Point, end: Point): SelectionBox {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}

/**
 * Comprueba si un elemento intersecta una caja de selección.
 *
 * La comprobación utiliza el rectángulo envolvente del elemento. La rotación
 * visual no se calcula todavía como un polígono independiente.
 */
export function intersectsSelectionBox(
  box: SelectionBox,
  element: NotebookElement,
): boolean {
  return (
    element.x < box.x + box.width &&
    element.x + element.width > box.x &&
    element.y < box.y + box.height &&
    element.y + element.height > box.y
  );
}

/**
 * Convierte las coordenadas del puntero, relativas a la ventana, en
 * coordenadas relativas al elemento HTML recibido.
 */
export function getCanvasPoint(event: PointerEvent, element: HTMLElement): Point {
  const rect = element.getBoundingClientRect();

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

/**
 * Limita un punto a los bordes visibles del canvas.
 */
export function constrainPoint(point: Point, canvas: HTMLElement): Point {
  return {
    x: Math.min(Math.max(point.x, 0), canvas.clientWidth),
    y: Math.min(Math.max(point.y, 0), canvas.clientHeight),
  };
}

/**
 * Calcula una nueva geometría al redimensionar un elemento desde uno de sus
 * ocho handles.
 *
 * El tamaño mínimo evita que un elemento se vuelva prácticamente imposible de
 * seleccionar y los límites del canvas impiden que salga de la página.
 */
export function resizeElement(
  element: NotebookElement,
  handle: ResizeHandle,
  point: Point,
  canvasWidth: number,
  canvasHeight: number,
): NotebookElement {
  const minimum = 24;
  let left = element.x;
  let top = element.y;
  let right = element.x + element.width;
  let bottom = element.y + element.height;

  if (handle.includes('w')) left = Math.max(0, Math.min(point.x, right - minimum));
  if (handle.includes('e')) right = Math.min(canvasWidth, Math.max(point.x, left + minimum));
  if (handle.includes('n')) top = Math.max(0, Math.min(point.y, bottom - minimum));
  if (handle.includes('s')) bottom = Math.min(canvasHeight, Math.max(point.y, top + minimum));

  return {
    ...element,
    x: Math.max(0, left),
    y: Math.max(0, top),
    width: right - left,
    height: bottom - top,
  };
}

/**
 * Obtiene el ángulo, en radianes, entre el centro de un elemento y el puntero.
 */
export function getAngle(center: Point, point: Point): number {
  return Math.atan2(point.y - center.y, point.x - center.x);
}

/**
 * Crea una copia superficial segura de cada elemento de una página.
 */
export function cloneElements(elements: NotebookElement[]): NotebookElement[] {
  return elements.map((element) => ({ ...element }));
}

/**
 * Crea un snapshot independiente de las páginas y sus elementos.
 *
 * Se utiliza para el historial de undo/redo, evitando que las mutaciones
 * posteriores modifiquen accidentalmente snapshots anteriores.
 */
export function clonePages(pages: NotebookPage[]): NotebookPage[] {
  return pages.map((page) => ({
    ...page,
    elements: cloneElements(page.elements),
  }));
}
