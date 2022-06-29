import { useCallback, useEffect, useRef, useState } from 'react';
import {
	D2CMessageCallback,
	GrantErrorCallback,
	SubscriptionErrorCallback,
} from './types';
import { useSubscription } from './useSubscription';
import { D2CMessageSubscriptionRequest } from './ux4iot-shared';

type HookOptions = {
	onData?: D2CMessageCallback; // BREAKING
	onGrantError?: GrantErrorCallback;
	onSubscriptionError?: SubscriptionErrorCallback;
};

export const useD2CMessages = <T extends Record<string, unknown>>(
	deviceId: string,
	options: HookOptions = {}
): T | undefined => {
	const { onData } = options;
	const onDataRef = useRef(onData);
	const [lastMessage, setLastMessage] = useState<T | undefined>();

	useEffect(() => {
		onDataRef.current = onData;
	}, [onData]);

	const onMessage: D2CMessageCallback = useCallback(
		(deviceId: string, message: T, timestamp: string | undefined) => {
			setLastMessage(message);
			onDataRef.current?.(deviceId, message, timestamp);
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
