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
import {
	getGrantFromSubscriptionRequest,
	isConnectionStateMessage,
	isD2CMessage,
	isDeviceTwinMessage,
	isTelemetryMessage,
} from './utils';
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
				this.onSocketConnectionUpdate?.(
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
		this.onSessionId?.(this.sessionId);
		this.onSocketConnectionUpdate?.('socket_connect');
		clearTimeout(this.retryTimeoutAfterError as unknown as NodeJS.Timeout);
		ux4iotState.resetState();
	}

	private onConnectError() {
		this.log(
			`Failed to establish websocket to ${this.api.getSocketURL(
				this.sessionId
			)}`
		);
		this.onSocketConnectionUpdate?.(
			'socket_connect_error',
			DISCONNECTED_MESSAGE
		);
		this.tryReconnect();
	}

	private onDisconnect(error: unknown) {
		if (error === 'io client disconnect') {
			this.log(CLIENT_DISCONNECTED_MESSAGE, error);
			this.onSocketConnectionUpdate?.(
				'socket_disconnect',
				CLIENT_DISCONNECTED_MESSAGE
			);
		} else {
			this.log(DISCONNECTED_MESSAGE, error);
			this.onSocketConnectionUpdate?.(
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
		await this.unsubscribeAll();
		ux4iotState.resetState();
		clearTimeout(this.retryTimeoutAfterError as unknown as NodeJS.Timeout);
		this.log('socket with id', this.sessionId, 'destroyed');
	}

	private async onData(m: Message) {
		for (const subscriptions of Object.values(
			ux4iotState.state.subscriptions
		)) {
			for (const s of subscriptions) {
				const { type, deviceId } = s;
				if (deviceId === m.deviceId) {
					switch (type) {
						case 'telemetry': {
							if (isTelemetryMessage(m)) {
								const telemetry: Record<string, unknown> = {};
								for (const telemetryKey of s.telemetryKeys) {
									telemetry[telemetryKey] = m.telemetry[telemetryKey];
								}
								s.onData(m.deviceId, telemetry, m.timestamp);
							}
							break;
						}
						case 'connectionState':
							isConnectionStateMessage(m) &&
								s.onData(m.deviceId, m.connectionState.connected, m.timestamp);
							break;
						case 'd2cMessages':
							isD2CMessage(m) && s.onData(m.deviceId, m.message, m.timestamp);
							break;
						case 'deviceTwin':
							isDeviceTwinMessage(m) &&
								s.onData(m.deviceId, m.deviceTwin, m.timestamp);
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
			for (const s of subscriptions) {
				const { onData, ...subRequest } = s;
				if (s.type === 'telemetry') {
					const { deviceId, type, telemetryKeys } = s;
					for (const telemetryKey of telemetryKeys) {
						const subReq = {
							sessionId: this.sessionId,
							telemetryKey,
							deviceId,
							type,
						};
						await this.unsubscribe(subscriberId, subReq);
					}
				} else {
					const subReq = {
						sessionId: this.sessionId,
						...subRequest,
					} as SubscriptionRequest;
					await this.unsubscribe(subscriberId, subReq);
				}
			}
		}
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
	}

	async grant(grantRequest: GrantRequest, onGrantError?: GrantErrorCallback) {
		if (ux4iotState.hasGrant(grantRequest)) {
			return;
		}
		try {
			await this.api.requestGrant(grantRequest);
			ux4iotState.addGrant(grantRequest);
		} catch (error) {
			onGrantError?.(error as GRANT_RESPONSES);
		}
	}

	async subscribe(
		subscriberId: string,
		subscriptionRequest: Omit<SubscriptionRequest, 'sessionId'>,
		onData: MessageCallback,
		onSubscriptionError?: SubscriptionErrorCallback,
		onGrantError?: GrantErrorCallback
	) {
		const sr = {
			...subscriptionRequest,
			sessionId: this.sessionId,
		} as SubscriptionRequest;
		ux4iotState.addSubscription(subscriberId, sr, onData);
		const grantRequest = getGrantFromSubscriptionRequest(sr);
		await this.grant(grantRequest, onGrantError);
		if (ux4iotState.hasGrant(grantRequest)) {
			try {
				const response = await this.getLastValueForSubscriptionRequest(sr);
				response &&
					onData(response.deviceId, response.data, response.timestamp);
				if (ux4iotState.getNumberOfSubscribers(sr) === 1) {
					await this.api.subscribe(subscriptionRequest);
				}
			} catch (error) {
				onSubscriptionError?.(error);
				ux4iotState.removeSubscription(subscriberId, sr);
			}
		} else {
			onSubscriptionError?.('No grant for subscription');
			ux4iotState.removeSubscription(subscriberId, sr);
		}
	}

	async unsubscribe(
		subscriberId: string,
		subscriptionRequest: Omit<SubscriptionRequest, 'sessionId'>,
		onSubscriptionError?: SubscriptionErrorCallback,
		onGrantError?: GrantErrorCallback
	) {
		const sr = {
			...subscriptionRequest,
			sessionId: this.sessionId,
		} as SubscriptionRequest;
		const subscription = ux4iotState.removeSubscription(subscriberId, sr);
		const grantRequest = getGrantFromSubscriptionRequest(sr);
		await this.grant(grantRequest, onGrantError);
		if (ux4iotState.hasGrant(grantRequest)) {
			try {
				if (ux4iotState.getNumberOfSubscribers(sr) === 0) {
					await this.api.unsubscribe(subscriptionRequest);
				}
			} catch (error) {
				ux4iotState.addSubscription(subscriberId, sr, subscription.onData);
				onSubscriptionError?.(error);
			}
		} else {
			onSubscriptionError?.('No grant for subscription');
			ux4iotState.addSubscription(subscriberId, sr, subscription.onData);
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
			for (const s of registered) {
				if (s.type === 'telemetry') {
					subscriptions[s.deviceId] = s.telemetryKeys;
				} else {
					subscriptions[s.deviceId] = [];
				}
			}
		}
		return subscriptions;
	}

	async removeSubscriberId(subscriberId: string) {
		const subscriptions = ux4iotState.state.subscriptions[subscriberId];

		if (subscriptions) {
			for (const s of subscriptions) {
				try {
					if (s.type === 'telemetry') {
						for (const telemetryKey of s.telemetryKeys) {
							const sr = { type: s.type, deviceId: s.deviceId, telemetryKey };
							await this.unsubscribe(subscriberId, sr);
						}
					} else {
						await this.unsubscribe(subscriberId, s);
					}
				} catch (error) {
					console.warn('couldnt unsubscribe subscriberId', subscriberId, error);
				}
			}
		}
		ux4iotState.cleanSubId(subscriberId);
	}

	async getLastValueForSubscriptionRequest(
		subscriptionRequest: SubscriptionRequest,
		onGrantError?: GrantErrorCallback,
		onSubscriptionError?: SubscriptionErrorCallback
	): Promise<{ deviceId: string; data: any; timestamp: string } | undefined> {
		const { type, deviceId } = subscriptionRequest;
		const grantRequest = getGrantFromSubscriptionRequest(subscriptionRequest);
		await this.grant(grantRequest, onGrantError);
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
					return Promise.resolve({ deviceId, data: {}, timestamp: '' });
				default:
					return Promise.resolve({ deviceId, data: {}, timestamp: '' });
			}
		} catch (error) {
			onSubscriptionError?.(error);
		}
	}
}
