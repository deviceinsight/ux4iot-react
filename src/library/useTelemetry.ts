import { useCallback, useEffect, useRef, useState } from 'react';
import { useEffectDebugger } from '../useEffectDebugger';
import {
	TelemetryCallback,
	GrantErrorCallback,
	SubscriptionErrorCallback,
} from './types';
import { TelemetrySubscriptionRequest } from './ux4iot-shared';
import { useSubscription } from './useSubscription';

type HookOptions<T> = {
	onData?: (data: T, timestamp: string | undefined) => void;
	onGrantError?: GrantErrorCallback;
	onSubscriptionError?: SubscriptionErrorCallback;
};

export const useTelemetry = <T = any>(
	deviceId: string,
	telemetryKey: string,
	options: HookOptions<T> = {}
): T | undefined => {
	const onDataRef = useRef(options.onData);
	const [value, setValue] = useState<T>();

	useEffect(() => {
		onDataRef.current = options.onData;
	}, [options.onData]);

	const onTelemetry: TelemetryCallback = useCallback(
		(
			deviceId: string,
			message: Record<string, unknown>,
			timestamp: string | undefined
		) => {
			const maybeValue = message[telemetryKey];
			if (maybeValue !== undefined) {
				setValue(maybeValue as T);
				onDataRef.current && onDataRef.current(maybeValue as T, timestamp);
			}
		},
		[telemetryKey]
	);

	const subscriptionRequest = useCallback((): TelemetrySubscriptionRequest => {
		return {
			deviceId,
			telemetryKey,
			type: 'telemetry',
		} as TelemetrySubscriptionRequest;
	}, [deviceId, telemetryKey]);

	useSubscription(options, onTelemetry, subscriptionRequest);

	// useEffect(() => {
	// 	onDataRef.current = onData;
	// 	onGrantErrorRef.current = onGrantError;
	// 	onSubscriptionErrorRef.current = onSubscriptionError;
	// }, [onData, onGrantError, onSubscriptionError]);

	// useEffect(() => {
	// 	const subReq = {
	// 		deviceId,
	// 		telemetryKey,
	// 		sessionId,
	// 		type: 'telemetry',
	// 	} as SubscriptionRequest;
	// 	async function sub() {
	// 		await ux4iot.subscribe(
	// 			subscriptionId.current,
	// 			subReq,
	// 			onTelemetry,
	// 			onSubscriptionErrorRef.current,
	// 			onGrantErrorRef.current
	// 		);
	// 	}
	// 	sub();
	// 	const subId = subscriptionId.current;
	// 	console.log('useTelemetry subscribe', ux4iot.sessionId);
	// 	return () => {
	// 		console.log('useTelemetry  unsubscribe', ux4iot.sessionId);
	// 		async function unsub() {
	// 			await ux4iot.unsubscribe(
	// 				subId,
	// 				subReq,
	// 				onSubscriptionErrorRef.current,
	// 				onGrantErrorRef.current
	// 			);
	// 		}
	// 		unsub();
	// 	};
	// }, [ux4iot, sessionId, deviceId, telemetryKey, onTelemetry]);

	// useEffect(() => {
	// 	// subscriberId: string,
	// 	// subscriptionRequest: SubscriptionRequest,
	// 	// onSubscriptionError: SubscriptionErrorCallback,
	// 	// onGrantError: GrantErrorCallback
	// }, [sessionId]);

	return value;
};
