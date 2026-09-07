import { Observable } from "rxjs";

export const someObservableCounter = new Observable<number>(sub => {
  let num = 0;
  const id = setInterval(() => {
    sub.next(num++);
  }, 100);
  return () => clearInterval(id);
});

export const observableThatThrows = new Observable<number>(sub => {
  const id = setInterval(() => {
    sub.error(new Error("Error inside an obsevable!"));
  }, 10);
  return () => clearInterval(id);
});

export function fetchData(signal: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => resolve("some data"), 80);
    signal.addEventListener("abort", () => {
      clearTimeout(id);
      reject();
    });
  });
}

export function rejectedFetchData(signal: AbortSignal): Promise<string> {
  return new Promise((_resolve, reject) => {
    const id = setTimeout(() => reject(new Error("Something went wrong")), 80);
    signal.addEventListener("abort", () => {
      clearTimeout(id);
      reject();
    });
  });
}
