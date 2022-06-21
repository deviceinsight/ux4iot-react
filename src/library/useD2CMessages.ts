import { useCallback, useEffect, useRef, useState } from 'react';
import {
	D2CMessageCallback,
	GrantErrorCallback,
	SubscriptionErrorCallback,
} from './types';
import { useSubscription } from './useSubscription';
import { D2CMessageSubscriptionRequest } from './ux4iot-shared';

type HookOptions<T> = {
	onData?: (data: T, timestamp: string | undefined) => void;
	onGrantError?: GrantErrorCallback;
	onSubscriptionError?: SubscriptionErrorCallback;
};

export const useD2CMessages = <T>(
	deviceId: string,
	options: HookOptions<T> = {}
): T | undefined => {
	const { onData } = options;
	const onDataRef = useRef(onData);
	const [lastMessage, setLastMessage] = useState<T | undefined>();

	useEffect(() => {
		onDataRef.current = onData;
	}, [onData]);

	const onMessage: D2CMessageCallback = useCallback(
		(deviceId: string, message: unknown, timestamp: string | undefined) => {
			setLastMessage(message as T);
			onDataRef.current && onDataRef.current(message as T, timestamp);
		},
		[setLastMessage]
	);

	const subscriptionRequest = useCallback((): Omit<
		D2CMessageSubscriptionRequest,
		'sessionId'
	> => {
		return { deviceId, type: 'd2cMessages' };
	}, [deviceId]);

	useSubscription(options, onMessage, subscriptionRequest);

	return lastMessage;
};
