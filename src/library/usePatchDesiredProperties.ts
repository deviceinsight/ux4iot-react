import { useCallback, useContext, useEffect, useRef } from 'react';
import { Ux4iotContext } from './Ux4iotContext';
import { IoTHubResponse, GrantErrorCallback } from './types';

type UsePatchDesiredPropertiesOutput = (
	desiredProperties: Record<string, unknown>
) => Promise<IoTHubResponse | void>;

type HookOptions = {
	onGrantError?: GrantErrorCallback;
};

export const usePatchDesiredProperties = (
	deviceId: string,
	options: HookOptions = {}
): UsePatchDesiredPropertiesOutput => {
	const { onGrantError } = options;
	const ux4iot = useContext(Ux4iotContext);
	const onGrantErrorRef = useRef(onGrantError);

	useEffect(() => {
		onGrantErrorRef.current = onGrantError;
	}, [onGrantError]);

	const patchDesiredProperties = useCallback(
		async (deviceId: string, desiredProperties: Record<string, unknown>) => {
			return await ux4iot?.patchDesiredProperties(
				deviceId,
				desiredProperties,
				onGrantErrorRef.current
			);
		},
		[ux4iot]
	);

	return (desiredProperties): Promise<IoTHubResponse | void> =>
		patchDesiredProperties(deviceId, desiredProperties);
};
