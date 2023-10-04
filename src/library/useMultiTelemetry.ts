import {
	useEffect,
	useReducer,
	Reducer,
	useCallback,
	useRef,
	useState,
	useContext,
} from 'react';
import { v4 as uuid } from 'uuid';
import {
	TelemetryAction,
	telemetryReducer,
	TelemetryState,
} from './telemetryState';
import {
	Subscribers,
	TelemetryCallback,
	GrantErrorCallback,
	SubscriptionErrorCallback,
} from './base/types';
import { TelemetrySubscriptionRequest } from './base/ux4iot-shared';
import { Ux4iotContext } from './Ux4iotContext';

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
	onData?: TelemetryCallback;
	onGrantError?: GrantErrorCallback;
	onSubscriptionError?: SubscriptionErrorCallback;
};

function getSubscriptionRequest(
	deviceId: string,
	telemetryKey: string,
	sessionId: string
): TelemetrySubscriptionRequest {
	return {
		sessionId,
		deviceId,
		telemetryKey,
		type: 'telemetry',
	};
}

export const useMultiTelemetry = (
	options: HookOptions
): UseMultiTelemetryOutput => {
	const { onData, onGrantError, onSubscriptionError, initialSubscribers } =
		options;

	const { ux4iot, sessionId } = useContext(Ux4iotContext);
	const [currentSubscribers, setCurrentSubscribers] = useState<Subscribers>({});
	const initialSubscribersRef = useRef(initialSubscribers);
	const onDataRef = useRef(onData);
	const onGrantErrorRef = useRef(onGrantError);
	const onSubscriptionErrorRef = useRef(onSubscriptionError);
	const subscriptionId = useRef<string>(uuid());

	useEffect(() => {
		initialSubscribersRef.current = initialSubscribers;
	}, [initialSubscribers]);

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
			if (ux4iot) {
				await ux4iot.subscribeAllTelemetry(
					sessionId,
					deviceId,
					telemetryKeys,
					subscriptionId.current,
					onTelemetry,
					onSubscriptionErrorRef.current,
					onGrantErrorRef.current
				);
				setCurrentSubscribers(
					ux4iot.getSubscriberIdSubscriptions(subscriptionId.current)
				);
			}
		},
		[ux4iot, onTelemetry, sessionId]
	);

	const removeTelemetry = useCallback(
		async (deviceId: string, telemetryKeys: string[]) => {
			if (ux4iot) {
				await ux4iot.unsubscribeAllTelemetry(
					sessionId,
					deviceId,
					telemetryKeys,
					subscriptionId.current,
					onSubscriptionErrorRef.current,
					onGrantErrorRef.current
				);
				setCurrentSubscribers(
					ux4iot.getSubscriberIdSubscriptions(subscriptionId.current)
				);
			}
		},
		[ux4iot, sessionId]
	);

	const toggleTelemetry = useCallback(
		async (deviceId: string, telemetryKey: string) => {
			if (ux4iot) {
				ux4iot.hasSubscription(
					subscriptionId.current,
					getSubscriptionRequest(deviceId, telemetryKey, sessionId)
				)
					? await removeTelemetry(deviceId, [telemetryKey])
					: await addTelemetry(deviceId, [telemetryKey]);
			}
		},
		[ux4iot, addTelemetry, removeTelemetry, sessionId]
	);

	const isSubscribed = useCallback(
		(deviceId: string, telemetryKey: string): boolean => {
			if (ux4iot) {
				return ux4iot.hasSubscription(
					subscriptionId.current,
					getSubscriptionRequest(deviceId, telemetryKey, sessionId)
				);
			} else {
				return false;
			}
		},
		[ux4iot, sessionId]
	);

	useEffect(() => {
		async function initSubscribe() {
			if (ux4iot && sessionId && initialSubscribersRef.current) {
				for (const [deviceId, telemetryKeys] of Object.entries(
					initialSubscribersRef.current
				)) {
					await addTelemetry(deviceId, telemetryKeys);
				}
				setCurrentSubscribers(
					ux4iot.getSubscriberIdSubscriptions(subscriptionId.current)
				);
			}
		}
		initSubscribe();
	}, [ux4iot, addTelemetry, sessionId]);

	useEffect(() => {
		const subId = subscriptionId.current;
		return () => {
			ux4iot?.removeSubscriberId(subId, sessionId);
		};
	}, [ux4iot, sessionId]);

	return {
		telemetry,
		addTelemetry,
		removeTelemetry,
		toggleTelemetry,
		isSubscribed,
		currentSubscribers,
	};
};
