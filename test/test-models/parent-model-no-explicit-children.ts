import { ComponentModel } from '../../src';
import { WithStateChart } from '../../src/create-chart';
import { ChildModel } from './child-model';


type ParentModelData = {
    some: string;
}

type Events =
    | { type: "SOME", value: string }
    | { type: "SWITCH" }
    | { type: "ADD" }
    | { type: "REMOVE", id: string };

class ParentModelHiddenChildrenB extends ComponentModel<ParentModelData, Events> {

    static childTypes = {
        Child: ChildModel
    }

    get childrenLength(): number { return this.#children.length }

    constructor() {
        super({
            some: 'info',
        });
    }

    someEvent(value: string) {
        this.default({ type: 'SOME', value })
    }

    addItem() {
        this.dispatch({ type: 'ADD' });
    }

    sendToChildren() {
        this.#children.forEach(ch => ch.dispatch({ type: 'some', value: 'from parent' }))
    }

    getChildrenData() {
        return this.#children.map(ch => ch.data.some);
    }

    protected default(ev: Events) {
        if (ev.type === 'SOME') this.setData('some', ev.value);
    }

    protected addChild() {
        const child = new ChildModel();
        child.start();
        this.#children.push(child);
    }

    protected removeChild(id: string) {
        const index = this.#children.findIndex(m => m._id === id);
        if (index < 0) return;
        this.#children[index].stop();
        this.#children = [
            ...this.#children.slice(0, index),
            ...this.#children.slice(index + 1),
        ];
    }

    #children: InstanceType<typeof ChildModel>[] = [];

}

export const ParentModelHiddenChildren = WithStateChart(ParentModelHiddenChildrenB, {
    initial: 'default',
    on: {
        ADD: {
            action() {
                this.addChild();
            }
        },
        REMOVE: {
            action(ev) {
                this.removeChild(ev.id)
            }
        }
    },
    states: {
        default: {
            on: {
                SOME: {
                    action(ev) {
                        this.setData('some', ev.value);
                    },
                },
                SWITCH: {
                    target: 'some'
                }
            },
            initial: 'other',
            states: {
                other: {},
                govno: {},
            }
        },
        some: {
            on: {
                SWITCH: {
                    target: 'default'
                }
            }
        }
    }
});