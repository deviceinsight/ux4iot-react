import { useEffect, useCallback, useRef, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { useUx4iot } from './Ux4iotContext';
import {
	GrantErrorCallback,
	SubscriptionErrorCallback,
	ConnectionStateCallback,
} from './types';
import { ConnectionStateSubscriptionRequest } from './ux4iot-shared';

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
	onData?: (
		deviceId: string,
		connectionState: boolean,
		timestamp: string
	) => void;
	onGrantError?: GrantErrorCallback;
	onSubscriptionError?: SubscriptionErrorCallback;
};

function getSubscriptionRequest(
	deviceId: string
): ConnectionStateSubscriptionRequest {
	return {
		deviceId,
		type: 'connectionState',
	} as ConnectionStateSubscriptionRequest;
}

export const useMultiConnectionState = (
	options: HookOptions
): UseMultiConnectionStateOutput => {
	const { onData, onGrantError, onSubscriptionError, initialSubscribers } =
		options;
	const { ux4iot } = useUx4iot();
	const [currentSubscribers, setCurrentSubscribers] = useState<string[]>([]);
	const onDataRef = useRef(onData);
	const onGrantErrorRef = useRef(onGrantError);
	const onSubscriptionErrorRef = useRef(onSubscriptionError);
	const subscriptionId = useRef<string>(uuid());
	const [connectionStates, setConnectionStates] = useState<
		Record<string, boolean>
	>({});

	useEffect(() => {
		onDataRef.current = onData;
		onGrantErrorRef.current = onGrantError;
		onSubscriptionErrorRef.current = onSubscriptionError;
	}, [onData, onGrantError, onSubscriptionError]);

	const onConnectionState: ConnectionStateCallback = useCallback(
		(deviceId, connectionState, timestamp) => {
			setConnectionStates(prevState => ({
				...prevState,
				[deviceId]: connectionState,
			}));
			onDataRef.current?.(deviceId, connectionState, timestamp);
		},
		[]
	);

	const addConnectionState = useCallback(
		async (deviceId: string) => {
			ux4iot.subscribe(
				subscriptionId.current,
				getSubscriptionRequest(deviceId),
				onConnectionState,
				onSubscriptionErrorRef.current,
				onGrantErrorRef.current
			);
			setCurrentSubscribers(
				Object.keys(ux4iot.getSubscriberIdSubscriptions(subscriptionId.current))
			);
		},
		[ux4iot, onConnectionState]
	);

	const removeConnectionState = useCallback(
		async (deviceId: string) => {
			ux4iot.unsubscribe(
				subscriptionId.current,
				getSubscriptionRequest(deviceId),
				onSubscriptionErrorRef.current,
				onGrantErrorRef.current
			);
			setCurrentSubscribers(
				Object.keys(ux4iot.getSubscriberIdSubscriptions(subscriptionId.current))
			);
		},
		[ux4iot]
	);

	const toggleConnectionState = useCallback(
		async (deviceId: string) => {
			ux4iot.hasSubscription(
				subscriptionId.current,
				getSubscriptionRequest(deviceId)
			)
				? removeConnectionState(deviceId)
				: addConnectionState(deviceId);
		},
		[ux4iot, addConnectionState, removeConnectionState]
	);

	const isSubscribed = useCallback(
		(deviceId: string): boolean => {
			return !!ux4iot.hasSubscription(
				subscriptionId.current,
				getSubscriptionRequest(deviceId)
			);
		},
		[ux4iot]
	);

	useEffect(() => {
		if (ux4iot && initialSubscribers) {
			for (const deviceId of initialSubscribers) {
				addConnectionState(deviceId);
			}
			setCurrentSubscribers(
				Object.keys(ux4iot.getSubscriberIdSubscriptions(subscriptionId.current))
			);
		}
		/*
		 * Intentionally omitting initialSubscribers and onConnectionState to prevent
		 * updates of dynamically assigned initialSubscribers from happening
		 */
	}, []); // eslint-disable-line

	useEffect(() => {
		const subId = subscriptionId.current;
		return () => {
			async function cleanup() {
				await ux4iot.removeSubscriberId(subId);
			}
			cleanup();
		};
	}, [ux4iot]);
	console.log(JSON.stringify(connectionStates));

	return {
		connectionStates,
		addConnectionState,
		removeConnectionState,
		toggleConnectionState,
		isSubscribed,
		currentSubscribers,
	};
};
