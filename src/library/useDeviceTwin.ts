import { useCallback, useEffect, useRef, useState } from 'react';
import {
	DeviceTwinCallback,
	GrantErrorCallback,
	SubscriptionErrorCallback,
} from './types';
import { useSubscription } from './useSubscription';
import { DeviceTwinSubscriptionRequest, TwinUpdate } from './ux4iot-shared';
import { useUx4iot } from './Ux4iotContext';

type HookOptions = {
	onData?: (twin: TwinUpdate) => void; // breaking Twin -> TwinUpdate
	onGrantError?: GrantErrorCallback;
	onSubscriptionError?: SubscriptionErrorCallback;
};

export const useDeviceTwin = (
	deviceId: string, // breaking Twin -> TwinUpdate
	options: HookOptions = {}
): TwinUpdate | undefined => {
	const { onData } = options;
	const { ux4iot } = useUx4iot();
	const onDataRef = useRef(onData);
	const [twin, setTwin] = useState<TwinUpdate>(); // breaking Twin -> TwinUpdate

	useEffect(() => {
		onDataRef.current = onData;
	}, [onData]);

	const onDeviceTwin: DeviceTwinCallback = useCallback(
		(deviceId, deviceTwin) => {
			setTwin(deviceTwin);
			onDataRef.current && onDataRef.current(deviceTwin);
		},
		[setTwin]
	);

	const subscriptionRequest = useCallback((): Omit<
		DeviceTwinSubscriptionRequest,
		'sessionId'
	> => {
		return { deviceId, type: 'deviceTwin' };
	}, [deviceId]);

	const getLast = async () => {
		const twin = await ux4iot.api.getLastDeviceTwin(deviceId);
		setTwin(twin);
	};

	useSubscription(options, onDeviceTwin, subscriptionRequest);

	return twin;
};
