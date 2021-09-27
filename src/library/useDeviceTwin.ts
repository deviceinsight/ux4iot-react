import { Twin } from 'azure-iothub';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { DeviceTwinCallback, GrantErrorCallback } from './types';
import { Ux4iotContext } from './Ux4iotContext';

type HookOptions = {
	onData?: (twin: Twin) => void;
	onGrantError?: GrantErrorCallback;
};

export const useDeviceTwin = (
	deviceId: string,
	options: HookOptions = {}
): Twin | undefined => {
	const { onData, onGrantError } = options;
	const ux4iot = useContext(Ux4iotContext);
	const [twin, setTwin] = useState<Twin>();
	const subscriberIdRef = useRef(uuidv4());
	const onDataRef = useRef(onData);
	const onGrantErrorRef = useRef(onGrantError);

	useEffect(() => {
		onDataRef.current = onData;
		onGrantErrorRef.current = onGrantError;
	}, [onData, onGrantError]);

	const onDeviceTwin: DeviceTwinCallback = useCallback(
		(deviceId, deviceTwin) => {
			setTwin(deviceTwin);
			onDataRef.current && onDataRef.current(deviceTwin);
		},
		[setTwin]
	);

	useEffect(() => {
		const id = subscriberIdRef.current;
		ux4iot?.registerDeviceTwinSubscriber(
			id,
			deviceId,
			onDeviceTwin,
			onGrantErrorRef.current
		);

		return () => {
			ux4iot?.unregisterDeviceTwinSubscriber(id, deviceId);
		};
	}, [deviceId, onDeviceTwin, ux4iot]);

	useEffect(() => {
		const ux4iotInstance = ux4iot;
		const id = subscriberIdRef.current;
		return () => {
			ux4iotInstance?.cleanupSubscriberId(id);
		};
	}, [ux4iot]);

	return twin;
};
