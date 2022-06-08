import {
	useEffect,
	useReducer,
	Reducer,
	useCallback,
	useRef,
	useState,
} from 'react';
import {
	TelemetryAction,
	telemetryReducer,
	TelemetryState,
	TelemetryValue as TV,
} from './state/telemetryState';
import { useUx4iot } from './Ux4iotContext';
import {
	Subscribers,
	TelemetryCallback,
	GrantErrorCallback,
	SubscriptionErrorCallback,
} from './types';
import { TelemetrySubscription } from './data/TelemetrySubscription';

type DataCallback = (
	deviceId: string,
	telemetryKey: string,
	telemetryValue: unknown,
	timestamp: string | undefined
) => void;

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
	onData?: DataCallback;
	onGrantError?: GrantErrorCallback;
	onSubscriptionError?: SubscriptionErrorCallback;
};

export type TelemetryValue = TV;

function serializeSubscribers(
	subscriptions: TelemetrySubscription[]
): Subscribers {
	const subscribers: Subscribers = {};

	for (const { deviceId, telemetryKey } of subscriptions) {
		if (subscribers[deviceId]) {
			subscribers[deviceId].push(telemetryKey);
		} else {
			subscribers[deviceId] = [telemetryKey];
		}
	}

	return subscribers;
}

export const useMultiTelemetry = (
	options: HookOptions
): UseMultiTelemetryOutput => {
	const { onData, onGrantError, onSubscriptionError, initialSubscribers } =
		options;
	const ux4iot = useUx4iot();
	const [currentSubscribers, setCurrentSubscribers] = useState<Subscribers>({});
	const onDataRef = useRef(onData);
	const onGrantErrorRef = useRef(onGrantError);
	const onSubscriptionErrorRef = useRef(onSubscriptionError);
	const subscriptionsRef = useRef<TelemetrySubscription[]>([]);

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
			for (const [telemetryKey, telemetryValue] of Object.entries(message)) {
				setTelemetry({
					type: 'ADD_DATA',
					deviceId,
					telemetryKey,
					telemetryValue,
					timestamp,
				});
				onDataRef.current &&
					onDataRef.current(deviceId, telemetryKey, telemetryValue, timestamp);
			}
		},
		[setTelemetry]
	);

	const addTelemetry = useCallback(
		async (deviceId: string, telemetryKeys: string[]) => {
			for (const telemetryKey of telemetryKeys) {
				const subscription = ux4iot.addTelemetrySubscription({
					deviceId,
					telemetryKey,
					onDataCallback: onTelemetry,
					onGrantError: onGrantErrorRef.current,
					onSubscriptionError: onSubscriptionErrorRef.current,
				});
				const nextSubscriptions = [...subscriptionsRef.current, subscription];
				subscriptionsRef.current = nextSubscriptions;
				setCurrentSubscribers(serializeSubscribers(nextSubscriptions));
			}
		},
		[ux4iot, onTelemetry]
	);

	const removeTelemetry = useCallback(
		async (deviceId: string, telemetryKeys: string[]) => {
			let nextSubscriptions = [...subscriptionsRef.current];
			for (const telemetryKey of telemetryKeys) {
				const subscription = subscriptionsRef.current.find(
					s => s.deviceId === deviceId && s.telemetryKey === telemetryKey
				);
				ux4iot.removeGrantable(subscription);
				nextSubscriptions = nextSubscriptions.filter(s => s !== subscription);
			}
			subscriptionsRef.current = nextSubscriptions;
			setCurrentSubscribers(serializeSubscribers(nextSubscriptions));
		},
		[ux4iot]
	);

	const toggleTelemetry = useCallback(
		async (deviceId: string, telemetryKey: string) => {
			const subscription = subscriptionsRef.current.find(
				s => s.deviceId === deviceId && s.telemetryKey === telemetryKey
			);
			if (subscription) {
				removeTelemetry(deviceId, [telemetryKey]);
			} else {
				addTelemetry(deviceId, [telemetryKey]);
			}
		},
		[addTelemetry, removeTelemetry]
	);

	const isSubscribed = useCallback(
		(deviceId: string, telemetryKey: string): boolean => {
			const subscription = subscriptionsRef.current.find(
				s => s.deviceId === deviceId && s.telemetryKey === telemetryKey
			);

			return subscription !== undefined;
		},
		[]
	);

	useEffect(() => {
		if (ux4iot && initialSubscribers) {
			const initial = [];
			for (const [deviceId, telemetryKeys] of Object.entries(
				initialSubscribers
			)) {
				for (const telemetryKey of telemetryKeys) {
					const subscription = ux4iot.addTelemetrySubscription({
						deviceId,
						telemetryKey,
						onDataCallback: onTelemetry,
						onGrantError: onGrantErrorRef.current,
						onSubscriptionError: onSubscriptionErrorRef.current,
					});
					initial.push(subscription);
				}
			}
			subscriptionsRef.current = initial;
		}
		/*
		 * Intentionally omitting initialSubscribers and onTelemetry to prevent
		 * updates of dynamically assigned initialSubscribers from happening
		 */
	}, []); // eslint-disable-line

	useEffect(() => {
		return () => {
			subscriptionsRef.current.forEach(s => ux4iot.removeGrantable(s));
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
