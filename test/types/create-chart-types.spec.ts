import { it, describe } from 'vitest';
import { ComponentModel, WithStateChart, StateChart, type StatePaths } from '../../src';


/* ------------------------------------------------------------------- */

class Model extends ComponentModel {
    constructor() {
        super({});
    }
}

const config = {
    initial: 'idle',
    states: {
        idle: {},
        running: {}
    }
} as const;

/* ------------------------------------------------------------------- */

type CounterEvents = { type: 'STEP'; amount: number } | { type: 'RESET' };

class CounterModel extends ComponentModel<{some: string}, CounterEvents> {
    count = 0;
    constructor() {
        super({ some: '' });
    }
    increment(amount: number) {
        this.count += amount;
    }
}

/* ------------------------------------------------------------------- */

describe('WithStateChart', function() {

    it('type-safe: matches() works with both raw and compiled chart', async function() {
        const ModelFromConfig = WithStateChart(Model, config);
        const inst1 = new ModelFromConfig();

        expectTypeOf(inst1.matches).toEqualTypeOf<
            (path: StatePaths<typeof config>) => boolean
        >();

        const compiled = StateChart.create(config);
        const ModelFromCompiled = WithStateChart(Model, compiled);
        const inst2 = new ModelFromCompiled();

        expectTypeOf(inst2.matches).toEqualTypeOf<
            (path: StatePaths<typeof config>) => boolean
        >();
    });

    it('infers `this` and events when created with <Model, Events>', async function() {
        const chart = StateChart.create<CounterModel, CounterEvents>({
            initial: 'active',
            states: {
                active: {
                    on: {
                        STEP: {
                            guard(ev) {
                                return ev.amount > 0 && this.count >= 0;
                            },
                            action(ev) {
                                this.increment(ev.amount);
                                expectTypeOf(this).toEqualTypeOf<CounterModel>();
                            }
                        },
                        RESET: {
                            action() {
                                this.count = 0;
                            }
                        }
                    }
                }
            }
        });

        void chart
    });

    it('infers `this` when created with a plain object type', async function() {
        const plainContext = {
            value: 0,
            inc() {
                this.value++;
            }
        };

        const chart = StateChart.create<typeof plainContext>({
            initial: 'idle',
            states: {
                idle: {
                    on: {
                        TICK: {
                            action() {
                                this.inc();
                                expectTypeOf(this).toEqualTypeOf<typeof plainContext>();
                            }
                        }
                    }
                }
            }
        });
        void chart;
    });

});
