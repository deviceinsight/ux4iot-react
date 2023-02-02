import { useCallback, useEffect, useRef, useState } from 'react';
import {
	TelemetryCallback,
	GrantErrorCallback,
	SubscriptionErrorCallback,
	MessageCallbackBase,
} from './base/types';
import { TelemetrySubscriptionRequest } from './base/ux4iot-shared';
import { useSubscription } from './useSubscription';

type HookOptions<T> = {
	onData?: MessageCallbackBase<T>;
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
		(deviceId, message, timestamp) => {
			const maybeValue = message?.[telemetryKey];
			if (maybeValue !== undefined) {
				setValue(maybeValue as T);
				onDataRef.current?.(deviceId, maybeValue as T, timestamp);
			}
		},
		[telemetryKey]
	);

	const subscriptionRequest = useCallback(
		(sessionId: string): TelemetrySubscriptionRequest => {
			return { deviceId, telemetryKey, type: 'telemetry', sessionId };
		},
		[deviceId, telemetryKey]
	);

	useSubscription(options, onTelemetry, subscriptionRequest);

	return value;
};
