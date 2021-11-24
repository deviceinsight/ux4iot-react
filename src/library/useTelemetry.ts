import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { TelemetryCallback, GrantErrorCallback } from './types';
import { Ux4iotContext } from './Ux4iotContext';

type HookOptions = {
	onData?: (data: unknown) => void;
	onGrantError?: GrantErrorCallback;
};

export const useTelemetry = <T = any>(
	deviceId: string,
	telemetryKey: string,
	options: HookOptions = {}
): T | undefined => {
	const { onData, onGrantError } = options;
	const ux4iot = useContext(Ux4iotContext);
	const [value, setValue] = useState<T>();
	const subscriberIdRef = useRef(uuidv4());
	const onDataRef = useRef(onData);
	const onGrantErrorRef = useRef(onGrantError);

	useEffect(() => {
		onDataRef.current = onData;
		onGrantErrorRef.current = onGrantError;
	}, [onData, onGrantError]);

	const onTelemetry: TelemetryCallback = useCallback(
		(deviceId: string, message: Record<string, unknown>) => {
			const maybeValue = message[telemetryKey];
			if (maybeValue) {
				setValue(maybeValue as T);
				onDataRef.current && onDataRef.current(maybeValue);
			}
		},
		[telemetryKey]
	);

	useEffect(() => {
		ux4iot?.registerTelemetrySubscriber(
			subscriberIdRef.current,
			deviceId,
			telemetryKey,
			onTelemetry,
			onGrantErrorRef.current
		);
	}, [ux4iot, deviceId, telemetryKey, onTelemetry]);

	useEffect(() => {
		const ux4iotInstance = ux4iot;
		const id = subscriberIdRef.current;
		return () => {
			ux4iotInstance?.cleanupSubscriberId(id);
		};
	}, [ux4iot]);

	return value;
};
