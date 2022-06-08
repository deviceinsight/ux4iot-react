import { useCallback, useEffect, useRef, useState } from 'react';
import { useUx4iot } from './Ux4iotContext';
import { GrantErrorCallback } from './types';
import { IoTHubResponse } from './ux4iot-shared';
import { DirectMethodGrantable } from './data/DirectMethodGrantable';

type UseDirectMethodOutput = (
	payload: Record<string, unknown>,
	responseTimeoutInSeconds?: number,
	connectTimeoutInSeconds?: number
) => Promise<IoTHubResponse | void>;

type HookOptions = {
	onGrantError?: GrantErrorCallback;
};

export const useDirectMethod = (
	deviceId: string,
	directMethodName: string,
	options: HookOptions = {}
): UseDirectMethodOutput => {
	const { onGrantError } = options;
	const ux4iot = useUx4iot();
	const onGrantErrorRef = useRef(onGrantError);
	const [grantable, setGrantable] = useState<DirectMethodGrantable>();

	useEffect(() => {
		onGrantErrorRef.current = onGrantError;
	}, [onGrantError]);

	useEffect(() => {
		const g = ux4iot.addDirectMethodGrantable({
			deviceId,
			directMethodName,
			onGrantError: onGrantErrorRef.current,
		});
		setGrantable(g);
	}, [deviceId, directMethodName, ux4iot]);

	const directMethod = useCallback(
		async (
			payload,
			responseTimeoutInSeconds,
			connectTimeoutInSeconds
		): Promise<IoTHubResponse | void> => {
			return await grantable?.invokeDirectMethod({
				methodName: directMethodName,
				payload,
				responseTimeoutInSeconds,
				connectTimeoutInSeconds,
			});
		},
		[directMethodName, grantable]
	);

	return directMethod;
};
