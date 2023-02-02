import { useCallback, useEffect, useRef, useState } from 'react';
import {
	ConnectionStateCallback,
	GrantErrorCallback,
	SubscriptionErrorCallback,
} from './base/types';
import { useSubscription } from './useSubscription';
import { ConnectionStateSubscriptionRequest } from './base/ux4iot-shared';

type HookOptions = {
	onData?: ConnectionStateCallback; // BREAKING
	onGrantError?: GrantErrorCallback;
	onSubscriptionError?: SubscriptionErrorCallback;
};

export const useConnectionState = (
	deviceId: string,
	options: HookOptions = {}
): boolean | undefined => {
	const { onData } = options;
	const onDataRef = useRef(onData);
	const [connectionState, setConnectionState] = useState<boolean>();

	useEffect(() => {
		onDataRef.current = onData;
	}, [onData]);

	const onConnectionState: ConnectionStateCallback = useCallback(
		(deviceId, connectionState, timestamp) => {
			if (connectionState !== undefined) {
				setConnectionState(connectionState);
				onDataRef.current?.(deviceId, connectionState, timestamp);
			}
		},
		[setConnectionState]
	);

	const subscriptionRequest = useCallback(
		(sessionId: string): ConnectionStateSubscriptionRequest => {
			return { deviceId, type: 'connectionState', sessionId };
		},
		[deviceId]
	);

	useSubscription(options, onConnectionState, subscriptionRequest);

	return connectionState;
};
