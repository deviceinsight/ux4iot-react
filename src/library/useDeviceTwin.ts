import { useCallback, useEffect, useRef, useState } from 'react';
import {
	DeviceTwinCallback,
	GrantErrorCallback,
	SubscriptionErrorCallback,
} from './base/types';
import { useSubscription } from './useSubscription';
import {
	DeviceTwinSubscriptionRequest,
	TwinUpdate,
} from './base/ux4iot-shared';

type HookOptions = {
	onData?: DeviceTwinCallback; // BREAKING
	onGrantError?: GrantErrorCallback;
	onSubscriptionError?: SubscriptionErrorCallback;
};

export const useDeviceTwin = (
	deviceId: string,
	options: HookOptions = {}
): TwinUpdate | undefined => {
	const { onData } = options;
	const onDataRef = useRef(onData);
	const [twin, setTwin] = useState<TwinUpdate>(); // BREAKING

	useEffect(() => {
		onDataRef.current = onData;
	}, [onData]);

	const onDeviceTwin: DeviceTwinCallback = useCallback(
		(deviceId, deviceTwin, timestamp) => {
			if (deviceTwin) {
				setTwin(deviceTwin);
				onDataRef.current?.(deviceId, deviceTwin, timestamp);
			}
		},
		[setTwin]
	);

	const subscriptionRequest = useCallback(
		(sessionId: string): DeviceTwinSubscriptionRequest => {
			return { deviceId, type: 'deviceTwin', sessionId };
		},
		[deviceId]
	);

	useSubscription(options, onDeviceTwin, subscriptionRequest);

	return twin;
};
