import {
  WithStateChart,
  ComponentModel,
  action,
  type PersistedSnapshot,
} from "../../src";

type SnapshotOverrideChildData = {
  value: string;
  transient?: string;
};

class SnapshotOverrideChildBase extends ComponentModel<SnapshotOverrideChildData> {
  overrideCalls = 0;
  lastReturnedSnapshot?: PersistedSnapshot<string, SnapshotOverrideChildData>;

  constructor() {
    super({ value: "live value", transient: "live only" });
  }

  getPersistedSnapshot() {
    this.overrideCalls += 1;
    const snapshot = super.getPersistedSnapshot();
    const customized = {
      ...snapshot,
      data: { ...snapshot.data, value: "persisted value" },
    };
    delete customized.data.transient;
    this.lastReturnedSnapshot = customized;
    return customized;
  }
}

export const SnapshotOverrideChild = WithStateChart(
  SnapshotOverrideChildBase,
  { initial: "ready", states: { ready: {} } },
  "SnapshotOverrideChildModel"
);

export class SnapshotOverrideParent extends ComponentModel<{
  child?: InstanceType<typeof SnapshotOverrideChild>;
}> {
  static childTypes = {
    RegisteredChildAlias: SnapshotOverrideChild,
  };

  constructor() {
    super({ child: undefined });
  }

  @action
  addChild() {
    this.setData("child", this.spawn(SnapshotOverrideChild));
  }
}

class RecursiveSnapshotGrandchild extends ComponentModel<{ value: string }> {
  constructor() {
    super({ value: "grandchild live" });
  }

  getPersistedSnapshot() {
    const snapshot = super.getPersistedSnapshot();
    return {
      ...snapshot,
      data: { ...snapshot.data, value: "grandchild persisted" },
    };
  }
}

class RecursiveSnapshotChild extends ComponentModel<{
  value: string;
  grandchild?: RecursiveSnapshotGrandchild;
}> {
  static childTypes = {
    GrandchildAlias: RecursiveSnapshotGrandchild,
  };

  constructor() {
    super({ value: "child live", grandchild: undefined });
  }

  @action
  addGrandchild() {
    this.setData("grandchild", this.spawn(RecursiveSnapshotGrandchild));
  }

  getPersistedSnapshot() {
    const snapshot = super.getPersistedSnapshot();
    return {
      ...snapshot,
      data: { ...snapshot.data, value: "child persisted" },
    };
  }
}

export class RecursiveSnapshotRoot extends ComponentModel<{
  child?: RecursiveSnapshotChild;
}> {
  static childTypes = {
    ChildAlias: RecursiveSnapshotChild,
  };

  constructor() {
    super({ child: undefined });
  }

  @action
  addChild() {
    this.setData("child", this.spawn(RecursiveSnapshotChild));
  }
}
