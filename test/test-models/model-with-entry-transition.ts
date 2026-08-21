import { ComponentModel } from '../../src';
import { WithStateChart } from '../../src/create-chart';


type MyModelData = {
    data: string|undefined,
}

type Events =
    | { type: 'SOME', value: string }
    | { type: 'ULTIMATE' }
    | { type: 'DO_SOME_STUFF' }
	| { type: 'TRY_REENTER' }
    | { type: 'COMPLETE' }

type Emits =
    | { type: 'SOME_HAPPEND' }
    | { type: 'WANT_TO_STOP' }

class ModelBase extends ComponentModel<MyModelData, Events, Emits, number> {

    initialExitFired = false;

    firstEntryFired = false;
    firstChildEntryFired = false;
    firstChildExitFired = false;

    secondEntryFired = false;
    secondChildEntryFired = false;
    secondChildExitFired = false;

    constructor(input: string){
        super({ data: input });
        this.logger = null
        this.tracer = null
    }

}


export const ModelWithEntryTrans = WithStateChart(ModelBase, {
    initial: 'initial',
    on: {
        ULTIMATE: {
            target: 'third'
        }
    },
    states: {
        initial: {
            always: {
                // To check entry transition
                target: 'first',
                guard() {
                    return this.data.data !== undefined
                }
            },
            exit() {
                this.initialExitFired = true;
            }
        },
        first: {
            initial: 'child',
            entry() {
                this.firstEntryFired = true;
            },
            states: {
                child: {
                    entry() {
                        this.firstChildEntryFired = true;
                    },
                    exit() {
                        this.firstChildExitFired = true;
                    },
                    on:  {
                        SOME: {
                            target: 'second',
                        },
                        TRY_REENTER: {
                            target: 'first.child',
                            reenter: true,
                        },
                        COMPLETE: {
                            target: 'last',
                        }
                    }
                },
            },
        },
        second: {
            initial: 'child',
            entry() {
                this.secondEntryFired = true;
            },
            states: {
                child: {
                    entry() {
                        this.secondChildEntryFired = true;
                    },
                    exit() {
                        this.secondChildExitFired = true;
                    },
                }
            }
        },
        third: {
            on: {
                DO_SOME_STUFF: {
                    action() {
                        this.emit({type: 'WANT_TO_STOP'});
                        this.setData('data', 'just before quit');
                    }
                }
            }
        },
        last: {}
    }
}, 'ModelWithEntryTrans');

