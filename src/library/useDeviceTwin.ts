import { useCallback, useEffect, useRef, useState } from 'react';
import {
	DeviceTwinCallback,
	GrantErrorCallback,
	SubscriptionErrorCallback,
} from './types';
import { useSubscription } from './useSubscription';
import { DeviceTwinSubscriptionRequest, TwinUpdate } from './ux4iot-shared';

type HookOptions = {
	onData?: DeviceTwinCallback;
	onGrantError?: GrantErrorCallback;
	onSubscriptionError?: SubscriptionErrorCallback;
};

export const useDeviceTwin = (
	deviceId: string, // breaking Twin -> TwinUpdate
	options: HookOptions = {}
): TwinUpdate | undefined => {
	const { onData } = options;
	const onDataRef = useRef(onData);
	const [twin, setTwin] = useState<TwinUpdate>(); // breaking Twin -> TwinUpdate

	useEffect(() => {
		onDataRef.current = onData;
	}, [onData]);

	const onDeviceTwin: DeviceTwinCallback = useCallback(
		(deviceId, deviceTwin, timestamp) => {
			setTwin(deviceTwin);
			onDataRef.current?.(deviceId, deviceTwin, timestamp);
		},
		[setTwin]
	);

	const subscriptionRequest = useCallback((): Omit<
		DeviceTwinSubscriptionRequest,
		'sessionId'
	> => {
		return { deviceId, type: 'deviceTwin' };
	}, [deviceId]);

	useSubscription(options, onDeviceTwin, subscriptionRequest);

	return twin;
};
