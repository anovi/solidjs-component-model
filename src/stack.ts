export class Stack<V = unknown> {
	#buffer: Array<V> = [];
	
	get size() {
		return this.#buffer.length;
	}
	
	push(value: V) {
		this.#buffer.push(value);
	}
	
	pop() {
		return this.#buffer.pop();
	}
	
	peek() {
		return this.#buffer.at(this.#buffer.length - 1);
	}
	
	isEmpty() {
		return this.#buffer.length === 0;
	}
	
	includes(value: V) {
		return this.#buffer.includes(value);
	}
	
	clear() {
		this.#buffer = [];
	}
	
	[Symbol.iterator]() {
		return this.#buffer[Symbol.iterator]();
	}
}