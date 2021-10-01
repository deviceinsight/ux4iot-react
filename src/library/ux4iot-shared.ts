import { Twin } from 'azure-iothub';

export type DeviceId = string;

// Requests
type GrantRequestBase<T> = {
	deviceId: string;
	sessionId: string;
} & T;
export type TelemetryGrantRequest = GrantRequestBase<{
	grantType: 'subscribeToTelemetry';
	telemetryKey?: string | null; // null means: Access to all telemetry keys
}>;
export type DeviceTwinGrantRequest = GrantRequestBase<{
	grantType: 'subscribeToDeviceTwin';
}>;
export type ConnectionStateGrantRequest = GrantRequestBase<{
	grantType: 'subscribeToConnectionState';
}>;
export type DesiredPropertyGrantRequest = GrantRequestBase<{
	grantType: 'modifyDesiredProperties';
}>;
export type DirectMethodGrantRequest = GrantRequestBase<{
	grantType: 'invokeDirectMethod';
	directMethodName: string | null; // null means: Access to all direct methods
}>;
export type RawD2CMessageGrantRequest = GrantRequestBase<{
	grantType: 'subscribeToD2CMessages';
}>;

export type GrantRequest =
	| TelemetryGrantRequest
	| DeviceTwinGrantRequest
	| ConnectionStateGrantRequest
	| DesiredPropertyGrantRequest
	| DirectMethodGrantRequest
	| RawD2CMessageGrantRequest;

export type ConnectionState = {
	connected: boolean;
};

export type MessageBase<T> = {
	deviceId: DeviceId;
} & T;

export type TelemetryMessage = MessageBase<{
	telemetry: Record<string, unknown>;
}>;

export type ConnectionStateMessage = MessageBase<{
	connectionState: ConnectionState;
}>;

export type DeviceTwinMessage = MessageBase<{
	deviceTwin: Twin;
}>;

export type RawD2CMessage = MessageBase<{
	message: Record<string, unknown>;
}>;

export type Message =
	| TelemetryMessage
	| ConnectionStateMessage
	| DeviceTwinMessage
	| RawD2CMessage;

export type IoTHubResponse = {
	status: number;
	payload: unknown;
};

export type LogLevel = 'error' | 'warn' | 'info' | 'verbose' | 'debug';

export type ParsedConnectionString = {
	Endpoint: string;
	SharedAccessKey: string;
};

export function parseConnectionString(
	connectionString: string
): ParsedConnectionString {
	const parsed = connectionString.split(';').reduce((acc, part) => {
		const i = part.indexOf('=');
		if (i < 0) return acc;

		const key = part.substring(0, i);
		const value = part.substring(i + 1);

		acc[key as keyof ParsedConnectionString] = value;
		return acc;
	}, {} as ParsedConnectionString);

	if (!parsed.Endpoint || !parsed.SharedAccessKey) {
		throw new Error(
			`Invalid Connection String: make sure "Endpoint=..." and "SharedAccessKey=..." is present in your connection string.`
		);
	}
	return parsed;
}
