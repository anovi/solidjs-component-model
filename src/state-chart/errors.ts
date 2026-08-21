export class MachineMalformed extends Error {
	public readonly name = "Machine Malformed";

	constructor(
		message: string,
		options?: { cause?: unknown, machineConfig: unknown }
	) {
		super(message, options);
		Object.setPrototypeOf(this, new.target.prototype);
		if ('captureStackTrace' in Error && typeof Error.captureStackTrace === 'function') {
			Error.captureStackTrace(this, MachineMalformed);
		}
	}
}