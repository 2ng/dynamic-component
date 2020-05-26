# @2ng/dynamic-component

## Usage

```ts
import { DynamicComponentModule } from '@2ng/dynamic-component';
```

```html
<ng-container
  [dynamicComponent]="component"
  [inputs]="inputs"
  [outputs]="outputs"
></ng-container>
```

## API

```ts
component: Type<C>
```

Компонент Angular

```ts
inputs: Partial<{ [input in keyof C]: C[input] }>;
```

Объект, ключи которого - это инпуты компонента, который будет отрисован динамически. Значение соответствует типу этого инпута.

Типизацией не смог получить только инпуты компонента, поэтому вывожу все свойства и методы класса в типах. Но внутри директивы присваиваю значение свойства только если задано значение свойству с именем инпута.

```ts
outputs: Partial<
  {
    [output in keyof C]: C[output] extends EventEmitter<infer K>
      ? (event: K) => void
      : never;
  }
>;;
```

Объект, ключи которого - это аутпуты компонента, который будет отрисован динамически. Значение - функция, которая будет передана в метод `subscribe`, при подписке на аутпут компонента.

Аналогично в типах вывожу все свойства и методы, но будет ошибка, если это свойство не экземпляр `EventEmitter`. Внутри директивы подписываюсь на аутпут только если свойству с именем аутпута присвоена функция .

---

## Example

### Component One

`one.component.ts`

```ts
import { Component, EventEmitter } from '@angular/core';

@Component({
  template: `
    <div>{{ name }}</div>
    <button (click)="showMore.emit()">Show more</div>
  `,
})
export class OneComponent {
  @Input() name: string;
  @Output() showMore = new EventEmitter<void>();
}
```

### Component Two

`two.component.html`

```html
<ng-container
  [dynamicComponent]="component"
  [inputs]="inputs"
  [outputs]="outputs"
></ng-container>
```

`two.component.ts`

```ts
import { Component } from '@angular/core';
import OneComponent from '/one.component';

@Component({...})
export class TwoComponent {
  component = OneComponent;
  inputs = {
    name: 'Andrey'
  }
  outputs = {
    showMore: () => this.onShowMore();
  }

  onShowMore() {
    console.log('show more');
  }
}
```
