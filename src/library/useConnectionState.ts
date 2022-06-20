import { useCallback, useEffect, useRef, useState } from 'react';
import { v4 as uuid } from 'uuid';
import {
	ConnectionStateCallback,
	GrantErrorCallback,
	SubscriptionErrorCallback,
} from './types';
import { useSubscription } from './useSubscription';
import { ConnectionStateSubscriptionRequest } from './ux4iot-shared';
import { useUx4iot } from './Ux4iotContext';

type HookOptions = {
	onData?: (connectionState: boolean) => void;
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
		(deviceId, state) => {
			setConnectionState(state);
			onDataRef.current && onDataRef.current(state);
		},
		[setConnectionState]
	);

	const subscriptionRequest =
		useCallback((): ConnectionStateSubscriptionRequest => {
			return {
				deviceId,
				type: 'connectionState',
			} as ConnectionStateSubscriptionRequest;
		}, [deviceId]);

	useSubscription(options, onConnectionState, subscriptionRequest);
	// useEffect(() => {
	// 	const s = ux4iot.addConnectionStateSubscription({
	// 		deviceId,
	// 		onDataCallback: onConnectionState,
	// 		onGrantError: onGrantErrorRef.current,
	// 		onSubscriptionError: onSubscriptionErrorRef.current,
	// 	});
	// 	setSubscription(s);
	// }, [ux4iot, deviceId, onConnectionState]);

	// useEffect(() => {
	// 	return () => {
	// 		ux4iot.removeGrantable(subscription);
	// 	};
	// }, [ux4iot, subscription]);
	// useEffect(() => {
	// 	if (ux4iot.sessionId) {
	// 		ux4iot.subscribe(
	// 			subscriptionId.current,
	// 			{ deviceId, type: 'connectionState' },
	// 			onConnectionState,
	// 			onSubscriptionErrorRef.current,
	// 			onGrantErrorRef.current
	// 		);
	// 	}
	// 	return () => {
	// 		const subId = subscriptionId;
	// 		ux4iot.unsubscribe(
	// 			subId.current,
	// 			{ deviceId, type: 'connectionState' },
	// 			onSubscriptionErrorRef.current,
	// 			onGrantErrorRef.current
	// 		);
	// 	};
	// }, [deviceId, onConnectionState, ux4iot]);
	return connectionState;
};
