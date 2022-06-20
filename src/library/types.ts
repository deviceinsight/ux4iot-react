import { GrantRequest, TwinUpdate } from './ux4iot-shared';

export type Subscribers = Record<string, string[]>;

export enum GRANT_RESPONSES {
	FORBIDDEN = 'FORBIDDEN',
	UNAUTHORIZED = 'UNAUTHORIZED',
	GRANTED = 'GRANTED',
	ERROR = 'ERROR',
}

export type GrantRequestFunctionType = (
	grant: GrantRequest
) => Promise<GRANT_RESPONSES>;

export type ConnectionUpdateReason =
	| 'socket_connect'
	| 'socket_connect_error'
	| 'socket_disconnect'
	| 'ux4iot_unreachable';

export type ConnectionUpdateFunction = (
	reason: ConnectionUpdateReason,
	description?: string
) => void;

export type InitializationOptions = {
	onSocketConnectionUpdate?: ConnectionUpdateFunction;
} & (InitializeDevOptions | InitializeProdOptions);
export type InitializeDevOptions = {
	adminConnectionString: string;
};
export type InitializeProdOptions = {
	ux4iotURL: string;
	grantRequestFunction: GrantRequestFunctionType;
};
export function isDevOptions(
	options: Record<string, unknown>
): options is InitializeDevOptions {
	return !!options.adminConnectionString;
}
export function isProdOptions(
	options: Record<string, unknown>
): options is InitializeProdOptions {
	return !!options.grantRequestFunction && !!options.ux4iotURL;
}

export type TelemetryCallback = (
	deviceId: string,
	telemetry: Record<string, unknown>,
	timestamp?: string
) => void;
export type DeviceTwinCallback = (
	deviceId: string,
	deviceTwin: TwinUpdate
) => void;
export type ConnectionStateCallback = (
	deviceId: string,
	connectionState: boolean
) => void;
export type D2CMessageCallback = (
	deviceId: string,
	message: Record<string, unknown>,
	timestamp?: string
) => void;

export type MessageCallback =
	| TelemetryCallback
	| DeviceTwinCallback
	| ConnectionStateCallback
	| D2CMessageCallback;

export type PatchDesiredPropertiesOptions = Record<string, unknown>;

export type GrantErrorCallback = (error: GRANT_RESPONSES) => void;
export type SubscriptionErrorCallback = (error: any) => void;
