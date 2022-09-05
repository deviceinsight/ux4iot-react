import { useEffect, useRef } from 'react';
import { v4 as uuid } from 'uuid';
import {
	GrantErrorCallback,
	MessageCallback,
	SubscriptionErrorCallback,
} from './base/types';
import { SubscriptionRequest } from './base/ux4iot-shared';
import { useUx4iot } from './Ux4iotContext';

export type HookOptions = {
	onGrantError?: GrantErrorCallback;
	onSubscriptionError?: SubscriptionErrorCallback;
};
export function useSubscription(
	options: HookOptions = {},
	onMessage: MessageCallback,
	getSubscriptionRequest: () => Omit<SubscriptionRequest, 'sessionId'>
) {
	const { ux4iot, sessionId } = useUx4iot();
	const { onGrantError, onSubscriptionError } = options;
	const subscriptionId = useRef<string>(uuid());

	const onGrantErrorRef = useRef(onGrantError);
	const onSubscriptionErrorRef = useRef(onSubscriptionError);

	useEffect(() => {
		onGrantErrorRef.current = onGrantError;
		onSubscriptionErrorRef.current = onSubscriptionError;
	}, [onGrantError, onSubscriptionError]);

	useEffect(() => {
		async function sub() {
			await ux4iot.subscribe(
				subscriptionId.current,
				getSubscriptionRequest(),
				onMessage,
				onSubscriptionErrorRef.current,
				onGrantErrorRef.current
			);
		}
		if (sessionId) {
			sub();
		}
		const subId = subscriptionId.current;
		return () => {
			async function unsub() {
				await ux4iot.unsubscribe(
					subId,
					getSubscriptionRequest(),
					onSubscriptionErrorRef.current,
					onGrantErrorRef.current
				);
			}
			if (sessionId) {
				unsub();
			}
		};
	}, [ux4iot, sessionId, getSubscriptionRequest, onMessage]);
}
