import {
	useEffect,
	useReducer,
	Reducer,
	useCallback,
	useRef,
	useState,
} from 'react';
import { v4 as uuid } from 'uuid';
import {
	TelemetryAction,
	telemetryReducer,
	TelemetryState,
} from './telemetryState';
import { useUx4iot } from './Ux4iotContext';
import {
	Subscribers,
	TelemetryCallback,
	GrantErrorCallback,
	SubscriptionErrorCallback,
} from './base/types';
import { TelemetrySubscriptionRequest } from './base/ux4iot-shared';

export type { TelemetryValue, TelemetryState } from './telemetryState';

type UseMultiTelemetryOutput = {
	addTelemetry: (deviceId: string, telemetryKeys: string[]) => Promise<void>;
	removeTelemetry: (deviceId: string, telemetryKeys: string[]) => Promise<void>;
	toggleTelemetry: (deviceId: string, telemetryKey: string) => Promise<void>;
	isSubscribed: (deviceId: string, telemetryKey: string) => boolean;
	telemetry: TelemetryState;
	currentSubscribers: Subscribers;
};

type HookOptions = {
	initialSubscribers?: Subscribers;
	onData?: TelemetryCallback; // BREAKING
	onGrantError?: GrantErrorCallback;
	onSubscriptionError?: SubscriptionErrorCallback;
};

function getSubscriptionRequest(deviceId: string, telemetryKey: string) {
	return {
		deviceId,
		telemetryKey,
		type: 'telemetry',
	} as TelemetrySubscriptionRequest;
}

export const useMultiTelemetry = (
	options: HookOptions
): UseMultiTelemetryOutput => {
	const { onData, onGrantError, onSubscriptionError, initialSubscribers } =
		options;
	const { ux4iot, sessionId } = useUx4iot();
	const [currentSubscribers, setCurrentSubscribers] = useState<Subscribers>({});
	const onDataRef = useRef(onData);
	const onGrantErrorRef = useRef(onGrantError);
	const onSubscriptionErrorRef = useRef(onSubscriptionError);
	const subscriptionId = useRef<string>(uuid());

	useEffect(() => {
		onDataRef.current = onData;
		onGrantErrorRef.current = onGrantError;
		onSubscriptionErrorRef.current = onSubscriptionError;
	}, [onData, onGrantError, onSubscriptionError]);

	const [telemetry, setTelemetry] = useReducer<
		Reducer<TelemetryState, TelemetryAction>
	>(telemetryReducer, {});

	const onTelemetry: TelemetryCallback = useCallback(
		(deviceId, message, timestamp) => {
			if (message) {
				setTelemetry({ type: 'ADD_DATA', deviceId, message, timestamp });
				onDataRef.current?.(deviceId, message, timestamp);
			}
		},
		[setTelemetry]
	);

	const addTelemetry = useCallback(
		async (deviceId: string, telemetryKeys: string[]) => {
			for (const key of telemetryKeys) {
				await ux4iot.subscribe(
					subscriptionId.current,
					getSubscriptionRequest(deviceId, key),
					onTelemetry,
					onSubscriptionErrorRef.current,
					onGrantErrorRef.current
				);
			}
			setCurrentSubscribers(
				ux4iot.getSubscriberIdSubscriptions(subscriptionId.current)
			);
		},
		[ux4iot, onTelemetry]
	);

	const removeTelemetry = useCallback(
		async (deviceId: string, telemetryKeys: string[]) => {
			for (const key of telemetryKeys) {
				await ux4iot.unsubscribe(
					subscriptionId.current,
					getSubscriptionRequest(deviceId, key),
					onSubscriptionErrorRef.current,
					onGrantErrorRef.current
				);
			}
			setCurrentSubscribers(
				ux4iot.getSubscriberIdSubscriptions(subscriptionId.current)
			);
		},
		[ux4iot]
	);

	const toggleTelemetry = useCallback(
		async (deviceId: string, telemetryKey: string) => {
			ux4iot.hasSubscription(
				subscriptionId.current,
				getSubscriptionRequest(deviceId, telemetryKey)
			)
				? await removeTelemetry(deviceId, [telemetryKey])
				: await addTelemetry(deviceId, [telemetryKey]);
		},
		[ux4iot, addTelemetry, removeTelemetry]
	);

	const isSubscribed = useCallback(
		(deviceId: string, telemetryKey: string): boolean => {
			return !!ux4iot.hasSubscription(
				subscriptionId.current,
				getSubscriptionRequest(deviceId, telemetryKey)
			);
		},
		[ux4iot]
	);

	useEffect(() => {
		async function initSubscribe() {
			if (ux4iot && initialSubscribers) {
				for (const [deviceId, telemetryKeys] of Object.entries(
					initialSubscribers
				)) {
					await addTelemetry(deviceId, telemetryKeys);
				}
				setCurrentSubscribers(
					ux4iot.getSubscriberIdSubscriptions(subscriptionId.current)
				);
			}
		}
		initSubscribe();
		/*
		 * Intentionally omitting initialSubscribers and onTelemetry to prevent
		 * updates of dynamically assigned initialSubscribers from happening
		 */
	}, [sessionId]); // eslint-disable-line

	useEffect(() => {
		const subId = subscriptionId.current;
		return () => {
			async function cleanup() {
				await ux4iot.removeSubscriberId(subId);
			}
			cleanup();
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
