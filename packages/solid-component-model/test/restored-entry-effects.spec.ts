import { describe, expect, it } from "vitest";

import { ComponentModel, WithStateChart } from "../src";

type Data = {
  entryEffectsRun: number;
};

type Event = { type: "OPEN" };

class RestoredEntryEffectsBase extends ComponentModel<Data, Event> {
  constructor() {
    super({ entryEffectsRun: 0 });
  }
}

const RestoredEntryEffectsModel = WithStateChart(RestoredEntryEffectsBase, {
  initial: "closed",
  states: {
    closed: {
      entry() {
        this.setData("entryEffectsRun", count => count + 1);
      },
      on: {
        OPEN: { target: "open" },
      },
    },
    open: {
      entry() {
        this.setData("entryEffectsRun", count => count + 1);
      },
    },
  },
});

describe("entry effects after restoring a model", () => {
  it("runs entry effects for transitions after the restored model starts", () => {
    const model = new RestoredEntryEffectsModel();
    model.start();

    expect(model.data.entryEffectsRun).toBe(1);

    const snapshot = model.getPersistedSnapshot();
    model.stop();

    const restored = RestoredEntryEffectsModel.fromPersistedSnapshot(snapshot);
    restored.start();

    expect(
      restored.data.entryEffectsRun,
      "Restoring the current state must not replay its entry effect."
    ).toBe(1);

    restored.dispatch({ type: "OPEN" });

    expect(restored.state()).toBe("open");
    expect(restored.data.entryEffectsRun).toBe(2);
  });
});
