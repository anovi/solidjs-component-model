import { Observable } from 'rxjs';
import { ComponentModel, action } from '../../src';

export class ChildWithoutStateChart extends ComponentModel<{ some: string }> {

    constructor(){
        super({ some: '' });
    }

    @action
    someEvent(value: string) {
        this.setSome(value);
    }

    eventThatSchedules(value: string) {
        this.schedule({
            action: () => {
                this.setSome(value);
            }
        }, 10);
    }

    protected setSome(value: string) {
        this.setData('some', value);
    }

}

type Data = {
    some: string;
    counter: number;
    children: ChildWithoutStateChart[],
}

export class ModelWithoutStateChart extends ComponentModel<Data> {

    constructor(){
        super({
            some: 'info',
            counter: 0,
            children: [],
        });
    }

    @action
    someEvent(value: string) {
        this.setSome(value);
    }

    @action
    startInvokable() {
        this.#privatestartInvokable();
    }

    @action
    eventThatSchedules(value: string) {
        this.schedule({
            action: () => {
                this.setSome(value);
            }
        }, 10);
    }

    @action
    addChild() {
        const child = new ChildWithoutStateChart();
        this.setData('children', this.data.children.length, child);
        child.start();
    }

    @action
    removeChild(child: ChildWithoutStateChart) {
        this.setData('children', (children) => children.filter(m => m !== child));
    }

    protected setSome(value: string) {
        this.setData('some', value);
    }

    #privatestartInvokable() {
        this.invokeObservable(this.#someObservable, {
            next: {
                action: (ev) => {
                    this.setData({ counter: ev.value });
                },
            }
        });
    }

    #someObservable = new Observable<number>((sub) => {
        let num = 0;
        const id = setInterval(() => {
            sub.next(++num);
        }, 100);
        return () => clearInterval(id);
    });

}

