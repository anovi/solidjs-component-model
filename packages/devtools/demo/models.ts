import { action, ComponentModel, WithStateChart } from "solid-component-model";

// --- Child Counter Model ---
export type ChildCounterData = {
  title: string;
  count: number;
  status: string;
};

export type ChildCounterEvents =
  { type: "INCREMENT" } | { type: "DECREMENT" } | { type: "RESET" };

class ChildCounterModelBase extends ComponentModel<
  ChildCounterData,
  ChildCounterEvents
> {
  constructor(title = "Counter Child") {
    super({
      title,
      count: 0,
      status: "idle",
    });
  }

  @action
  increment() {
    this.setData("count", this.data.count + 1);
    this.setData("status", `Incremented to ${this.data.count}`);
  }

  @action
  decrement() {
    this.setData("count", this.data.count - 1);
    this.setData("status", `Decremented to ${this.data.count}`);
  }

  @action
  reset() {
    this.setData("count", 0);
    this.setData("status", "Reset to 0");
  }
}

export const ChildCounterModel = WithStateChart(ChildCounterModelBase, {
  initial: "Active",
  states: {
    Active: {
      on: {
        INCREMENT: {
          action() {
            this.increment();
          },
        },
        DECREMENT: {
          action() {
            this.decrement();
          },
        },
        RESET: {
          action() {
            this.reset();
          },
        },
      },
    },
  },
});

// --- Parent App Model ---
export type ParentAppData = {
  appName: string;
  children: InstanceType<typeof ChildCounterModel>[];
  totalClicks: number;
};

export type ParentAppEvents =
  | { type: "ADD_CHILD"; title?: string }
  | { type: "REMOVE_CHILD"; id: string }
  | { type: "INCREMENT_ALL" };

class ParentAppModelBase extends ComponentModel<
  ParentAppData,
  ParentAppEvents
> {
  static childTypes = {
    Child: ChildCounterModel,
  };

  constructor() {
    super({
      appName: "Demo Root Application",
      children: [],
      totalClicks: 0,
    });
  }

  @action
  addChild(title?: string) {
    const childName = title ?? `Child #${this.data.children.length + 1}`;
    const child = new ChildCounterModel(childName);
    this.setData("children", this.data.children.length, child);
    child.start();
    this.setData("totalClicks", this.data.totalClicks + 1);
    return child;
  }

  @action
  removeChild(id: string) {
    const idx = this.data.children.findIndex(c => c._id === id);
    if (idx < 0) return;
    const child = this.data.children[idx];
    child.stop();
    this.setData("children", [
      ...this.data.children.slice(0, idx),
      ...this.data.children.slice(idx + 1),
    ]);
  }

  @action
  incrementAll() {
    for (const child of this.data.children) {
      child.increment();
    }
    this.setData(
      "totalClicks",
      this.data.totalClicks + this.data.children.length
    );
  }
}

export const ParentAppModel = WithStateChart(ParentAppModelBase, {
  initial: "Ready",
  states: {
    Ready: {
      on: {
        ADD_CHILD: {
          action(ev) {
            this.addChild(ev.title);
          },
        },
        REMOVE_CHILD: {
          action(ev) {
            this.removeChild(ev.id);
          },
        },
        INCREMENT_ALL: {
          action() {
            this.incrementAll();
          },
        },
      },
    },
  },
});

// --- Standalone Settings / Theme Model ---
export type SettingsData = {
  theme: "dark" | "light";
  refreshInterval: number;
};

class SettingsModelBase extends ComponentModel<
  SettingsData,
  { type: "TOGGLE_THEME" }
> {
  constructor() {
    super({
      theme: "dark",
      refreshInterval: 1000,
    });
  }

  @action
  toggleTheme() {
    this.setData("theme", this.data.theme === "dark" ? "light" : "dark");
  }
}

export const SettingsModel = WithStateChart(SettingsModelBase, {
  initial: "Active",
  states: {
    Active: {
      on: {
        TOGGLE_THEME: {
          action() {
            this.toggleTheme();
          },
        },
      },
    },
  },
});
