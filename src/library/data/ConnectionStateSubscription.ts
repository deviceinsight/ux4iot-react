import { ConnectionStateCallback } from '../types';
import {
	ConnectionStateMessage,
	ConnectionStateGrantRequest,
	ConnectionStateSubscriptionRequest,
	Message,
} from '../base/ux4iot-shared';
import { Subscription, SubscriptionArgs } from './Subscription';

function isConnectionStateMessage(
	message: Record<string, unknown>
): message is ConnectionStateMessage {
	return !!message.connectionState;
}

export type ConnectionStateArgs = SubscriptionArgs & {
	onDataCallback: ConnectionStateCallback;
};

export class ConnectionStateSubscription extends Subscription {
	onDataCallback: ConnectionStateCallback;

	constructor(args: ConnectionStateArgs) {
		super(args);
		this.onDataCallback = args.onDataCallback;
	}

	createGrant(): Omit<ConnectionStateGrantRequest, 'sessionId'> {
		return { grantType: 'subscribeToConnectionState', deviceId: this.deviceId };
	}

	createSubscription(): Omit<ConnectionStateSubscriptionRequest, 'sessionId'> {
		return { type: 'connectionState', deviceId: this.deviceId };
	}

	onData(data: Message): void {
		if (isConnectionStateMessage(data)) {
			if (this.deviceId === data.deviceId) {
				this.onDataCallback(this.deviceId, data.connectionState.connected);
			}
		}
	}

	isEqual(s: Subscription): boolean {
		return (
			s instanceof ConnectionStateSubscription && this.deviceId === s.deviceId
		);
	}
}
