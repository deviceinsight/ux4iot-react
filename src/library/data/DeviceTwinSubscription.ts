import { DeviceTwinCallback } from '../types';
import {
	DeviceTwinMessage,
	DeviceTwinGrantRequest,
	DeviceTwinSubscriptionRequest,
	Message,
} from '../ux4iot-shared';

import { Subscription, SubscriptionArgs } from './Subscription';

function isDeviceTwinMessage(
	message: Record<string, unknown>
): message is DeviceTwinMessage {
	return !!message.deviceTwin;
}

export type DeviceTwinArgs = SubscriptionArgs & {
	onDataCallback: DeviceTwinCallback;
};

export class DeviceTwinSubscription extends Subscription {
	onDataCallback: DeviceTwinCallback;

	constructor(args: DeviceTwinArgs) {
		super(args);
		this.onDataCallback = args.onDataCallback;
	}

	createGrant(): Omit<DeviceTwinGrantRequest, 'sessionId'> {
		return {
			grantType: 'subscribeToDeviceTwin',
			deviceId: this.deviceId,
		};
	}

	createSubscription(): Omit<DeviceTwinSubscriptionRequest, 'sessionId'> {
		return {
			type: 'deviceTwin',
			deviceId: this.deviceId,
		};
	}

	onData(data: Message): void {
		if (isDeviceTwinMessage(data)) {
			if (this.deviceId === data.deviceId) {
				this.onDataCallback(this.deviceId, data.deviceTwin);
			}
		}
	}
	isEqual(s: Subscription): boolean {
		return s instanceof DeviceTwinSubscription && this.deviceId === s.deviceId;
	}
}
