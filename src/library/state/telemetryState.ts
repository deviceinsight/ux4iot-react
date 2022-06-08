import { Reducer } from 'react';

export type TelemetryValue = {
	value: unknown;
	timestamp: string | undefined;
};
export type TelemetryState = Record<string, Record<string, TelemetryValue>>;

export type ADD_DATA_ACTION = {
	type: 'ADD_DATA';
	deviceId: string;
	telemetryKey: string;
	telemetryValue: unknown;
	timestamp?: string;
};

export type TelemetryAction = ADD_DATA_ACTION;

export const telemetryReducer: Reducer<TelemetryState, TelemetryAction> = (
	state,
	action
) => {
	switch (action.type) {
		case 'ADD_DATA': {
			const { telemetryKey, telemetryValue, deviceId, timestamp } = action;
			const nextState = {
				...state,
				[deviceId]: {
					...state[deviceId],
					[telemetryKey]: {
						value: telemetryValue,
						timestamp,
					},
				},
			};
			return nextState;
		}
		default:
			return state;
	}
};
