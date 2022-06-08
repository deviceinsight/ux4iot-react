import { useCallback, useEffect, useRef, useState } from 'react';
import { useEffectDebugger } from '../useEffectDebugger';
import { TelemetrySubscription } from './data/TelemetrySubscription';
import {
	TelemetryCallback,
	GrantErrorCallback,
	SubscriptionErrorCallback,
} from './types';
import { useUx4iot } from './Ux4iotContext';

type DataCallback<T> = (data: T, timestamp: string | undefined) => void;

type HookOptions<T> = {
	onData?: DataCallback<T>;
	onGrantError?: GrantErrorCallback;
	onSubscriptionError?: SubscriptionErrorCallback;
};

export const useTelemetry = <T = any>(
	deviceId: string,
	telemetryKey: string,
	options: HookOptions<T> = {}
): T | undefined => {
	const { onData, onGrantError, onSubscriptionError } = options;
	const ux4iot = useUx4iot();
	const [subscription, setSubscription] = useState<TelemetrySubscription>();
	const onDataRef = useRef(onData);
	const onGrantErrorRef = useRef(onGrantError);
	const onSubscriptionErrorRef = useRef(onSubscriptionError);

	const [value, setValue] = useState<T>();

	useEffect(() => {
		onDataRef.current = onData;
		onGrantErrorRef.current = onGrantError;
		onSubscriptionErrorRef.current = onSubscriptionError;
	}, [onData, onGrantError, onSubscriptionError]);

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

	useEffectDebugger(() => {
		const s = ux4iot.addTelemetrySubscription({
			deviceId,
			telemetryKeys: [telemetryKey],
			onDataCallback: onTelemetry,
			onGrantError: onGrantErrorRef.current,
			onSubscriptionError: onSubscriptionErrorRef.current,
		});
		setSubscription(s);
	}, [ux4iot, deviceId, telemetryKey, onTelemetry]);

	useEffect(() => {
		return () => {
			ux4iot.removeGrantable(subscription);
		};
	}, [ux4iot, subscription]);

	return value;
};
