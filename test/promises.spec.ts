import { describe, it, expect } from "vitest";

describe.skip("Promise / async / try-catch experiments", () => {
  /*
   * ============================================================
   * 1. A synchronous throw is caught by try/catch
   * ============================================================
   */

  it("1 - catches synchronous throw", () => {
    let caught = false;

    try {
      throw new Error("boom");
    } catch {
      caught = true;
    }

    expect(caught).toBe(true);
  });

  /*
   * ============================================================
   * 2. A rejected Promise is NOT caught unless we await it
   * ============================================================
   */

  it("2 - try/catch does NOT catch an un-awaited rejection", async () => {
    let caught = false;

    try {
      Promise.reject(new Error("boom"));
    } catch {
      caught = true;
    }

    expect(caught).toBe(false);

    // We need to handle the rejection so Vitest doesn't
    // report it as an unhandled rejection.
    await Promise.resolve();
  });

  /*
   * ============================================================
   * 3. await converts rejection into a throw
   * ============================================================
   */

  it("3 - await turns rejection into a throw that try/catch catches", async () => {
    let caught = false;

    try {
      await Promise.reject(new Error("boom"));
    } catch {
      caught = true;
    }

    expect(caught).toBe(true);
  });

  /*
   * ============================================================
   * 4. An async function that throws becomes a rejected Promise
   * ============================================================
   */

  it("4 - async throw becomes Promise rejection", async () => {
    async function foo() {
      throw new Error("boom");
    }

    const promise = foo();

    expect(promise).toBeInstanceOf(Promise);

    await expect(promise).rejects.toThrow("boom");
  });

  /*
   * ============================================================
   * 5. Calling an async function inside try/catch
   *
   * The important part:
   *
   *     foo()
   *
   * does NOT wait for foo().
   * ============================================================
   */

  it("5 - calling async function does not make try/catch wait", async () => {
    let caught = false;

    async function foo() {
      throw new Error("boom");
    }

    try {
      foo();
    } catch {
      caught = true;
    }

    expect(caught).toBe(false);

    // Consume the rejection.
    await expect(foo()).rejects.toThrow();
  });

  /*
   * ============================================================
   * 6. await fixes the previous example
   * ============================================================
   */

  it("6 - await allows try/catch to catch async error", async () => {
    let caught = false;

    async function foo() {
      throw new Error("boom");
    }

    try {
      await foo();
    } catch {
      caught = true;
    }

    expect(caught).toBe(true);
  });

  /*
   * ============================================================
   * 7. Async function calls another async function
   * ============================================================
   */

  it("7 - rejection propagates through async calls", async () => {
    async function inner() {
      throw new Error("boom");
    }

    async function middle() {
      return inner();
    }

    async function outer() {
      return middle();
    }

    await expect(outer()).rejects.toThrow("boom");
  });

  /*
   * ============================================================
   * 8. Catching at the outer level
   * ============================================================
   */

  it("8 - outer await can catch rejection from deeply nested async calls", async () => {
    async function inner() {
      throw new Error("boom");
    }

    async function middle() {
      return await inner();
    }

    async function outer() {
      return await middle();
    }

    let caught = false;

    try {
      await outer();
    } catch {
      caught = true;
    }

    expect(caught).toBe(true);
  });

  /*
   * ============================================================
   * 9. A catch in the middle can consume the error
   * ============================================================
   */

  it("9 - middle catch prevents outer catch", async () => {
    async function inner() {
      throw new Error("boom");
    }

    async function middle() {
      try {
        await inner();
      } catch {
        // Error consumed.
      }
    }

    let caught = false;

    try {
      await middle();
    } catch {
      caught = true;
    }

    expect(caught).toBe(false);
  });

  /*
   * ============================================================
   * 10. Middle catch can rethrow
   * ============================================================
   */

  it("10 - middle catch can rethrow", async () => {
    async function inner() {
      throw new Error("boom");
    }

    async function middle() {
      // eslint-disable-next-line no-useless-catch
      try {
        await inner();
      } catch (error) {
        throw error;
      }
    }

    await expect(middle()).rejects.toThrow("boom");
  });

  /*
   * ============================================================
   * 11. Middle catch can throw a DIFFERENT error
   * ============================================================
   */

  it("11 - middle catch can replace the error", async () => {
    async function inner() {
      throw new Error("original");
    }

    async function middle() {
      try {
        await inner();
      } catch {
        throw new Error("replacement");
      }
    }

    await expect(middle()).rejects.toThrow("replacement");
  });

  /*
   * ============================================================
   * 12. The REALLY important case:
   *
   * async function calls async function without await.
   * ============================================================
   */

  it("12 - returning a Promise propagates its rejection", async () => {
    async function inner() {
      throw new Error("boom");
    }

    async function outer() {
      return inner();
    }

    await expect(outer()).rejects.toThrow("boom");
  });

  /*
   * ============================================================
   * 13. But if the Promise is detached, the chain is broken.
   * ============================================================
   */

  it("13 - detached Promise is not propagated", async () => {
    async function inner() {
      throw new Error("boom");
    }

    async function outer() {
      inner(); // deliberately NOT returned or awaited
    }

    let caught = false;

    try {
      await outer();
    } catch {
      caught = true;
    }

    expect(caught).toBe(false);

    // The rejection is now detached from outer().
  });

  /*
   * ============================================================
   * 14. Returning vs awaiting
   *
   * These are effectively equivalent for propagation.
   * ============================================================
   */

  it("14 - return Promise propagates rejection", async () => {
    async function inner() {
      throw new Error("boom");
    }

    async function outer() {
      return inner();
    }

    await expect(outer()).rejects.toThrow();
  });

  it("14b - await Promise propagates rejection", async () => {
    async function inner() {
      throw new Error("boom");
    }

    async function outer() {
      return await inner();
    }

    await expect(outer()).rejects.toThrow();
  });

  /*
   * ============================================================
   * 15. try/catch around return does NOT catch the rejection
   * ============================================================
   */

  it("15 - try/catch does not catch a returned rejection", async () => {
    let caught = false;

    async function inner() {
      throw new Error("boom");
    }

    async function outer() {
      try {
        return inner();
      } catch {
        caught = true;
        throw new Error("caught");
      }
    }

    await expect(outer()).rejects.toThrow("boom");

    expect(caught).toBe(false);
  });

  /*
   * ============================================================
   * 16. await is necessary if the catch belongs here
   * ============================================================
   */

  it("16 - await makes the catch work", async () => {
    let caught = false;

    async function inner() {
      throw new Error("boom");
    }

    async function outer() {
      try {
        return await inner();
      } catch {
        caught = true;
        throw new Error("caught");
      }
    }

    await expect(outer()).rejects.toThrow("caught");

    expect(caught).toBe(true);
  });

  /*
   * ============================================================
   * 17. Promise.then() has its own error propagation chain
   * ============================================================
   */

  it("17 - rejection propagates through then()", async () => {
    const result = Promise.resolve().then(() => {
      throw new Error("boom");
    });

    await expect(result).rejects.toThrow("boom");
  });

  /*
   * ============================================================
   * 18. catch() handles rejection
   * ============================================================
   */

  it("18 - Promise.catch handles rejection", async () => {
    const result = Promise.reject(new Error("boom")).catch(() => {
      return "recovered";
    });

    await expect(result).resolves.toBe("recovered");
  });

  /*
   * ============================================================
   * 19. catch() can rethrow
   * ============================================================
   */

  it("19 - catch can rethrow", async () => {
    const result = Promise.reject(new Error("boom")).catch(() => {
      throw new Error("new error");
    });

    await expect(result).rejects.toThrow("new error");
  });

  /*
   * ============================================================
   * 20. A synchronous throw INSIDE a Promise callback
   * ============================================================
   */

  it("20 - throw inside then becomes rejection", async () => {
    const result = Promise.resolve().then(() => {
      throw new Error("boom");
    });

    await expect(result).rejects.toThrow("boom");
  });

  /*
   * ============================================================
   * 21. try/catch outside does NOT catch Promise callback throw
   * ============================================================
   */

  it("21 - outer synchronous try/catch cannot catch Promise callback throw", async () => {
    let caught = false;

    try {
      Promise.resolve().then(() => {
        throw new Error("boom");
      });
    } catch {
      caught = true;
    }

    expect(caught).toBe(false);

    // Attach a handler to consume the rejection.
    await Promise.resolve()
      .then(() => {
        throw new Error("boom");
      })
      .catch(() => {});
  });

  /*
   * ============================================================
   * 22. Nested async operation with await
   * ============================================================
   */

  it("22 - errors propagate through multiple async levels", async () => {
    async function database() {
      throw new Error("database failed");
    }

    async function service() {
      return await database();
    }

    async function controller() {
      return await service();
    }

    try {
      await controller();
      throw new Error("Expected controller to fail");
    } catch (error) {
      expect(error).toEqual(new Error("database failed"));
    }
  });

  /*
   * ============================================================
   * 23. Fire-and-forget operation
   *
   * This is probably the most relevant experiment for you.
   * ============================================================
   */

  it("23 - fire-and-forget errors are detached", async () => {
    const errors: unknown[] = [];

    async function backgroundTask() {
      throw new Error("background failed");
    }

    async function start() {
      // Fire and forget.
      backgroundTask().catch(error => {
        errors.push(error);
      });
    }

    await start();

    // Give the microtask queue a chance.
    await Promise.resolve();

    expect(errors).toHaveLength(1);
    expect(errors[0]).toEqual(new Error("background failed"));
  });

  /*
   * ============================================================
   * 24. Fire-and-forget with a surrounding try/catch
   * ============================================================
   */

  it("24 - surrounding try/catch does not catch fire-and-forget error", async () => {
    let caught = false;

    async function backgroundTask() {
      throw new Error("background failed");
    }

    async function start() {
      try {
        backgroundTask();
      } catch {
        caught = true;
      }
    }

    await start();

    expect(caught).toBe(false);
  });

  /*
   * ============================================================
   * 25. A useful pattern for your state machine
   * ============================================================
   */

  it("25 - explicit catch around the async boundary", async () => {
    let machineError: unknown;

    async function invokedOperation() {
      throw new Error("invocation failed");
    }

    async function executeInvocation() {
      try {
        await invokedOperation();
      } catch (error) {
        machineError = error;
      }
    }

    await executeInvocation();

    expect(machineError).toEqual(new Error("invocation failed"));
  });
});
