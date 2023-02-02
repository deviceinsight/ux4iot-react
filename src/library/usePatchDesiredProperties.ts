import { useCallback, useContext, useEffect, useRef } from 'react';
import { GrantErrorCallback } from './base/types';
import {
	DesiredPropertyGrantRequest,
	IoTHubResponse,
} from './base/ux4iot-shared';
import { Ux4iotContext } from './Ux4iotContext';

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
	const { ux4iot } = useContext(Ux4iotContext);
	const onGrantErrorRef = useRef(onGrantError);

	useEffect(() => {
		onGrantErrorRef.current = onGrantError;
	}, [onGrantError]);

	const patchDesiredProperties = useCallback(
		async (
			desiredProperties: Record<string, unknown>
		): Promise<IoTHubResponse | void> => {
			if (ux4iot) {
				const req: Omit<DesiredPropertyGrantRequest, 'sessionId'> = {
					type: 'desiredProperties',
					deviceId,
				};
				return await ux4iot.patchDesiredProperties(
					req,
					desiredProperties,
					onGrantErrorRef.current
				);
			}
		},
		[deviceId, ux4iot]
	);

	return patchDesiredProperties;
};
