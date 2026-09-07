/* eslint-disable @typescript-eslint/no-explicit-any */
import { onCleanup } from "solid-js";
import type { AnyModel, EventType } from "./types";
import type { Event } from "./state-chart";
import type { Unsubscribable } from "./observable";

export type EventHandlers<E extends Event> = {
  [K in EventType<E>]?: (event: Extract<E, { type: K }>) => void;
};

type HasEvents<E extends Event> = {
  on: <T extends EventType<E>>(
    type: T,
    handler: (event: Extract<E, { type: T }>) => void
  ) => Unsubscribable;
};

export function useModel<M extends new (...args: any[]) => AnyModel>(
  ctor: M,
  ...args: ConstructorParameters<M>
): InstanceType<M>;
export function useModel<M extends new (...args: any[]) => object>(
  ctor: M,
  ...args: ConstructorParameters<M>
): InstanceType<M>;

/**
 * Instantiates a component model inside a SolidJS component, automatically
 * starting it on mount and stopping it on cleanup (unmount).
 *
 * @param ctor - Model class constructor.
 * @param args - Arguments forwarded to the constructor.
 * @returns The instantiated and started model instance.
 *
 * @example
 * ```ts
 * interface ModelData {
 *   count: number;
 *   label: string;
 * }
 *
 * export class CounterModel extends ComponentModel<ModelData> {
 *   constructor(count: number, label: string) {
 *     super({ count, label });
 *   }
 *
 *   increment() {
 *     this.data.setCount(c => c + 1);
 *   }
 * }
 *
 * // Inside a SolidJS component
 * function MyComponent() {
 *   const model = useModel(CounterModel, 1, 'a');
 *
 *   createEffect(() => {
 *     console.log('count:', model.data.count);
 *   });
 *
 *   return <button onClick={() => model.increment()}>Increment</button>;
 * }
 * ```
 */
export function useModel(
  ctor: new (...args: any[]) => AnyModel,
  ...args: any[]
): AnyModel {
  const model = new ctor(...args);
  onCleanup(model.stop.bind(model));
  model.start();
  return model;
}

/**
 * Subscribe to events with automatic disposal of subscription.
 */
export function useEvents<E extends Event>(
  model: HasEvents<E>,
  handlers: EventHandlers<E>
) {
  const subscriptions = Object.entries(handlers).map(([type, handler]) =>
    model.on(type as never, handler as never)
  );

  onCleanup(() => {
    for (const sub of subscriptions) {
      sub.unsubscribe();
    }
  });
}
