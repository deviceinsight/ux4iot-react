// Ux4iot:
//   - patchDesiredProperties( deviceId, patch)
//     - catch notReady: Error
//     - catch notGranted: Youre not authorized
//   - invokeDirectMethod(deviceId, directMethod)
//     - catch notReady: Error
//     - catch notGranted: Youre not authorized
//   - state: Ux4iotState
//     - methods:
//       - private hasGrantFor(deviceId, telemetryKey): checks if theres a need to ask for grant
//       - private hasSubscriptionFor(deviceId, telemetryKey): checks if theres a need to subscribe
//       - onStateChange
//   // - ungrant(grant)
//   - grant(grant)
//     if ux4iot.ready === false:
//       - enqueue grantrequest
//     else
//       - requests grant if grant isnt already in state
//         - success: add grant to ux4iotState
//         - failure: onGrantError
//   - subscribe(subscriberId, subReq)
//     - subscribes data if data isnt already subscribed to
//       - success: add subscription to ux4iotState
//       - failure: onSubscriptionError
//   - unsubscribe(subscriberId, subReq)
//     - unsubscribes data if data isnt still subscribed by anyone else
//       - success: remove subscription to ux4iotState
//       - failure: onSubscriptionError
//   - onData:
//     for each subscriptionId.onDataCallback in ux4iotState.subscriptions
//       - match deviceId, match type, aggregate telemetry
//         - onDataCallback(deviceId, data)

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

// useTelemetry:

// state:
//   - telemetryValue
//   - ux4iot context

// effects
//   ux4iot.onIsReadyChange
//     - is ready?
//       yes:
//       - ux4iot.askGrant
//         - true: granted
//         - false: onGrantError
//       - ux4iot.askSubscription:
//         - true: subscribed
//         - false: onSubscriptionError
//       no:
//       - idle

// useMultiTelemetry
//   for each deviceId:
//     for each telemetryKey of deviceId:
//       addTelemetry();

//   addTelemetry:
//     - ux4iot.subscribe(subscriberId, subReq) -> replace subrequest!!!

// type Subscription<T> = {
// 	type: SubscriptionRequest['type'];
// 	deviceId: string;
// 	onData: MessageCallback;
// 	telemetryKeys: string[];
// };

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

//@ts-ignore
window.ux4iotState = state;

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

export function hasGrantForSubscription(
	subscriptionRequest: SubscriptionRequest
) {
	for (const grants of Object.values(state.grants)) {
		for (const g of grants) {
			const { deviceId, type, sessionId } = subscriptionRequest;
			if (g.deviceId !== deviceId || g.sessionId !== sessionId) {
				continue;
			}
			switch (type) {
				case 'connectionState':
					return g.grantType === 'subscribeToConnectionState';
				case 'deviceTwin':
					return g.grantType === 'subscribeToDeviceTwin';
				case 'd2cMessages':
					return g.grantType === 'subscribeToD2CMessages';
				case 'telemetry': {
					const { telemetryKey } = subscriptionRequest;
					return (
						g.grantType === 'subscribeToTelemetry' &&
						g.telemetryKey === telemetryKey
					);
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
		for (const { type, deviceId, onData } of subscriptions) {
			if (deviceId === message.deviceId) {
				switch (type) {
					case 'telemetry':
						isTelemetryMessage(message) &&
							onData(message.deviceId, message.telemetry, message.timestamp);
						break;
					case 'connectionState':
						isConnectionStateMessage(message) &&
							onData(message.deviceId, message.connectionState.connected);
						break;
					case 'd2cMessages':
						isD2CMessage(message) &&
							onData(message.deviceId, message.message, message.timestamp);
						break;
					case 'deviceTwin':
						isDeviceTwinMessage(message) &&
							onData(message.deviceId, message.deviceTwin);
						break;
				}
			}
		}
	}
}

export function cleanSubId(subscriptionId: string) {
	delete state.subscriptions[subscriptionId];
}
