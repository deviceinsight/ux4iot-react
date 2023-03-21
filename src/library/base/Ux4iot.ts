import { io, Socket } from 'socket.io-client';
import {
	InitializationOptions,
	isDevOptions,
	ConnectionUpdateFunction,
	MessageCallback,
	SubscriptionErrorCallback,
	GrantErrorCallback,
	GRANT_RESPONSES,
} from './types';

import {
	DesiredPropertyGrantRequest,
	DirectMethodGrantRequest,
	GrantRequest,
	IoTHubResponse,
	LastValueResponse,
	Message,
	SubscriptionRequest,
} from './ux4iot-shared';

import { Ux4iotApi } from './Ux4iotApi';
import * as ux4iotState from './ux4iotState';
import {
	getGrantFromSubscriptionRequest,
	isConnectionStateMessage,
	isD2CMessage,
	isDeviceTwinMessage,
	isTelemetryMessage,
} from './utils';
import { DeviceMethodParams } from 'azure-iothub';
import { NETWORK_STATES, RECONNECT_TIMEOUT } from './constants';
import { AxiosError } from 'axios';

export class Ux4iot {
	sessionId = '';
	socket: Socket | undefined;
	devMode: boolean;
	api: Ux4iotApi;
	retryTimeoutAfterError?: NodeJS.Timeout;
	onSocketConnectionUpdate?: ConnectionUpdateFunction;
	onSessionId?: (sessionId: string) => void;

	private constructor(
		options: InitializationOptions,
		sessionId: string,
		api: Ux4iotApi,
		onSessionId?: (sessionId: string) => void
	) {
		this.sessionId = sessionId;
		this.api = api;
		this.devMode = isDevOptions(options);
		this.onSessionId = onSessionId;
		this.onSocketConnectionUpdate = options.onSocketConnectionUpdate;
		this.initializeSocket();
	}

	public static async create(
		options: InitializationOptions,
		onSessionId?: (sessionId: string) => void
	): Promise<Ux4iot> {
		const api = new Ux4iotApi(options);
		try {
			const sessionId = await api.getSessionId();
			api.setSessionId(sessionId);
			return new Ux4iot(options, sessionId, api, onSessionId);
		} catch (error) {
			const [reason, description] = NETWORK_STATES.UX4IOT_OFFLINE;
			options.onSocketConnectionUpdate?.(reason, description);

			throw NETWORK_STATES.UX4IOT_OFFLINE.join();
		}
	}

	private initializeSocket() {
		const socketURI = this.api.getSocketURL(this.sessionId);
		this.socket = io(socketURI, { transports: ['websocket'] });
		this.socket.on('connect', this.onConnect.bind(this));
		this.socket.on('connect_error', this.onConnectError.bind(this));
		this.socket.on('disconnect', this.onDisconnect.bind(this));
		this.socket.on('data', this.onData.bind(this));
	}

	private tryReconnect() {
		clearTimeout(this.retryTimeoutAfterError as unknown as NodeJS.Timeout);

		this.retryTimeoutAfterError = setTimeout(async () => {
			if (!this.socket) {
				try {
					const sessionId = await this.api.getSessionId();
					this.api.setSessionId(sessionId);
					this.sessionId = sessionId;
				} catch (error) {
					const [reason, description] = NETWORK_STATES.UX4IOT_OFFLINE;
					this.log(reason, description, error);
					this.onSocketConnectionUpdate?.(reason, description);
					this.tryReconnect();
					return;
				}
				this.initializeSocket();
			}
		}, RECONNECT_TIMEOUT);
	}

	private async onConnect() {
		this.log(`Connected to ${this.api.getSocketURL(this.sessionId)}`);
		this.log('Successfully reconnected. Resubscribing to old state...');
		ux4iotState.resetState();
		console.log('onSessionId called with', this.sessionId);
		this.onSessionId?.(this.sessionId); // this callback should be used to reestablish all subscriptions
		this.onSocketConnectionUpdate?.(...NETWORK_STATES.CONNECTED);
		clearTimeout(this.retryTimeoutAfterError as unknown as NodeJS.Timeout);
	}

	private onConnectError() {
		const socketURL = this.api.getSocketURL(this.sessionId);
		this.log(`Failed to establish websocket to ${socketURL}`);
		const [reason, description] = NETWORK_STATES.SERVER_UNAVAILABLE;
		this.onSocketConnectionUpdate?.(reason, description);
		this.tryReconnect();
	}

	private onDisconnect(error: unknown) {
		if (error === 'io client disconnect') {
			// https://socket.io/docs/v4/client-api/#event-disconnect
			const [reason, description] = NETWORK_STATES.CLIENT_DISCONNECTED;
			this.log(reason, description, error);
			this.onSocketConnectionUpdate?.(reason, description);
		} else {
			const [reason, description] = NETWORK_STATES.SERVER_DISCONNECTED;
			this.log(reason, description, error);
			this.onSocketConnectionUpdate?.(reason, description);
			this.socket = undefined;
			this.tryReconnect();
		}
	}

	public async destroy(): Promise<void> {
		this.socket?.disconnect();
		this.socket = undefined;
		clearTimeout(this.retryTimeoutAfterError as unknown as NodeJS.Timeout);
		this.log('socket with id', this.sessionId, 'destroyed');
	}

	private async onData(m: Message) {
		for (const subscriptions of Object.values(
			ux4iotState.state.subscriptions
		)) {
			for (const sub of subscriptions) {
				const { type, deviceId } = sub;
				if (deviceId === m.deviceId) {
					switch (type) {
						case 'telemetry': {
							if (isTelemetryMessage(m)) {
								const telemetry: Record<string, unknown> = {};
								for (const telemetryKey of sub.telemetryKeys) {
									telemetry[telemetryKey] = m.telemetry[telemetryKey];
								}
								sub.onData(m.deviceId, telemetry, m.timestamp);
							}
							break;
						}
						case 'connectionState':
							isConnectionStateMessage(m) &&
								sub.onData(m.deviceId, m.connectionState, m.timestamp);
							break;
						case 'd2cMessages':
							isD2CMessage(m) && sub.onData(m.deviceId, m.message, m.timestamp);
							break;
						case 'deviceTwin':
							isDeviceTwinMessage(m) &&
								sub.onData(m.deviceId, m.deviceTwin, m.timestamp);
							break;
					}
				}
			}
		}
	}

	async unsubscribeAll() {
		for (const [subscriberId, subscriptions] of Object.entries(
			ux4iotState.state.subscriptions
		)) {
			for (const sub of subscriptions) {
				const { onData, ...subscriptionRequest } = sub;
				if (sub.type === 'telemetry') {
					const { deviceId, type, telemetryKeys } = sub;
					for (const telemetryKey of telemetryKeys) {
						const sr = {
							sessionId: this.sessionId,
							telemetryKey,
							deviceId,
							type,
						};
						await this.unsubscribe(subscriberId, sr);
					}
				} else {
					const sr = {
						...subscriptionRequest,
						sessionId: this.sessionId,
					} as SubscriptionRequest;
					await this.unsubscribe(subscriberId, sr);
				}
			}
		}
	}

	async patchDesiredProperties(
		grantRequest: DesiredPropertyGrantRequest,
		patch: Record<string, unknown>,
		onGrantError?: GrantErrorCallback
	): Promise<IoTHubResponse | void> {
		await this.grant(grantRequest, onGrantError);
		if (ux4iotState.hasGrant(grantRequest)) {
			await this.api.patchDesiredProperties(grantRequest.deviceId, patch);
		}
	}

	async invokeDirectMethod(
		grantRequest: DirectMethodGrantRequest,
		options: DeviceMethodParams,
		onGrantError?: GrantErrorCallback
	): Promise<IoTHubResponse | void> {
		await this.grant(grantRequest, onGrantError);
		if (ux4iotState.hasGrant(grantRequest)) {
			return await this.api.invokeDirectMethod(grantRequest.deviceId, options);
		}
	}

	async grant(grantRequest: GrantRequest, onGrantError?: GrantErrorCallback) {
		if (ux4iotState.hasGrant(grantRequest)) {
			return;
		}
		const grantResponse = await this.api.requestGrant(grantRequest);
		if (grantResponse === GRANT_RESPONSES.GRANTED) {
			ux4iotState.addGrant(grantRequest);
		} else {
			onGrantError?.(grantResponse);
		}
	}

	async subscribe(
		subscriberId: string,
		subscriptionRequest: SubscriptionRequest,
		onData: MessageCallback,
		onSubscriptionError?: SubscriptionErrorCallback,
		onGrantError?: GrantErrorCallback
	) {
		const grantRequest = getGrantFromSubscriptionRequest(subscriptionRequest);

		await this.grant(grantRequest, onGrantError);
		if (ux4iotState.hasGrant(grantRequest)) {
			const response = await this.getLastValueForSubscriptionRequest(
				subscriptionRequest
			);
			onData(response.deviceId, response.data, response.timestamp);
			try {
				// this if block is used as an optimization.
				// When the number of subscribers is bigger than 0 then we do not need to fire a subscription request
				// If the request fails, then we do not need to remove the subscription, since it will only be added after
				// the subscribe request is successful
				// If the number of subscribers isn't 0 then we know that the request succeeded in the past
				if (ux4iotState.getNumberOfSubscribers(subscriptionRequest) === 1) {
					await this.api.subscribe(subscriptionRequest);
				}
				ux4iotState.addSubscription(subscriberId, subscriptionRequest, onData);
			} catch (error) {
				onSubscriptionError?.((error as AxiosError).response?.data);
			}
		} else {
			onSubscriptionError?.('No grant for subscription');
			ux4iotState.removeSubscription(subscriberId, subscriptionRequest);
		}
	}

	async unsubscribe(
		subscriberId: string,
		subscriptionRequest: SubscriptionRequest,
		onSubscriptionError?: SubscriptionErrorCallback,
		onGrantError?: GrantErrorCallback
	) {
		const grantRequest = getGrantFromSubscriptionRequest(subscriptionRequest);
		await this.grant(grantRequest, onGrantError);
		if (ux4iotState.hasGrant(grantRequest)) {
			try {
				if (ux4iotState.getNumberOfSubscribers(subscriptionRequest) === 1) {
					await this.api.unsubscribe(subscriptionRequest);
				}
				ux4iotState.removeSubscription(subscriberId, subscriptionRequest);
			} catch (error) {
				onSubscriptionError?.(error);
			}
		} else {
			onSubscriptionError?.('No grant for subscription');
		}
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

		if (registered) {
			for (const sub of registered) {
				if (sub.type === 'telemetry') {
					subscriptions[sub.deviceId] = sub.telemetryKeys;
				} else {
					subscriptions[sub.deviceId] = [];
				}
			}
		}
		return subscriptions;
	}

	async removeSubscriberId(subscriberId: string) {
		const subscriptions = ux4iotState.state.subscriptions[subscriberId];

		if (subscriptions) {
			for (const sub of subscriptions) {
				try {
					if (sub.type === 'telemetry') {
						for (const telemetryKey of sub.telemetryKeys) {
							const sr = {
								type: sub.type,
								deviceId: sub.deviceId,
								telemetryKey,
								sessionId: sub.sessionId,
							};
							await this.unsubscribe(subscriberId, sr);
						}
					} else {
						await this.unsubscribe(subscriberId, sub);
					}
				} catch (error) {
					console.warn('couldnt unsubscribe subscriberId', subscriberId, error);
				}
			}
		}
		ux4iotState.cleanSubId(subscriberId);
	}

	async getLastValueForSubscriptionRequest(
		subscriptionRequest: SubscriptionRequest
	): Promise<LastValueResponse<any>> {
		const { type, deviceId } = subscriptionRequest;
		try {
			switch (type) {
				case 'connectionState':
					return await this.api.getLastConnectionState(deviceId);
				case 'deviceTwin':
					return await this.api.getLastDeviceTwin(deviceId);
				case 'telemetry': {
					const { telemetryKey } = subscriptionRequest;
					return await this.api.getLastTelemetryValues(deviceId, telemetryKey);
				}
				case 'd2cMessages':
					return Promise.resolve({ deviceId, data: undefined, timestamp: '' });
				default:
					return Promise.resolve({ deviceId, data: undefined, timestamp: '' });
			}
		} catch (error) {
			this.log((error as AxiosError).response?.data);
			return Promise.resolve({ deviceId, data: undefined, timestamp: '' });
		}
	}

	private log(...args: any[]) {
		if (this.devMode) {
			console.warn('ux4iot:', ...args);
		}
	}
}
