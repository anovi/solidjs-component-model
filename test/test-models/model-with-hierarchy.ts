import { Observable } from 'rxjs';
import { ComponentModel } from '../../src';
import { WithStateChart } from '../../src/create-chart';


type Data = {
    some: string;
    entry: number,
    counter: number,
    data: string|undefined,
}

type Events =
    | { type: 'SOME', value: string }
    | { type: 'OTHER', value: string }

type Emits =
    | { type: 'SOME_HAPPEND' }

class ModelWithChildStateNodesBase extends ComponentModel<Data, Events, Emits> {

    defaultStateEntryHookTriggered: boolean = false;

    constructor(){
        super({
            some: 'info',
            entry: 0,
            data: undefined,
            counter: 0,
        });
    }

    // Events
    someEvent(value: string) { this.dispatch({type: 'SOME', value}) }
    other(value: string) { this.dispatch({type: 'OTHER', value}) }

    protected async somePromise(signal: AbortSignal) {
        return await this.fetchData(signal);
    }

    protected fetchData(signal: AbortSignal): Promise<string> {
        return new Promise((resolve, reject) => {
            const id = setTimeout(() => resolve('some data'), 80);
            signal.addEventListener('abort', (() => {
                clearTimeout(id);
                reject();
            }));
        })
    }

    metaExitTriggered = false;
    contentExitTriggered = false;

}


export const ModelWithChildStateNodes = WithStateChart(ModelWithChildStateNodesBase, {
    govno: 'alskjdf',
    initial: 'default',
    entry() {
        this.invokeObservable(ObservableCounter, {
            next: {
                action: (event) => {
                    this.setData('counter', event.value);
                }
            }
        })
    },
    states: {
        default: {
            entry() {
                this.defaultStateEntryHookTriggered = true;
            },
            on: {
                SOME: {
                    // To test if it switches to `loading.meta`
                    target: 'loading',
                    action(event) {
                        this.setData({
                            some: event.value,
                        });
                    }
                }
            
            }
        },
        loading: {
            initial: 'meta',
            states: {
                meta: {
                    exit() {
                        this.metaExitTriggered = true;
                    },
                    entry() {
                        this.invokePromise((signal) => this.fetchData(signal), {
                            onDone: {target: 'loading.content'},
                            onError: {target: 'default'},
                        });
                    },
                },
                content: {
                    entry() {
                        this.setData('entry', this.data.entry + 1);
                        this.invokePromise(this.somePromise.bind(this), {
                            onDone: {
                                target: 'default',
                                action: (event) => {
                                    this.setData('data', event.result);
                                }
                            },
                            onError: {target: 'default'},
                        });
                    },
                    exit() {
                        this.contentExitTriggered = true;
                    },
                    on: {
                        OTHER: {
                            target: 'default',
                            action (event) {
                                this.setData('some', event.value);
                                this.emit({ type: 'SOME_HAPPEND' });
                            }
                        },

                    }
                }
            }
        }
    }
})

const ObservableCounter = new Observable<number>((sub) => {
    let num = 0;
    const id = setInterval(() => {
        sub.next(++num);
    }, 100);
    return () => clearInterval(id);
})