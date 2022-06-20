import { Reducer } from 'react';

export type TelemetryValue = {
	value: unknown;
	timestamp: string | undefined;
};
export type TelemetryState = Record<string, Record<string, TelemetryValue>>;

/*
{ 
  deviceId1: {
    pressure: {
      value: 123,
      timestamp: Date
    }
  }
  deviceId2: {
    pressure: {
      value: 123,
      timestamp: Date
    }
  }
}
*/

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
				nextDeviceState[telemetryKey] = {
					value: telemetryValue,
					timestamp,
				};
			}

			return { ...state, [deviceId]: nextDeviceState };
		}
		default:
			return state;
	}
};
