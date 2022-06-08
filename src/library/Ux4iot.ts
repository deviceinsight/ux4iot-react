import { io, Socket } from 'socket.io-client';
import {
	InitializationOptions,
	isDevOptions,
	ConnectionUpdateFunction,
} from './types';

import { Message } from './ux4iot-shared';

import { GrantableState } from './state/GrantableState';
import { Ux4iotApi } from './data/Ux4iotApi';
import { Subscription } from './data/Subscription';

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
	grantableState: GrantableState;
	api: Ux4iotApi;
	retryTimeoutAfterError = 0;
	onSocketConnectionUpdate?: ConnectionUpdateFunction;

	constructor(options: InitializationOptions) {
		const { onSocketConnectionUpdate } = options;
		this.api = new Ux4iotApi(options);
		this.devMode = isDevOptions(options);
		this.onSocketConnectionUpdate = onSocketConnectionUpdate;
		this.grantableState = new GrantableState(this.api);

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
				this.api.setSessionId(sessionId);
				await this.grantableState.establishAll();
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
		this.onSocketConnectionUpdate &&
			this.onSocketConnectionUpdate('socket_connect');
		clearTimeout(this.retryTimeoutAfterError as unknown as NodeJS.Timeout);
		await this.grantableState?.establishAll();
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

	private async onData(data: Message) {
		this.grantableState.desiredState.forEach(
			s => s instanceof Subscription && s.onData(data)
		);
	}

	public async destroy(): Promise<void> {
		this.socket?.disconnect();
		this.socket = undefined;
		await this.grantableState?.unsubscribeAll();
		clearTimeout(this.retryTimeoutAfterError as unknown as NodeJS.Timeout);
		this.log('socket with id', this.sessionId, 'destroyed');
	}
}
