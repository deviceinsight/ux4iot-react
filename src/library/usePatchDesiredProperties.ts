import { useCallback, useEffect, useRef, useState } from 'react';
import { useUx4iot } from './Ux4iotContext';
import { GrantErrorCallback } from './types';
import { IoTHubResponse } from './ux4iot-shared';
import { PatchDesiredPropertiesGrantable } from './data/PatchDesiredPropertiesGrantable';

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
	const ux4iot = useUx4iot();
	const onGrantErrorRef = useRef(onGrantError);
	const [grantable, setGrantable] = useState<PatchDesiredPropertiesGrantable>();

	useEffect(() => {
		onGrantErrorRef.current = onGrantError;
	}, [onGrantError]);

	useEffect(() => {
		const g = ux4iot.addPatchDesiredPropertiesGrantable({
			deviceId,
			onGrantError: onGrantErrorRef.current,
		});
		setGrantable(g);
	}, [ux4iot, deviceId]);

	const patchDesiredProperties = useCallback(
		async (
			desiredProperties: Record<string, unknown>
		): Promise<IoTHubResponse | void> => {
			return await grantable?.patchDesiredProperties(desiredProperties);
		},
		[grantable]
	);

	return patchDesiredProperties;
};
