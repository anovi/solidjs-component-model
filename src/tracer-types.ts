/**
 * Observability types and interfaces (contract only).
 * Domain, Application, and UI depend on these; infra implements them.
 */

export type TraceId = string;
export type SpanId = string;

export interface TraceContext {
	traceId: TraceId;
	spanId: SpanId;
}

export type SpanStatus = "ok" | "error" | "cancelled";

export interface SpanAttributes {
	[key: string]: string | number | boolean | undefined;
}

export interface SpanRecord {
	traceId: TraceId;
	spanId: SpanId;
	parentSpanId?: SpanId;

	name: string;
	startTime: number;
	endTime: number;
	duration: number;

	process: "renderer" | "main" | "preload";

	status: SpanStatus;

	attributes?: SpanAttributes;

	timestamp: string; // ISO
}

export interface Span {
	readonly traceId: TraceId;
	readonly spanId: SpanId;
	readonly parentSpanId?: SpanId;

	readonly name: string;

	setAttribute: (key: string, value: string | number | boolean) => void;
	setAttributes: (attributes: SpanAttributes) => void;

	/**
	 * Record an error on the span.
	 * Should also set status to "error".
	 */
	recordError: (error: unknown) => void;

	/**
	 * Mark span as completed.
	 * Must: capture endTime, compute duration, trigger export.
	 * Should be idempotent.
	 */
	end: (status?: SpanStatus) => void;

	/**
	 * Return minimal context used for propagation.
	 */
	context: () => TraceContext;
}

export interface Tracer {
	startTrace: (name: string, attributes?: SpanAttributes) => Span;

	startSpan: (
		name: string,
		options?: {
			parent?: TraceContext;
			attributes?: SpanAttributes;
		}
	) => Span;
}

export interface TracedEvent<T = unknown> {
	payload: T;
	trace?: TraceContext;
}

export interface TracedIpcPayload<T = unknown> {
	data: T;
	trace?: TraceContext;
}

export interface SpanExporter {
	export: (span: SpanRecord) => Promise<void>;
	shutdown: () => Promise<void>;
}

export interface FileTraceStorageConfig {
	filePath: string;
	flushIntervalMs?: number;
}
