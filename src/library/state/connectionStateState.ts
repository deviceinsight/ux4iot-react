import { Reducer } from 'react';

export type ConnectionStateState = Record<string, boolean>;

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
	connectionState: boolean;
};

export type ConnectionStateAction = ADD_DATA_ACTION;

export const connectionStateReducer: Reducer<
	ConnectionStateState,
	ConnectionStateAction
> = (state, action) => {
	switch (action.type) {
		case 'ADD_DATA': {
			const { deviceId, connectionState } = action;
			return { ...state, [deviceId]: connectionState };
		}
		default:
			return state;
	}
};
