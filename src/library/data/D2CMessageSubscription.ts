import { D2CMessageCallback } from '../types';
import {
	RawD2CMessage,
	RawD2CMessageGrantRequest,
	RawD2CMessageSubscriptionRequest,
	Message,
} from '../base/ux4iot-shared';
import { Subscription, SubscriptionArgs } from './Subscription';

export type D2CMessageArgs = SubscriptionArgs & {
	onDataCallback: D2CMessageCallback;
};

export class D2CMessageSubscription extends Subscription {
	onDataCallback: D2CMessageCallback;

	constructor(args: D2CMessageArgs) {
		super(args);
		this.onDataCallback = args.onDataCallback;
	}

	createGrant(): Omit<RawD2CMessageGrantRequest, 'sessionId'> {
		return { grantType: 'subscribeToD2CMessages', deviceId: this.deviceId };
	}

	createSubscription(): Omit<RawD2CMessageSubscriptionRequest, 'sessionId'> {
		return { type: 'rawD2CMessages', deviceId: this.deviceId };
	}

	onData(data: Message): void {
		if (isRawMessage(data)) {
			if (this.deviceId === data.deviceId) {
				this.onDataCallback(this.deviceId, data.message, data.timestamp);
			}
		}
	}

	isEqual(s: Subscription): boolean {
		return s instanceof D2CMessageSubscription && this.deviceId === s.deviceId;
	}
}
