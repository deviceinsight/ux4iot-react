import { useCallback, useEffect, useRef, useState } from 'react';
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

	const subscriptionRequest = useCallback((): Omit<
		TelemetrySubscriptionRequest,
		'sessionId'
	> => {
		return { deviceId, telemetryKey, type: 'telemetry' };
	}, [deviceId, telemetryKey]);

	useSubscription(options, onTelemetry, subscriptionRequest);

	return value;
};
