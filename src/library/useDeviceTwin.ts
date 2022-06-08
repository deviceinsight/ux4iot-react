import { useCallback, useEffect, useRef, useState } from 'react';
import { DeviceTwinSubscription } from './data/DeviceTwinSubscription';
import {
	DeviceTwinCallback,
	GrantErrorCallback,
	SubscriptionErrorCallback,
} from './types';
import { TwinUpdate } from './ux4iot-shared';
import { useUx4iot } from './Ux4iotContext';

type HookOptions = {
	onData?: (twin: TwinUpdate) => void; // breaking Twin -> TwinUpdate
	onGrantError?: GrantErrorCallback;
	onSubscriptionError?: SubscriptionErrorCallback;
};

export const useDeviceTwin = (
	deviceId: string,
	options: HookOptions = {}
): TwinUpdate | undefined => {
	// breaking Twin -> TwinUpdate
	const { onData, onGrantError, onSubscriptionError } = options;
	const ux4iot = useUx4iot();
	const [subscription, setSubscription] = useState<DeviceTwinSubscription>();
	const onDataRef = useRef(onData);
	const onGrantErrorRef = useRef(onGrantError);
	const onSubscriptionErrorRef = useRef(onSubscriptionError);
	const [twin, setTwin] = useState<TwinUpdate>(); // breaking Twin -> TwinUpdate

	useEffect(() => {
		onDataRef.current = onData;
		onGrantErrorRef.current = onGrantError;
		onSubscriptionErrorRef.current = onSubscriptionError;
	}, [onData, onGrantError, onSubscriptionError]);

	const onDeviceTwin: DeviceTwinCallback = useCallback(
		(deviceId, deviceTwin) => {
			setTwin(deviceTwin);
			onDataRef.current && onDataRef.current(deviceTwin);
		},
		[setTwin]
	);

	useEffect(() => {
		const s = ux4iot.addDeviceTwinSubscription({
			deviceId,
			onDataCallback: onDeviceTwin,
			onGrantError: onGrantErrorRef.current,
			onSubscriptionError: onSubscriptionErrorRef.current,
		});
		setSubscription(s);
	}, [ux4iot, deviceId, onDeviceTwin]);

	useEffect(() => {
		return () => {
			ux4iot.removeGrantable(subscription);
		};
	}, [ux4iot, subscription]);

	return twin;
};
