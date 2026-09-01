import { describe, it } from "vitest";
import { from, take, toArray, firstValueFrom } from "rxjs";
import { ModelWithChildStateNodes } from "./test-models/model-with-hierarchy";
import { sleep } from "./test-kit";

describe("RxJS interop", () => {
  it("can be consumed as an RxJS observable", async () => {
    const model = new ModelWithChildStateNodes();

    const snapshots = firstValueFrom(from(model).pipe(take(2), toArray()));

    model.start();
    await sleep(105);

    const values = await snapshots;
    assert.equal(values.length, 2);
    assert.equal(values[0].data.counter, 0);
    assert.equal(values[1].data.counter, 1);
  });
});
