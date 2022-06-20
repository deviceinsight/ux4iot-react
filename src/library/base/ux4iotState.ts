import {
	ConnectionStateCallback,
	D2CMessageCallback,
	DeviceTwinCallback,
	MessageCallback,
	TelemetryCallback,
} from '../types';
import {
	ConnectionStateGrantRequest,
	ConnectionStateSubscriptionRequest,
	DesiredPropertyGrantRequest,
	DeviceTwinGrantRequest,
	DeviceTwinSubscriptionRequest,
	DirectMethodGrantRequest,
	GrantRequest,
	Message,
	RawD2CMessageGrantRequest,
	RawD2CMessageSubscriptionRequest,
	SubscriptionRequest,
	TelemetryGrantRequest,
	TelemetrySubscriptionRequest,
} from '../ux4iot-shared';
import {
	isTelemetryMessage,
	isConnectionStateMessage,
	isD2CMessage,
	isDeviceTwinMessage,
	grantRequestsEqual,
} from './utils';

type Subscription =
	| TelemetrySubscription
	| DeviceTwinSubscription
	| D2CMessageSubscription
	| ConnectionStateSubscription;
type TelemetrySubscription = Omit<
	TelemetrySubscriptionRequest,
	'sessionId' | 'telemetryKey'
> & {
	onData: TelemetryCallback;
	telemetryKeys: string[];
};
type DeviceTwinSubscription = Omit<
	DeviceTwinSubscriptionRequest,
	'sessionId'
> & {
	onData: DeviceTwinCallback;
};
type D2CMessageSubscription = Omit<
	RawD2CMessageSubscriptionRequest,
	'sessionId'
> & {
	onData: D2CMessageCallback;
};
type ConnectionStateSubscription = Omit<
	ConnectionStateSubscriptionRequest,
	'sessionId'
> & {
	onData: ConnectionStateCallback;
};

type Ux4iotState = {
	grants: Ux4iotGrants;
	subscriptions: Ux4iotSubscriptions;
};

type Ux4iotGrants = {
	deviceTwin: DeviceTwinGrantRequest[];
	connectionState: ConnectionStateGrantRequest[];
	d2cMessage: RawD2CMessageGrantRequest[];
	telemetry: TelemetryGrantRequest[];
	desiredProperties: DesiredPropertyGrantRequest[];
	directMethod: DirectMethodGrantRequest[];
};
type Ux4iotSubscriptions = Record<string, Subscription[]>;

export const state: Ux4iotState = {
	grants: {
		deviceTwin: [],
		connectionState: [],
		d2cMessage: [],
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
		d2cMessage: [],
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
	for (const s of state.subscriptions[subscriberId]) {
		const { type, deviceId } = subscriptionRequest;
		const { type: sType, deviceId: sDeviceId } = s;
		if (sDeviceId === deviceId && sType === type) {
			switch (type) {
				case 'connectionState':
				case 'd2cMessages':
				case 'deviceTwin':
					return true;
				case 'telemetry': {
					const { telemetryKeys } = s as TelemetrySubscription;
					return telemetryKeys.includes(subscriptionRequest.telemetryKey);
				}
			}
		}
	}
	return false;
}

export function hasGrant(grantRequest: GrantRequest) {
	for (const grants of Object.values(state.grants))
		for (const g of grants)
			if (grantRequestsEqual(grantRequest, g)) return true;
	return false;
}

export function getNumberOfSubscribers(
	subscriptionRequest: SubscriptionRequest
) {
	let subscriptionCount = 0;
	for (const subscriptions of Object.values(state.subscriptions)) {
		for (const s of subscriptions) {
			const { type, deviceId } = subscriptionRequest;
			const { type: sType, deviceId: sDeviceId } = s;
			if (sDeviceId === deviceId && sType === type) {
				switch (type) {
					case 'connectionState':
					case 'd2cMessages':
					case 'deviceTwin':
						subscriptionCount++;
						break;
					case 'telemetry': {
						const { telemetryKeys } = s as TelemetrySubscription;
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
		for (const g of grants) {
			if (g.deviceId !== deviceId || g.sessionId !== sessionId) {
				continue;
			}
			switch (type) {
				case 'connectionState':
					if (g.grantType === 'subscribeToConnectionState') return true;
					break;
				case 'deviceTwin':
					if (g.grantType === 'subscribeToDeviceTwin') return true;
					break;
				case 'd2cMessages':
					if (g.grantType === 'subscribeToD2CMessages') return true;
					break;
				case 'telemetry': {
					const { telemetryKey } = subscriptionRequest;
					if (
						g.grantType === 'subscribeToTelemetry' &&
						g.telemetryKey === telemetryKey
					)
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
	const { type, deviceId } = subscriptionRequest;
	if (hasSubscription(subscriberId, subscriptionRequest)) {
		return;
	}
	switch (type) {
		case 'deviceTwin':
		case 'connectionState':
		case 'd2cMessages': {
			const subscription = { type, deviceId, onData } as
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
	const { type, deviceId } = subscriptionRequest;
	switch (type) {
		case 'deviceTwin':
		case 'connectionState':
		case 'd2cMessages': {
			const subscriptionRequest = state.subscriptions[subscriberId].find(
				s => s.deviceId === deviceId && s.type === type
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
					return s.deviceId === deviceId;
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
	const { grantType } = grantRequest;
	switch (grantType) {
		case 'invokeDirectMethod':
			return grants.directMethod.push(grantRequest);
		case 'modifyDesiredProperties':
			return grants.desiredProperties.push(grantRequest);
		case 'subscribeToConnectionState':
			return grants.connectionState.push(grantRequest);
		case 'subscribeToD2CMessages':
			return grants.d2cMessage.push(grantRequest);
		case 'subscribeToDeviceTwin':
			return grants.deviceTwin.push(grantRequest);
		case 'subscribeToTelemetry':
			return grants.telemetry.push(grantRequest);
		default:
			break;
	}
}

export function removeGrant(grantRequest: GrantRequest) {
	const { grants } = state;
	const { grantType } = grantRequest;
	switch (grantType) {
		case 'invokeDirectMethod':
			grants.directMethod = grants.directMethod.filter(
				g => !grantRequestsEqual(g, grantRequest)
			);
			break;
		case 'modifyDesiredProperties':
			grants.desiredProperties = grants.desiredProperties.filter(
				g => !grantRequestsEqual(g, grantRequest)
			);
			break;
		case 'subscribeToConnectionState':
			grants.connectionState = grants.connectionState.filter(
				g => !grantRequestsEqual(g, grantRequest)
			);
			break;
		case 'subscribeToD2CMessages':
			grants.d2cMessage = grants.d2cMessage.filter(
				g => !grantRequestsEqual(g, grantRequest)
			);
			break;
		case 'subscribeToDeviceTwin':
			grants.deviceTwin = grants.deviceTwin.filter(
				g => !grantRequestsEqual(g, grantRequest)
			);
			break;
		case 'subscribeToTelemetry':
			grants.telemetry = grants.telemetry.filter(
				g => !grantRequestsEqual(g, grantRequest)
			);
			break;
		default:
			break;
	}
}

export function sendMessage(message: Message) {
	for (const subscriptions of Object.values(state.subscriptions)) {
		for (const s of subscriptions) {
			const { type, deviceId } = s;
			if (deviceId === message.deviceId) {
				switch (type) {
					case 'telemetry': {
						if (isTelemetryMessage(message)) {
							const filteredTelemetry: Record<string, unknown> = {};
							for (const telemetryKey of s.telemetryKeys) {
								filteredTelemetry[telemetryKey] =
									message.telemetry[telemetryKey];
							}
							s.onData(message.deviceId, filteredTelemetry, message.timestamp);
						}
						break;
					}
					case 'connectionState':
						isConnectionStateMessage(message) &&
							s.onData(message.deviceId, message.connectionState.connected);
						break;
					case 'd2cMessages':
						isD2CMessage(message) &&
							s.onData(message.deviceId, message.message, message.timestamp);
						break;
					case 'deviceTwin':
						isDeviceTwinMessage(message) &&
							s.onData(message.deviceId, message.deviceTwin);
						break;
				}
			}
		}
	}
}

export function cleanSubId(subscriptionId: string) {
	delete state.subscriptions[subscriptionId];
}
