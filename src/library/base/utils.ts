import {
	ConnectionStateMessage,
	DeviceTwinMessage,
	TelemetryMessage,
	D2CMessage,
	GrantRequest,
	SubscriptionRequest,
	TelemetryGrantRequest,
} from '../ux4iot-shared';

const DELIMITER = '___';

export function makeSubKey(...args: unknown[]): string {
	return args.filter(arg => !!arg).join(DELIMITER);
}

export function parseSubKey(subscriberKey: string): Record<string, string> {
	const [subscriberId, deviceId, telemetryKey] = subscriberKey.split(DELIMITER);

	return { subscriberId, deviceId, telemetryKey };
}

export function deserializeTelemetrySubscriberState(
	subscriberId: string,
	state: Record<string, any>
): Record<string, string[]> {
	return Object.keys(state).reduce<Record<string, string[]>>((obj, key) => {
		const { subscriberId: id, deviceId, telemetryKey } = parseSubKey(key);
		if (subscriberId === id) {
			if (obj[deviceId]) {
				obj[deviceId].push(telemetryKey);
			} else {
				obj[deviceId] = [telemetryKey];
			}
		}
		return obj;
	}, {});
}

export function deserializeSubscriberState(
	subscriberId: string,
	state: Record<string, any>
): string[] {
	return Object.keys(state).reduce<string[]>((deviceIds, key) => {
		const { subscriberId: id, deviceId } = parseSubKey(key);
		if (subscriberId === id) {
			deviceIds.push(deviceId);
		}
		return deviceIds;
	}, []);
}

export function cleanSubId<T extends Record<string, any>>(
	id: string,
	subscribers: T
): T {
	return Object.keys(subscribers).reduce<T>((nextSubs, subKey) => {
		const { subscriberId } = parseSubKey(subKey);
		if (subscriberId !== id) {
			nextSubs[subKey as keyof T] = subscribers[subKey];
		}
		return nextSubs;
	}, {} as T);
}

export function printDevModeWarning(): void {
	console.log(
		`%c
 _____________________________________________________
|                                                     |
|                     Warning                         |
|  You are using ux4iot-react in Development mode.    |
|                                                     |
|  Don't use this in production, follow the link for  |
|  more information: https://bit.ly/3igAntF           |
|_____________________________________________________|
	`,
		'color: red; font-weight: bold; font-size: 14px;'
	);
}

export function isConnectionStateMessage(
	message: Record<string, unknown>
): message is ConnectionStateMessage {
	return !!message.connectionState;
}

export function isD2CMessage(
	message: Record<string, unknown>
): message is D2CMessage {
	return !!message.message;
}

export function isDeviceTwinMessage(
	message: Record<string, unknown>
): message is DeviceTwinMessage {
	return !!message.deviceTwin;
}

export function isTelemetryMessage(
	message: Record<string, unknown>
): message is TelemetryMessage {
	return !!message.telemetry;
}

export function grantRequestsEqual(g1: GrantRequest, g2: GrantRequest) {
	if (g1.type === g2.type && g1.sessionId === g2.sessionId) {
		switch (g1.type) {
			case 'desiredProperties':
			case 'deviceTwin':
			case 'connectionState':
			case 'd2cMessages':
				return g1.deviceId === g2.deviceId;
			case 'directMethod':
				return (
					g1.deviceId === g2.deviceId &&
					g1.directMethodName === (g2 as typeof g1).directMethodName
				);
			case 'telemetry':
				return (
					g1.deviceId === g2.deviceId &&
					g1.telemetryKey === (g2 as typeof g1).telemetryKey
				);
			default:
				return false;
		}
	}
	return false;
}

export function getGrantFromSubscriptionRequest(
	request: SubscriptionRequest
): GrantRequest {
	const { type, sessionId, deviceId } = request;
	const grantRequest: GrantRequest = { sessionId, deviceId, type };
	switch (type) {
		case 'connectionState':
		case 'deviceTwin':
		case 'd2cMessages':
			return grantRequest;
		case 'telemetry': {
			const { telemetryKey } = request;
			return { ...grantRequest, telemetryKey } as TelemetryGrantRequest;
		}
		default:
			throw Error('No such grantType for subscriptionType');
	}
}
