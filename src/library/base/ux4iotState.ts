import {
	ConnectionStateCallback,
	D2CMessageCallback,
	DeviceTwinCallback,
	MessageCallback,
	TelemetryCallback,
} from './types';
import {
	ConnectionStateGrantRequest,
	ConnectionStateSubscriptionRequest,
	D2CMessageGrantRequest,
	D2CMessageSubscriptionRequest,
	DesiredPropertyGrantRequest,
	DeviceTwinGrantRequest,
	DeviceTwinSubscriptionRequest,
	DirectMethodGrantRequest,
	GrantRequest,
	SubscriptionRequest,
	TelemetryGrantRequest,
	TelemetrySubscriptionRequest,
} from './ux4iot-shared';
import { grantRequestsEqual } from './utils';

type Subscription =
	| TelemetrySubscription
	| DeviceTwinSubscription
	| D2CMessageSubscription
	| ConnectionStateSubscription;
type TelemetrySubscription = Omit<
	TelemetrySubscriptionRequest,
	'telemetryKey'
> & {
	onData: TelemetryCallback;
	telemetryKeys: string[];
};
type DeviceTwinSubscription = DeviceTwinSubscriptionRequest & {
	onData: DeviceTwinCallback;
};
type D2CMessageSubscription = D2CMessageSubscriptionRequest & {
	onData: D2CMessageCallback;
};
type ConnectionStateSubscription = ConnectionStateSubscriptionRequest & {
	onData: ConnectionStateCallback;
};

type Ux4iotState = {
	grants: Ux4iotGrants;
	subscriptions: Ux4iotSubscriptions;
};

type Ux4iotGrants = {
	deviceTwin: DeviceTwinGrantRequest[];
	connectionState: ConnectionStateGrantRequest[];
	d2cMessages: D2CMessageGrantRequest[];
	telemetry: TelemetryGrantRequest[];
	desiredProperties: DesiredPropertyGrantRequest[];
	directMethod: DirectMethodGrantRequest[];
};
type Ux4iotSubscriptions = Record<string, Subscription[]>;

export const state: Ux4iotState = {
	grants: {
		deviceTwin: [],
		connectionState: [],
		d2cMessages: [],
		telemetry: [],
		desiredProperties: [],
		directMethod: [],
	},
	subscriptions: {},
};

export function resetState() {
	state.grants = {
		deviceTwin: [],
		connectionState: [],
		d2cMessages: [],
		telemetry: [],
		desiredProperties: [],
		directMethod: [],
	};
	state.subscriptions = {};
}

export function hasSubscription(
	subscriberId: string,
	subscriptionRequest: SubscriptionRequest
): boolean {
	if (!state.subscriptions[subscriberId]) return false;
	for (const sub of state.subscriptions[subscriberId]) {
		const { type, deviceId, sessionId } = subscriptionRequest;
		const { type: sType, deviceId: sDeviceId, sessionId: sSessionId } = sub;
		if (sSessionId === sessionId && sDeviceId === deviceId && sType === type) {
			switch (type) {
				case 'connectionState':
				case 'd2cMessages':
				case 'deviceTwin':
					return true;
				case 'telemetry': {
					const { telemetryKeys } = sub as TelemetrySubscription;
					return telemetryKeys.includes(subscriptionRequest.telemetryKey);
				}
			}
		}
	}
	return false;
}

export function hasGrant(grantRequest: GrantRequest) {
	for (const grants of Object.values(state.grants))
		for (const grant of grants)
			if (grantRequestsEqual(grantRequest, grant)) return true;
	return false;
}

export function getNumberOfSubscribers(
	subscriptionRequest: SubscriptionRequest
) {
	let subscriptionCount = 0;
	for (const subscriptions of Object.values(state.subscriptions)) {
		for (const sub of subscriptions) {
			const { type, deviceId, sessionId } = subscriptionRequest;
			const { type: sType, deviceId: sDeviceId, sessionId: sSessionId } = sub;
			if (
				sessionId === sSessionId &&
				sDeviceId === deviceId &&
				sType === type
			) {
				switch (type) {
					case 'connectionState':
					case 'd2cMessages':
					case 'deviceTwin':
						subscriptionCount++;
						break;
					case 'telemetry': {
						const { telemetryKeys } = sub as TelemetrySubscription;
						if (telemetryKeys.includes(subscriptionRequest.telemetryKey)) {
							subscriptionCount++;
						}
						break;
					}
				}
			}
		}
	}
	return subscriptionCount;
}

export function hasGrantForSubscription(
	subscriptionRequest: SubscriptionRequest
) {
	const { deviceId, type, sessionId } = subscriptionRequest;
	for (const grants of Object.values(state.grants)) {
		for (const grant of grants) {
			if (grant.deviceId !== deviceId || grant.sessionId !== sessionId) {
				continue;
			}
			switch (type) {
				case 'connectionState':
				case 'deviceTwin':
				case 'd2cMessages':
					if (grant.type === type) return true;
					break;
				case 'telemetry': {
					const { telemetryKey } = subscriptionRequest;
					if (grant.type === type && grant.telemetryKey === telemetryKey)
						return true;
					break;
				}
			}
		}
	}
	return false;
}

export function addSubscription(
	subscriberId: string,
	subscriptionRequest: SubscriptionRequest,
	onData: MessageCallback
) {
	const { subscriptions } = state;
	const { type, deviceId, sessionId } = subscriptionRequest;
	if (hasSubscription(subscriberId, subscriptionRequest)) {
		return;
	}
	switch (type) {
		case 'deviceTwin':
		case 'connectionState':
		case 'd2cMessages': {
			const subscription = { type, deviceId, onData, sessionId } as
				| DeviceTwinSubscription
				| ConnectionStateSubscription
				| D2CMessageSubscription;
			!subscriptions[subscriberId]
				? (subscriptions[subscriberId] = [subscription])
				: subscriptions[subscriberId].push(subscription);
			break;
		}
		case 'telemetry': {
			const { telemetryKey } = subscriptionRequest;
			const subscription = {
				type,
				deviceId,
				onData,
				telemetryKeys: [telemetryKey],
				sessionId,
			} as TelemetrySubscription;
			if (subscriptions[subscriberId]) {
				const foundSubscription = subscriptions[subscriberId].find(
					s => s.deviceId === deviceId
				) as TelemetrySubscription;
				if (foundSubscription) {
					foundSubscription.telemetryKeys.push(telemetryKey);
				} else {
					subscriptions[subscriberId].push(subscription);
				}
			} else {
				subscriptions[subscriberId] = [subscription];
			}
			break;
		}
		default:
			break;
	}
}

export function removeSubscription(
	subscriberId: string,
	subscriptionRequest: SubscriptionRequest
): Subscription | undefined {
	if (!state.subscriptions[subscriberId]) {
		return;
	}
	const { type, deviceId, sessionId } = subscriptionRequest;
	switch (type) {
		case 'deviceTwin':
		case 'connectionState':
		case 'd2cMessages': {
			const subscriptionRequest = state.subscriptions[subscriberId].find(
				s =>
					s.deviceId === deviceId &&
					s.type === type &&
					s.sessionId === sessionId
			);

			state.subscriptions[subscriberId] = state.subscriptions[
				subscriberId
			].filter(s => s !== subscriptionRequest);

			if (state.subscriptions[subscriberId].length === 0) {
				delete state.subscriptions[subscriberId];
			}
			return subscriptionRequest;
		}
		case 'telemetry':
			if (state.subscriptions[subscriberId]) {
				const foundSubscription = state.subscriptions[subscriberId].find(s => {
					return s.deviceId === deviceId && s.sessionId === sessionId;
				}) as TelemetrySubscription | undefined;
				if (foundSubscription) {
					const keys = foundSubscription.telemetryKeys;
					const { telemetryKey } = subscriptionRequest;
					const nextTelemetryKeys = keys.filter(k => k !== telemetryKey);

					if (nextTelemetryKeys.length === 0) {
						state.subscriptions[subscriberId] = state.subscriptions[
							subscriberId
						].filter(s => {
							return s !== foundSubscription;
						});
					} else {
						foundSubscription.telemetryKeys = nextTelemetryKeys;
					}
				}
				if (state.subscriptions[subscriberId].length === 0) {
					delete state.subscriptions[subscriberId];
				}
				return foundSubscription;
			}
			break;
		default:
			break;
	}
}

export function addGrant(grantRequest: GrantRequest) {
	const { grants } = state;
	const { type } = grantRequest;
	//@ts-ignore type of grant request is correctly map in Ux4iotState
	grants[type].push(grantRequest);
}

export function removeGrant(grantRequest: GrantRequest) {
	const { grants } = state;
	const { type } = grantRequest;
	//@ts-ignore type of grant request is correctly map in Ux4iotState
	grants[type] = grants[type].filter(g => !grantRequestsEqual(g, grantRequest));
}

export function cleanSubId(subscriptionId: string) {
	delete state.subscriptions[subscriptionId];
}
