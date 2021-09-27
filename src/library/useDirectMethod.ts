import { DeviceMethodParams } from 'azure-iothub';
import { useCallback, useContext, useEffect, useRef } from 'react';
import { Ux4iotContext } from './Ux4iotContext';
import { GrantErrorCallback } from './types';

type UseDirectMethodOutput = (
	payload: Record<string, unknown>
) => Promise<unknown>;

type HookOptions = {
	onGrantError?: GrantErrorCallback;
};

export const useDirectMethod = (
	deviceId: string,
	methodName: string,
	options: HookOptions = {}
): UseDirectMethodOutput => {
	const { onGrantError } = options;
	const ux4iot = useContext(Ux4iotContext);
	const onGrantErrorRef = useRef(onGrantError);

	useEffect(() => {
		onGrantErrorRef.current = onGrantError;
	}, [onGrantError]);

	const directMethod = useCallback(
		async (deviceId: string, options: DeviceMethodParams) => {
			return await ux4iot?.invokeDirectMethod(
				deviceId,
				options,
				onGrantErrorRef.current
			);
		},
		[ux4iot]
	);

	return payload => directMethod(deviceId, { methodName, payload });
};
