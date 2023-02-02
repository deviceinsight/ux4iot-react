import { useEffect, useCallback, useRef, useState, useContext } from 'react';
import { v4 as uuid } from 'uuid';
import {
	GrantErrorCallback,
	SubscriptionErrorCallback,
	ConnectionStateCallback,
} from './base/types';
import { ConnectionStateSubscriptionRequest } from './base/ux4iot-shared';
import { Ux4iotContext } from './Ux4iotContext';

type UseMultiConnectionStateOutput = {
	addConnectionState: (deviceId: string) => Promise<void>;
	removeConnectionState: (deviceId: string) => Promise<void>;
	toggleConnectionState: (deviceId: string) => Promise<void>;
	isSubscribed: (deviceId: string) => boolean;
	connectionStates: Record<string, boolean>;
	currentSubscribers: string[];
};

type HookOptions = {
	initialSubscribers?: string[];
	onData?: ConnectionStateCallback;
	onGrantError?: GrantErrorCallback;
	onSubscriptionError?: SubscriptionErrorCallback;
};

function getSubscriptionRequest(
	deviceId: string,
	sessionId: string
): ConnectionStateSubscriptionRequest {
	return {
		sessionId,
		deviceId,
		type: 'connectionState',
	};
}

export const useMultiConnectionState = (
	options: HookOptions
): UseMultiConnectionStateOutput => {
	const { onData, onGrantError, onSubscriptionError, initialSubscribers } =
		options;
	const { ux4iot, sessionId } = useContext(Ux4iotContext);
	const [currentSubscribers, setCurrentSubscribers] = useState<string[]>([]);
	const initialSubscribersRef = useRef(initialSubscribers);
	const onDataRef = useRef(onData);
	const onGrantErrorRef = useRef(onGrantError);
	const onSubscriptionErrorRef = useRef(onSubscriptionError);
	const subscriptionId = useRef<string>(uuid());
	const [connectionStates, setConnectionStates] = useState<
		Record<string, boolean>
	>({});

	useEffect(() => {
		initialSubscribersRef.current = initialSubscribers;
	}, [initialSubscribers]);

	useEffect(() => {
		onDataRef.current = onData;
		onGrantErrorRef.current = onGrantError;
		onSubscriptionErrorRef.current = onSubscriptionError;
	}, [onData, onGrantError, onSubscriptionError]);

	const onConnectionState: ConnectionStateCallback = useCallback(
		(deviceId, connectionState, timestamp) => {
			if (connectionState) {
				setConnectionStates(prevState => ({
					...prevState,
					[deviceId]: connectionState,
				}));
				onDataRef.current?.(deviceId, connectionState, timestamp);
			}
		},
		[]
	);

	const addConnectionState = useCallback(
		async (deviceId: string) => {
			if (ux4iot) {
				await ux4iot.subscribe(
					subscriptionId.current,
					getSubscriptionRequest(deviceId, sessionId),
					onConnectionState,
					onSubscriptionErrorRef.current,
					onGrantErrorRef.current
				);
				setCurrentSubscribers(
					Object.keys(
						ux4iot.getSubscriberIdSubscriptions(subscriptionId.current)
					)
				);
			}
		},
		[ux4iot, onConnectionState, sessionId]
	);

	const removeConnectionState = useCallback(
		async (deviceId: string) => {
			if (ux4iot) {
				await ux4iot.unsubscribe(
					subscriptionId.current,
					getSubscriptionRequest(deviceId, sessionId),
					onSubscriptionErrorRef.current,
					onGrantErrorRef.current
				);
				setCurrentSubscribers(
					Object.keys(
						ux4iot.getSubscriberIdSubscriptions(subscriptionId.current)
					)
				);
			}
		},
		[ux4iot, sessionId]
	);

	const toggleConnectionState = useCallback(
		async (deviceId: string) => {
			if (ux4iot) {
				ux4iot.hasSubscription(
					subscriptionId.current,
					getSubscriptionRequest(deviceId, sessionId)
				)
					? await removeConnectionState(deviceId)
					: await addConnectionState(deviceId);
			}
		},
		[ux4iot, addConnectionState, removeConnectionState, sessionId]
	);

	const isSubscribed = useCallback(
		(deviceId: string): boolean => {
			if (ux4iot) {
				return !!ux4iot.hasSubscription(
					subscriptionId.current,
					getSubscriptionRequest(deviceId, sessionId)
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
				for (const deviceId of initialSubscribersRef.current) {
					await addConnectionState(deviceId);
				}
				setCurrentSubscribers(
					Object.keys(
						ux4iot.getSubscriberIdSubscriptions(subscriptionId.current)
					)
				);
			}
		}
		initSubscribe();
	}, [ux4iot, addConnectionState, sessionId]);

	useEffect(() => {
		const subId = subscriptionId.current;
		return () => {
			ux4iot?.removeSubscriberId(subId);
		};
	}, [ux4iot]);

	return {
		connectionStates,
		addConnectionState,
		removeConnectionState,
		toggleConnectionState,
		isSubscribed,
		currentSubscribers,
	};
};
