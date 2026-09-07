import { bench, describe } from "vitest";
import { createComputed, createRoot, untrack } from "solid-js";
import { createStore, unwrap } from "solid-js/store";

describe("SolidJS Store Reading Benchmark", () => {
  // 1. Flat store with multiple scalar properties
  const [flatStore] = createStore({
    a: 1,
    b: 2,
    c: 3,
    d: 4,
    e: 5,
    f: 6,
    g: 7,
    h: 8,
    i: 9,
    j: 10,
  });

  // 2. Deeply nested store (5 levels deep)
  const [nestedStore] = createStore({
    level1: {
      level2: {
        level3: {
          level4: {
            level5: {
              value: 42,
              name: "nested-benchmark",
            },
          },
        },
      },
    },
  });

  // 3. Array store with 1,000 items containing objects
  const [arrayStore] = createStore({
    items: Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      name: `item_${i}`,
      value: i * 2,
      active: i % 2 === 0,
    })),
  });

  // ---------------------------------------------------------------------------
  // Suite 1: Single property read inside a reactive context
  // ---------------------------------------------------------------------------
  describe("Flat store - single property read inside reactive context", () => {
    bench("tracked (default)", () => {
      createRoot(dispose => {
        createComputed(() => {
          const _ = flatStore.a;
          void _;
        });
        dispose();
      });
    });

    bench("untracked (untrack)", () => {
      createRoot(dispose => {
        createComputed(() => {
          const _ = untrack(() => flatStore.a);
          void _;
        });
        dispose();
      });
    });

    bench("unwrapped (unwrap)", () => {
      createRoot(dispose => {
        createComputed(() => {
          const raw = unwrap(flatStore);
          const _ = raw.a;
          void _;
        });
        dispose();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 2: Multiple property reads inside a reactive context
  // ---------------------------------------------------------------------------
  describe("Flat store - reading multiple properties (10 props x 100 times) inside reactive context", () => {
    bench("tracked (default)", () => {
      createRoot(dispose => {
        createComputed(() => {
          let sum = 0;
          for (let i = 0; i < 100; i++) {
            sum +=
              flatStore.a +
              flatStore.b +
              flatStore.c +
              flatStore.d +
              flatStore.e +
              flatStore.f +
              flatStore.g +
              flatStore.h +
              flatStore.i +
              flatStore.j;
          }
          void sum;
        });
        dispose();
      });
    });

    bench("untracked (untrack block)", () => {
      createRoot(dispose => {
        createComputed(() => {
          let sum = 0;
          untrack(() => {
            for (let i = 0; i < 100; i++) {
              sum +=
                flatStore.a +
                flatStore.b +
                flatStore.c +
                flatStore.d +
                flatStore.e +
                flatStore.f +
                flatStore.g +
                flatStore.h +
                flatStore.i +
                flatStore.j;
            }
          });
          void sum;
        });
        dispose();
      });
    });

    bench("untracked (untrack per read)", () => {
      createRoot(dispose => {
        createComputed(() => {
          let sum = 0;
          for (let i = 0; i < 100; i++) {
            sum +=
              untrack(() => flatStore.a) +
              untrack(() => flatStore.b) +
              untrack(() => flatStore.c) +
              untrack(() => flatStore.d) +
              untrack(() => flatStore.e) +
              untrack(() => flatStore.f) +
              untrack(() => flatStore.g) +
              untrack(() => flatStore.h) +
              untrack(() => flatStore.i) +
              untrack(() => flatStore.j);
          }
          void sum;
        });
        dispose();
      });
    });

    bench("unwrapped (unwrap block)", () => {
      createRoot(dispose => {
        createComputed(() => {
          let sum = 0;
          const raw = unwrap(flatStore);
          for (let i = 0; i < 100; i++) {
            sum +=
              raw.a +
              raw.b +
              raw.c +
              raw.d +
              raw.e +
              raw.f +
              raw.g +
              raw.h +
              raw.i +
              raw.j;
          }
          void sum;
        });
        dispose();
      });
    });

    bench("unwrapped (unwrap per read)", () => {
      createRoot(dispose => {
        createComputed(() => {
          let sum = 0;
          for (let i = 0; i < 100; i++) {
            sum +=
              unwrap(flatStore).a +
              unwrap(flatStore).b +
              unwrap(flatStore).c +
              unwrap(flatStore).d +
              unwrap(flatStore).e +
              unwrap(flatStore).f +
              unwrap(flatStore).g +
              unwrap(flatStore).h +
              unwrap(flatStore).i +
              unwrap(flatStore).j;
          }
          void sum;
        });
        dispose();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 3: Deeply nested store reads inside a reactive context
  // ---------------------------------------------------------------------------
  describe("Deeply nested store - 5 levels deep inside reactive context", () => {
    bench("tracked (default)", () => {
      createRoot(dispose => {
        createComputed(() => {
          for (let i = 0; i < 100; i++) {
            const v = nestedStore.level1.level2.level3.level4.level5.value;
            const n = nestedStore.level1.level2.level3.level4.level5.name;
            void v;
            void n;
          }
        });
        dispose();
      });
    });

    bench("untracked (untrack block)", () => {
      createRoot(dispose => {
        createComputed(() => {
          untrack(() => {
            for (let i = 0; i < 100; i++) {
              const v = nestedStore.level1.level2.level3.level4.level5.value;
              const n = nestedStore.level1.level2.level3.level4.level5.name;
              void v;
              void n;
            }
          });
        });
        dispose();
      });
    });

    bench("untracked (untrack per read)", () => {
      createRoot(dispose => {
        createComputed(() => {
          for (let i = 0; i < 100; i++) {
            const v = untrack(
              () => nestedStore.level1.level2.level3.level4.level5.value
            );
            const n = untrack(
              () => nestedStore.level1.level2.level3.level4.level5.name
            );
            void v;
            void n;
          }
        });
        dispose();
      });
    });

    bench("unwrapped (unwrap block)", () => {
      createRoot(dispose => {
        createComputed(() => {
          const raw = unwrap(nestedStore);
          for (let i = 0; i < 100; i++) {
            const v = raw.level1.level2.level3.level4.level5.value;
            const n = raw.level1.level2.level3.level4.level5.name;
            void v;
            void n;
          }
        });
        dispose();
      });
    });

    bench("unwrapped (unwrap per read)", () => {
      createRoot(dispose => {
        createComputed(() => {
          for (let i = 0; i < 100; i++) {
            const v =
              unwrap(nestedStore).level1.level2.level3.level4.level5.value;
            const n =
              unwrap(nestedStore).level1.level2.level3.level4.level5.name;
            void v;
            void n;
          }
        });
        dispose();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 4: Array store iteration inside a reactive context
  // ---------------------------------------------------------------------------
  describe("Array store - iterating 1,000 items inside reactive context", () => {
    bench("tracked (default)", () => {
      createRoot(dispose => {
        createComputed(() => {
          let total = 0;
          for (let i = 0; i < arrayStore.items.length; i++) {
            const item = arrayStore.items[i];
            total += item.value;
            if (item.active) {
              total += item.id;
            }
          }
          void total;
        });
        dispose();
      });
    });

    bench("untracked (untrack block)", () => {
      createRoot(dispose => {
        createComputed(() => {
          let total = 0;
          untrack(() => {
            for (let i = 0; i < arrayStore.items.length; i++) {
              const item = arrayStore.items[i];
              total += item.value;
              if (item.active) {
                total += item.id;
              }
            }
          });
          void total;
        });
        dispose();
      });
    });

    bench("untracked (untrack per read)", () => {
      createRoot(dispose => {
        createComputed(() => {
          let total = 0;
          const len = untrack(() => arrayStore.items.length);
          for (let i = 0; i < len; i++) {
            const item = untrack(() => arrayStore.items[i]);
            total += untrack(() => item.value);
            if (untrack(() => item.active)) {
              total += untrack(() => item.id);
            }
          }
          void total;
        });
        dispose();
      });
    });

    bench("unwrapped (unwrap block)", () => {
      createRoot(dispose => {
        createComputed(() => {
          let total = 0;
          const raw = unwrap(arrayStore);
          for (let i = 0; i < raw.items.length; i++) {
            const item = raw.items[i];
            total += item.value;
            if (item.active) {
              total += item.id;
            }
          }
          void total;
        });
        dispose();
      });
    });

    bench("unwrapped (unwrap per read)", () => {
      createRoot(dispose => {
        createComputed(() => {
          let total = 0;
          const rawItems = unwrap(arrayStore.items);
          const len = rawItems.length;
          for (let i = 0; i < len; i++) {
            const item = unwrap(rawItems[i]);
            total += item.value;
            if (item.active) {
              total += item.id;
            }
          }
          void total;
        });
        dispose();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 5: Store reads outside reactive context (no Listener active)
  // ---------------------------------------------------------------------------
  describe("Outside reactive context (no Listener)", () => {
    bench("default direct read", () => {
      let sum = 0;
      for (let i = 0; i < 100; i++) {
        sum +=
          flatStore.a +
          flatStore.b +
          flatStore.c +
          flatStore.d +
          flatStore.e +
          flatStore.f +
          flatStore.g +
          flatStore.h +
          flatStore.i +
          flatStore.j;
      }
      void sum;
    });

    bench("wrapped in untrack", () => {
      let sum = 0;
      untrack(() => {
        for (let i = 0; i < 100; i++) {
          sum +=
            flatStore.a +
            flatStore.b +
            flatStore.c +
            flatStore.d +
            flatStore.e +
            flatStore.f +
            flatStore.g +
            flatStore.h +
            flatStore.i +
            flatStore.j;
        }
      });
      void sum;
    });

    bench("unwrapped with unwrap", () => {
      let sum = 0;
      const raw = unwrap(flatStore);
      for (let i = 0; i < 100; i++) {
        sum +=
          raw.a +
          raw.b +
          raw.c +
          raw.d +
          raw.e +
          raw.f +
          raw.g +
          raw.h +
          raw.i +
          raw.j;
      }
      void sum;
    });
  });
});
