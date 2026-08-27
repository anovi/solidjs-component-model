import { action, ComponentModel } from "../../src";

type Data = {
  count: number;
  label: string;
};

export class ModelWithParams extends ComponentModel<Data> {
  constructor(count: number, label: string) {
    super({
      count,
      label,
    });
  }

  @action
  increment() {
    this.setData("count", this.data.count + 1);
  }
}
