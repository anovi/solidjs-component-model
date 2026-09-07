import { describe, it, expect } from "vitest";
import {
  createRoot,
  createEffect,
  createRenderEffect,
  createComputed,
  createMemo,
  createSignal,
  untrack,
} from "solid-js";
import { createStore, unwrap, type SetStoreFunction } from "solid-js/store";
import { createPromiseResolver, sleep } from "../test-kit";

interface State {
  count: number;
  text: string;
  nested: {
    value: number;
  };
}

class StoreContainer {
  private _store: State;
  private _setStore: SetStoreFunction<State>;

  constructor(initialState?: Partial<State>) {
    const [store, setStore] = createStore<State>({
      count: 0,
      text: "initial",
      nested: { value: 10 },
      ...initialState,
    });
    this._store = store;
    this._setStore = setStore;
  }

  /**
   * Property that returns the store wrapped in untrack.
   *
   * untrack only executes its callback `() => this._store` without tracking.
   * Because `this._store` is already a reactive Proxy, returning it just returns
   * the Proxy reference. Subsequent property reads on that returned Proxy
   * (e.g. `container.data.count`) happen OUTSIDE untrack's callback.
   */
  get data(): State {
    return untrack(() => this._store);
  }

  setCount(count: number) {
    this._setStore("count", count);
  }

  setText(text: string) {
    this._setStore("text", text);
  }

  setNestedValue(value: number) {
    this._setStore("nested", "value", value);
  }
}

describe("SolidJS Research: untrack(() => storeProxy) behavior", () => {
  it("subscribes to property changes when reading from untracked getter in createComputed (synchronous)", () => {
    createRoot(dispose => {
      const container = new StoreContainer({ count: 0 });
      let computedRunCount = 0;
      let lastObservedCount = -1;

      createComputed(() => {
        computedRunCount++;
        // 'container.data' executes untrack(() => this._store), returning the store Proxy.
        // Then, '.count' is accessed on the returned Proxy while Listener is active.
        lastObservedCount = container.data.count;
      });

      // Runs synchronously on creation
      expect(computedRunCount).toBe(1);
      expect(lastObservedCount).toBe(0);

      // Mutating the store triggers synchronous re-computation because .count was tracked!
      container.setCount(1);
      expect(computedRunCount).toBe(2);
      expect(lastObservedCount).toBe(1);

      container.setCount(2);
      expect(computedRunCount).toBe(3);
      expect(lastObservedCount).toBe(2);

      dispose();
    });
  });

  it("subscribes to property changes when reading from untracked getter in createRenderEffect", async () => {
    return createRoot(async dispose => {
      const container = new StoreContainer({ count: 0 });
      let runCount = 0;
      let lastObservedCount = -1;

      createRenderEffect(() => {
        runCount++;
        lastObservedCount = container.data.count;
      });

      expect(runCount).toBe(1);
      expect(lastObservedCount).toBe(0);

      container.setCount(42);
      await sleep(0);

      expect(runCount).toBe(2);
      expect(lastObservedCount).toBe(42);

      dispose();
    });
  });

  it("subscribes to property changes when reading from untracked getter in createEffect (asynchronous)", async () => {
    return createRoot(async dispose => {
      const container = new StoreContainer({ count: 0 });
      let effectRunCount = 0;
      let lastObservedCount = -1;

      createEffect(() => {
        effectRunCount++;
        lastObservedCount = container.data.count;
      });

      await sleep(0);
      expect(effectRunCount).toBe(1);
      expect(lastObservedCount).toBe(0);

      container.setCount(1);
      await sleep(0);

      expect(effectRunCount).toBe(2);
      expect(lastObservedCount).toBe(1);

      dispose();
    });
  });

  it("subscribes when assigning data to a local variable first before property read", () => {
    createRoot(dispose => {
      const container = new StoreContainer({ count: 0 });
      let runCount = 0;
      let lastObservedCount = -1;

      createComputed(() => {
        runCount++;
        const d = container.data; // untrack returns the proxy
        lastObservedCount = d.count; // accessing .count here triggers the proxy get trap with active Listener
      });

      expect(runCount).toBe(1);
      expect(lastObservedCount).toBe(0);

      container.setCount(99);
      expect(runCount).toBe(2);
      expect(lastObservedCount).toBe(99);

      dispose();
    });
  });

  it("subscribes when obtaining the proxy outside the computation and reading its properties inside", () => {
    createRoot(dispose => {
      const container = new StoreContainer({ count: 0 });
      const dataProxy = container.data; // obtained outside reactive context

      let runCount = 0;
      let lastObservedCount = -1;

      createComputed(() => {
        runCount++;
        lastObservedCount = dataProxy.count; // read inside reactive context
      });

      expect(runCount).toBe(1);
      expect(lastObservedCount).toBe(0);

      container.setCount(100);
      expect(runCount).toBe(2);
      expect(lastObservedCount).toBe(100);

      dispose();
    });
  });

  it("subscribes to nested property changes inside reactive context", () => {
    createRoot(dispose => {
      const container = new StoreContainer();
      let runCount = 0;
      let lastObservedNestedValue = -1;

      createComputed(() => {
        runCount++;
        lastObservedNestedValue = container.data.nested.value;
      });

      expect(runCount).toBe(1);
      expect(lastObservedNestedValue).toBe(10);

      container.setNestedValue(99);
      expect(runCount).toBe(2);
      expect(lastObservedNestedValue).toBe(99);

      dispose();
    });
  });

  it("subscribes when used inside createMemo", () => {
    createRoot(dispose => {
      const container = new StoreContainer({ count: 5 });

      const doubled = createMemo(() => {
        return container.data.count * 2;
      });

      expect(doubled()).toBe(10);

      container.setCount(10);
      expect(doubled()).toBe(20);

      dispose();
    });
  });

  it("does NOT subscribe if the property read itself is wrapped in untrack()", () => {
    createRoot(dispose => {
      const container = new StoreContainer({ count: 0 });
      const [trigger, setTrigger] = createSignal(0);
      let runCount = 0;
      let lastObservedCount = -1;

      createComputed(() => {
        runCount++;
        trigger(); // explicit signal dependency
        // Wrapping the actual property read in untrack() bypasses tracking
        lastObservedCount = untrack(() => container.data.count);
      });

      expect(runCount).toBe(1);
      expect(lastObservedCount).toBe(0);

      // Mutating count should NOT trigger re-computation
      container.setCount(50);
      expect(runCount).toBe(1);
      expect(lastObservedCount).toBe(0);

      // Triggering manual signal causes re-computation and reads the updated value
      setTrigger(1);
      expect(runCount).toBe(2);
      expect(lastObservedCount).toBe(50);

      dispose();
    });
  });

  it("does NOT subscribe when store is unwrapped with unwrap() before reading properties", () => {
    createRoot(dispose => {
      const container = new StoreContainer({ count: 0 });
      let runCount = 0;

      createComputed(() => {
        runCount++;
        // unwrap strips the Proxy wrapper and returns the raw underlying JS object
        const raw = unwrap(container.data);
        const _ = raw.count;
        void _;
      });

      expect(runCount).toBe(1);

      // Mutating store does NOT notify raw object reads
      container.setCount(77);
      expect(runCount).toBe(1);

      dispose();
    });
  });

  describe("unwrap(state.user) vs unwrap(state).user subscription behavior", () => {
    it("unwrap(state.user) subscribes to 'state.user' (not user.name), so property updates inside user do NOT re-run, but replacing/clearing user DOES re-run", async () => {
      const [promise, done] = createPromiseResolver();
      createRoot(async dispose => {
        const [state, setState] = createStore<{
          user: { name: string } | undefined;
        }>({ user: { name: "John" } });
        let runCount = 0;
        let lastObservedUser: { name: string } | undefined;

        createComputed(() => {
          runCount++;
          // Reading `state.user` accesses the proxy getter while Listener is active,
          // creating a subscription to `state.user` (the property on `state`).
          // `unwrap` strips proxies from `state.user`, so `user.name` is NOT subscribed to.
          const user = unwrap(state.user);
          lastObservedUser = user;
        });

        expect(runCount).toBe(1);
        expect(lastObservedUser?.name).toBe("John");

        // 1. setState("user", "name", "Jane") or setState("user", { name: "Jane" }):
        // Solid store MERGES objects at "user", so the `user` reference on `state` does NOT change!
        // Only `user.name` is updated. Because `user.name` was read from raw unwrapped object,
        // it does NOT trigger re-computation.
        setState("user", { name: "Jane" });
        await sleep(0);
        expect(runCount).toBe(1); // STILL 1! No re-run!

        // 2. Direct mutation on unwrapped object (user.name = "Jane") does NOT trigger re-computation:
        if (lastObservedUser) {
          lastObservedUser.name = "Direct";
        }
        await sleep(0);
        expect(runCount).toBe(1); // STILL 1!

        // 3. But if `state.user` itself is changed (e.g. set to undefined or a new object type),
        // the `state.user` subscription fires!
        setState("user", undefined);
        await sleep(0);
        expect(runCount).toBe(2); // RE-RUNS because `state.user` changed!
        expect(lastObservedUser).toBeUndefined();

        dispose();
        done();
      });
      return promise;
    });

    it("comparing with tracked `state.user.name`: DOES re-run when nested property changes", async () => {
      const [promise, done] = createPromiseResolver();
      createRoot(async dispose => {
        const [state, setState] = createStore({ user: { name: "John" } });
        let runCount = 0;
        let lastObservedName = "";

        createComputed(() => {
          runCount++;
          // Tracked read through proxy: subscribes to both `state.user` AND `user.name`
          lastObservedName = state.user.name;
        });

        expect(runCount).toBe(1);
        expect(lastObservedName).toBe("John");

        // Here, updating `user.name` triggers re-computation
        setState("user", { name: "Jane" });
        await sleep(0);
        expect(runCount).toBe(2);
        expect(lastObservedName).toBe("Jane");

        dispose();
        done();
      });
      return promise;
    });

    it("unwrap(state).user does NOT subscribe to 'state.user' because unwrap() is called on the root store before property access", () => {
      createRoot(dispose => {
        const [state, setState] = createStore<{
          user: { name: string } | undefined;
        }>({ user: { name: "John" } });
        let runCount = 0;

        createComputed(() => {
          runCount++;
          // unwrap(state) returns the raw root object.
          // Accessing `.user` on the raw object does NOT trigger the proxy getter.
          const rawState = unwrap(state);
          const user = rawState.user;
          void user?.name;
        });

        expect(runCount).toBe(1);

        // Setting `user` to undefined does NOT trigger re-computation because no proxy property was accessed
        setState("user", undefined);
        expect(runCount).toBe(1);

        dispose();
      });
    });

    it("untrack(() => unwrap(state.user)) prevents subscription to 'state.user'", () => {
      createRoot(dispose => {
        const [state, setState] = createStore<{
          user: { name: string } | undefined;
        }>({ user: { name: "John" } });
        let runCount = 0;

        createComputed(() => {
          runCount++;
          // Wrapping the read in untrack prevents `state.user` from subscribing
          const user = untrack(() => unwrap(state.user));
          void user?.name;
        });

        expect(runCount).toBe(1);

        // Setting `user` to undefined does NOT trigger re-computation
        setState("user", undefined);
        expect(runCount).toBe(1);

        dispose();
      });
    });
  });
});
