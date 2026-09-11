# Instrucciones para agentes

## Proyecto

Este repositorio es una aplicación Angular.

## Reglas básicas

- Revisa los archivos existentes antes de modificar código.
- Mantén los cambios enfocados en la tarea solicitada.
- No sobrescribas cambios del usuario.
- Ejecuta las pruebas o comprobaciones disponibles después de realizar cambios.
- Usa el formato y las convenciones ya existentes en el proyecto.

## Estructura

- El código fuente principal está en `src/`.
- Los recursos públicos están en `public/`.
- La configuración de Angular está en `angular.json`.
- IGNORA LA CARPETA DE `node_modules` A NO SER QUE EL USUARIO TE LO PIDA O SEA ESTRICTAMENTE NECESARIO DE SER NECESARIO PREGUNTAR ANTES DE


# AI Agent Instructions - Angular Development Guidelines

## 1. Objetivo

Estas reglas definen cómo los agentes de IA deben analizar, crear, modificar y refactorizar código Angular dentro del proyecto.

El objetivo principal es mantener una aplicación:

- Modular.
- Mantenible.
- Reutilizable.
- Escalable.
- Fácil de entender.
- Consistente con Angular moderno.
- Con responsabilidades bien separadas.
- Con el menor acoplamiento posible.

Antes de modificar código, el agente debe entender primero la arquitectura existente y respetar las convenciones del proyecto.

---

## 2. Regla principal: respetar el proyecto existente

Antes de crear o modificar archivos:

1. Revisar la estructura de carpetas relacionada con la tarea.
2. Revisar componentes, servicios, interfaces y modelos existentes.
3. Buscar funcionalidades similares que puedan reutilizarse.
4. Evitar crear una segunda implementación de algo que ya existe.
5. Mantener los nombres, patrones y convenciones existentes cuando sean correctos.
6. No renombrar ni reorganizar archivos sin una razón técnica clara.
7. No introducir una arquitectura completamente diferente solo por preferencia personal.

### No asumir

El agente no debe inventar:

- Propiedades que no existen.
- Servicios que no existen.
- Interfaces innecesarias.
- Endpoints.
- Métodos de API.
- Variables de estado.
- Componentes inexistentes.
- Librerías que no están instaladas.

Si algo necesario no existe, primero comprobar si existe una alternativa en el proyecto.

---

# 3. Angular moderno

Utilizar preferentemente las APIs modernas de Angular.

## Preferir

- `signal()`
- `computed()`
- `effect()` cuando realmente sea necesario
- `input()`
- `output()`
- `model()`
- `inject()`
- Standalone Components
- Control flow moderno:
  - `@if`
  - `@else`
  - `@for`
  - `@switch`
- `ChangeDetectionStrategy.OnPush`
- APIs modernas de Angular cuando sean apropiadas.

### Ejemplo

Preferir:

```ts
readonly user = signal<User | null>(null);

readonly fullName = computed(() => {
  const currentUser = this.user();

  return currentUser
    ? `${currentUser.firstName} ${currentUser.lastName}`
    : '';
});
```

Sobre mantener estado mutable innecesario:

```ts
user: User | null = null;
fullName = '';
```

---

# 4. Uso correcto de Signals

Los Signals deben utilizarse como mecanismo principal para estado reactivo local cuando aporten valor.

## Usar `signal()` para

- Estado de UI.
- Loading.
- Errores.
- Datos obtenidos de APIs.
- Filtros.
- Selecciones.
- Estados de componentes.
- Valores que cambian y afectan directamente al template.

Ejemplo:

```ts
readonly loading = signal(false);
readonly selectedId = signal<string | null>(null);
readonly items = signal<Item[]>([]);
```

## Usar `computed()` para valores derivados

No almacenar como estado algo que pueda calcularse a partir de otro estado.

Preferir:

```ts
readonly total = computed(() =>
  this.items().reduce((sum, item) => sum + item.price, 0)
);
```

En lugar de:

```ts
items = signal<Item[]>([]);
total = signal(0);
```

y actualizar manualmente `total`.

Esto evita estados duplicados y reduce inconsistencias.

---

# 5. Uso de `effect()`

`effect()` no debe utilizarse como sustituto de `computed()`.

Usarlo principalmente para efectos secundarios reales, por ejemplo:

- Sincronización con APIs externas.
- LocalStorage.
- Logging específico.
- Integraciones externas.
- Acciones que realmente necesitan ejecutarse cuando cambia un signal.

No usar:

```ts
effect(() => {
  this.fullName.set(`${this.firstName()} ${this.lastName()}`);
});
```

Si el valor es derivado, utilizar `computed()`.

---

# 6. Inputs y Outputs

Preferir las APIs modernas:

```ts
readonly userId = input.required<string>();

readonly saved = output<User>();
```

En lugar de:

```ts
@Input() userId!: string;
@Output() saved = new EventEmitter<User>();
```

Usar `model()` cuando exista una necesidad real de two-way binding.

---

# 7. Inyección de dependencias

Preferir `inject()`:

```ts
private readonly userService = inject(UserService);
```

En lugar de:

```ts
constructor(private userService: UserService) {}
```

Mantener las dependencias `private readonly` cuando no necesiten ser accesibles desde el template.

---

# 8. Componentización

## Regla

Si un componente está creciendo demasiado, analizar si puede dividirse en componentes más pequeños.

Componentizar cuando una parte:

- Tiene una responsabilidad clara.
- Se repite.
- Tiene lógica independiente.
- Tiene un template complejo.
- Puede reutilizarse.
- Mejora considerablemente la legibilidad.

Ejemplo conceptual:

```text
UserPageComponent
├── UserHeaderComponent
├── UserFiltersComponent
├── UserTableComponent
└── UserFormComponent
```

No componentizar artificialmente elementos triviales solo para aumentar la cantidad de archivos.

El objetivo es separar responsabilidades, no crear un zoológico de componentes.

---

# 9. Componentes reutilizables

Antes de crear un componente nuevo, buscar componentes existentes que puedan reutilizarse.

Si una UI aparece en varias partes de la aplicación, considerar crear un componente reutilizable.

Ejemplo:

```text
shared/
├── components/
│   ├── empty-state/
│   ├── loading-state/
│   ├── confirmation-dialog/
│   └── page-header/
```

Los componentes reutilizables deben:

- Tener una API clara.
- Recibir información mediante inputs.
- Emitir eventos mediante outputs.
- Evitar conocer detalles específicos de una feature.
- Evitar depender directamente de lógica de negocio de una pantalla concreta.

---

# 10. Separación de responsabilidades

Evitar componentes que hagan absolutamente todo:

```text
Component
├── API calls
├── State management
├── Business logic
├── Data transformation
├── Validation
├── Complex calculations
└── UI
```

Cuando la lógica crezca, dividir responsabilidades.

Una estructura posible:

```text
Feature
├── components/
├── services/
├── state/
├── interfaces/
├── models/
└── pages/
```

No crear todas estas carpetas si la feature no las necesita.

---

# 11. Estructura de carpetas

Mantener una estructura organizada por responsabilidad y feature.

Ejemplo:

```text
src/
└── app/
    ├── core/
    │   ├── guards/
    │   ├── interceptors/
    │   ├── services/
    │   └── ...
    │
    ├── shared/
    │   ├── components/
    │   ├── directives/
    │   ├── pipes/
    │   └── ...
    │
    ├── features/
    │   ├── users/
    │   │   ├── components/
    │   │   ├── interfaces/
    │   │   ├── models/
    │   │   ├── pages/
    │   │   ├── services/
    │   │   └── state/
    │   │
    │   └── products/
    │       ├── components/
    │       ├── interfaces/
    │       ├── models/
    │       ├── pages/
    │       ├── services/
    │       └── state/
    │
    └── app.routes.ts
```

La estructura exacta debe adaptarse al proyecto existente.

---

# 12. Interfaces

Mantener una carpeta específica para interfaces cuando el proyecto utilice esta convención.

Ejemplo:

```text
interfaces/
├── user.interface.ts
├── user-response.interface.ts
└── user-filter.interface.ts
```

Ejemplo:

```ts
export interface User {
  id: string;
  name: string;
  email: string;
}
```

Evitar definir interfaces grandes directamente dentro de componentes si son utilizadas en varios archivos.

También evitar crear interfaces innecesarias para objetos triviales que solo se utilizan una vez.

---

# 13. Models vs Interfaces

Mantener una separación coherente.

Usar `interfaces/` principalmente para contratos de datos:

```text
interfaces/
├── user.interface.ts
├── create-user.interface.ts
└── update-user.interface.ts
```

Usar `models/` cuando exista lógica o una representación de dominio más rica que justifique un modelo.

No crear ambas carpetas automáticamente. Utilizar la convención que ya siga el proyecto.

---

# 14. Servicios

Los servicios deben encargarse de responsabilidades específicas.

## Servicios de estado con Signals

Cuando una feature necesite manejar estado, **preferir un servicio dedicado de estado basado en Signals** en lugar de almacenar ese estado directamente en el componente.

El objetivo es mantener los componentes enfocados en la presentación y coordinación de la UI, evitando que se conviertan en contenedores gigantes de estado y lógica.

Ejemplo:

```ts
@Injectable()
export class ProductsStateService {
  private readonly _products = signal<Product[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly products = this._products.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly hasProducts = computed(() => this._products().length > 0);

  setProducts(products: Product[]): void {
    this._products.set(products);
  }

  setLoading(loading: boolean): void {
    this._loading.set(loading);
  }

  setError(error: string | null): void {
    this._error.set(error);
  }
}
```

El componente consume el estado:

```ts
private readonly productsState = inject(ProductsStateService);

readonly products = this.productsState.products;
readonly loading = this.productsState.loading;
readonly hasProducts = this.productsState.hasProducts;
```

De esta forma, el componente no necesita mantener manualmente múltiples variables de estado.

### Separar API y estado cuando sea conveniente

Cuando una feature tenga suficiente complejidad, separar:

```text
services/
├── products-api.service.ts
└── products-state.service.ts
```

`ProductsApiService`:

- Comunicación HTTP.
- Endpoints.
- Requests y responses.

`ProductsStateService`:

- Signals.
- Estado de la feature.
- Valores derivados mediante `computed()`.
- Actualización del estado.

Esto permite mantener una separación clara entre **datos externos** y **estado de la aplicación**.

### El componente debe consumir el estado

Evitar:

```ts
export class ProductsComponent {
  products = signal<Product[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  // Mucha lógica de estado...
}
```

Preferir:

```ts
export class ProductsComponent {
  private readonly productsState = inject(ProductsStateService);

  readonly products = this.productsState.products;
  readonly loading = this.productsState.loading;
  readonly error = this.productsState.error;
}
```

El componente debe concentrarse principalmente en:

- Presentación.
- Interacción del usuario.
- Coordinación de acciones.
- Composición de componentes.

### Importante

No crear un servicio de estado por obligación para cada componente pequeño.

Para una UI trivial con uno o dos valores locales, un `signal()` dentro del componente puede ser perfectamente correcto.

Utilizar un servicio de estado cuando el estado:

- Sea relevante para una feature.
- Sea utilizado por varios componentes.
- Tenga lógica de actualización.
- Tenga múltiples valores relacionados.
- Pueda hacer crecer innecesariamente el componente.
- Necesite persistir durante la navegación interna de una feature.

El objetivo es **sacar el estado complejo del componente**, no convertir cada booleano en un servicio porque la humanidad ya tiene suficientes archivos.


Ejemplos:

```text
services/
├── users-api.service.ts
├── users-state.service.ts
└── users-permissions.service.ts
```

Cuando exista una diferencia clara entre:

- Comunicación con API.
- Estado.
- Lógica específica.

No mezclar todo en un único servicio gigantesco.

### Evitar

```ts
UserService {
  getUsers();
  createUser();
  updateUser();
  deleteUser();
  manageState();
  showDialogs();
  managePermissions();
  formatData();
  exportExcel();
}
```

Si el servicio empieza a convertirse en el protagonista de toda la aplicación, probablemente necesita dividirse.

---

# 15. Reutilización

Antes de escribir código nuevo:

1. Buscar funciones existentes.
2. Buscar servicios existentes.
3. Buscar componentes existentes.
4. Buscar interfaces existentes.
5. Buscar pipes/directivas existentes.
6. Revisar si una funcionalidad similar ya está implementada.

No duplicar código cuando pueda reutilizarse razonablemente.

### Pero tampoco sobre-abstraer

No crear una abstracción genérica complicada para dos líneas de código que solo aparecen una vez.

La reutilización debe reducir complejidad, no aumentarla.

---

# 16. Código mantenible

Priorizar:

- Nombres descriptivos.
- Funciones pequeñas.
- Responsabilidades únicas.
- Tipado fuerte.
- Código predecible.
- Flujo fácil de seguir.
- Poca duplicación.
- Dependencias claras.

Evitar:

- Métodos gigantes.
- Variables con nombres ambiguos.
- `any` innecesario.
- Lógica duplicada.
- Condicionales profundamente anidados.
- Magic numbers.
- Comentarios que expliquen código obvio.

---

# 17. TypeScript

Utilizar TypeScript de forma estricta.

Preferir:

```ts
const user: User = response;
```

Evitar:

```ts
const user: any = response;
```

No utilizar `any` simplemente para silenciar errores.

Cuando sea posible, utilizar:

- Interfaces.
- Tipos.
- Unions.
- Generics.
- Type guards.
- Utility types.

---

# 18. Template

Mantener los templates limpios.

Evitar meter lógica compleja directamente en HTML.

Preferir:

```html
@if (isEmpty()) {
  <app-empty-state />
}
```

Sobre expresiones complejas repetidas:

```html
@if (!loading() && items().length === 0 && filters().some(...)) {
  ...
}
```

Si una condición se vuelve compleja, convertirla en un `computed()` o método apropiado.

---

# 19. Estado

Evitar múltiples fuentes de verdad.

Mal:

```ts
items = signal<Item[]>([]);
itemCount = signal(0);
hasItems = signal(false);
```

Si `itemCount` y `hasItems` dependen de `items`, utilizar:

```ts
readonly items = signal<Item[]>([]);

readonly itemCount = computed(() => this.items().length);

readonly hasItems = computed(() => this.items().length > 0);
```

Esto reduce bugs provocados por estados que se olvidan de sincronizar.

---

# 20. Manejo de APIs

Separar preferentemente la comunicación HTTP de la presentación.

Ejemplo:

```text
features/products/
├── interfaces/
├── services/
│   ├── products-api.service.ts
│   └── products-state.service.ts
└── pages/
```

El componente debería coordinar la UI, no convertirse en un cliente HTTP con patas.

---

# 21. Manejo de errores y loading

Los estados de una operación asíncrona deben ser explícitos.

Considerar:

```ts
readonly loading = signal(false);
readonly error = signal<string | null>(null);
readonly data = signal<Product[]>([]);
```

Evitar estados ambiguos como:

```ts
data = null;
```

donde no queda claro si significa:

- Cargando.
- Error.
- Sin datos.
- No inicializado.

---

# 22. Modificaciones de código existente

Cuando se solicite modificar una funcionalidad:

1. Entender primero el código existente.
2. Cambiar únicamente lo necesario.
3. Mantener la lógica que ya funciona.
4. Evitar refactors gigantescos si no son necesarios.
5. No cambiar nombres públicos sin razón.
6. No romper contratos existentes.
7. Revisar usos del código antes de cambiar interfaces o servicios.

Si un refactor es necesario, hacerlo de forma incremental.

---

# 23. Nuevas funcionalidades

Para una nueva feature:

1. Identificar el dominio.
2. Crear la carpeta de la feature.
3. Separar páginas y componentes.
4. Crear interfaces.
5. Crear servicios cuando sean necesarios.
6. Crear estado reactivo cuando sea necesario.
7. Reutilizar componentes existentes.
8. Mantener la feature lo más independiente posible.

Ejemplo:

```text
features/orders/
├── components/
│   ├── order-table/
│   ├── order-filters/
│   └── order-summary/
├── interfaces/
│   ├── order.interface.ts
│   ├── create-order.interface.ts
│   └── order-filter.interface.ts
├── pages/
│   ├── orders-page/
│   └── order-detail-page/
├── services/
│   └── orders-api.service.ts
└── state/
    └── orders-state.service.ts
```

---

# 24. Shared vs Core vs Feature

## `core/`

Utilizar para funcionalidades globales de infraestructura:

- Auth.
- Guards.
- Interceptors.
- Configuración.
- Servicios globales.

## `shared/`

Utilizar para elementos reutilizables:

- Componentes.
- Directivas.
- Pipes.
- Utilidades compartidas.

## `features/`

Utilizar para funcionalidades propias de un dominio:

- Users.
- Products.
- Orders.
- Accounting.
- Loans.

Evitar poner lógica específica de una feature dentro de `shared/`.

---

# 25. Imports

Mantener imports limpios.

Eliminar imports no utilizados.

Evitar imports circulares.

Preferir importar desde el archivo/fuente apropiada y mantener los barrels (`index.ts`) solo cuando realmente aporten claridad.

---

# 26. Performance

No optimizar prematuramente.

Cuando exista una necesidad real:

- Utilizar `OnPush`.
- Signals.
- `computed()`.
- Lazy loading.
- Trackeo correcto en `@for`.
- Evitar cálculos repetitivos en templates.
- Evitar recrear objetos innecesariamente.

Ejemplo:

```html
@for (item of items(); track item.id) {
  ...
}
```

---

# 27. Accesibilidad

Cuando se creen componentes de UI:

- Usar elementos HTML semánticos.
- Labels asociados a inputs.
- Estados disabled correctamente.
- Soporte de teclado cuando aplique.
- ARIA solo cuando sea necesario.
- No depender exclusivamente del color para comunicar estados.

---

# 28. Dependencias

No agregar una librería externa para resolver algo que Angular o el proyecto ya pueden resolver.

Antes de instalar una dependencia:

1. Revisar `package.json`.
2. Verificar si existe una solución interna.
3. Considerar el coste de mantenimiento.
4. Usarla solo si aporta valor real.

---

# 29. Refactorización

Una refactorización debe mejorar al menos uno de estos aspectos:

- Legibilidad.
- Reutilización.
- Mantenibilidad.
- Testabilidad.
- Separación de responsabilidades.
- Rendimiento.
- Consistencia arquitectónica.

No refactorizar simplemente porque una implementación "podría verse más bonita".

---

# 30. Reglas para agentes de IA

Antes de entregar código, comprobar:

### Arquitectura

- [ ] ¿Estoy respetando la estructura existente?
- [ ] ¿La funcionalidad está dentro de la feature correcta?
- [ ] ¿Las interfaces están en `interfaces/` según la convención del proyecto?
- [ ] ¿Estoy colocando código compartido en `shared/` únicamente si realmente es compartido?

### Angular

- [ ] ¿Estoy utilizando APIs modernas de Angular?
- [ ] ¿Puedo usar `signal()`?
- [ ] ¿Un valor derivado debería ser `computed()`?
- [ ] ¿Realmente necesito `effect()`?
- [ ] ¿Estoy utilizando `input()` / `output()` cuando corresponde?
- [ ] ¿Estoy usando `inject()`?
- [ ] ¿Estoy utilizando `@if`, `@for` y `@switch`?

### Código

- [ ] ¿Estoy evitando `any`?
- [ ] ¿Estoy evitando duplicación?
- [ ] ¿Las responsabilidades están separadas?
- [ ] ¿Los nombres son claros?
- [ ] ¿Estoy evitando métodos demasiado grandes?
- [ ] ¿Estoy reutilizando código existente?

### SOLID

- [ ] ¿Cada componente, servicio o clase tiene una responsabilidad clara?
- [ ] ¿Estoy evitando acoplamiento innecesario?
- [ ] ¿Las interfaces contienen únicamente lo necesario?
- [ ] ¿Estoy aplicando SOLID sin sobre-abstraer?

### Estado y servicios

- [ ] ¿El estado de la feature debería vivir en un servicio con Signals?
- [ ] ¿Estoy evitando ensuciar el componente con demasiada lógica de estado?
- [ ] ¿Los valores derivados están implementados con `computed()`?
- [ ] ¿La comunicación HTTP está separada del manejo de estado cuando corresponde?

### Componentización

- [ ] ¿El componente tiene demasiadas responsabilidades?
- [ ] ¿Alguna parte puede convertirse en un componente reutilizable?
- [ ] ¿Estoy evitando componentizar cosas trivialmente?

### Cambios

- [ ] ¿Estoy modificando únicamente lo necesario?
- [ ] ¿He revisado los usos existentes antes de cambiar una API?
- [ ] ¿Estoy evitando romper funcionalidad existente?
- [ ] ¿Estoy introduciendo código o propiedades que no existen sin necesidad?

---

# 31. Prioridad de decisiones

Cuando existan varias soluciones posibles, priorizar en este orden:

1. **Correctitud**
2. **Compatibilidad con la arquitectura existente**
3. **Mantenibilidad**
4. **Reutilización**
5. **Simplicidad**
6. **Rendimiento**
7. **Elegancia**

Una solución sencilla y consistente con el proyecto es preferible a una solución técnicamente sofisticada pero innecesariamente compleja.

---

# 32. Regla final

El agente debe escribir código que otro desarrollador pueda entender meses después sin necesitar preguntarle a una entidad sobrenatural qué demonios estaba pensando.

**Preferir código simple, moderno, tipado, reutilizable y bien organizado.**

No introducir complejidad sin una razón concreta.
