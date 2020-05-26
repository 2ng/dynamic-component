import {
  ComponentFactory,
  ComponentFactoryResolver,
  ComponentRef,
  Directive,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChange,
  SimpleChanges,
  Type,
  ViewContainerRef,
} from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

type OutputBindingObject<C> = Partial<
  {
    [output in keyof C]: C[output] extends EventEmitter<infer K>
      ? (event: K) => void
      : never;
  }
>;

type InputBindingObject<C> = Partial<{ [input in keyof C]: C[input] }>;

type ComponentInstance<C> = C & {
  ngOnChanges?: (changes: SimpleChanges) => void;
};

@Directive({
  selector: 'ng-container[dynamicComponent]',
})
export class DynamicComponentDirective<C> implements OnChanges, OnDestroy {
  @Input() dynamicComponent: Type<C>;
  @Input() inputs: InputBindingObject<C>;
  @Input() outputs: OutputBindingObject<C>;

  private _compRef: ComponentRef<C>;
  private _compFactory: ComponentFactory<C>;

  private _destroyer = new Subject<void>();

  constructor(private _host: ViewContainerRef, private _cfr: ComponentFactoryResolver) {}

  ngOnChanges(changes: SimpleChanges) {
    const { dynamicComponent, inputs, outputs } = changes;

    if (dynamicComponent) {
      this._createComponent(dynamicComponent);
    }

    if (inputs) {
      this._bindInputs(inputs);
    }

    if (outputs) {
      this._bindOutputs(outputs);
    }
  }

  private _createComponent(change: SimpleChange): void {
    const { currentValue, firstChange } = change;

    if (!firstChange) {
      this._compRef.destroy();
    }

    if (currentValue) {
      this._compFactory = this._cfr.resolveComponentFactory<C>(currentValue);
      this._compRef = this._host.createComponent<C>(this._compFactory);
    }
  }

  private _bindInputs(inputs: SimpleChange): void {
    const instance = this._compRef?.instance as ComponentInstance<C>;

    if (instance) {
      this._compFactory.inputs.forEach(({ propName }) => {
        instance[propName] = inputs.currentValue?.[propName];
      });

      this._compRef.changeDetectorRef.markForCheck();

      if (instance.ngOnChanges) {
        this._applyNgOnChanges(inputs);
      }
    }
  }

  private _applyNgOnChanges(inputs: SimpleChange): void {
    const { previousValue, currentValue, firstChange } = inputs;

    const changed = Object.keys(currentValue).reduce((acc, key) => {
      if (firstChange || previousValue?.[key] !== currentValue?.[key]) {
        acc[key] = new SimpleChange(
          previousValue?.[key],
          currentValue?.[key],
          firstChange,
        );
      }

      return acc;
    }, {} as SimpleChanges);

    if (Object.keys(changed).length) {
      const instance = this._compRef.instance as ComponentInstance<C>;

      instance.ngOnChanges(changed);
    }
  }

  private _bindOutputs(outputs: SimpleChange): void {
    const { currentValue, firstChange } = outputs;

    if (!firstChange) {
      this._destroyer.next();
    }

    if (this._compRef.instance) {
      this._compFactory.outputs.forEach(({ propName }) => {
        const output = this._compRef.instance[propName] as EventEmitter<any>;

        if (typeof currentValue?.[propName] === 'function') {
          output.pipe(takeUntil(this._destroyer)).subscribe(currentValue[propName]);
        }
      });
    }
  }

  ngOnDestroy() {
    this._destroyer.next();
    this._destroyer.complete();

    this._compRef.destroy();
  }
}
