import { Reducer } from 'react';

export type TelemetryState = Record<string, Record<string, unknown>>;

export type ADD_DATA_ACTION = {
	type: 'ADD_DATA';
	deviceId: string;
	telemetryKey: string;
	telemetryValue: unknown;
};

export type TelemetryAction = ADD_DATA_ACTION;

export const telemetryReducer: Reducer<TelemetryState, TelemetryAction> = (
	state,
	action
) => {
	switch (action.type) {
		case 'ADD_DATA': {
			const { telemetryKey, telemetryValue, deviceId } = action;
			const nextState = {
				...state,
				[deviceId]: {
					...state[deviceId],
					[telemetryKey]: telemetryValue,
				},
			};
			return nextState;
		}
		default:
			return state;
	}
};
