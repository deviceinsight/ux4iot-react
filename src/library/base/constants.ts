import { ConnectionUpdateReason } from '../types';

export const RECONNECT_TIMEOUT = 5000;
export const TIMEOUT_SECONDS = RECONNECT_TIMEOUT / 1000;
export const NETWORK_STATES: Record<string, [ConnectionUpdateReason, string]> =
	{
		UX4IOT_OFFLINE: [
			'ux4iot_unreachable',
			`Failed to fetch sessionId of ux4iot. Attempting again in ${TIMEOUT_SECONDS} seconds.`,
		], // INIT_ERROR_MESSAGE],
		SERVER_UNAVAILABLE: [
			'socket_connect_error',
			'Could not establish connection to ux4iot websocket',
		], // SERVER_UNAVAILABLE_MESSAGE],
		CLIENT_DISCONNECTED: ['socket_disconnect', 'Client manually disconnected'], // CLIENT_DISCONNECTED_MESSAGE],
		SERVER_DISCONNECTED: [
			'socket_disconnect',
			`Disconnected / Error Connecting. Trying to reconnect in ${TIMEOUT_SECONDS} seconds.`,
		], // SERVER_DISCONNECTED_MESSAGE],
		CONNECTED: ['socket_connect', 'Connected to ux4iot websocket'],
	};
