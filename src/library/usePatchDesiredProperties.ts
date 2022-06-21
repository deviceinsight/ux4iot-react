import { useCallback, useEffect, useRef } from 'react';
import { useUx4iot } from './Ux4iotContext';
import { GrantErrorCallback } from './types';
import { DesiredPropertyGrantRequest, IoTHubResponse } from './ux4iot-shared';

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
	const { ux4iot } = useUx4iot();
	const onGrantErrorRef = useRef(onGrantError);

	useEffect(() => {
		onGrantErrorRef.current = onGrantError;
	}, [onGrantError]);

	const patchDesiredProperties = useCallback(
		async (
			desiredProperties: Record<string, unknown>
		): Promise<IoTHubResponse | void> => {
			const req: Omit<DesiredPropertyGrantRequest, 'sessionId'> = {
				type: 'desiredProperties',
				deviceId,
			};
			return ux4iot.patchDesiredProperties(
				req,
				desiredProperties,
				onGrantErrorRef.current
			);
		},
		[deviceId, ux4iot]
	);

	return patchDesiredProperties;
};
