import { useCallback, useEffect, useRef, useState } from 'react';
import { ConnectionStateSubscription } from './data/ConnectionStateSubscription';
import {
	ConnectionStateCallback,
	GrantErrorCallback,
	SubscriptionErrorCallback,
} from './types';
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
	const { onData, onGrantError, onSubscriptionError } = options;
	const ux4iot = useUx4iot();
	const [subscription, setSubscription] =
		useState<ConnectionStateSubscription>();
	const [connectionState, setConnectionState] = useState<boolean>();
	const onDataRef = useRef(onData);
	const onGrantErrorRef = useRef(onGrantError);
	const onSubscriptionErrorRef = useRef(onSubscriptionError);

	useEffect(() => {
		onDataRef.current = onData;
		onGrantErrorRef.current = onGrantError;
		onSubscriptionErrorRef.current = onSubscriptionError;
	}, [onData, onGrantError, onSubscriptionError]);

	const onConnectionState: ConnectionStateCallback = useCallback(
		(deviceId, state) => {
			setConnectionState(state);
			onDataRef.current && onDataRef.current(state);
		},
		[setConnectionState]
	);

	useEffect(() => {
		const s = ux4iot.addConnectionStateSubscription({
			deviceId,
			onDataCallback: onConnectionState,
			onGrantError: onGrantErrorRef.current,
			onSubscriptionError: onSubscriptionErrorRef.current,
		});
		setSubscription(s);
	}, [ux4iot, deviceId, onConnectionState]);

	useEffect(() => {
		return () => {
			ux4iot.removeGrantable(subscription);
		};
	}, [ux4iot, subscription]);

	return connectionState;
};
