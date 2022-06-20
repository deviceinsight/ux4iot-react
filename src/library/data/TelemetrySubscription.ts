import { Subscription, SubscriptionArgs } from './Subscription';
import { TelemetryCallback } from '../types';
import {
	Message,
	TelemetryGrantRequest,
	TelemetryMessage,
	TelemetrySubscriptionRequest,
} from '../base/ux4iot-shared';

export function isTelemetryMessage(
	message: Record<string, unknown>
): message is TelemetryMessage {
	return !!message.telemetry;
}

export type TelemetryArgs = SubscriptionArgs & {
	onDataCallback: TelemetryCallback;
	telemetryKeys: string[];
};

export class TelemetrySubscriber extends Subscription {
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

				this.onDataCallback(this.deviceId, outMessage, data.timestamp);
			}
		}
	}

	//@override
	public async subscribe() {
		if (this.isSubscribed) {
			return;
		}
		if (!this.granted) await this.askForGrant();
		if (this.granted) {
			try {
				await this.api.subscribe(this.createSubscription());
				this.isSubscribed = true;
			} catch (error) {
				this.onSubscriptionError && this.onSubscriptionError(error);
			}
		}
	}

	addTelemetry(telemetryKeys: string[]) {
		// check telemetryKeys array for 0 length
		// request grant for telemetryKeys
		// if success
		//   - make subscription request
		//   - add telemetryKeys to object instance "this.telemetryKeys"
		// else call onGrantError

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
