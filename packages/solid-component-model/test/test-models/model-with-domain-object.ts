import { ComponentModel } from "../../src";
import { WithStateChart } from "../../src/create-chart";
import { DomainPath } from "./domain-object";
import { ParentModel } from "./parent-model";

type ChildModelData = {
  some: string;
  path: DomainPath;
};

type Events = { type: "some"; value: string };

class ModelWithDomainPath extends ComponentModel<ChildModelData, Events> {
  declare protected parent: InstanceType<typeof ParentModel>;

  constructor(some: string, path: string) {
    super({
      some: some,
      path: DomainPath.fromPersistence(path),
    });
  }

  static prepareSnapshotData(snapshot: any): void {
    const path = DomainPath.fromDomain(snapshot.data.path);
    snapshot.data.path = path;
    return snapshot;
  }
}

export const WithDomainPathMachine = WithStateChart(ModelWithDomainPath, {
  initial: "default",
  states: {
    default: {},
  },
});
