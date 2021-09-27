import {
	useEffect,
	useContext,
	useReducer,
	Reducer,
	useCallback,
	useRef,
	useState,
} from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
	TelemetryAction,
	telemetryReducer,
	TelemetryState,
} from './telemetryState';
import { Ux4iotContext } from './Ux4iotContext';
import { Subscribers, TelemetryCallback, GrantErrorCallback } from './types';

type DataCallback = (
	deviceId: string,
	telemetryKey: string,
	telemetryValue: unknown
) => void;

type UseTelemetryOutput = {
	addTelemetry: (deviceId: string, telemetryKeys: string[]) => void;
	removeTelemetry: (deviceId: string, telemetryKeys: string[]) => void;
	toggleTelemetry: (deviceId: string, telemetryKey: string) => void;
	isSubscribed: (deviceId: string, telemetryKey: string) => boolean;
	telemetry: Record<string, Record<string, unknown>>;
	currentSubscribers: Subscribers;
};

type HookOptions = {
	initialSubscribers?: Subscribers;
	onData?: DataCallback;
	onGrantError?: GrantErrorCallback;
};

export const useTelemetry = (options: HookOptions): UseTelemetryOutput => {
	const { onData, onGrantError, initialSubscribers } = options;
	const ux4iot = useContext(Ux4iotContext);
	const [currentSubscribers, setSubscribers] = useState<Subscribers>({});
	const subscriberIdRef = useRef<string>(uuidv4());
	const onDataRef = useRef(onData);
	const onGrantErrorRef = useRef(onGrantError);

	useEffect(() => {
		console.log('updated callbacks');
		onDataRef.current = onData;
		onGrantErrorRef.current = onGrantError;
	}, [onData, onGrantError]);

	const [telemetry, setTelemetry] = useReducer<
		Reducer<TelemetryState, TelemetryAction>
	>(telemetryReducer, {});

	const onTelemetry: TelemetryCallback = useCallback(
		(deviceId, message) => {
			for (const [telemetryKey, telemetryValue] of Object.entries(message)) {
				setTelemetry({
					type: 'ADD_DATA',
					deviceId,
					telemetryKey,
					telemetryValue,
				});
				onDataRef.current &&
					onDataRef.current(deviceId, telemetryKey, telemetryValue);
			}
		},
		[setTelemetry]
	);

	const addTelemetry = useCallback(
		async (deviceId: string, telemetryKeys: string[]) => {
			if (ux4iot) {
				let nextSubscribers = currentSubscribers;
				for (const k of telemetryKeys) {
					nextSubscribers = await ux4iot?.registerTelemetrySubscriber(
						subscriberIdRef.current,
						deviceId,
						k,
						onTelemetry,
						onGrantErrorRef.current
					);
				}
				setSubscribers(nextSubscribers);
			}
		},
		[ux4iot, onTelemetry, currentSubscribers]
	);

	const removeTelemetry = useCallback(
		async (deviceId: string, telemetryKeys: string[]) => {
			if (ux4iot) {
				let nextSubscribers = currentSubscribers;
				for (const k of telemetryKeys) {
					nextSubscribers = await ux4iot?.unregisterTelemetrySubscriber(
						subscriberIdRef.current,
						deviceId,
						k
					);
				}
				setSubscribers(nextSubscribers);
			}
		},
		[ux4iot, currentSubscribers]
	);

	const toggleTelemetry = useCallback(
		async (deviceId: string, telemetryKey: string) => {
			if (ux4iot) {
				const nextSubscribers = await ux4iot.toggleTelemetry(
					subscriberIdRef.current,
					deviceId,
					telemetryKey,
					onTelemetry,
					onGrantErrorRef.current
				);
				setSubscribers(nextSubscribers);
			}
		},
		[ux4iot, onTelemetry]
	);

	const isSubscribed = useCallback(
		(deviceId: string, telemetryKey: string) => {
			return !!ux4iot?.hasTelemetrySubscription(
				subscriberIdRef.current,
				deviceId,
				telemetryKey
			);
		},
		[ux4iot]
	);

	useEffect(() => {
		(async function initialRegister() {
			if (ux4iot && initialSubscribers) {
				for (const [deviceId, telemetryKeys] of Object.entries(
					initialSubscribers
				)) {
					for (const telemetryKey of telemetryKeys) {
						if (
							!ux4iot.hasTelemetrySubscription(
								subscriberIdRef.current,
								deviceId,
								telemetryKey
							)
						) {
							const nextSubscribers = await ux4iot.registerTelemetrySubscriber(
								subscriberIdRef.current,
								deviceId,
								telemetryKey,
								onTelemetry,
								onGrantError
							);
							setSubscribers(nextSubscribers);
						}
					}
				}
			}
		})();
		/*
		 * Intentionally omitting initialSubscribers and onTelemetry to prevent
		 * updates of dynamically assigned initialSubscribers from happening
		 */
	}, [ux4iot]); // eslint-disable-line

	useEffect(() => {
		const ux4iotInstance = ux4iot;
		const id = subscriberIdRef.current;
		return () => {
			ux4iotInstance?.cleanupSubscriberId(id);
		};
	}, [ux4iot]);

	return {
		telemetry,
		addTelemetry,
		removeTelemetry,
		toggleTelemetry,
		isSubscribed,
		currentSubscribers,
	};
};
