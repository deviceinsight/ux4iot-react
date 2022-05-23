import { io, Socket } from 'socket.io-client';
import axios, { AxiosInstance } from 'axios';
import {
	cleanSubId,
	deserializeSubscriberState,
	deserializeTelemetrySubscriberState,
	makeSubKey,
	parseSubKey,
	printDevModeWarning,
} from './utils';
import {
	GrantRequestFunctionType,
	InitializationOptions,
	isConnectionStateMessage,
	isDeviceTwinMessage,
	isTelemetryMessage,
	isRawMessage,
	Subscribers,
	ConnectionStateCallback,
	DeviceTwinCallback,
	TelemetryCallback,
	RawD2CMessageCallback,
	isDevOptions,
	isProdOptions,
	GrantErrorCallback,
	GRANT_RESPONSES,
	ConnectionUpdateReason,
	ConnectionUpdateFunction,
} from './types';
import {
	createTelemetryGrant,
	createDeviceTwinGrant,
	createConnectionStateGrant,
	createDirectMethodGrant,
	createPatchDesiredPropertiesGrant,
	createRawD2CMessageGrant,
} from './grants';
import {
	GrantRequest,
	Message,
	parseConnectionString,
	IoTHubResponse,
} from './ux4iot-shared';

import { DeviceMethodParams } from 'azure-iothub';

const RECONNECT_TIMEOUT = 5000;
const DISCONNECTED_MESSAGE = `Disconnected / Error Connecting. Trying to reconnect in ${
	RECONNECT_TIMEOUT / 1000
} seconds.`;
const INIT_ERROR_MESSAGE = `Failed to fetch sessionId of ux4iot. Attempting again in ${
	RECONNECT_TIMEOUT / 1000
} seconds.`;
const CLIENT_DISCONNECTED_MESSAGE = 'Client manually disconnected';

const defaultGrantRequestFunction = (
	baseURL: string,
	sharedAccessKey: string
): GrantRequestFunctionType => {
	const axiosInstance = axios.create({
		baseURL,
		headers: { 'Shared-Access-Key': sharedAccessKey },
	});
	return async (grant: GrantRequest) => {
		try {
			await axiosInstance.put('/grants', grant);
		} catch (error) {
			if (axios.isAxiosError(error)) {
				if (error.response) {
					if (error.response.status === 401) {
						return GRANT_RESPONSES.UNAUTHORIZED;
					} else if (error.response.status === 403) {
						return GRANT_RESPONSES.FORBIDDEN;
					}
				}
			}
			return GRANT_RESPONSES.ERROR;
		}
		return GRANT_RESPONSES.GRANTED;
	};
};

export class Ux4iot {
	ux4iotURL: string;
	sessionId = '';
	socket: Socket | undefined;
	needsResubscribingAfterConnect = false;
	telemetrySubscribers: Record<string, TelemetryCallback>;
	deviceTwinSubscribers: Record<string, DeviceTwinCallback>;
	connectionStateSubscribers: Record<string, ConnectionStateCallback>;
	rawD2CMessageSubscribers: Record<string, RawD2CMessageCallback>;
	invokeDirectMethodGrants: Record<string, string[]>;
	patchDesiredPropertiesGrants: string[];
	grantRequestFunction: GrantRequestFunctionType;
	axiosInstance: AxiosInstance;
	devMode: boolean;
	retryTimeoutAfterError = 0;
	onSocketConnectionUpdate?: ConnectionUpdateFunction;

	constructor(
		ux4iotURL: string,
		grantRequestFunction: GrantRequestFunctionType,
		devMode = false,
		onSocketConnectionUpdate?: ConnectionUpdateFunction
	) {
		this.ux4iotURL = ux4iotURL;
		this.grantRequestFunction = grantRequestFunction;
		this.telemetrySubscribers = {};
		this.deviceTwinSubscribers = {};
		this.connectionStateSubscribers = {};
		this.rawD2CMessageSubscribers = {};
		this.invokeDirectMethodGrants = {};
		this.patchDesiredPropertiesGrants = [];
		this.axiosInstance = axios.create({
			baseURL: ux4iotURL,
		});
		this.devMode = devMode;
		this.onSocketConnectionUpdate = onSocketConnectionUpdate;
	}

	private log(...args: any[]) {
		if (this.devMode) {
			console.warn('ux4iot:', ...args);
		}
	}

	private async init(): Promise<void> {
		if (!this.socket) {
			let sessionId;
			try {
				const response = await this.axiosInstance.post('/session');
				sessionId = sessionId = response.data.sessionId;
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
			if (sessionId) {
				this.sessionId = sessionId;
				const socketURI = `${this.ux4iotURL}?sessionId=${this.sessionId}`;
				this.socket = io(socketURI);
				this.socket.on('connect', this.onConnect.bind(this));
				this.socket.on('connect_error', this.onConnectError.bind(this));
				this.socket.on('disconnect', this.onDisconnect.bind(this));
				this.socket.on('data', this.onData.bind(this));
			}
		}
	}

	static async create(options: InitializationOptions): Promise<Ux4iot> {
		let instance, endpoint, requestFunc, devMode;
		const { onSocketConnectionUpdate } = options;

		if (isDevOptions(options)) {
			printDevModeWarning();
			const { Endpoint, SharedAccessKey } = parseConnectionString(
				options.adminConnectionString
			);
			endpoint = Endpoint;
			requestFunc = defaultGrantRequestFunction(Endpoint, SharedAccessKey);
			devMode = true;
		} else if (isProdOptions(options)) {
			const { ux4iotURL, grantRequestFunction } = options;
			endpoint = ux4iotURL;
			requestFunc = grantRequestFunction;
			devMode = false;
		} else {
			throw new Error(
				'Insufficient arguments when trying to create Ux4iot instance'
			);
		}
		instance = new Ux4iot(
			endpoint,
			requestFunc,
			devMode,
			onSocketConnectionUpdate
		);
		await instance.init();

		return instance;
	}

	destroy(): void {
		this.socket?.disconnect();
		this.socket = undefined;
		clearTimeout(this.retryTimeoutAfterError as unknown as NodeJS.Timeout);
		this.log('socket with id', this.sessionId, 'destroyed');
	}

	private onConnect() {
		this.log(`Connected to ${this.ux4iotURL}`);
		this.log('Successfully reconnected. Resubscribing to old state...');
		this.onSocketConnectionUpdate &&
			this.onSocketConnectionUpdate('socket_connect');
		clearTimeout(this.retryTimeoutAfterError as unknown as NodeJS.Timeout);
		this.resubscribeState();
	}

	private onConnectError() {
		this.log(`Failed to establish websocket to ${this.ux4iotURL}`);
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

	private tryReconnect() {
		clearTimeout(this.retryTimeoutAfterError as unknown as NodeJS.Timeout);
		this.retryTimeoutAfterError = setTimeout(
			this.init.bind(this),
			RECONNECT_TIMEOUT
		) as unknown as number;
	}

	private async onData(data: Message) {
		if (isTelemetryMessage(data)) {
			for (const [subKey, callback] of Object.entries(
				this.telemetrySubscribers
			)) {
				const { deviceId, telemetryKey } = parseSubKey(subKey);
				for (const messageTelemetryKey of Object.keys(data.telemetry)) {
					if (
						deviceId === data.deviceId &&
						telemetryKey === messageTelemetryKey
					) {
						callback(deviceId, data.telemetry, data.timestamp);
					}
				}
			}
		} else if (isDeviceTwinMessage(data)) {
			for (const [subKey, callback] of Object.entries(
				this.deviceTwinSubscribers
			)) {
				const { deviceId } = parseSubKey(subKey);
				if (deviceId === data.deviceId) {
					callback(deviceId, data.deviceTwin);
				}
			}
		} else if (isConnectionStateMessage(data)) {
			for (const [subKey, callback] of Object.entries(
				this.connectionStateSubscribers
			)) {
				const { deviceId } = parseSubKey(subKey);
				if (deviceId === data.deviceId) {
					callback(deviceId, data.connectionState.connected);
				}
			}
		} else if (isRawMessage(data)) {
			for (const [subKey, callback] of Object.entries(
				this.rawD2CMessageSubscribers
			)) {
				const { deviceId } = parseSubKey(subKey);
				if (deviceId === data.deviceId) {
					callback(deviceId, data.message, data.timestamp);
				}
			}
		}
	}

	private async resubscribeTelemetrySubscribers() {
		const requests = Object.keys(this.telemetrySubscribers).map(subKey => {
			const { subscriberId, deviceId, telemetryKey } = parseSubKey(subKey);
			const g = createTelemetryGrant(this.sessionId, deviceId, telemetryKey);

			return this.grantRequestFunction(g).then(result => {
				if (result !== GRANT_RESPONSES.GRANTED) {
					const subKey = makeSubKey(subscriberId, deviceId, telemetryKey);
					delete this.telemetrySubscribers[subKey];
				}
			});
		});

		await Promise.all(requests);
	}

	private async resubscribeDeviceTwinSubscribers() {
		const requests = Object.keys(this.deviceTwinSubscribers).map(subKey => {
			const { subscriberId, deviceId } = parseSubKey(subKey);
			const g = createDeviceTwinGrant(this.sessionId, deviceId);

			return this.grantRequestFunction(g).then(result => {
				if (result !== GRANT_RESPONSES.GRANTED) {
					const subKey = makeSubKey(subscriberId, deviceId);
					delete this.deviceTwinSubscribers[subKey];
				}
			});
		});

		await Promise.all(requests);
	}

	private async resubscribeConnectionStateSubscribers() {
		const requests = Object.keys(this.connectionStateSubscribers).map(
			subKey => {
				const { subscriberId, deviceId } = parseSubKey(subKey);
				const g = createConnectionStateGrant(this.sessionId, deviceId);

				return this.grantRequestFunction(g).then(result => {
					if (result !== GRANT_RESPONSES.GRANTED) {
						const subKey = makeSubKey(subscriberId, deviceId);
						delete this.connectionStateSubscribers[subKey];
					}
				});
			}
		);

		await Promise.all(requests);
	}

	private async resubscribeDirectMethod() {
		const requests = Object.entries(this.invokeDirectMethodGrants).flatMap(
			([deviceId, methods]) => {
				return methods.map(method => {
					const g = createDirectMethodGrant(this.sessionId, deviceId, method);

					return this.grantRequestFunction(g).then(result => {
						if (result !== GRANT_RESPONSES.GRANTED) {
							this.invokeDirectMethodGrants[deviceId] =
								this.invokeDirectMethodGrants[deviceId].filter(
									m => method !== m
								);
						}
					});
				});
			}
		);
		await Promise.all(requests);
	}

	private async resubscribePatchDesiredProperties() {
		const requests = this.patchDesiredPropertiesGrants.map(deviceId => {
			const g = createPatchDesiredPropertiesGrant(this.sessionId, deviceId);

			return this.grantRequestFunction(g).then(result => {
				if (result !== GRANT_RESPONSES.GRANTED) {
					this.patchDesiredPropertiesGrants =
						this.patchDesiredPropertiesGrants.filter(d => d !== deviceId);
				}
			});
		});
		await Promise.all(requests);
	}

	private async resubscribeRawD2CMessageSubscribers() {
		const requests = Object.keys(this.rawD2CMessageSubscribers).map(subKey => {
			const { subscriberId, deviceId } = parseSubKey(subKey);
			const g = createRawD2CMessageGrant(this.sessionId, deviceId);

			return this.grantRequestFunction(g).then(result => {
				if (result !== GRANT_RESPONSES.GRANTED) {
					const subKey = makeSubKey(subscriberId, deviceId);
					delete this.rawD2CMessageSubscribers[subKey];
				}
			});
		});

		await Promise.all(requests);
	}

	private async resubscribeState() {
		this.log(
			'resubscribing to ',
			this.telemetrySubscribers,
			this.deviceTwinSubscribers,
			this.connectionStateSubscribers,
			this.invokeDirectMethodGrants,
			this.patchDesiredPropertiesGrants,
			this.rawD2CMessageSubscribers
		);
		await Promise.all([
			this.resubscribeTelemetrySubscribers(),
			this.resubscribeDeviceTwinSubscribers(),
			this.resubscribeConnectionStateSubscribers(),
			this.resubscribeDirectMethod(),
			this.resubscribePatchDesiredProperties(),
			this.resubscribeRawD2CMessageSubscribers(),
		]);
	}

	public toggleTelemetry(
		subscriberId: string,
		deviceId: string,
		telemetryKey: string,
		onTelemetry: TelemetryCallback,
		onError?: GrantErrorCallback
	): Promise<Subscribers> {
		const subscriberKey = makeSubKey(subscriberId, deviceId, telemetryKey);

		return this.telemetrySubscribers[subscriberKey]
			? this.unregisterTelemetrySubscriber(subscriberId, deviceId, telemetryKey)
			: this.registerTelemetrySubscriber(
					subscriberId,
					deviceId,
					telemetryKey,
					onTelemetry,
					onError
			  );
	}

	public hasTelemetrySubscription(
		subscriberId: string,
		deviceId: string,
		telemetryKey: string
	): boolean {
		const subKey = makeSubKey(subscriberId, deviceId, telemetryKey);
		return this.telemetrySubscribers[subKey] !== undefined;
	}

	public hasDeviceTwinSubscription(
		subscriberId: string,
		deviceId: string
	): boolean {
		const subKey = makeSubKey(subscriberId, deviceId);
		return this.deviceTwinSubscribers[subKey] !== undefined;
	}

	public hasConnectionStateSubscription(
		subscriberId: string,
		deviceId: string
	): boolean {
		const subKey = makeSubKey(subscriberId, deviceId);
		return this.connectionStateSubscribers[subKey] !== undefined;
	}

	public cleanupSubscriberId(id: string): void {
		this.log('Removing all subscriptions with subscriberId', id);

		this.telemetrySubscribers = cleanSubId(id, this.telemetrySubscribers);
		this.deviceTwinSubscribers = cleanSubId(id, this.deviceTwinSubscribers);
		this.connectionStateSubscribers = cleanSubId(
			id,
			this.connectionStateSubscribers
		);
		this.rawD2CMessageSubscribers = cleanSubId(
			id,
			this.rawD2CMessageSubscribers
		);
	}

	public async registerTelemetrySubscriber(
		subscriberId: string,
		deviceId: string,
		telemetryKey: string,
		onTelemetry: TelemetryCallback,
		onError?: GrantErrorCallback
	): Promise<Subscribers> {
		const subscriberKey = makeSubKey(subscriberId, deviceId, telemetryKey);
		this.telemetrySubscribers[subscriberKey] = onTelemetry;

		const grant = createTelemetryGrant(this.sessionId, deviceId, telemetryKey);
		const result = await this.grantRequestFunction(grant);

		if (result !== GRANT_RESPONSES.GRANTED && onError) {
			onError(result);
		}

		return deserializeTelemetrySubscriberState(
			subscriberId,
			this.telemetrySubscribers
		);
	}

	public async unregisterTelemetrySubscriber(
		subscriberId: string,
		deviceId: string,
		telemetryKey: string
	): Promise<Subscribers> {
		const subscriberKey = makeSubKey(subscriberId, deviceId, telemetryKey);
		delete this.telemetrySubscribers[subscriberKey];

		return deserializeTelemetrySubscriberState(
			subscriberId,
			this.telemetrySubscribers
		);
	}

	public async registerDeviceTwinSubscriber(
		subscriberId: string,
		deviceId: string,
		onDeviceTwin: DeviceTwinCallback,
		onError?: GrantErrorCallback
	): Promise<string[]> {
		const subscriberKey = makeSubKey(subscriberId, deviceId);
		this.deviceTwinSubscribers[subscriberKey] = onDeviceTwin;

		const grant = createDeviceTwinGrant(this.sessionId, deviceId);
		const result = await this.grantRequestFunction(grant);

		if (result !== GRANT_RESPONSES.GRANTED && onError) {
			onError(result);
		}

		return deserializeSubscriberState(subscriberId, this.deviceTwinSubscribers);
	}

	public async unregisterDeviceTwinSubscriber(
		subscriberId: string,
		deviceId: string
	): Promise<string[]> {
		const subscriberKey = makeSubKey(subscriberId, deviceId);
		delete this.deviceTwinSubscribers[subscriberKey];

		return deserializeSubscriberState(subscriberId, this.deviceTwinSubscribers);
	}

	public async registerConnectionStateSubscriber(
		subscriberId: string,
		deviceId: string,
		onConnectionState: ConnectionStateCallback,
		onError?: GrantErrorCallback
	): Promise<string[]> {
		const subscriberKey = makeSubKey(subscriberId, deviceId);
		this.connectionStateSubscribers[subscriberKey] = onConnectionState;

		const grant = createConnectionStateGrant(this.sessionId, deviceId);
		const result = await this.grantRequestFunction(grant);

		if (result !== GRANT_RESPONSES.GRANTED && onError) {
			onError(result);
		}

		return deserializeSubscriberState(
			subscriberId,
			this.connectionStateSubscribers
		);
	}

	public async unregisterConnectionStateSubscriber(
		subscriberId: string,
		deviceId: string
	): Promise<string[]> {
		const subscriberKey = makeSubKey(subscriberId, deviceId);
		delete this.connectionStateSubscribers[subscriberKey];

		return deserializeSubscriberState(
			subscriberId,
			this.connectionStateSubscribers
		);
	}

	public hasDirectMethodGrant(deviceId: string, methodName: string): boolean {
		return !!this.invokeDirectMethodGrants[deviceId]?.includes(methodName);
	}

	public async registerDirectMethod(
		deviceId: string,
		methodName: string,
		onError?: GrantErrorCallback
	): Promise<void> {
		const grant = createDirectMethodGrant(this.sessionId, deviceId, methodName);
		const result = await this.grantRequestFunction(grant);

		if (result !== GRANT_RESPONSES.GRANTED && onError) {
			onError(result);
		}

		if (this.invokeDirectMethodGrants[deviceId]) {
			this.invokeDirectMethodGrants[deviceId].push(methodName);
		} else {
			this.invokeDirectMethodGrants[deviceId] = [methodName];
		}
	}

	public async invokeDirectMethod(
		deviceId: string,
		options: DeviceMethodParams,
		onError?: GrantErrorCallback
	): Promise<IoTHubResponse | void> {
		if (!this.hasDirectMethodGrant(deviceId, options.methodName)) {
			await this.registerDirectMethod(deviceId, options.methodName, onError);
		}
		const response = await this.axiosInstance.post(
			'/directMethod',
			{
				deviceId,
				methodParams: options,
			},
			{
				headers: {
					sessionId: this.sessionId,
				},
			}
		);

		return response.data;
	}

	public hasPatchDesiredPropertiesGrant(deviceId: string): boolean {
		return this.patchDesiredPropertiesGrants.includes(deviceId);
	}

	public async registerPatchDesiredProperties(
		deviceId: string,
		onError?: GrantErrorCallback
	): Promise<void> {
		const grant = createPatchDesiredPropertiesGrant(this.sessionId, deviceId);
		const result = await this.grantRequestFunction(grant);

		if (result !== GRANT_RESPONSES.GRANTED && onError) {
			onError(result);
		}

		this.patchDesiredPropertiesGrants.push(deviceId);
	}

	public async patchDesiredProperties(
		deviceId: string,
		desiredPropertyPatch: Record<string, unknown>,
		onError?: GrantErrorCallback
	): Promise<IoTHubResponse | void> {
		if (!this.hasPatchDesiredPropertiesGrant(deviceId)) {
			await this.registerPatchDesiredProperties(deviceId, onError);
		}
		if (this.patchDesiredPropertiesGrants.includes(deviceId)) {
			const response = await this.axiosInstance.patch<IoTHubResponse | void>(
				'/deviceTwinDesiredProperties',
				{ deviceId, desiredPropertyPatch },
				{
					headers: {
						sessionId: this.sessionId,
					},
				}
			);

			return response.data;
		}
	}

	public async registerRawD2CMessageSubscriber(
		subscriberId: string,
		deviceId: string,
		onMessage: RawD2CMessageCallback,
		onError?: GrantErrorCallback
	): Promise<string[]> {
		const subscriberKey = makeSubKey(subscriberId, deviceId);
		this.rawD2CMessageSubscribers[subscriberKey] = onMessage;

		const grant = createRawD2CMessageGrant(this.sessionId, deviceId);
		const result = await this.grantRequestFunction(grant);

		if (result !== GRANT_RESPONSES.GRANTED && onError) {
			onError(result);
		}

		return deserializeSubscriberState(
			subscriberId,
			this.rawD2CMessageSubscribers
		);
	}

	public async unregisterRawD2CMessageSubscriber(
		subscriberId: string,
		deviceId: string
	): Promise<string[]> {
		const subscriberKey = makeSubKey(subscriberId, deviceId);
		delete this.rawD2CMessageSubscribers[subscriberKey];

		return deserializeSubscriberState(
			subscriberId,
			this.rawD2CMessageSubscribers
		);
	}
}
