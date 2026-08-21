import { batch as e, createSignal as t, untrack as n } from "solid-js";
import { createStore as r, unwrap as i } from "solid-js/store";
//#region src/observable.ts
var a = { unsubscribe: () => void 0 }, o = class {
	get closed() {
		return this.#n;
	}
	complete() {
		if (this._throwIfClosed(), !this.#t) {
			this.#t = !0;
			for (let e of this.#e) e.complete && e.complete();
			this.#e.clear();
		}
	}
	next(e) {
		if (this._throwIfClosed(), !(this.#t || this.#r)) for (let t of this.#e) t.next && t.next(e);
	}
	error(e) {
		if (this._throwIfClosed(), !this.#r) {
			this.#r = !0, this.#i = e;
			for (let e of this.#e) e.error && e.error(this.#i);
			this.#e.clear();
		}
	}
	subscribe(e) {
		return this._throwIfClosed(), this.#e.add(e), this.#r ? (e.error && e.error(this.#i), a) : this.#t ? (e.complete && e.complete(), a) : { unsubscribe: () => {
			this.#e.delete(e);
		} };
	}
	unsubscribe() {
		this.#e.clear(), this.#n = !0;
	}
	_throwIfClosed() {
		if (this.#n) throw Error("Subject is already stopped.");
	}
	#e = /* @__PURE__ */ new Set();
	#t = !1;
	#n = !1;
	#r = !1;
	#i = null;
}, s = class {
	#e = /* @__PURE__ */ new Map();
	schedule(e, t, n) {
		let r = setTimeout(() => {
			this.#e.delete(r), e();
		}, t);
		return this.#e.set(r, {
			fn: e,
			tag: n || ""
		}), r;
	}
	cancel(e) {
		this.#e.delete(e), clearTimeout(e);
	}
	flush(e) {
		for (let [t, n] of this.#e) (!e || n.tag === e) && (clearTimeout(t), this.#e.delete(t));
	}
}, c = {
	InvokedDone: "@done.invoke",
	InvokedError: "@error.invoke",
	InvokedNext: "@next.invoke",
	ScheduledExecute: "@execute.scheduled",
	Eventless: "@always",
	Start: "@start"
};
//#endregion
//#region src/state-chart/state-path.ts
function l(e, t) {
	let n = [], r = 0;
	for (; r < e.length && r < t.length && e[r] === t[r];) n.push(e[r]), r++;
	return {
		common: n,
		exit: e.slice(n.length),
		enter: t.slice(n.length)
	};
}
function* u(e) {
	let t = e.common.length, n = e.common.length + e.enter.length, r = [...e.common, ...e.exit], i = [...e.enter];
	for (; r.length !== t;) yield {
		path: r.join(".").replace(/^\./, ""),
		exit: !0
	}, r.pop();
	for (; r.length !== n;) {
		let e = i.shift();
		if (e == null) break;
		r.push(e), yield {
			path: r.join(".").replace(/^\./, ""),
			exit: !1
		};
	}
}
var d = class e {
	#e = [];
	get length() {
		return this.#e.length;
	}
	constructor(e = "") {
		this.#e = e.split("."), this.#e[0] !== "" && this.#e.unshift("");
	}
	toString() {
		let e = this.#e.join(".");
		return e.startsWith(".") ? e.slice(1) : e;
	}
	toArray() {
		return [...this.#e];
	}
	static fromArray(t) {
		let n = new e();
		return n.#e = t, n.#e[0] !== "" && n.#e.unshift(""), n;
	}
	diffFrom(e) {
		return l(e.#e, this.#e);
	}
	*[Symbol.iterator]() {
		for (let e = 0; e < this.#e.length; e++) yield this.#e[e];
	}
	parent() {
		if (this.#e.length <= 1) return;
		let t = new e();
		return t.#e = this.#e.slice(0, -1), t;
	}
	child(t) {
		let n = new e();
		return n.#e = [...this.#e], n.#e.push(t), n;
	}
	*paths() {
		for (let t = 1; t <= this.#e.length; t++) {
			let n = new e();
			n.#e = this.#e.slice(0, t), yield n;
		}
	}
	*pathsReversed() {
		for (let t = this.#e.length; t >= 1; t--) {
			let n = new e();
			n.#e = this.#e.slice(1, t), yield n;
		}
	}
	*ancestors() {
		for (let e = this.#e.length; e >= 0; e--) yield this.#e.slice(1, e).join(".");
	}
}, f = /* @__PURE__ */ function(e) {
	return e[e.parallel = 1] = "parallel", e[e.final = 2] = "final", e[e.history = 3] = "history", e;
}({}), p = class e extends Error {
	name = "Machine Malformed";
	constructor(t, n) {
		super(t, n), Object.setPrototypeOf(this, new.target.prototype), "captureStackTrace" in Error && typeof Error.captureStackTrace == "function" && Error.captureStackTrace(this, e);
	}
}, m = "", h = class e {
	root;
	lookup = /* @__PURE__ */ new Map();
	config;
	static create(t) {
		let n = new e();
		return n.root = n.#r(t, null, ""), n.config = t, n.#n(), n;
	}
	getNodeByPath(e) {
		return this.lookup.get(e);
	}
	getEventHandlers(e, t) {
		let n = this.getNodeByPath(e);
		if (!n) throw new p(`unable to find sate "${e.toString()}"`, { machineConfig: null });
		if (t && n.on) return n.on[t.type];
		if (n.always) return n.always;
	}
	resolveFinalState(e = m) {
		let t = this.getNodeByPath(e);
		if (!t) throw new p(`wrong transition target "${e.toString()}"`, { machineConfig: null });
		let n = e;
		for (; t.initial;) t = t.initial, t && (n = n === "" ? t.name : n + "." + t.name);
		return n;
	}
	createRuntime(e) {
		return new g(e, this);
	}
	#e(e, t, n) {
		if (e[t]) throw new p(`State ${n} of type "${e.type}" can't have "${t}" property.`);
	}
	#t = [];
	#n() {
		this.#t.every((e) => e.every((e) => {
			if (e.target && !this.getNodeByPath(e.target)) throw new p(`target "${e.target}" is points to unexisting state.`);
			return !0;
		})), this.#t = null;
	}
	#r(e, t, n) {
		let r = Object.create(null);
		if (r.parent = t, t === null && (r.name = m), e.entry && (r.entry = e.entry), e.exit && (r.exit = e.exit), e.always) {
			let t = Array.isArray(e.always) ? e.always : [e.always];
			r.always = t, this.#t.push(t);
		}
		if (e.type) switch (e.type) {
			case "parallel":
				r.type = f.parallel, this.#e(e, "initial", n);
				break;
			case "final":
				this.#e(e, "always", n), this.#e(e, "exit", n), this.#e(e, "initial", n), this.#e(e, "on", n), this.#e(e, "states", n), r.type = f.final;
				break;
			case "history":
				r.type = f.history;
				break;
		}
		if (e.on) {
			r.on = {};
			for (let t in e.on) {
				if (!Object.hasOwn(e.on, t)) continue;
				let n = t, i = e.on[n], a = Array.isArray(i) ? i : [i];
				this.#t.push(a), r.on[t] = a;
			}
		}
		if (e.states) {
			if (!e.initial) throw new p("missing initial state", { machineConfig: e });
			let t = r.children = Object.create(null);
			for (let i in e.states) {
				if (!Object.hasOwn(e.states, i)) continue;
				let a = e.states[i], o = this.#r(a, r, n === "" ? i : `${n}.${i}`);
				o.name = i, t[i] = o;
			}
		}
		if (e.initial) {
			if (!r.children) throw new p("State with initial should have child states.");
			let t = r.children[e.initial];
			if (!t) throw new p("Initial in state is not found.");
			r.initial = t;
		}
		return this.lookup.set(n, r), r;
	}
}, g = class {
	context;
	chart;
	constructor(e, t) {
		this.context = e, this.chart = t;
	}
	*transition(e, t, n) {
		if (n && e === t) {
			let t = this.chart.getNodeByPath(e);
			if (!t) throw new p(`unable to find sate "${e}"`, { machineConfig: null });
			yield {
				exit: !0,
				path: e,
				effect: t.exit
			}, yield {
				exit: !1,
				path: e,
				effect: t.entry
			};
			return;
		}
		let r = new d(e), i = new d(this.chart.resolveFinalState(t)).diffFrom(r);
		e === m && (yield {
			path: m,
			exit: !1,
			effect: this.chart.root.entry
		});
		for (let e of u(i)) {
			let t = this.chart.lookup.get(e.path);
			if (!t) throw new p(`unable to find sate "${e.path}"`, { machineConfig: null });
			e.effect = e.exit ? t.exit : t.entry, yield e;
		}
	}
	getMostSpecificHandler(e, t) {
		let n = new d(e);
		for (let e of n.ancestors()) {
			let n = this.chart.getEventHandlers(e, t);
			if (n) for (let r of n) if (r.guard) try {
				if (r.guard.call(this.context, t)) return r;
			} catch (t) {
				return new p(`error in guard in state "${e}"`, {
					cause: t,
					machineConfig: this.constructor
				});
			}
			else return r;
		}
	}
}, _ = class {
	event(e) {
		if (e.type === c.InvokedError) {
			console.log(`Event: %c${e.type}`, "color: red", e);
			return;
		}
		console.log(`Event: %c${e.type}`, "color: green", e);
	}
	transition(e, t) {
		console.log(`Transition: ${e || "*"} → %c${t}`, "color: blue; font-weight: bold;");
	}
	warning(e) {
		console.warn(e);
	}
	effectError(e, t, n) {
		console.error(`%c${e} effect`, "color:red;font-weight:bold", `in "${t}" failed`, n);
	}
	group(e, t) {
		console.group(e, t);
	}
	groupEnd() {
		console.groupEnd();
	}
	error(e, t) {}
}, v = class {
	event(e) {
		if (e.type === c.InvokedError) {
			console.log(`Event: \x1b[31m${e.type}\x1b[0m`, e);
			return;
		}
		console.log(`Event: \x1b[32m${e.type}\x1b[0m`, e);
	}
	transition(e, t) {
		console.log(`Transition: ${e || "*"} → \x1b[1;34m${t}\x1b[0m`);
	}
	warning(e) {
		console.warn(`\x1b[33mWarning:\x1b[0m ${e}`);
	}
	effectError(e, t, n) {
		console.error(`\x1b[1;31m${e} effect\x1b[0m in "${t}" failed`, n);
	}
	group(e, t) {
		console.group(e, t);
	}
	groupEnd() {
		console.groupEnd();
	}
	error(e, t) {}
}, y = class {
	constructor() {
		this.head = null, this.tail = null, this.length = 0;
	}
	#e(e) {
		if (e < this.length / 2) {
			let t = this.head, n = 0;
			for (; n < e;) t = t.next, n++;
			return t;
		}
		let t = this.tail, n = this.length - 1;
		for (; n > e;) t = t.prev, n--;
		return t;
	}
	prepend(e) {
		let t = {
			value: e,
			prev: null,
			next: this.head
		};
		return this.head === null ? this.tail = t : this.head.prev = t, this.head = t, this.length++, this;
	}
	append(e) {
		let t = {
			value: e,
			prev: this.tail,
			next: null
		};
		return this.tail === null ? this.head = t : this.tail.next = t, this.tail = t, this.length++, this;
	}
	insert(e, t) {
		if (e <= 0) return this.prepend(t);
		if (e >= this.length) return this.append(t);
		let n = this.#e(e), r = n.prev, i = {
			value: t,
			prev: r,
			next: n
		};
		return r.next = i, n.prev = i, this.length++, this;
	}
	delete(e) {
		if (this.head === null) throw Error("List is empty");
		if (e < 0 || e >= this.length) throw Error("Index out of bounds");
		let t = this.#e(e);
		return t.prev === null ? this.head = t.next : t.prev.next = t.next, t.next === null ? this.tail = t.prev : t.next.prev = t.prev, this.length--, this;
	}
	at(e) {
		if (e < 0 || e >= this.length) throw Error("Index out of bounds");
		return this.#e(e).value;
	}
	toArray() {
		let e = Array(this.length), t = this.head, n = 0;
		for (; t !== null;) e[n++] = t.value, t = t.next;
		return e;
	}
	*[Symbol.iterator]() {
		let e = this.head;
		for (; e !== null;) yield e.value, e = e.next;
	}
}, b = class {
	#e = new y();
	enqueue(e) {
		this.#e.append(e);
	}
	dequeue() {
		if (this.#e.length === 0) return;
		let e = this.#e.at(0);
		return this.#e.delete(0), e;
	}
	flush() {
		for (; this.#e.length > 0;) this.#e.delete(0);
	}
	get size() {
		return this.#e.length;
	}
}, x = class e extends Error {
	name = "Effect Failed";
	constructor(t, n) {
		super(`${t}`, n), Object.setPrototypeOf(this, new.target.prototype), "captureStackTrace" in Error && typeof Error.captureStackTrace == "function" && Error.captureStackTrace(this, e);
	}
}, S = class {
	#e = [];
	get size() {
		return this.#e.length;
	}
	push(e) {
		this.#e.push(e);
	}
	pop() {
		return this.#e.pop();
	}
	peek() {
		return this.#e.at(this.#e.length - 1);
	}
	isEmpty() {
		return this.#e.length === 0;
	}
	includes(e) {
		return this.#e.includes(e);
	}
	clear() {
		this.#e = [];
	}
	[Symbol.iterator]() {
		return this.#e[Symbol.iterator]();
	}
}, C = () => "", w = () => void 0, T = /* @__PURE__ */ new Map(), E = new S(), D = /* @__PURE__ */ new Map();
function O(e, t, n) {
	let r = n.value;
	return n.value = function(...e) {
		this.enqueue(() => {
			r.apply(this, e);
		});
	}, n;
}
var k = class a {
	static childTypes = {};
	data;
	state;
	error;
	send;
	status = "idle";
	doneData;
	_id = crypto.randomUUID();
	constructor(e) {
		let [n, i] = r(e);
		this.data = n, this.setData = (...e) => {
			i(...e);
		}, this.#t = new b(), this.send = this.#S();
		let a = this.constructor.chart;
		if (a) {
			let [e, n] = t("");
			this.state = e, this.#n = n, this.stateChart = a.createRuntime(this);
		} else this.#n = w, this.state = C;
	}
	static configure(e) {
		Object.assign(this.defaults, e);
	}
	static fromJSON(e) {
		let t = this;
		if (!t.isModelSnapshot(e)) throw Error(`${e} is not a model's snapshot.`);
		return t.fromSnapshot(e);
	}
	static fromPersistedSnapshot(e) {
		let t = this.fromJSON(e);
		return t.applyPersistedSnapshot(e), t;
	}
	applyPersistedSnapshot(e) {}
	on(e, t) {
		return this.#i ||= new o(), this.#i.subscribe({ next(n) {
			"type" in n && n.type === e && t(n);
		} });
	}
	subscribe(e) {
		return this.#i ||= new o(), this.status === "error" && this.#i.error(this.error), this.status === "stopped" && this.#i.complete(), this.#i.subscribe(e);
	}
	dispatch(e) {
		if (e = i(e), this.status !== "active") return this.#k(`Can't dispatch "${e.type}" for a`);
		this.#m(e);
	}
	toJSON() {
		return this.#C(this);
	}
	getPersistedSnapshot() {
		return this.toJSON();
	}
	start() {
		if (this.status !== "idle") return this.#k("Can't start a");
		if (this.#v(), this.#E(this.data), this.#y(), this.status = "active", T.set(this._id, this), !E.isEmpty()) {
			let e = E.peek(), t = D.get(e._id) || [];
			t.push(this), this.parent = e, D.set(e._id, t);
		}
		if (this.stateChart) {
			let e = this.state();
			e !== "" && this.#n(""), this.#_({ type: c.Start }, {
				target: e,
				reenter: this.state() !== ""
			});
		}
	}
	stop() {
		if (this.status !== "active") return this.#k("Can't stop a");
		this.status = "stopped", this.#d(), this.#i?.complete();
	}
	invokeObservable(e, t) {
		if (this.status !== "active") return this.#k("Can't invoke observable for a");
		let n = this.state();
		this.#c(({ signal: r }) => {
			let i = e.subscribe({
				next: (e) => {
					t.next && this.enqueue(() => {
						this.#_({
							type: c.InvokedNext,
							value: e,
							state: n
						}, t.next);
					});
				},
				error: (e) => {
					if (t.error) this.enqueue(() => {
						this.#_({
							type: c.InvokedError,
							error: e,
							state: n
						}, t.error);
					});
					else {
						this.#u(new p(`unhandled error in observable in "${n}"`, {
							cause: e,
							machineConfig: this.constructor
						}), !0);
						return;
					}
				},
				complete: () => {
					t.complete && this.enqueue(() => {
						this.#_({
							type: c.InvokedDone,
							result: void 0,
							state: n
						}, t.complete);
					});
				}
			});
			r.addEventListener("abort", () => {
				i.unsubscribe();
			});
		});
	}
	invokePromise(e, t) {
		if (this.status !== "active") return this.#k("Can't invoke promise for a");
		let n = this.state();
		this.#c(async ({ signal: r }) => {
			try {
				let i = await e(r), a = {
					type: c.InvokedDone,
					result: i,
					state: n
				}, o = this.#s(Array.isArray(t.onDone) ? t.onDone : [t.onDone], n, a);
				if (!o || o instanceof p) return this.#u(o || new p(`error in state "${n}"`, {
					cause: "No onDone handler found",
					machineConfig: this.constructor
				}));
				if (o instanceof Error) return this.#l(o);
				this.#_(a, o);
			} catch (e) {
				if (e instanceof p) {
					this.#u(e);
					return;
				}
				if (t.onError) this.#_({
					type: c.InvokedError,
					error: e,
					state: n
				}, t.onError);
				else {
					let t = new p(`unhandled promise rejection in "${n}"`, {
						cause: e,
						machineConfig: this.constructor
					});
					this.#u(t);
				}
			}
		});
	}
	emit(e) {
		if (e = i(e), this.status !== "active") return this.#k(`Can't emit "${e.type}" in a`);
		this.enqueue(() => {
			this.#i?.next(e);
		});
	}
	onCleanup;
	setData;
	schedule(e, t) {
		if (this.status !== "active") return this.#k("Can't schedule in a");
		this.#e ||= new s(), this.#e.schedule(this.#_.bind(this, {
			type: c.ScheduledExecute,
			state: this.state()
		}, e), t || 0, this.state());
	}
	enqueue(e, t) {
		if (this.status !== "active") return this.#k("Can't enque in a");
		this.#t.enqueue(e), E.isEmpty() && queueMicrotask(() => {
			this.#x(this.state(), "event");
		});
	}
	get logger() {
		return this.#D ?? a.defaults.logger;
	}
	set logger(e) {
		this.#D = e || void 0;
	}
	get tracer() {
		return this.#O ?? a.defaults.tracer;
	}
	set tracer(e) {
		this.#O = e || void 0;
	}
	#e = null;
	#t;
	#n;
	#r = null;
	#i = null;
	stateChart;
	static defaults = {};
	#a(e, t) {
		this.#r ||= /* @__PURE__ */ new Map();
		let n = this.#r.get(e) || /* @__PURE__ */ new Set();
		n.add(t), this.#r.set(e, n);
	}
	#o(e, t) {
		let n = this.#r.get(e);
		n && (n.delete(t), n.size === 0 && this.#r.delete(e));
	}
	#s(e, t, n) {
		let r;
		for (let i = 0; i < e.length; i++) if (r = e[i], r.guard) try {
			if (r.guard.call(this, n)) return r;
		} catch (e) {
			return new p(`error in guard in state "${t}"`, {
				cause: e,
				machineConfig: this.constructor
			});
		}
		else return r;
	}
	#c(e) {
		if (this.status !== "active") return this.#k("Can't invoke for a");
		let t = new AbortController(), n = {
			controller: t,
			cleanup: void 0
		}, r = this.state();
		return this.#a(r, n), Promise.resolve(e({
			signal: t.signal,
			send: (e) => {
				t.signal.aborted || this.dispatch(e);
			}
		})).then((e) => {
			typeof e == "function" && (t.signal.aborted ? e() : n.cleanup = e);
		}).catch((e) => {
			throw e;
		}), () => {
			t.abort(), n.cleanup?.(), this.#o(r, n);
		};
	}
	#l(e) {
		this.status = "error", this.#d(), this.error = e, this.#P("err", e), console.error(e), this.#i?.error(e);
	}
	#u(e, t) {
		if (this.#l(e), E.peek() === this && E.pop(), !t) throw e;
		queueMicrotask(() => {
			throw e;
		});
	}
	#d() {
		if (T.delete(this._id), this.#t.flush(), this.#r) for (let [e] of this.#r) this.#p(e);
		this.#f("");
		let e = D.get(this._id);
		if (e) {
			for (let t = 0; t < e.length; t++) e[t].stop();
			D.delete(this._id);
		}
		if (E.size > 0) {
			let e = E.peek()._id, t = D.get(e);
			if (!t) return;
			let n = t.findIndex((e) => e === this);
			n > -1 && t.splice(n, 1);
		}
		this.onCleanup && this.onCleanup();
	}
	#f(e) {
		this.#e?.flush(e);
	}
	#p(e) {
		let t = this.#r?.get(e);
		if (t) for (let n of [...t]) n.controller.abort(), n.cleanup?.(), this.#r?.delete(e);
	}
	#m(e) {
		if (this.status !== "active") return this.#k(`Can't handle "${e.type}" in a`);
		let t = this.stateChart.getMostSpecificHandler(this.state(), e);
		if (t) {
			if (t instanceof Error) return this.#l(t);
			this.#_(e, t);
		}
	}
	#h(e) {
		switch (e.type) {
			case c.InvokedDone: return {
				type: e.type,
				result: String(e.result)
			};
			case c.InvokedError: return {
				type: e.type,
				error: String(e.error)
			};
			case c.InvokedNext: return {
				type: e.type,
				error: String(e.value)
			};
			default: return { ...e };
		}
	}
	#g(e) {
		return !e.type.startsWith("@");
	}
	#_(e, t) {
		if (this.status !== "active") return this.#k(`Can't handle "${e.type}" in a`);
		let n = this.#I("Event", this.#g(e) ? { ...e } : this.#h(e));
		this.#M(), this.#j(e), t?.action && this.enqueue(t.action.bind(this, e)), this.#t.size > 0 && this.#x(this.state(), "event"), t?.target != null && this.#b(this.stateChart.transition(this.state(), t.target, t.reenter), e);
		let r = this.state();
		if (!(e.type === c.Eventless && e.state === r)) {
			let e = this.stateChart?.getMostSpecificHandler(r);
			e && e instanceof Error ? this.#l(e) : e && this.#_({
				type: c.Eventless,
				state: r
			}, e);
		}
		n && n.end(), this.#N();
	}
	#v() {
		E.push(this);
	}
	#y() {
		E.pop();
	}
	#b(e, t, n) {
		let r = this.state();
		for (let i of e) if (i.exit) {
			let e = i.effect, a = e && this.#F("Exit", {
				parent: n?.context(),
				attributes: { state: i.path }
			});
			e && this.enqueue(e.bind(this, t)), this.#p(i.path), this.#f(i.path), this.#t.size > 0 && this.#x(r, "exit"), a?.end(), this.#n(i.path);
		} else {
			this.#n(i.path);
			let e = i.effect, r = e && this.#F("Entry", {
				parent: n,
				attributes: { state: i.path }
			});
			e && this.enqueue(e.bind(this, t)), this.#t.size > 0 && this.#x(i.path, "entry"), r?.end();
		}
		this.#A(r, this.state());
	}
	#x(t, r) {
		let i = this.#t.dequeue();
		i && (this.#v(), n(() => e(() => {
			for (; i;) {
				try {
					i();
				} catch (e) {
					if (e instanceof p) {
						this.#u(e);
						return;
					}
					let n = new x(`${r} effect in "${t}" state failed`, { cause: e });
					this.#P("err", n), console.error(n);
				}
				i = this.#t.dequeue();
			}
		})), this.#y());
	}
	#S() {
		return new Proxy({}, { get: (e, t) => (e) => {
			this.dispatch({
				type: t,
				...e ?? {}
			});
		} });
	}
	#C(e, t = "") {
		return {
			_id: e._id,
			state: e.state(),
			name: t,
			data: e.#T(i(e.data), this),
			status: e.status
		};
	}
	#w(e, t) {
		for (let n in e) if (Object.hasOwn(e, n) && e[n] === t) return n;
	}
	#T(e, t) {
		if (e instanceof a) {
			let t = e.parent.constructor.childTypes, n = e.constructor, r = this.#w(t, n);
			if (!r) throw Error("Can't find a child to spawn a model");
			return e.#C(e, r);
		}
		if (Array.isArray(e)) return e.map((e) => this.#T(e, t));
		if (e && typeof e == "object") {
			let n = {};
			for (let [r, i] of Object.entries(e)) n[r] = this.#T(i, t);
			return n;
		}
		return e;
	}
	static fromSnapshot(e, t) {
		if (this === a) throw Error("You need to extend you model from ComponentModel class.");
		let n = e.name, r, i = this.dataFromJSON(e.data, t);
		if (t) {
			let e = this.getChildCtor(t, n);
			if (!e) throw Error(`Unable to find child constructor "${n}" in ${t}`);
			r = new e({});
		} else r = new this({});
		return r.setData(i), r.#n(e.state), r._id = e._id, r.status = "idle", r;
	}
	static dataFromJSON(e, t) {
		if (this.isModelSnapshot(e)) return this.fromSnapshot(e, t || this);
		if (Array.isArray(e)) return e.map((e) => this.dataFromJSON(e, t));
		if (e && typeof e == "object") {
			let n = {};
			for (let [r, i] of Object.entries(e)) n[r] = this.dataFromJSON(i, t);
			return n;
		}
		return e;
	}
	static isModelSnapshot(e) {
		return !(!e || typeof e != "object" || !e || !("data" in e) || !e.data || typeof e.data != "object" || e.data === null || !("_id" in e) || typeof e._id != "string" || !("status" in e) || typeof e.status != "string" || !("state" in e) || typeof e.state != "string");
	}
	static getChildCtor(e, t) {
		let n = e.childTypes;
		if (Object.hasOwn(n, t)) return n[t];
	}
	#E(e) {
		if (e instanceof a) {
			console.log("child is in", e.status, "status"), e.status === "idle" && e.start();
			return;
		}
		if (Array.isArray(e)) return e.map(this.#E.bind(this));
		if (e && typeof e == "object") {
			let t = {};
			for (let [n, r] of Object.entries(e)) t[n] = this.#E(r);
		}
	}
	#D;
	#O;
	#k(e) {
		console.warn(e + ` model in "${this.status}" status.`);
	}
	#A(e, t) {
		this.logger && this.logger.transition(e, t);
	}
	#j(e) {
		this.logger && this.logger.event(e);
	}
	#M() {
		this.logger && this.logger.group(this.constructor.name, this._id);
	}
	#N() {
		this.logger && this.logger.groupEnd();
	}
	#P(e, t) {
		this.logger && this.logger.error(e, { cause: t });
	}
	#F(...e) {
		if (this.tracer) return this.tracer.startSpan(...e);
	}
	#I(...e) {
		if (this.tracer) return this.tracer.startTrace(...e);
	}
}, A = { matches: { value(e) {
	let t = this.state();
	return !t || e.length > t.length ? !1 : t.startsWith(e) && (e.length === t.length || t.slice(e.length).startsWith("."));
} } };
function j(e) {
	"matches" in e || Object.defineProperties(e, A);
}
function M(e, t, n) {
	let r = t instanceof h ? t : h.create(t);
	class i extends e {
		static chart = r;
	}
	return Object.defineProperty(i, "name", { value: n || e.name }), j(i.prototype), i;
}
//#endregion
export { _ as BrowserLogger, k as ComponentModel, c as InternalEventName, g as Interpreter, p as MachineMalformed, h as StateChart, v as TerminalLogger, M as WithStateChart, O as action };

//# sourceMappingURL=index.js.map