import { it, describe, assert } from 'vitest';

import { ComponentModel } from '../src';
import { WithStateChart } from '../src/create-chart';
import { StateChart } from '../src/state-chart';

describe('WithStateChart', function() {

    it('accepts a raw config and creates a working model', async function() {
        class Model extends ComponentModel {
            constructor() {
                super({});
            }
        }

        const ModelWithChart = WithStateChart(Model, {
            initial: 'idle',
            states: {
                idle: {
                    on: { GO: { target: 'running' } }
                },
                running: {}
            }
        });

        const inst = new ModelWithChart();
        inst.start();

        assert.equal(inst.status, 'active');
        assert.equal(inst.state(), 'idle');

        inst.dispatch({ type: 'GO' });
        assert.equal(inst.state(), 'running');
    });

    it('accepts a compiled StateChart and creates a working model', async function() {
        class Model extends ComponentModel {
            constructor() {
                super({});
            }
        }

        const compiledChart = StateChart.create<Model>({
            initial: 'idle',
            states: {
                idle: {
                    on: { GO: { target: 'running' } }
                },
                running: {}
            }
        });

        const ModelWithChart = WithStateChart(Model, compiledChart);

        const inst = new ModelWithChart();
        inst.start();

        assert.equal(inst.status, 'active');
        assert.equal(inst.state(), 'idle');

        inst.dispatch({ type: 'GO' });
        assert.equal(inst.state(), 'running');
    });

    it('type-safe: matches() works with both raw and compiled chart', async function() {
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

        const ModelFromConfig = WithStateChart(Model, config);
        const inst1 = new ModelFromConfig();
        inst1.start();
        assert.equal(inst1.matches('idle'), true);
        assert.equal(inst1.matches('running'), false);

        // compiled chart
        const compiled = StateChart.create(config);
        const ModelFromCompiled = WithStateChart(Model, compiled);
        const inst2 = new ModelFromCompiled();
        inst2.start();
        assert.equal(inst2.matches('idle'), true);
        assert.equal(inst2.matches('running'), false);
    });

    it('infers `this` and events when created with <typeof Model, Events>', async function() {
        type Events = { type: 'STEP'; amount: number } | { type: 'RESET' };

        let actionRan = false;
        class CounterModel extends ComponentModel<any, Events> {
            count = 0;
            constructor() {
                super({});
            }
            increment(amount: number) {
                this.count += amount;
                actionRan = true;
            }
        }

        const chart = StateChart.create<CounterModel, Events>({
            initial: 'active',
            states: {
                active: {
                    on: {
                        STEP: {
                            action(ev) {
                                this.increment(ev.amount);
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

        const ModelWithChart = WithStateChart(CounterModel, chart);
        const inst = new ModelWithChart();
        inst.start();
        inst.dispatch({ type: 'STEP', amount: 5 });
        assert.equal(inst.count, 5);
        assert.equal(actionRan, true);
    });

    it('infers `this` and events when created with <Model, Events>', async function() {
        type Events = { type: 'STEP'; amount: number } | { type: 'RESET' };

        let actionRan = false;
        class CounterModel extends ComponentModel<any, Events> {
            count = 0;
            constructor() {
                super({});
            }
            increment(amount: number) {
                this.count += amount;
                actionRan = true;
            }
        }

        const chart = StateChart.create<CounterModel, Events>({
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

        const ModelWithChart = WithStateChart(CounterModel, chart);
        const inst = new ModelWithChart();
        inst.start();
        inst.dispatch({ type: 'STEP', amount: 5 });
        assert.equal(inst.count, 5);
        assert.equal(actionRan, true);
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
                            }
                        }
                    }
                }
            }
        });

        const runtime = chart.createRuntime(plainContext);
        const handler = runtime.getMostSpecificHandler('idle', { type: 'TICK' });
        assert.ok(handler && !(handler instanceof Error));
        if (handler && !(handler instanceof Error) && handler.action) {
            handler.action.call(plainContext, { type: 'TICK' });
            assert.equal(plainContext.value, 1);
        }
    });

});
