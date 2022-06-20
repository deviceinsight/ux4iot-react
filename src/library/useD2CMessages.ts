import { useCallback, useEffect, useRef, useState } from 'react';
import {
	D2CMessageCallback,
	GrantErrorCallback,
	SubscriptionErrorCallback,
} from './types';
import { useSubscription } from './useSubscription';
import { RawD2CMessageSubscriptionRequest } from './ux4iot-shared';

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

	const subscriptionRequest =
		useCallback((): RawD2CMessageSubscriptionRequest => {
			return {
				deviceId,
				type: 'd2cMessages',
			} as RawD2CMessageSubscriptionRequest;
		}, [deviceId]);

	useSubscription(options, onMessage, subscriptionRequest);

	// useEffect(() => {
	// 	const s = ux4iot.addD2CMessageSubscription({
	// 		deviceId,
	// 		onDataCallback: onMessage,
	// 		onGrantError: onGrantErrorRef.current,
	// 		onSubscriptionError: onSubscriptionErrorRef.current,
	// 	});
	// 	setSubscription(s);
	// }, [ux4iot, deviceId, onMessage]);

	// useEffect(() => {
	// 	return () => {
	// 		ux4iot.removeGrantable(subscription);
	// 	};
	// }, [ux4iot, subscription]);
	// useEffect(() => {
	// 	ux4iot.subscribe(
	// 		subscriptionId.current,
	// 		{ deviceId, type: 'd2cMessages' },
	// 		onMessage,
	// 		onSubscriptionErrorRef.current,
	// 		onGrantErrorRef.current
	// 	);
	// 	return () => {
	// 		const subId = subscriptionId;
	// 		ux4iot.unsubscribe(
	// 			subId.current,
	// 			{ deviceId, type: 'd2cMessages' },
	// 			onSubscriptionErrorRef.current,
	// 			onGrantErrorRef.current
	// 		);
	// 	};
	// }, [deviceId, onMessage, ux4iot]);

	return lastMessage;
};
