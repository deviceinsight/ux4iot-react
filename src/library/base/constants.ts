import { ConnectionUpdateReason } from '../types';

export const RECONNECT_TIMEOUT = 5000;
export const TIMEOUT_SECONDS = RECONNECT_TIMEOUT / 1000;
export const NETWORK_STATES: Record<string, [ConnectionUpdateReason, string]> =
	{
		UX4IOT_OFFLINE: [
			'ux4iot_unreachable',
			`Failed to fetch sessionId of ux4iot. Attempting again in ${TIMEOUT_SECONDS} seconds.`,
		],
		SERVER_UNAVAILABLE: [
			'socket_connect_error',
			'Could not establish connection to ux4iot websocket',
		],
		CLIENT_DISCONNECTED: ['socket_disconnect', 'Client manually disconnected'],
		SERVER_DISCONNECTED: [
			'socket_disconnect',
			`Disconnected / Error Connecting. Trying to reconnect in ${TIMEOUT_SECONDS} seconds.`,
		],
		CONNECTED: ['socket_connect', 'Connected to ux4iot websocket'],
	};
