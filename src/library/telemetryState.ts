import { Reducer } from 'react';

export type TelemetryState = Record<string, Record<string, unknown>>;

export type ADD_DATA_ACTION = {
	type: 'ADD_DATA';
	deviceId: string;
	telemetryKey: string;
	telemetryValue: unknown;
	timestamp: Date | null;
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
