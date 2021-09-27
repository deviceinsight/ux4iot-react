import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ConnectionStateCallback, GrantErrorCallback } from './types';
import { Ux4iotContext } from './Ux4iotContext';

type HookOptions = {
	onData?: (connectionState: boolean) => void;
	onGrantError?: GrantErrorCallback;
};

export const useConnectionState = (
	deviceId: string,
	options: HookOptions = {}
): boolean | undefined => {
	const { onData, onGrantError } = options;
	const ux4iot = useContext(Ux4iotContext);
	const [connectionState, setConnectionState] = useState<boolean>();
	const subscriberIdRef = useRef(uuidv4());
	const onDataRef = useRef(onData);
	const onGrantErrorRef = useRef(onGrantError);

	useEffect(() => {
		onDataRef.current = onData;
		onGrantErrorRef.current = onGrantError;
	}, [onData, onGrantError]);

	const onConnectionState: ConnectionStateCallback = useCallback(
		(deviceId, state) => {
			setConnectionState(state);
			onDataRef.current && onDataRef.current(state);
		},
		[setConnectionState]
	);

	useEffect(() => {
		const id = subscriberIdRef.current;
		ux4iot?.registerConnectionStateSubscriber(
			id,
			deviceId,
			onConnectionState,
			onGrantErrorRef.current
		);

		return () => {
			ux4iot?.unregisterConnectionStateSubscriber(id, deviceId);
		};
	}, [deviceId, onConnectionState, ux4iot]);

	useEffect(() => {
		const ux4iotInstance = ux4iot;
		const id = subscriberIdRef.current;

		return () => {
			ux4iotInstance?.cleanupSubscriberId(id);
		};
	}, [ux4iot]);

	return connectionState;
};
