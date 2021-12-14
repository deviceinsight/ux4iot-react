import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { GrantErrorCallback, RawD2CMessageCallback } from './types';
import { Ux4iotContext } from './Ux4iotContext';

type DataCallback<T> = (data: T, timestamp: string | undefined) => void;

export const useD2CMessages = <T>(
	deviceId: string,
	options: {
		onData?: DataCallback<T>;
		onGrantError?: GrantErrorCallback;
	} = {}
): T | undefined => {
	const { onData, onGrantError } = options;
	const subscriberIdRef = useRef(uuidv4());
	const ux4iot = useContext(Ux4iotContext);
	const [lastMessage, setLastMessage] = useState<T | undefined>();
	const onDataRef = useRef(onData);
	const onGrantErrorRef = useRef(onGrantError);

	useEffect(() => {
		onDataRef.current = onData;
		onGrantErrorRef.current = onGrantError;
	}, [onData, onGrantError]);

	const onMessage: RawD2CMessageCallback = useCallback(
		(deviceId: string, message: unknown, timestamp: string | undefined) => {
			setLastMessage(message as T);
			onDataRef.current && onDataRef.current(message as T, timestamp);
		},
		[]
	);

	useEffect(() => {
		ux4iot?.registerRawD2CMessageSubscriber(
			subscriberIdRef.current,
			deviceId,
			onMessage,
			onGrantErrorRef.current
		);
	}, [ux4iot, deviceId, onMessage]);

	useEffect(() => {
		const ux4iotInstance = ux4iot;
		const id = subscriberIdRef.current;
		return () => {
			ux4iotInstance?.cleanupSubscriberId(id);
		};
	}, [ux4iot]);

	return lastMessage;
};
