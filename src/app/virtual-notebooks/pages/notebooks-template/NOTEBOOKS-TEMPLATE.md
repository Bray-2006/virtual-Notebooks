# Documentación del template de cuadernos virtuales

Este documento explica cómo está construido el template de cuadernos virtuales y cómo funciona cada una de sus piezas. La intención es que cualquier persona que continúe el desarrollo pueda entender el flujo completo antes de modificarlo.

La implementación actual es un demo funcional de un cuaderno digital. Permite:

- Ver dos páginas al mismo tiempo.
- Escribir directamente en una página.
- Crear texto, imágenes, rectángulos, elipses, líneas y flechas.
- Seleccionar, mover y seleccionar varios elementos.
- Redimensionar y rotar elementos.
- Eliminar elementos.
- Deshacer y rehacer cambios.
- Avanzar y retroceder entre spreads de páginas.
- Restringir los elementos al área visible de su página.

No existe todavía persistencia en backend. El estado vive en memoria mientras la pantalla está abierta.

## 1. Ubicación y responsabilidad de los archivos

La feature está organizada así:

```text
notebooks-template/
├── interfaces/
│   └── notebook-template.interface.ts
├── notebooks-template.ts
├── notebooks-template.html
├── notebooks-template.css
└── NOTEBOOKS-TEMPLATE.md
```

La barra de herramientas está extraída como componente porque tiene una responsabilidad independiente:

```text
virtual-notebooks/
└── components/
    └── notebook-toolbar/
        ├── notebook-toolbar.ts
        ├── notebook-toolbar.html
        └── notebook-toolbar.css
```

### `notebooks-template.ts`

Es el coordinador principal de la pantalla. Mantiene el estado del cuaderno y coordina las interacciones del usuario.

Sus responsabilidades actuales son:

1. Mantener las páginas y sus elementos.
2. Determinar qué spread se está mostrando.
3. Determinar qué página está seleccionada.
4. Gestionar la herramienta activa.
5. Crear y actualizar elementos mediante eventos de puntero.
6. Mantener la selección simple o múltiple.
7. Aplicar límites para que los elementos no salgan de la página.
8. Mantener el historial de undo y redo.
9. Coordinar la carga de imágenes.
10. Responder a los atajos de teclado.

El componente todavía concentra bastante lógica porque el objetivo actual es un demo funcional. Si el editor crece, la siguiente extracción natural sería mover la lógica de geometría y las operaciones de páginas a servicios separados.

### `notebooks-template.html`

Define la composición visual:

- Cabecera del cuaderno.
- Campo editable para el título.
- Barra de herramientas.
- Spread con dos páginas.
- Área de escritura de cada página.
- Elementos dibujados.
- Controles de selección, redimensionado y rotación.
- Caja de selección múltiple.
- Paginador de PrimeNG.

El template debe mantenerse principalmente declarativo. La lógica geométrica debe permanecer en TypeScript.

### `notebooks-template.css`

Define la apariencia de las páginas, las líneas horizontales del cuaderno, los elementos del canvas y los controles visuales de selección.

Las páginas utilizan un `repeating-linear-gradient` para generar las líneas horizontales. El color se recibe desde TypeScript mediante la propiedad CSS `--notebook-line-color`, cuyo valor actual es `var(--p-primary-color)`.

### `interfaces/notebook-template.interface.ts`

Contiene los contratos de datos y tipos de interacción del editor. Estos tipos se mantienen fuera del componente para evitar que `notebooks-template.ts` se convierta en un archivo difícil de mantener y para permitir su reutilización futura en servicios, pruebas o componentes hijos.

### `notebook-toolbar`

Es un componente presentacional. Recibe valores mediante `input()` y comunica acciones mediante `output()`.

La toolbar no modifica directamente las páginas. Solo informa al componente padre de acciones como:

- Seleccionar una herramienta.
- Bloquear o desbloquear el lienzo.
- Solicitar undo.
- Solicitar redo.
- Solicitar eliminar la selección.

Esto mantiene separada la interfaz de botones de la lógica del editor.

## 2. Modelo mental del editor

El editor se puede entender como tres niveles:

```text
Cuaderno
└── páginas
    └── elementos
        ├── posición
        ├── tamaño
        ├── rotación
        └── contenido opcional
```

La página es la unidad de aislamiento. Cada elemento pertenece a una página concreta y solo debe responder a eventos ocurridos dentro de esa página.

Esto es importante porque el editor muestra dos páginas al mismo tiempo. Una interacción que ocurre en la página izquierda no debe crear, seleccionar o mover nada en la página derecha.

## 3. Tipos e interfaces

Todos los contratos están en:

```text
src/app/virtual-notebooks/pages/notebooks-template/interfaces/notebook-template.interface.ts
```

### 3.1 `NotebookTool`

```ts
export type NotebookTool =
  | 'select'
  | 'text'
  | 'image'
  | 'rectangle'
  | 'ellipse'
  | 'line'
  | 'arrow'
  | 'eraser';
```

Es una unión de literales. Esto significa que una herramienta solo puede tener uno de esos valores.

La ventaja de una unión de literales frente a un `string` genérico es que TypeScript puede detectar errores como:

```ts
this.activeTool.set('circle');
```

`circle` no forma parte de `NotebookTool`, por lo que el compilador lo rechaza.

Significado de cada valor:

| Valor | Propósito |
| --- | --- |
| `select` | Seleccionar, mover, redimensionar, rotar y seleccionar varios elementos. |
| `text` | Crear un elemento de texto arrastrando sobre la página. |
| `image` | Abrir el selector de archivos y colocar una imagen en la página. |
| `rectangle` | Dibujar un rectángulo. |
| `ellipse` | Dibujar una elipse. |
| `line` | Dibujar una línea. |
| `arrow` | Dibujar una flecha. |
| `eraser` | Eliminar un elemento al hacer click sobre él. |

### 3.2 `ElementType`

```ts
export type ElementType = Exclude<NotebookTool, 'select' | 'eraser'>;
```

`ElementType` representa únicamente herramientas que producen elementos persistentes dentro de una página.

Se excluyen:

- `select`, porque modifica la selección o la posición de elementos existentes.
- `eraser`, porque elimina elementos existentes.

Actualmente los elementos persistentes pueden ser:

```text
text | image | rectangle | ellipse | line | arrow
```

Usar `Exclude` evita repetir manualmente la lista y hace que el tipo se actualice automáticamente si `NotebookTool` cambia.

### 3.3 `ResizeHandle`

```ts
export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
```

Representa los ocho puntos de redimensionado alrededor de un elemento.

Las letras son abreviaturas de direcciones en inglés:

- `n`: north, norte, borde superior.
- `e`: east, este, borde derecho.
- `s`: south, sur, borde inferior.
- `w`: west, oeste, borde izquierdo.

Las combinaciones representan esquinas:

- `nw`: esquina superior izquierda, north west.
- `ne`: esquina superior derecha, north east.
- `se`: esquina inferior derecha, south east.
- `sw`: esquina inferior izquierda, south west.

Visualmente:

```text
nw ───────── n ───────── ne
│                         │
│                         │
w        elemento         e
│                         │
│                         │
sw ───────── s ───────── se
```

El valor se utiliza en `resizeElement()` para saber qué coordenadas modificar:

- Si contiene `w`, se modifica el lado izquierdo.
- Si contiene `e`, se modifica el lado derecho.
- Si contiene `n`, se modifica el lado superior.
- Si contiene `s`, se modifica el lado inferior.

Por ejemplo:

```ts
handle = 'se';
```

Como contiene `s` y `e`, se modifica el borde inferior y el derecho. El elemento crece o disminuye desde la esquina inferior derecha.

En cambio:

```ts
handle = 'nw';
```

Como contiene `n` y `w`, se modifican el borde superior y el izquierdo. La posición `x` y `y` puede cambiar junto con el ancho y el alto.

El cursor visual también depende del handle:

- Esquinas `nw` y `se`: cursor diagonal `nwse-resize`.
- Esquinas `ne` y `sw`: cursor diagonal `nesw-resize`.
- Bordes `n` y `s`: cursor vertical `ns-resize`.
- Bordes `e` y `w`: cursor horizontal `ew-resize`.

### 3.4 `Point`

```ts
export interface Point {
  x: number;
  y: number;
}
```

Representa una coordenada bidimensional relativa al canvas de una página.

Ejemplo:

```ts
const point: Point = { x: 120, y: 80 };
```

No representa coordenadas absolutas de la ventana. `getCanvasPoint()` convierte la posición del puntero del navegador a una posición local del `.page-canvas`.

### 3.5 `NotebookElement`

```ts
export interface NotebookElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  content?: string;
  imageUrl?: string;
}
```

Es la representación común de cualquier objeto colocado en una página.

#### `id`

Identificador único dentro del demo. Se genera como `element-1`, `element-2`, etc. Es utilizado por Angular en `track element.id` y para saber qué elementos están seleccionados.

#### `type`

Indica cómo debe dibujarse el elemento en el template. El HTML utiliza `@switch` para decidir si debe mostrar un `textarea`, una imagen o un SVG.

#### `x` y `y`

Indican la posición de la esquina superior izquierda del elemento respecto al canvas de su página.

```text
(0, 0) ─────────────────────► x
  │
  │      ┌──────────────┐
  │      │ elemento     │
  │      └──────────────┘
  ▼
  y
```

#### `width` y `height`

Indican el tamaño del rectángulo envolvente del elemento. Incluso una línea o una flecha utiliza un rectángulo envolvente para simplificar la selección, el movimiento y el redimensionado.

#### `rotation`

Es el ángulo de rotación en grados. `0` significa que no hay rotación. El template lo aplica mediante:

```html
[style.transform]="'rotate(' + element.rotation + 'deg)'"
```

La rotación se calcula con `Math.atan2()` a partir del centro del elemento y la posición actual del puntero.

#### `content`

Se utiliza principalmente para los elementos de tipo `text`. Es opcional porque las figuras no necesitan texto.

#### `imageUrl`

Contiene la URL temporal creada para una imagen mediante `URL.createObjectURL(file)`. Es opcional porque solo existe en elementos de tipo `image`.

### 3.6 `NotebookPage`

```ts
export interface NotebookPage {
  id: number;
  content: string;
  elements: NotebookElement[];
}
```

Representa una página completa.

- `id`: número visible de página.
- `content`: texto escrito en el área principal de la página.
- `elements`: objetos flotantes dibujados sobre el área de escritura.

El texto principal de `content` y los elementos de `elements` son dos formas diferentes de escribir en la página. El primero funciona como una hoja de texto; el segundo funciona como un canvas de anotaciones.

### 3.7 `SelectionBox`

```ts
export interface SelectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

Es el rectángulo temporal que aparece cuando se arrastra sobre un espacio vacío usando `select`.

Se genera con `getBounds()`, que normaliza el inicio y el final. Esto permite arrastrar en cualquier dirección: arriba, abajo, izquierda o derecha.

Por ejemplo, si el usuario empieza en `x = 300` y termina en `x = 100`, el ancho sigue siendo positivo y `x` pasa a ser `100`.

### 3.8 Tipos `Interaction`

`Interaction` es una unión discriminada. Cada interacción tiene una propiedad `kind` que permite saber qué operación está activa:

```ts
export type Interaction =
  | DrawInteraction
  | MoveInteraction
  | ResizeInteraction
  | RotateInteraction
  | MarqueeInteraction;
```

La unión permite que `onPointerMove()` y `onPointerUp()` ejecuten el comportamiento correcto sin usar `any`.

#### `DrawInteraction`

Se inicia cuando el usuario elige una herramienta de dibujo y presiona sobre el canvas.

Guarda:

- `pageIndex`: página donde comenzó la interacción.
- `start`: punto inicial.
- `initialPages`: snapshot usado para historial.

#### `MoveInteraction`

Se inicia al presionar un elemento con la herramienta de selección.

Guarda:

- `pageIndex`: página donde están los elementos.
- `start`: punto inicial del puntero.
- `elementIds`: uno o varios elementos que se moverán.
- `initialElements`: posiciones originales de los elementos de esa página.
- `initialPages`: snapshot para undo.

#### `ResizeInteraction`

Se inicia al presionar uno de los ocho handles.

Guarda:

- `elementId`: elemento que se redimensiona.
- `handle`: punto de redimensionado utilizado.
- `initialElement`: geometría original.
- `initialPages`: snapshot para undo.

#### `RotateInteraction`

Se inicia al presionar el botón circular que aparece encima del elemento seleccionado.

Guarda:

- `elementId`: elemento que rota.
- `startAngle`: ángulo del puntero al comenzar.
- `center`: centro del elemento.
- `initialElement`: rotación original.
- `initialPages`: snapshot para undo.

#### `MarqueeInteraction`

Es la selección por arrastre sobre un espacio vacío.

Guarda:

- `pageIndex`: página de la selección.
- `start`: punto inicial.
- `initialSelection`: selección anterior, necesaria para combinar con `Shift`.

## 4. Estado reactivo del componente

El componente usa Signals de Angular para el estado local.

### Estado de la interfaz

```ts
readonly notebookTitle = signal('Mi cuaderno');
readonly activeTool = signal<ToolType>('select');
readonly canvasLocked = signal(false);
readonly currentSpread = signal(0);
readonly selectedPageIndex = signal(0);
readonly selectedElementIds = signal<string[]>([]);
```

- `notebookTitle`: título editable.
- `activeTool`: herramienta actualmente activa.
- `canvasLocked`: impide crear o modificar elementos cuando vale `true`.
- `currentSpread`: índice del conjunto visible de dos páginas.
- `selectedPageIndex`: índice de la página actualmente enfocada.
- `selectedElementIds`: IDs de los elementos seleccionados.

### Estado temporal de interacción

```ts
readonly draftElement = signal<NotebookElement | null>(null);
readonly draftPageIndex = signal<number | null>(null);
readonly selectionBox = signal<SelectionBox | null>(null);
readonly selectionBoxPageIndex = signal<number | null>(null);
```

Estos valores son temporales y existen mientras el puntero está siendo arrastrado.

#### Por qué existe `draftPageIndex`

Como se muestran dos páginas, no basta con saber que existe un `draftElement`. También hay que saber en qué página se debe renderizar.

El HTML comprueba:

```html
draftPageIndex() === currentSpread() * 2 + pageIndex
```

Esto evita que una figura que se está dibujando aparezca simultáneamente en las dos páginas visibles.

#### Por qué existe `selectionBoxPageIndex`

La caja de selección tiene el mismo problema. Si solo se almacenara la caja, el template podría pintarla en ambas páginas.

Por eso se guarda el índice de la página en la que empezó la selección y se renderiza únicamente allí.

### Estado permanente del cuaderno

```ts
readonly pages = signal<NotebookPage[]>([...]);
```

Es la fuente principal de verdad del contenido del editor. Los spreads se calculan a partir de este array; no se mantienen páginas duplicadas para la vista izquierda y derecha.

### Estado del historial

```ts
readonly history = signal<NotebookPage[][]>([]);
readonly redoHistory = signal<NotebookPage[][]>([]);
```

Cada entrada es una copia completa del array de páginas.

Los valores derivados son:

```ts
readonly canUndo = computed(() => this.history().length > 0);
readonly canRedo = computed(() => this.redoHistory().length > 0);
```

Se utiliza `computed()` porque `canUndo` y `canRedo` dependen completamente de los arrays del historial.

### Estado derivado de páginas visibles

```ts
readonly visiblePages = computed(() => [
  this.pages()[this.currentSpread() * 2] ?? null,
  this.pages()[this.currentSpread() * 2 + 1] ?? null,
]);
```

Si `currentSpread()` vale `0`, se muestran los índices `0` y `1`. Si vale `1`, se muestran `2` y `3`.

La fórmula general es:

```text
índice de página izquierda = currentSpread * 2
índice de página derecha   = currentSpread * 2 + 1
```

Si no existe la segunda página, se devuelve `null` y se pinta la tarjeta de página vacía.

## 5. Flujo de herramientas

La herramienta se selecciona desde `NotebookToolbarComponent`. El hijo emite `toolSelected` y el padre ejecuta `setActiveTool()`.

```html
(toolSelected)="setActiveTool($event)"
```

Al cambiar de herramienta se limpian las interacciones temporales:

```ts
setActiveTool(tool: ToolType): void {
  this.activeTool.set(tool);
  this.draftElement.set(null);
  this.draftPageIndex.set(null);
  this.selectionBox.set(null);
  this.selectionBoxPageIndex.set(null);
}
```

Esto evita dejar una figura fantasma o una caja de selección activa al cambiar de herramienta.

### 5.1 Herramienta `select`

Es la herramienta principal para editar elementos.

Permite:

- Hacer click en un elemento para seleccionarlo.
- Arrastrar cualquier parte del elemento para moverlo.
- Arrastrar un handle para redimensionarlo.
- Arrastrar el handle circular para rotarlo.
- Arrastrar sobre un espacio vacío para crear una selección múltiple.
- Mantener `Shift`, `Ctrl` o `Cmd` para alternar elementos en la selección.

Al presionar un elemento, se ejecuta `onElementPointerDown()`.

La implementación no exige hacer click en una esquina del elemento para moverlo. El propio `.canvas-element` recibe el evento, mientras que la imagen y el SVG tienen `pointer-events: none` para que el contenedor sea el objetivo del puntero.

### 5.2 Herramientas de dibujo

Las herramientas `text`, `rectangle`, `ellipse`, `line` y `arrow` siguen el mismo patrón:

1. El usuario selecciona la herramienta.
2. Presiona sobre el canvas.
3. Se guarda la página y el punto inicial.
4. Se crea un elemento provisional de tamaño `1 x 1`.
5. Mientras se arrastra, se actualiza el rectángulo envolvente.
6. Al soltar, se confirma el elemento si mide al menos `8 x 8`.
7. La herramienta vuelve automáticamente a `select`.

El tamaño se calcula mediante:

```ts
getBounds(start, end)
```

Esta función devuelve siempre un rectángulo normalizado con ancho y alto positivos.

La figura se muestra durante el arrastre usando `draftElement`. Solo se agrega definitivamente a `page.elements` en `onPointerUp()`.

Esto es lo que evita que un simple click cree automáticamente un rectángulo o una elipse.

### 5.4 Herramienta `image`

El flujo de imagen es diferente porque necesita un archivo del sistema:

1. El usuario selecciona `image`.
2. Presiona en una posición del canvas.
3. Se guarda `pageIndex` y `point` en `pendingImagePlacement`.
4. Se abre el input de archivos oculto.
5. El usuario elige una imagen.
6. Se crea un elemento inicial de `180 x 140`.
7. Se ajusta su posición para que permanezca dentro del canvas.
8. Se crea una URL temporal con `URL.createObjectURL(file)`.
9. Se agrega a la página y se selecciona.

La posición se guarda antes de abrir el selector porque el evento de cambio del input ocurre después de la interacción original con el canvas.

En una futura versión con persistencia, la URL temporal deberá reemplazarse por un archivo almacenado o por una URL permanente.

### 5.5 Herramienta `eraser`

Cuando está activa, hacer click sobre un elemento ejecuta:

```ts
deleteElement(pageIndex, element.id)
```

El borrador no necesita arrastre en la implementación actual. Es una eliminación por click.

### 5.6 Herramientas visualizadas como próximamente

La toolbar muestra un botón de dibujo a mano alzada, pero está deshabilitado:

```html
[disabled]="true"
```

No debe añadirse `'freehand'` a `NotebookTool` hasta que exista una representación adecuada para sus puntos o trazos.

Una futura interfaz podría ser:

```ts
interface FreehandElement extends NotebookElement {
  type: 'freehand';
  points: Point[];
}
```

## 6. Eventos de puntero

El canvas escucha cuatro eventos principales:

```html
(pointerdown)="onCanvasPointerDown(...)"
(pointermove)="onPointerMove($event)"
(pointerup)="onPointerUp($event)"
(pointercancel)="onPointerUp($event)"
```

Los eventos de puntero funcionan tanto con mouse como con lápiz táctil y touch.

### 6.1 `pointerdown` en el canvas

`onCanvasPointerDown()` decide qué operación iniciar según la herramienta activa.

Primero verifica si el canvas está bloqueado. Luego evita comenzar una operación sobre un elemento existente:

```ts
if (target.closest('.canvas-element')) return;
```

Después convierte la coordenada del navegador a coordenada local:

```ts
const point = this.getCanvasPoint(event, event.currentTarget as HTMLElement);
```

Finalmente selecciona el flujo apropiado:

| Herramienta | Interacción iniciada |
| --- | --- |
| `image` | Espera la selección de archivo. |
| `eraser` | No inicia arrastre desde un espacio vacío. |
| `select` | Inicia `marquee`. |
| Dibujo | Inicia `draw`. |

### 6.2 `pointerdown` en un elemento

`onElementPointerDown()` se utiliza cuando el usuario pulsa sobre un elemento existente.

Orden de decisión:

1. Si el lienzo está bloqueado, no hace nada.
2. Detiene la propagación para que el canvas no inicie otra interacción.
3. Marca la página como seleccionada.
4. Si la herramienta es `eraser`, elimina el elemento.
5. Si la herramienta no es `select`, no mueve el elemento.
6. Si hay una tecla modificadora, alterna la selección.
7. En otro caso, inicia una interacción `move`.

El `stopPropagation()` es especialmente importante para que el mismo pointerdown no se procese también como un click sobre el fondo de la página.

### 6.3 `pointermove`

`onPointerMove()` examina `interaction.kind` y ejecuta una operación diferente:

- `draw`: actualiza `draftElement`.
- `marquee`: actualiza `selectionBox`.
- `move`: calcula un desplazamiento y mueve los elementos.
- `rotate`: recalcula el ángulo.
- `resize`: calcula una nueva geometría.

Antes de operar, el punto se limita al área del canvas con `constrainPoint()`.

### 6.4 `pointerup`

`onPointerUp()` confirma o finaliza la interacción.

Para dibujar:

- El draft se elimina.
- Si alcanza el tamaño mínimo, se agrega a la página.
- Se guarda el snapshot para undo.
- El nuevo elemento queda seleccionado.
- La herramienta vuelve a `select`.

Para marquee:

- Se buscan los elementos que intersectan la caja.
- Se actualiza la lista de IDs seleccionados.
- Se elimina la caja visual.

Para mover, redimensionar o rotar:

- Se compara el estado inicial con el estado final.
- Solo si hubo cambios se agrega una entrada al historial.

## 7. Sistema de coordenadas y límites

Todos los elementos utilizan coordenadas relativas a su propia página. No deben utilizar coordenadas relativas al viewport del navegador.

La conversión se realiza así:

```ts
private getCanvasPoint(event: PointerEvent, element: HTMLElement): Point {
  const rect = element.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}
```

Esto permite que el elemento siga la posición correcta aunque la página esté desplazada dentro de la ventana.

### `constrainPoint()`

Limita un punto al rango válido del canvas:

```text
0 ≤ x ≤ canvas.clientWidth
0 ≤ y ≤ canvas.clientHeight
```

Esto evita que el puntero produzca valores fuera del área visual.

### Movimiento dentro de límites

Para mover varios elementos se calcula el rectángulo combinado de la selección:

```text
minX = borde izquierdo más pequeño
minY = borde superior más pequeño
maxX = borde derecho más grande
maxY = borde inferior más grande
```

Después se limita el desplazamiento para que ese rectángulo completo permanezca dentro del canvas.

Esto es importante para selección múltiple: no se limita cada elemento por separado, sino el grupo completo.

### Redimensionado dentro de límites

`resizeElement()` aplica estas reglas:

- El borde izquierdo nunca baja de `0`.
- El borde superior nunca baja de `0`.
- El borde derecho nunca supera `canvasWidth`.
- El borde inferior nunca supera `canvasHeight`.
- El tamaño mínimo de ancho y alto es `24`.

El tamaño mínimo de dibujo inicial es diferente: una figura dibujada debe alcanzar al menos `8 x 8` para confirmarse. El mínimo de `24` se utiliza durante el redimensionado para evitar elementos demasiado pequeños o difíciles de volver a seleccionar.

### Consideración sobre rotación

Actualmente los límites de movimiento y redimensionado se calculan utilizando el rectángulo sin rotar. La rotación visual puede hacer que una esquina sobresalga ligeramente aunque el rectángulo original esté dentro de los límites.

Si en el futuro se necesita una restricción geométrica exacta, será necesario calcular el bounding box rotado usando los cuatro vértices transformados alrededor del centro.

## 8. Selección simple y múltiple

La selección se guarda como una lista de IDs:

```ts
readonly selectedElementIds = signal<string[]>([]);
```

### Selección simple

Al hacer click sobre un elemento sin teclas modificadoras, la selección pasa a contener únicamente ese ID.

### Selección aditiva

Con `Shift`, `Ctrl` o `Cmd`, el ID se añade si no estaba seleccionado o se elimina si ya estaba seleccionado.

Esto permite construir una selección de varios elementos sin perder los anteriores.

### Selección por caja

Al arrastrar sobre el espacio vacío se crea una `SelectionBox`. Al soltar, `intersects()` comprueba qué elementos se cruzan con ella.

La comparación actual utiliza el rectángulo envolvente sin considerar la rotación exacta del contenido. Es suficiente para el demo y es el mismo modelo usado para mover y limitar elementos.

### Movimiento de varios elementos

La interacción guarda `elementIds`. Durante el movimiento:

1. Se calcula el delta del puntero.
2. Se obtiene el bounding box del grupo.
3. Se limita el delta.
4. Se aplica el mismo delta a cada elemento seleccionado.

Por eso los elementos conservan sus distancias relativas durante el movimiento.

## 9. Redimensionado

Los handles se renderizan únicamente cuando se cumplen ambas condiciones:

```ts
isSelected(element.id) && activeTool() === 'select'
```

El handle llama a:

```ts
onResizePointerDown(event, pageIndex, element, handle)
```

La función guarda la geometría original y el handle utilizado. Mientras el puntero se mueve, `resizeElement()` mantiene cuatro límites conceptuales:

```text
left   = x
top    = y
right  = x + width
bottom = y + height
```

Según el handle se modifica uno o dos de ellos. Al final se reconstruye el elemento:

```text
x      = left
y      = top
width  = right - left
height = bottom - top
```

La redimensión no cambia el tipo del elemento ni su rotación.

## 10. Rotación

El control de rotación es el botón circular ubicado sobre el elemento seleccionado.

Al iniciar:

1. Se calcula el centro del elemento.
2. Se calcula el ángulo inicial entre el centro y el puntero.
3. Se guarda la rotación original.

Durante el movimiento:

```ts
const angle = this.getAngle(center, point);
const rotation = initialRotation + deltaAngleInDegrees;
```

`getAngle()` utiliza:

```ts
Math.atan2(point.y - center.y, point.x - center.x)
```

`atan2()` devuelve el ángulo en radianes. Luego se convierte a grados multiplicando por `180 / Math.PI`, porque CSS espera grados en `rotate(...)`.

La rotación se almacena en el propio elemento, por lo que permanece al cambiar de herramienta o navegar entre spreads.

## 11. Escritura de texto

Existen dos tipos de escritura:

### Texto principal de la página

El `textarea.writing-area` ocupa todo el canvas y actualiza `page.content`.

```html
(input)="updatePageContent($event, pageIndex)"
```

### Elemento flotante de texto

Cuando se crea un elemento con `type === 'text'`, se genera un `textarea` interno. Su contenido se guarda en `element.content` mediante `updateElementText()`.

El elemento flotante puede moverse, redimensionarse y rotarse como los demás elementos.

### Consideración actual sobre historial

Las funciones `updatePageContent()` y `updateElementText()` actualizan directamente el estado y actualmente no crean un snapshot individual por cada pulsación de tecla. Esto evita llenar el historial con una entrada por carácter, pero también significa que el undo de texto no está separado por edición.

Una mejora futura sería registrar el historial:

- Al perder el foco.
- Con debounce.
- Al confirmar una edición.

## 12. Imágenes

Las imágenes se renderizan con:

```html
<img class="element-image" [src]="element.imageUrl" />
```

El CSS establece:

```css
object-fit: contain;
pointer-events: none;
```

`pointer-events: none` hace que el contenedor `.canvas-element` reciba la interacción, lo que permite mover la imagen haciendo click en cualquier parte de ella.

La URL creada con `URL.createObjectURL()` es temporal. Si se eliminan imágenes o se navega durante mucho tiempo, una versión de producción debería llamar a `URL.revokeObjectURL()` cuando la URL deje de utilizarse.

## 13. Undo y redo

### Snapshot

Antes de una operación mutadora importante se clona el estado de las páginas. La clonación se realiza con:

```ts
clonePages()
```

Y cada elemento se copia con:

```ts
cloneElements()
```

Las copias son necesarias para que el historial no apunte al mismo array que continúa mutándose.

### `commitPages()`

Centraliza las operaciones que cambian de forma completa las páginas:

1. Guarda el estado anterior en `history`.
2. Vacía `redoHistory`.
3. Reemplaza `pages` con una copia del nuevo estado.

El redo se vacía cuando aparece un cambio nuevo después de un undo, que es el comportamiento esperado en editores.

### Undo

`undo()` toma el último snapshot de `history`, guarda el estado actual en `redoHistory` y restaura el snapshot anterior.

### Redo

`redo()` toma el último snapshot de `redoHistory`, guarda el estado actual en `history` y restaura el estado siguiente.

### Atajos

| Atajo | Acción |
| --- | --- |
| `Ctrl + Z` / `Cmd + Z` | Deshacer. |
| `Ctrl + Shift + Z` / `Cmd + Shift + Z` | Rehacer. |
| `Ctrl + Y` / `Cmd + Y` | Rehacer. |
| `Delete` o `Backspace` | Eliminar selección. |
| `Escape` | Cancelar interacción temporal y volver a selección. |

Los atajos no se ejecutan mientras el usuario está escribiendo en un `input`, `textarea` o elemento editable.

## 14. Bloqueo del lienzo

La toolbar puede bloquear el canvas con `toggleCanvasLock()`.

Cuando `canvasLocked()` es `true`, se bloquean:

- Crear figuras.
- Seleccionar elementos.
- Mover elementos.
- Redimensionar.
- Rotar.
- Eliminar con la herramienta borrador.
- Colocar imágenes.

El bloqueo también cancela la interacción temporal activa y limpia drafts y cajas de selección.

El texto principal y los textos internos no tienen un bloqueo visual adicional en el demo. Si el bloqueo debe impedir también la escritura, habrá que añadir `[readonly]` o una condición equivalente a los `textarea`.

## 15. Paginación y spreads

El componente importa:

```ts
import { PaginatorModule } from 'primeng/paginator';
```

El paginador usa un spread por página de PrimeNG:

```html
<p-paginator
  [first]="currentSpread()"
  [rows]="1"
  [totalRecords]="spreadCount()"
  (onPageChange)="onPageChange($event)"
></p-paginator>
```

`rows="1"` significa que cada posición del paginador representa un conjunto de dos páginas, no una página individual.

### Navegación manual

Los botones `Anterior` y `Siguiente` actualizan `currentSpread()` respetando los límites:

```text
mínimo = 0
máximo = spreadCount - 1
```

Al cambiar de spread se limpia la selección para no conservar IDs visualmente seleccionados en una página que ya no se está mostrando.

### Crear una página

`addPage()` añade una página vacía al final, calcula su índice, navega al spread correspondiente y la marca como página seleccionada.

La segunda página visible puede ser `null` cuando todavía no existe. En ese caso se muestra un estado vacío, pero no se crea automáticamente hasta que el usuario pulse `Nueva página`.

## 16. Evitar el bug de reflejo entre páginas

La vista muestra dos estructuras `.page-canvas` al mismo tiempo. Por eso los estados temporales siempre deben estar asociados a un `pageIndex`.

Los dos casos protegidos son:

### Draft de dibujo

Se utilizan:

```ts
draftElement
draftPageIndex
```

El draft se pinta solo cuando su índice coincide con la página actual del `@for`.

### Caja de selección

Se utilizan:

```ts
selectionBox
selectionBoxPageIndex
```

La caja se pinta solo en la página donde comenzó el arrastre.

### Regla para futuras interacciones

Toda interacción temporal nueva debería guardar siempre:

1. El tipo de interacción.
2. El índice de la página.
3. El elemento afectado, si aplica.
4. El estado inicial necesario para cancelar o guardar historial.

No se debe crear un único estado global que el template de ambas páginas pueda interpretar indistintamente.

## 17. PrimeNG utilizado

La feature utiliza PrimeNG para los controles de interfaz:

- `ButtonModule`: botones de nueva página, navegación y acciones.
- `ToolbarModule`: estructura de la barra de herramientas.
- `TooltipModule`: ayudas visuales sobre las herramientas.
- `PaginatorModule`: navegación entre spreads.

Las figuras y los controles de manipulación son HTML, CSS y SVG porque necesitan interacción geométrica personalizada. PrimeNG no reemplaza esa parte del editor.

## 18. Accesibilidad y experiencia de usuario

La implementación incluye:

- `aria-label` en botones y controles principales.
- Tooltips de PrimeNG en las herramientas.
- Botones deshabilitados cuando una acción no está disponible.
- Estado visual para la herramienta activa.
- Estado visual para el elemento seleccionado.
- `touch-action: none` para que las interacciones de dibujo sean consistentes.
- Exclusión de atajos mientras se escribe.

Recomendaciones para seguir mejorando:

1. Añadir indicadores de foco visibles para handles y botones.
2. Permitir mover elementos con las flechas del teclado.
3. Añadir `aria-live` para comunicar cambios de página.
4. Mostrar una ayuda de atajos en la interfaz.
5. Añadir un estado visible cuando el lienzo está bloqueado.
6. Asegurar que los elementos pequeños sigan teniendo un área de click cómoda.

## 19. Qué ocurre cuando se modifica cada entidad

| Acción | Estado modificado | Historial actual |
| --- | --- | --- |
| Crear figura | `pages`, `selectedElementIds` | Sí |
| Crear imagen | `pages`, `selectedElementIds` | Sí |
| Mover elemento | `pages` | Sí al soltar |
| Mover varios elementos | `pages` | Sí al soltar |
| Redimensionar | `pages` | Sí al soltar |
| Rotar | `pages` | Sí al soltar |
| Eliminar selección | `pages`, `selectedElementIds` | Sí |
| Usar borrador | `pages`, `selectedElementIds` | Sí |
| Editar texto principal | `pages` | No por cada input actualmente |
| Editar texto flotante | `pages` | No por cada input actualmente |
| Cambiar título | `notebookTitle` | No |
| Cambiar de spread | `currentSpread`, `selectedPageIndex` | No |

## 20. Guía para añadir un nuevo tipo de elemento

Para añadir una nueva figura, por ejemplo `diamond`, se recomienda seguir este orden.

### Paso 1: ampliar `NotebookTool`

```ts
export type NotebookTool =
  | ...
  | 'diamond';
```

Como `diamond` no está excluido por `ElementType`, pasará a formar parte automáticamente de los elementos persistentes.

### Paso 2: añadir el botón a la toolbar

El botón debe emitir `selectTool('diamond')` y tener:

- Icono.
- `aria-label`.
- Tooltip.
- Estado `tool-active`.

### Paso 3: añadir el render en el template

Dentro del `@switch (element.type)` se agrega un nuevo `@case` con SVG o HTML.

También hay que añadirlo al bloque del `draftElement`, para que se vea mientras se dibuja.

### Paso 4: revisar el cursor y estilos

Si necesita estilos particulares, agregarlos a `notebooks-template.css` evitando afectar a otras figuras.

### Paso 5: revisar el comportamiento geométrico

Si la figura solo necesita un rectángulo envolvente, no hay que cambiar `resizeElement()`. Si necesita puntos especiales, proporciones fijas o una estructura propia, deberá añadirse lógica específica.

### Paso 6: comprobar historial y límites

El nuevo elemento debe:

- Usar `createElement()`.
- Guardarse en `page.elements`.
- Respetar los límites del canvas.
- Poder seleccionarse y eliminarse.
- Poder moverse, salvo que exista una razón para impedirlo.

## 21. Guía para modificar el modelo de datos

Antes de añadir una propiedad a `NotebookElement`, comprobar si realmente aplica a todos los elementos. Si solo aplica a uno, considerar una unión discriminada más específica:

```ts
interface BaseElement {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

interface TextElement extends BaseElement {
  type: 'text';
  content: string;
}

interface ImageElement extends BaseElement {
  type: 'image';
  imageUrl: string;
}
```

Ese modelo es más estricto que los campos opcionales actuales, pero también requiere adaptar todos los lugares que crean, copian y renderizan elementos. Por eso no debe introducirse como cambio aislado.

## 22. Evolución recomendada de la arquitectura

Cuando esta pantalla crezca, conviene extraer responsabilidades en este orden:

### 22.1 Servicio de geometría

Podría contener funciones puras como:

- `getBounds()`.
- `constrainPoint()`.
- `resizeElement()`.
- `intersects()`.
- Cálculo del ángulo.
- Bounding box rotado.

Al ser funciones puras, son fáciles de probar sin renderizar Angular.

### 22.2 Servicio de estado del cuaderno

Podría administrar:

- `pages`.
- Historial.
- Redo.
- Creación y eliminación.
- Actualización de elementos.

El componente quedaría enfocado en coordinar eventos y mostrar el estado.

### 22.3 Modelo de viewport

Necesario para implementar correctamente:

- Zoom.
- Ajustar a pantalla.
- Centrar selección.

### 22.4 Renderizador o componente de elementos

Si el `@switch` del template crece demasiado, cada tipo visual podría tener un componente especializado. No conviene hacerlo mientras el número de tipos siga siendo pequeño, porque se añadiría complejidad sin una ganancia clara.

### 22.5 Persistencia

La persistencia debería añadirse después de estabilizar el modelo local. El flujo esperado sería:

```text
Interacción del usuario
        ↓
Estado local con signals
        ↓
Snapshot o cambio confirmado
        ↓
Servicio de persistencia
        ↓
Backend
```

El componente no debería hacer llamadas HTTP directamente.

## 23. Reglas prácticas antes de modificar el código

Antes de cambiar esta feature:

1. Revisar `notebook-template.interface.ts`.
2. Comprobar si la modificación afecta a una página o a ambas páginas visibles.
3. Mantener `pageIndex` en toda interacción temporal.
4. No usar coordenadas del viewport como si fueran coordenadas del canvas.
5. No mutar directamente snapshots que estén en el historial.
6. Mantener la herramienta y el tipo de elemento separados conceptualmente.
7. Usar `computed()` para valores derivados.
8. Limpiar drafts y selecciones al cancelar una operación.
9. Añadir la operación al historial una sola vez, normalmente al soltar el puntero.
10. Ejecutar TypeScript y build después de modificar interfaces o templates.

## 24. Comprobaciones recomendadas

Después de cambios en esta carpeta:

```powershell
& .\node_modules\.bin\tsc.cmd --noEmit -p tsconfig.app.json
& .\node_modules\.bin\ng.cmd build --configuration development
git diff --check
```

Además de compilar, conviene probar manualmente:

- Crear una figura en la página izquierda.
- Crear otra figura en la página derecha mientras se muestra el mismo spread.
- Arrastrar una selección desde cada página.
- Mover una figura desde el centro, no solo desde una esquina.
- Mover varios elementos hasta los cuatro bordes.
- Redimensionar desde los ocho handles.
- Rotar una figura.
- Deshacer y rehacer cada operación.
- Bloquear y desbloquear el canvas.
- Cambiar de spread mientras hay elementos seleccionados.
- Crear una página nueva.
- Subir una imagen y moverla dentro de sus límites.

## 25. Resumen del flujo completo

```text
Usuario elige herramienta
          ↓
activeTool cambia mediante signal
          ↓
Usuario presiona el canvas o un elemento
          ↓
Se crea Interaction con pageIndex y estado inicial
          ↓
pointermove actualiza draft, selección o geometría
          ↓
constrainPoint limita la interacción al canvas
          ↓
pointerup confirma el cambio
          ↓
commitPages guarda snapshot cuando corresponde
          ↓
La vista se actualiza mediante signals
```

La idea central para mantener la feature escalable es conservar esta separación:

```text
Toolbar       → comunica intención
Template      → representa el estado
Componente TS → coordina interacción
Interfaces    → definen contratos
Geometría     → calcula posiciones y tamaños
Estado        → guarda páginas e historial
Persistencia  → futura responsabilidad externa
```

Mientras cada nueva funcionalidad respete esa separación, será posible añadir zoom, nuevos elementos, persistencia y colaboración sin tener que reescribir todo el template.
