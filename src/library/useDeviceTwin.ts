import { useCallback, useEffect, useRef, useState } from 'react';
import { v4 as uuid } from 'uuid';
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
	deviceId: string,
	options: HookOptions = {}
): TwinUpdate | undefined => {
	// breaking Twin -> TwinUpdate
	const onDataRef = useRef(options.onData);
	const [twin, setTwin] = useState<TwinUpdate>(); // breaking Twin -> TwinUpdate

	useEffect(() => {
		onDataRef.current = options.onData;
	}, [options.onData]);

	const onDeviceTwin: DeviceTwinCallback = useCallback(
		(deviceId, deviceTwin) => {
			setTwin(deviceTwin);
			onDataRef.current && onDataRef.current(deviceTwin);
		},
		[setTwin]
	);

	const subscriptionRequest = useCallback((): DeviceTwinSubscriptionRequest => {
		return {
			deviceId,
			type: 'deviceTwin',
		} as DeviceTwinSubscriptionRequest;
	}, [deviceId]);

	useSubscription(options, onDeviceTwin, subscriptionRequest);

	// useEffect(() => {
	// 	const s = ux4iot.addDeviceTwinSubscription({
	// 		deviceId,
	// 		onDataCallback: onDeviceTwin,
	// 		onGrantError: onGrantErrorRef.current,
	// 		onSubscriptionError: onSubscriptionErrorRef.current,
	// 	});
	// 	setSubscription(s);
	// }, [ux4iot, deviceId, onDeviceTwin]);

	// useEffect(() => {
	// 	return () => {
	// 		ux4iot.removeGrantable(subscription);
	// 	};
	// }, [ux4iot, subscription]);

	// useEffect(() => {
	// 	ux4iot.subscribe(
	// 		subscriptionId.current,
	// 		{ deviceId, type: 'deviceTwin' },
	// 		onDeviceTwin,
	// 		onSubscriptionErrorRef.current,
	// 		onGrantErrorRef.current
	// 	);
	// 	return () => {
	// 		const subId = subscriptionId;
	// 		ux4iot.unsubscribe(
	// 			subId.current,
	// 			{ deviceId, type: 'deviceTwin' },
	// 			onSubscriptionErrorRef.current,
	// 			onGrantErrorRef.current
	// 		);
	// 	};
	// }, [deviceId, onDeviceTwin, ux4iot]);

	return twin;
};
