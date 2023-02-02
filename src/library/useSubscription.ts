import { useContext, useEffect, useRef } from 'react';
import { v4 as uuid } from 'uuid';
import {
	GrantErrorCallback,
	MessageCallback,
	SubscriptionErrorCallback,
} from './base/types';
import { SubscriptionRequest } from './base/ux4iot-shared';
import { Ux4iotContext } from './Ux4iotContext';

export type HookOptions = {
	onGrantError?: GrantErrorCallback;
	onSubscriptionError?: SubscriptionErrorCallback;
};
export function useSubscription(
	options: HookOptions = {},
	onMessage: MessageCallback,
	getSubscriptionRequest: (sessionId: string) => SubscriptionRequest
) {
	const { ux4iot, sessionId } = useContext(Ux4iotContext);
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
			if (sessionId) {
				await ux4iot?.subscribe(
					subscriptionId.current,
					getSubscriptionRequest(sessionId),
					onMessage,
					onSubscriptionErrorRef.current,
					onGrantErrorRef.current
				);
			}
		}
		sub();
		const subId = subscriptionId.current;

		return () => {
			async function unsub() {
				if (sessionId) {
					await ux4iot?.unsubscribe(
						subId,
						getSubscriptionRequest(sessionId),
						onSubscriptionErrorRef.current,
						onGrantErrorRef.current
					);
				}
			}
			unsub();
		};
	}, [ux4iot, sessionId, getSubscriptionRequest, onMessage]);
}
