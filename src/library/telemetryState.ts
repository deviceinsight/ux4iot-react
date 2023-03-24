import { Reducer } from 'react';
import { CachedValueType } from './base/ux4iot-shared';

type DeviceId = string;
type TelemetryKey = string;
export type TelemetryValue = {
	value: CachedValueType;
	timestamp: string | undefined;
};
export type TelemetryState = Record<
	DeviceId,
	Record<TelemetryKey, TelemetryValue>
>;

export type ADD_DATA_ACTION = {
	type: 'ADD_DATA';
	deviceId: string;
	message: Record<string, any>;
	timestamp?: string;
};

export type TelemetryAction = ADD_DATA_ACTION;

export const telemetryReducer: Reducer<TelemetryState, TelemetryAction> = (
	state,
	action
) => {
	switch (action.type) {
		case 'ADD_DATA': {
			const { deviceId, message, timestamp } = action;
			const nextDeviceState = { ...state[deviceId] };

			for (const [telemetryKey, telemetryValue] of Object.entries(message)) {
				nextDeviceState[telemetryKey] = telemetryValue
					? { value: telemetryValue.value, timestamp: telemetryValue.timestamp }
					: { value: telemetryValue, timestamp };
			}

			return { ...state, [deviceId]: nextDeviceState };
		}
		default:
			return state;
	}
};
