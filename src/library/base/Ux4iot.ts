import { io, Socket } from 'socket.io-client';
import {
	InitializationOptions,
	isDevOptions,
	ConnectionUpdateFunction,
	MessageCallback,
	SubscriptionErrorCallback,
	GrantErrorCallback,
	GRANT_RESPONSES,
} from '../types';

import {
	DesiredPropertyGrantRequest,
	DirectMethodGrantRequest,
	GrantRequest,
	IoTHubResponse,
	Message,
	SubscriptionRequest,
} from '../ux4iot-shared';

import { Ux4iotApi } from './Ux4iotApi';
import * as ux4iotState from './ux4iotState';
import { getGrantFromSubscriptionRequest } from './utils';
import { DeviceMethodParams } from 'azure-iothub';

const RECONNECT_TIMEOUT = 5000;
const DISCONNECTED_MESSAGE = `Disconnected / Error Connecting. Trying to reconnect in ${
	RECONNECT_TIMEOUT / 1000
} seconds.`;
const INIT_ERROR_MESSAGE = `Failed to fetch sessionId of ux4iot. Attempting again in ${
	RECONNECT_TIMEOUT / 1000
} seconds.`;
const CLIENT_DISCONNECTED_MESSAGE = 'Client manually disconnected';

export class Ux4iot {
	sessionId = '';
	socket: Socket | undefined;
	devMode: boolean;
	//   - state: Ux4iotState
	//     - methods:
	//       - private hasGrantFor(deviceId, telemetryKey): checks if theres a need to ask for grant
	//       - private hasSubscriptionFor(deviceId, telemetryKey): checks if theres a need to subscribe
	//       - onStateChange
	api: Ux4iotApi;
	retryTimeoutAfterError = 0;
	onSocketConnectionUpdate?: ConnectionUpdateFunction;
	onSessionId?: (sessionId: string) => void;

	constructor(
		options: InitializationOptions,
		onSessionId?: (sessionId: string) => void
	) {
		const { onSocketConnectionUpdate } = options;
		this.api = new Ux4iotApi(options);
		this.devMode = isDevOptions(options);
		this.onSocketConnectionUpdate = onSocketConnectionUpdate;
		this.onSessionId = onSessionId;
		this.connect();
	}

	private log(...args: any[]) {
		if (this.devMode) {
			console.warn('ux4iot:', ...args);
		}
	}

	private async connect(): Promise<void> {
		if (!this.socket) {
			try {
				const sessionId = await this.api.getSessionId();
				this.sessionId = sessionId;
			} catch (error) {
				this.onSocketConnectionUpdate &&
					this.onSocketConnectionUpdate(
						'ux4iot_unreachable',
						INIT_ERROR_MESSAGE
					);
				this.log(INIT_ERROR_MESSAGE);
				this.tryReconnect();
				return;
			}
			if (this.sessionId) {
				const socketURI = this.api.getSocketURL(this.sessionId);
				this.socket = io(socketURI);
				this.socket.on('connect', this.onConnect.bind(this));
				this.socket.on('connect_error', this.onConnectError.bind(this));
				this.socket.on('disconnect', this.onDisconnect.bind(this));
				this.socket.on('data', this.onData.bind(this));
			}
		}
	}

	private tryReconnect() {
		clearTimeout(this.retryTimeoutAfterError as unknown as NodeJS.Timeout);
		this.retryTimeoutAfterError = setTimeout(
			this.connect.bind(this),
			RECONNECT_TIMEOUT
		) as unknown as number;
	}

	private async onConnect() {
		this.log(`Connected to ${this.api.getSocketURL(this.sessionId)}`);
		this.log('Successfully reconnected. Resubscribing to old state...');
		this.api.setSessionId(this.sessionId);
		this.onSessionId && this.onSessionId(this.sessionId);
		console.log(
			'called onSessionId in ux4iot',
			this.onSessionId,
			'with',
			this.sessionId
		);
		this.onSocketConnectionUpdate &&
			this.onSocketConnectionUpdate('socket_connect');
		clearTimeout(this.retryTimeoutAfterError as unknown as NodeJS.Timeout);
		// await this.grantableState?.establishAll();
	}

	private onConnectError() {
		this.log(
			`Failed to establish websocket to ${this.api.getSocketURL(
				this.sessionId
			)}`
		);
		this.onSocketConnectionUpdate &&
			this.onSocketConnectionUpdate(
				'socket_connect_error',
				DISCONNECTED_MESSAGE
			);
		this.tryReconnect();
	}

	private onDisconnect(error: unknown) {
		if (error === 'io client disconnect') {
			this.log(CLIENT_DISCONNECTED_MESSAGE, error);
			this.onSocketConnectionUpdate &&
				this.onSocketConnectionUpdate(
					'socket_disconnect',
					CLIENT_DISCONNECTED_MESSAGE
				);
		} else {
			this.log(DISCONNECTED_MESSAGE, error);
			this.onSocketConnectionUpdate &&
				this.onSocketConnectionUpdate(
					'socket_disconnect',
					DISCONNECTED_MESSAGE
				);
			this.socket = undefined;
			this.tryReconnect();
		}
	}

	public async destroy(): Promise<void> {
		this.socket?.disconnect();
		this.socket = undefined;
		// await this.grantableState?.unsubscribeAll();
		clearTimeout(this.retryTimeoutAfterError as unknown as NodeJS.Timeout);
		this.log('socket with id', this.sessionId, 'destroyed');
	}

	private async onData(message: Message) {
		//   - onData:
		//     for each subscriptionId.onDataCallback in ux4iotState.subscriptions
		//       - match deviceId, match type, aggregate telemetry
		//         - onDataCallback(deviceId, data)
		ux4iotState.sendMessage(message);
	}

	async patchDesiredProperties(
		grantRequest: Omit<DesiredPropertyGrantRequest, 'sessionId'>,
		desiredPropertyPatch: Record<string, unknown>,
		onGrantError?: GrantErrorCallback
	): Promise<IoTHubResponse | void> {
		const grantReq = {
			...grantRequest,
			sessionId: this.sessionId,
		} as GrantRequest;
		await this.grant(grantReq, onGrantError);
		await this.api.patchDesiredProperties(
			grantRequest.deviceId,
			desiredPropertyPatch
		);
		//   - patchDesiredProperties( deviceId, patch)
		//     - catch notReady: Error
		//     - catch notGranted: Youre not authorized
	}

	async invokeDirectMethod(
		grantRequest: Omit<DirectMethodGrantRequest, 'sessionId'>,
		options: DeviceMethodParams,
		onGrantError?: GrantErrorCallback
	): Promise<IoTHubResponse | void> {
		const grantReq = {
			...grantRequest,
			sessionId: this.sessionId,
		} as GrantRequest;
		await this.grant(grantReq, onGrantError);
		return await this.api.invokeDirectMethod(grantRequest.deviceId, options);
		//   - invokeDirectMethod(deviceId, directMethod)
		//     - catch notReady: Error
		//     - catch notGranted: Youre not authorized
	}

	async grant(grantRequest: GrantRequest, onGrantError?: GrantErrorCallback) {
		if (ux4iotState.hasGrant(grantRequest)) {
			return;
		}
		try {
			ux4iotState.addGrant(grantRequest);
			await this.api.requestGrant(grantRequest);
		} catch (error) {
			onGrantError && onGrantError(error as GRANT_RESPONSES);
			ux4iotState.removeGrant(grantRequest);
		}
		//   - grant(grant)
		//     if ux4iot.ready === false:
		//       - enqueue grantrequest
		//     else
		//       - requests grant if grant isnt already in state
		//         - success: add grant to ux4iotState
		//         - failure: onGrantError
	}

	async subscribe(
		subscriberId: string,
		subscriptionRequest: Omit<SubscriptionRequest, 'sessionId'>,
		onData: MessageCallback,
		onSubscriptionError?: SubscriptionErrorCallback,
		onGrantError?: GrantErrorCallback
	) {
		const subReq = {
			...subscriptionRequest,
			sessionId: this.sessionId,
		} as SubscriptionRequest;
		ux4iotState.addSubscription(subscriberId, subReq, onData);
		const grantRequest = getGrantFromSubscriptionRequest(subReq);
		await this.grant(grantRequest, onGrantError);
		if (ux4iotState.hasGrant(grantRequest)) {
			try {
				await this.api.subscribe(subscriptionRequest);
			} catch (error) {
				onSubscriptionError && onSubscriptionError(error);
				ux4iotState.removeSubscription(subscriberId, subReq);
			}
		} else {
			onSubscriptionError && onSubscriptionError('No grant for subscription');
		}
		//   - subscribe(subscriberId, subReq)
		//     - subscribes data if data isnt already subscribed to
		//       - success: add subscription to ux4iotState
		//       - failure: onSubscriptionError
	}

	async unsubscribe(
		subscriberId: string,
		subscriptionRequest: Omit<SubscriptionRequest, 'sessionId'>,
		onSubscriptionError?: SubscriptionErrorCallback,
		onGrantError?: GrantErrorCallback
	) {
		const subReq = {
			...subscriptionRequest,
			sessionId: this.sessionId,
		} as SubscriptionRequest;
		const subscription = ux4iotState.removeSubscription(subscriberId, subReq);
		const grantRequest = getGrantFromSubscriptionRequest(subReq);
		await this.grant(grantRequest, onGrantError);
		if (ux4iotState.hasGrant(grantRequest)) {
			try {
				await this.api.unsubscribe(subscriptionRequest);
			} catch (error) {
				onSubscriptionError && onSubscriptionError(error);
				if (subscription) {
					ux4iotState.addSubscription(
						subscriberId,
						subReq,
						subscription?.onData
					);
				}
			}
		} else {
			onSubscriptionError && onSubscriptionError('No grant for subscription');
		}
		//   - unsubscribe(subscriberId, subReq)
		//     - unsubscribes data if data isnt still subscribed by anyone else
		//       - success: remove subscription to ux4iotState
		//       - failure: onSubscriptionError
	}

	hasSubscription(
		subscriberId: string,
		subscriptionRequest: SubscriptionRequest
	) {
		return ux4iotState.hasSubscription(subscriberId, subscriptionRequest);
	}

	getSubscriberIdSubscriptions(subscriberId: string): Record<string, string[]> {
		const registered = ux4iotState.state.subscriptions[subscriberId];
		const subscriptions: Record<string, string[]> = {};

		for (const s of registered) {
			if (s.type === 'telemetry') {
				subscriptions[s.deviceId] = s.telemetryKeys;
			}
		}
		return subscriptions;
	}

	async removeSubscriberId(subscriberId: string) {
		const subscriptions = ux4iotState.state.subscriptions[subscriberId];

		if (subscriptions) {
			for (const s of subscriptions) {
				try {
					await this.unsubscribe(subscriberId, s);
				} catch (error) {
					console.log('couldnt unsubscribe subscriberId', subscriberId, error);
				}
			}
		}
		ux4iotState.cleanSubId(subscriberId);
	}
}
