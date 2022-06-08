import { Subscription, SubscriptionArgs } from './Subscription';
import { TelemetryCallback } from '../types';
import {
	Message,
	TelemetryGrantRequest,
	TelemetryMessage,
	TelemetrySubscriptionRequest,
} from '../ux4iot-shared';

export function isTelemetryMessage(
	message: Record<string, unknown>
): message is TelemetryMessage {
	return !!message.telemetry;
}

export type TelemetryArgs = SubscriptionArgs & {
	onDataCallback: TelemetryCallback;
	telemetryKeys: string[];
};

export class TelemetrySubscription extends Subscription {
	telemetryKeys: string[];
	onDataCallback: TelemetryCallback;

	constructor(args: TelemetryArgs) {
		super(args);
		this.onDataCallback = args.onDataCallback;
		this.telemetryKeys = args.telemetryKeys;
	}

	createGrant(): Omit<TelemetryGrantRequest, 'sessionId'>[] {
		return this.telemetryKeys.map(tk => ({
			grantType: 'subscribeToTelemetry',
			deviceId: this.deviceId,
			telemetryKey: tk,
		}));
	}

	createSubscription(): Omit<TelemetrySubscriptionRequest, 'sessionId'>[] {
		return this.telemetryKeys.map(tk => ({
			type: 'telemetry',
			deviceId: this.deviceId,
			telemetryKey: tk,
		}));
	}

	onData(data: Message): void {
		if (isTelemetryMessage(data)) {
			if (this.deviceId === data.deviceId) {
				const outMessage: Record<string, unknown> = { deviceId: data.deviceId };
				for (const [key, value] of Object.entries(data.telemetry))
					if (this.telemetryKeys.includes(key)) outMessage[key] = value;

				this.onDataCallback(this.deviceId, data.telemetry, data.timestamp);
			}
		}
	}

	addTelemetry(telemetryKeys: string[]) {
		if (telemetryKeys.length === 0) {
			return;
		}
		for (const tk of telemetryKeys) {
			if (this.telemetryKeys.includes(tk)) {
				continue;
			}
		}
		this.telemetryKeys = this.telemetryKeys
			.concat(...telemetryKeys)
			.filter((item, i, arr) => arr.indexOf(item) === i);
	}

	removeTelemetry(telemetryKeys: string[]) {
		if (telemetryKeys.length === 0) {
			return;
		}
		this.telemetryKeys = this.telemetryKeys.filter(
			tk => !telemetryKeys.includes(tk)
		);
	}

	isEqual(s: Subscription): boolean {
		return (
			s instanceof TelemetrySubscription &&
			this.deviceId === s.deviceId &&
			this.telemetryKeys.every(tk => s.telemetryKeys.includes(tk)) &&
			s.telemetryKeys.every(tk => this.telemetryKeys.includes(tk))
		);
	}
}
