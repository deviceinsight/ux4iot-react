import { useCallback, useEffect, useRef, useState } from 'react';
import { D2CMessageSubscription } from './data/D2CMessageSubscription';
import {
	D2CMessageCallback,
	GrantErrorCallback,
	SubscriptionErrorCallback,
} from './types';
import { useUx4iot } from './Ux4iotContext';

type HookOptions<T> = {
	onData?: (data: T, timestamp: string | undefined) => void;
	onGrantError?: GrantErrorCallback;
	onSubscriptionError?: SubscriptionErrorCallback;
};

export const useD2CMessages = <T>(
	deviceId: string,
	options: HookOptions<T> = {}
): T | undefined => {
	const { onData, onGrantError, onSubscriptionError } = options;
	const ux4iot = useUx4iot();
	const [subscription, setSubscription] = useState<D2CMessageSubscription>();
	const [lastMessage, setLastMessage] = useState<T | undefined>();
	const onDataRef = useRef(onData);
	const onGrantErrorRef = useRef(onGrantError);
	const onSubscriptionErrorRef = useRef(onSubscriptionError);

	useEffect(() => {
		onDataRef.current = onData;
		onGrantErrorRef.current = onGrantError;
		onSubscriptionErrorRef.current = onSubscriptionError;
	}, [onData, onGrantError, onSubscriptionError]);

	const onMessage: D2CMessageCallback = useCallback(
		(deviceId: string, message: unknown, timestamp: string | undefined) => {
			setLastMessage(message as T);
			onDataRef.current && onDataRef.current(message as T, timestamp);
		},
		[setLastMessage]
	);

	useEffect(() => {
		const s = ux4iot.addD2CMessageSubscription({
			deviceId,
			onDataCallback: onMessage,
			onGrantError: onGrantErrorRef.current,
			onSubscriptionError: onSubscriptionErrorRef.current,
		});
		setSubscription(s);
	}, [ux4iot, deviceId, onMessage]);

	useEffect(() => {
		return () => {
			ux4iot.removeGrantable(subscription);
		};
	}, [ux4iot, subscription]);

	return lastMessage;
};
