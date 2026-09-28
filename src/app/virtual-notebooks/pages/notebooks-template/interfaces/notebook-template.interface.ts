export type NotebookTool =
  | 'select'
  | 'text'
  | 'image'
  | 'rectangle'
  | 'ellipse'
  | 'line'
  | 'arrow'
  | 'eraser';

export type ElementType = Exclude<NotebookTool, 'select' | 'eraser'>;
export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export interface Point {
  x: number;
  y: number;
}

export interface NotebookElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  
content?: string | { ops: any[] };
  imageUrl?: string;
}

export interface NotebookPage {
  id: number;
  
content?: string | { ops: any[] };
  elements: NotebookElement[];
}

export interface SelectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DrawInteraction {
  kind: 'draw';
  pageIndex: number;
  start: Point;
  initialPages: NotebookPage[];
}

export interface MoveInteraction {
  kind: 'move';
  pageIndex: number;
  start: Point;
  elementIds: string[];
  initialElements: NotebookElement[];
  initialPages: NotebookPage[];
}

export interface ResizeInteraction {
  kind: 'resize';
  pageIndex: number;
  elementId: string;
  handle: ResizeHandle;
  initialElement: NotebookElement;
  initialPages: NotebookPage[];
}

export interface RotateInteraction {
  kind: 'rotate';
  pageIndex: number;
  elementId: string;
  startAngle: number;
  center: Point;
  initialElement: NotebookElement;
  initialPages: NotebookPage[];
}

export interface MarqueeInteraction {
  kind: 'marquee';
  pageIndex: number;
  start: Point;
  initialSelection: string[];
}

export type Interaction =
  | DrawInteraction
  | MoveInteraction
  | ResizeInteraction
  | RotateInteraction
  | MarqueeInteraction;
