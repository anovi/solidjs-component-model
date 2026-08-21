
export function sleep (ms: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

/**
 * Helper to run async tests. Example:
 * 
 * ```typescript
 *   const [promise, resolve] = createPromiseResolver()
 *   someAsyncFunction().then(() => {
 *      resolve();
 *   })
 *   return promise;
 * ```
 * 
 * @returns A tuple containing a promise and a function to resolve the promise.
 */
export function createPromiseResolver(): [Promise<void>, () => void] {
    let resolve: () => void;
    const promise = new Promise<void>((_resolve) => {
        resolve = _resolve;
    });
    return [promise, () => resolve()];
}

export function expectUnhandledRejection(
    fn: () => void | Promise<void>,
): Promise<unknown> {
    return new Promise((resolve, reject) => {
        const handler = (error: unknown) => {
            process.off('unhandledRejection', handler);
            resolve(error);
        };

        process.on('unhandledRejection', handler);

        Promise.resolve(fn()).catch(error => {
            process.off('unhandledRejection', handler);
            reject(error);
        });
    });
}

export function expectUncaughtException(
    fn: () => void | Promise<void>,
): Promise<Error> {
    return new Promise((resolve, reject) => {
        const handler = (error: Error) => {
            process.off('uncaughtException', handler);
            resolve(error);
        };

        process.on('uncaughtException', handler);

        Promise.resolve(fn()).catch(error => {
            process.off('uncaughtException', handler);
            reject(error);
        });
    });
}