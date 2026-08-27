import { describe, it, expect } from "vitest";
import assert from 'node:assert'
import { ComponentModel, WithStateChart } from "../dist";

function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

const config = {
  initial: "default",
  states: {
    default: {
      on: {
        SOME: {
          action(ev) {
            this.setData("some", ev.value);
            this.schedule(
              {
                action: () => {
                  console.log("Scheduled!");
                },
              },
              10
            );
          },
        },
        SWITCH: {
          target: "some",
        },
      },
    },
    some: {
      on: {
        SWITCH: {
          target: "default",
        },
      },
    },
  },
};

class ParentModelB extends ComponentModel {
  constructor() {
    super({
      some: "info",
      children: [],
      counter: 0,
    });
  }

  someEvent(value) {
    this.dispatch({ type: "SOME", value });
  }

  switch() {
    this.dispatch({ type: "SWITCH" });
  }
}

const ParentModel = WithStateChart(ParentModelB, config);

describe("Test compiled", () => {
  it("does not allow to call protected methods", async () => {
    const model = new ParentModel();
    model.start();

    // Unfortunately you can call "protected" methods
    model.schedule({
      after: 10,
      action: () => {
        console.log("Scheduled!");
      },
    });

    model.setData('some', 'violation');

    await sleep(20);

    assert.notDeepEqual(model.data.some, 'violation');
  });

  it("works", async () => {
    const model = new ParentModel();
    model.start();

    model.enqueue(() => {
      model.setData('some', 'violation');
    })

    await sleep(10);

    expect(model.data.some).toEqual('violation')
  });

  it("allows to dispatch events", async () => {
    const model = new ParentModel();
    model.start();

    model.someEvent("privet!");

    await sleep(10);

    expect(model.data.some).toEqual("privet!");
  });
});
