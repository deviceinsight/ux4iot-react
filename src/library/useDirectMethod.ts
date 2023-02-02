import { useCallback, useContext, useEffect, useRef } from 'react';
import { GrantErrorCallback } from './base/types';
import { DirectMethodGrantRequest, IoTHubResponse } from './base/ux4iot-shared';
import { Ux4iotContext } from './Ux4iotContext';

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
	const { ux4iot } = useContext(Ux4iotContext);
	const onGrantErrorRef = useRef(onGrantError);

	useEffect(() => {
		onGrantErrorRef.current = onGrantError;
	}, [onGrantError]);

	const directMethod = useCallback(
		async (
			payload,
			responseTimeoutInSeconds,
			connectTimeoutInSeconds
		): Promise<IoTHubResponse | void> => {
			if (ux4iot) {
				const req: Omit<DirectMethodGrantRequest, 'sessionId'> = {
					type: 'directMethod',
					deviceId,
					directMethodName,
				};
				return await ux4iot.invokeDirectMethod(
					req,
					{
						methodName: directMethodName,
						payload,
						responseTimeoutInSeconds,
						connectTimeoutInSeconds,
					},
					onGrantErrorRef.current
				);
			}
		},
		[ux4iot, deviceId, directMethodName]
	);

	return directMethod;
};
