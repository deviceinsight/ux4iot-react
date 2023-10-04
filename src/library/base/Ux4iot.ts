import { io, Socket } from 'socket.io-client';
import {
	InitializationOptions,
	isDevOptions,
	ConnectionUpdateFunction,
	MessageCallback,
	SubscriptionErrorCallback,
	GrantErrorCallback,
	GRANT_RESPONSES,
	TelemetryCallback,
} from './types';

import {
	CachedValueType,
	DesiredPropertyGrantRequest,
	DirectMethodGrantRequest,
	GrantRequest,
	IoTHubResponse,
	LastValueConnectionStateResponse,
	LastValueDeviceTwinResponse,
	LastValueObj,
	LastValueResponse,
	LastValueTelemetryResponse,
	Message,
	SubscriptionRequest,
	TelemetrySubscriptionRequest,
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
import { AxiosError } from 'axios';
import { ConnectionUpdateReason } from './types';

const RECONNECT_TIMEOUT = 5000;
const MAX_RECONNECT_TIMEOUT = 30000;
const NETWORK_STATES: Record<string, [ConnectionUpdateReason, string]> = {
	UX4IOT_OFFLINE: [
		'ux4iot_unreachable',
		'Failed to fetch sessionId of ux4iot.',
	],
	SERVER_UNAVAILABLE: [
		'socket_connect_error',
		'Could not establish connection to ux4iot websocket',
	],
	CLIENT_DISCONNECTED: ['socket_disconnect', 'Client manually disconnected'],
	SERVER_DISCONNECTED: [
		'socket_disconnect',
		'Disconnected / Error Connecting.',
	],
	CONNECTED: ['socket_connect', 'Connected to ux4iot websocket'],
};

function nextTimeout(
	timeout: number = RECONNECT_TIMEOUT,
	maxTimeout: number = MAX_RECONNECT_TIMEOUT
) {
	return timeout + timeout > maxTimeout ? maxTimeout : timeout + timeout;
}

export class Ux4iot {
	sessionId = '';
	socket: Socket | undefined;
	devMode: boolean;
	api: Ux4iotApi;
	retryTimeout: number;
	maxRetryTimeout: number;
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
		this.retryTimeout = options.reconnectTimeout ?? RECONNECT_TIMEOUT;
		this.maxRetryTimeout = options.maxReconnectTimeout ?? MAX_RECONNECT_TIMEOUT;
		this.onSessionId = onSessionId;
		this.onSocketConnectionUpdate = options.onSocketConnectionUpdate;
		this.initializeSocket();
	}

	public static async create(
		options: InitializationOptions,
		onSessionId?: (sessionId: string) => void
	): Promise<Ux4iot> {
		const { onSocketConnectionUpdate, reconnectTimeout, maxReconnectTimeout } =
			options;
		const timeout = reconnectTimeout ?? RECONNECT_TIMEOUT;
		const maxTimeout = maxReconnectTimeout ?? MAX_RECONNECT_TIMEOUT;
		const api = new Ux4iotApi(options);
		let initializationTimeout: NodeJS.Timeout | undefined;
		try {
			const sessionId = await api.getSessionId();
			api.setSessionId(sessionId);
			clearTimeout(initializationTimeout);
			return new Ux4iot(options, sessionId, api, onSessionId);
		} catch (error) {
			const [reason, description] = NETWORK_STATES.UX4IOT_OFFLINE;
			onSocketConnectionUpdate?.(reason, description);

			console.warn(
				`Trying to initialize again in ${timeout / 1000} seconds...`
			);

			const nextOptions = {
				...options,
				reconnectTimeout: nextTimeout(timeout, maxTimeout),
				maxReconnectTimeout: maxTimeout,
			};

			return new Promise((resolve, reject) => {
				initializationTimeout = setTimeout(() => {
					return resolve(Ux4iot.create(nextOptions, onSessionId));
				}, timeout);
			});
		}
	}

	private initializeSocket() {
		const socketURI = this.api.getSocketURL(this.sessionId);
		this.socket = io(socketURI, { transports: ['websocket', 'polling'] });
		this.socket.on('connect', this.onConnect.bind(this));
		this.socket.on('connect_error', this.onConnectError.bind(this));
		this.socket.on('disconnect', this.onDisconnect.bind(this));
		this.socket.on('data', this.onData.bind(this));
	}

	private tryReconnect(timeout: number = this.retryTimeout) {
		clearTimeout(this.retryTimeoutAfterError);

		this.log(`Trying to reconnect in ${timeout / 1000} seconds...`);

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
					this.tryReconnect(
						nextTimeout(timeout ?? this.retryTimeout, this.maxRetryTimeout)
					);
					return;
				}
				this.initializeSocket();
			}
		}, timeout);
	}

	private async onConnect() {
		this.log(`Connected to ${this.api.getSocketURL(this.sessionId)}`);
		this.log('Successfully reconnected. Resubscribing to old state...');
		ux4iotState.resetState();
		console.log('onSessionId called with', this.sessionId);
		this.onSessionId?.(this.sessionId); // this callback should be used to reestablish all subscriptions
		this.onSocketConnectionUpdate?.(...NETWORK_STATES.CONNECTED);
		clearTimeout(this.retryTimeoutAfterError);
	}

	private onConnectError() {
		this.log(`on connect error called`);
		const socketURL = this.api.getSocketURL(this.sessionId);
		this.log(`Failed to establish websocket to ${socketURL}`);
		const [reason, description] = NETWORK_STATES.SERVER_UNAVAILABLE;
		this.onSocketConnectionUpdate?.(reason, description);
		this.tryReconnect();
	}

	private onDisconnect(error: unknown) {
		this.log(`on disconnect called`);
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
		clearTimeout(this.retryTimeoutAfterError);
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
									if (m.telemetry[telemetryKey] !== undefined) {
										telemetry[telemetryKey] = m.telemetry[telemetryKey];
									}
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
			onData(response.deviceId, response.data as any, response.timestamp);
			try {
				// this if block is used as an optimization.
				// When the number of subscribers is bigger than 0 then we do not need to fire a subscription request
				// If the request fails, then we do not need to remove the subscription, since it will only be added after
				// the subscribe request is successful
				// If the number of subscribers isn't 0 then we know that the request succeeded in the past
				if (ux4iotState.getNumberOfSubscribers(subscriptionRequest) === 0) {
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

	async subscribeAllTelemetry(
		sessionId: string,
		deviceId: string,
		telemetryKeys: string[],
		subscriberId: string,
		onData: TelemetryCallback,
		onSubscriptionError?: SubscriptionErrorCallback,
		onGrantError?: GrantErrorCallback
	) {
		const subscriptionRequests: TelemetrySubscriptionRequest[] =
			telemetryKeys.map(telemetryKey => ({
				sessionId,
				deviceId,
				telemetryKey,
				type: 'telemetry',
			}));
		const grantRequest: GrantRequest = {
			sessionId,
			deviceId,
			type: 'telemetry',
			telemetryKey: null,
		};
		await this.grant(grantRequest, onGrantError);
		if (ux4iotState.hasGrant(grantRequest)) {
			const response = await this.getLastTelemetryValues(
				deviceId,
				subscriptionRequests
			);
			// response.data = { [telemetryKey]: { value: v, timestamp: t }, ...}
			onData(response.deviceId, response.data, response.timestamp);
			try {
				const filteredSubscriptions = subscriptionRequests.filter(
					s => ux4iotState.getNumberOfSubscribers(s) === 0
				);
				if (filteredSubscriptions.length > 0) {
					await this.api.subscribeAll(filteredSubscriptions);
				}
				// we have to iterate over all subscriptionRequests because the state needs to save all subscribers with subscriberId
				for (const sr of subscriptionRequests) {
					ux4iotState.addSubscription(subscriberId, sr, onData);
				}
			} catch (error) {
				onSubscriptionError?.((error as AxiosError).response?.data);
			}
		} else {
			onSubscriptionError?.('No grant for subscription');
			for (const sr of subscriptionRequests) {
				ux4iotState.removeSubscription(subscriberId, sr);
			}
		}
	}

	async unsubscribeAllTelemetry(
		sessionId: string,
		deviceId: string,
		telemetryKeys: string[],
		subscriberId: string,
		onSubscriptionError?: SubscriptionErrorCallback,
		onGrantError?: GrantErrorCallback
	) {
		const subscriptionRequests: TelemetrySubscriptionRequest[] =
			telemetryKeys.map(telemetryKey => ({
				sessionId,
				deviceId,
				telemetryKey,
				type: 'telemetry',
			}));
		const grantRequest: GrantRequest = {
			sessionId,
			deviceId,
			type: 'telemetry',
			telemetryKey: null,
		};
		await this.grant(grantRequest, onGrantError);
		if (ux4iotState.hasGrant(grantRequest)) {
			try {
				const filteredSubscriptions = subscriptionRequests.filter(
					s => ux4iotState.getNumberOfSubscribers(s) === 1
				);
				if (filteredSubscriptions.length > 0) {
					await this.api.unsubscribeAll(filteredSubscriptions);
				}
				// we have to iterate over all subscriptionRequests because the state needs to save all subscribers with subscriberId
				for (const sr of subscriptionRequests) {
					ux4iotState.removeSubscription(subscriberId, sr);
				}
			} catch (error) {
				onSubscriptionError?.((error as AxiosError).response?.data);
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

	async removeSubscriberId(subscriberId: string, sessionId: string) {
		const subscriptions = ux4iotState.state.subscriptions[subscriberId];
		if (subscriptions) {
			const byDeviceId = subscriptions.reduce<
				Record<string, ux4iotState.Subscription[]>
			>((acc, sub) => {
				(acc[sub.deviceId] = acc[sub.deviceId] || []).push(sub);
				return acc;
			}, {});

			for (const [deviceId, subscriptions] of Object.entries(byDeviceId)) {
				for (const sub of subscriptions) {
					try {
						if (sub.type === 'telemetry') {
							await this.unsubscribeAllTelemetry(
								sessionId,
								deviceId,
								sub.telemetryKeys,
								subscriberId
							);
						} else {
							await this.unsubscribe(subscriberId, sub);
						}
					} catch (error) {
						console.warn(
							'could not unsubscribe subscriberId',
							subscriberId,
							error
						);
					}
				}
			}
		}
		ux4iotState.cleanSubId(subscriberId);
	}

	async getLastTelemetryValues(
		deviceId: string,
		subscriptionRequest: TelemetrySubscriptionRequest[]
	): Promise<LastValueResponse<Record<string, LastValueObj<CachedValueType>>>> {
		const telemetryKeys = subscriptionRequest.map(
			sr => sr.telemetryKey as string
		);
		return this.api.getLastTelemetryValues(deviceId, telemetryKeys);
	}

	async getLastValueForSubscriptionRequest(
		subscriptionRequest: SubscriptionRequest
	): Promise<
		| LastValueTelemetryResponse
		| LastValueConnectionStateResponse
		| LastValueDeviceTwinResponse
		| LastValueResponse<undefined>
	> {
		const { type, deviceId } = subscriptionRequest;
		try {
			switch (type) {
				case 'connectionState':
					return await this.api.getLastConnectionState(deviceId);
				case 'deviceTwin':
					return await this.api.getLastDeviceTwin(deviceId);
				case 'telemetry': {
					const { telemetryKey } = subscriptionRequest;
					return await this.api.getLastTelemetryValue(
						deviceId,
						telemetryKey as string
					);
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
