import { useCallback, useEffect, useRef, useState } from 'react';
import {
	ConnectionStateCallback,
	GrantErrorCallback,
	SubscriptionErrorCallback,
} from './types';
import { useSubscription } from './useSubscription';
import { ConnectionStateSubscriptionRequest } from './ux4iot-shared';

type HookOptions = {
	onData?: ConnectionStateCallback;
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
		(deviceId, state, timestamp) => {
			setConnectionState(state);
			onDataRef.current?.(deviceId, state, timestamp);
		},
		[setConnectionState]
	);

	const subscriptionRequest = useCallback((): Omit<
		ConnectionStateSubscriptionRequest,
		'sessionId'
	> => {
		return { deviceId, type: 'connectionState' };
	}, [deviceId]);

	useSubscription(options, onConnectionState, subscriptionRequest);

	return connectionState;
};
