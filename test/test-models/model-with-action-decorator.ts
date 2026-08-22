import { ComponentModel, action } from "../../src";

type Data = {
  log: string[];
};

export class ModelWithActionDecorator extends ComponentModel<Data> {
  constructor() {
    super({
      log: [],
    });
  }

  @action
  pushLog(value: string) {
    this.setData("log", log => [...log, value]);
  }

  @action
  pushLogWithInternalEnqueue(value: string) {
    this.enqueue(() => {
      this.setData("log", log => [...log, value]);
    });
  }

  @action
  pushLogMultiple(a: string, b: string) {
    this.setData("log", log => [...log, a, b]);
  }

  regularMethod(value: string) {
    this.setData("log", log => [...log, value]);
  }
}
