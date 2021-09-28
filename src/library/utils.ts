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
