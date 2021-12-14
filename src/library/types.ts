import { Twin } from 'azure-iothub';
import {
	ConnectionStateMessage,
	DeviceTwinMessage,
	GrantRequest,
	RawD2CMessage,
	TelemetryMessage,
} from './ux4iot-shared';

export function isTelemetryMessage(
	message: Record<string, unknown>
): message is TelemetryMessage {
	return !!message.telemetry;
}

export function isDeviceTwinMessage(
	message: Record<string, unknown>
): message is DeviceTwinMessage {
	return !!message.deviceTwin;
}

export function isConnectionStateMessage(
	message: Record<string, unknown>
): message is ConnectionStateMessage {
	return !!message.connectionState;
}

export function isRawMessage(
	message: Record<string, unknown>
): message is RawD2CMessage {
	return !!message.message;
}

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

export type InitializationOptions =
	| InitializeDevOptions
	| InitializeProdOptions;
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
	value: Record<string, unknown>,
	timestamp?: string
) => void;
export type DeviceTwinCallback = (deviceId: string, deviceTwin: Twin) => void;
export type ConnectionStateCallback = (
	deviceId: string,
	connectionState: boolean
) => void;
export type RawD2CMessageCallback = (
	deviceId: string,
	message: Record<string, unknown>,
	timestamp?: string
) => void;

export type PatchDesiredPropertiesOptions = Record<string, unknown>;

export type GrantErrorCallback = (error: GRANT_RESPONSES) => void;
