// twins won't change in the forseeable future so instead of using the "Twin['properties] type"

// of the azure-iothub library a manual typing is used. azure-iothub isn't really getting updated..
export type TwinUpdate = {
	version: number;
	properties: {
		reported: {
			[key: string]: any;
		};
		desired: {
			[key: string]: any;
		};
	};
};

export type DeviceId = string;

// Requests
type GrantRequestBase<T> = {
	deviceId: string;
	sessionId: string;
} & T;
export type TelemetryGrantRequest = GrantRequestBase<{
	type: 'telemetry';
	telemetryKey?: string | null; // null means: Access to all telemetry keys
}>;
export type DeviceTwinGrantRequest = GrantRequestBase<{
	type: 'deviceTwin';
}>;
export type ConnectionStateGrantRequest = GrantRequestBase<{
	type: 'connectionState';
}>;
export type DesiredPropertyGrantRequest = GrantRequestBase<{
	type: 'desiredProperties';
}>;
export type DirectMethodGrantRequest = GrantRequestBase<{
	type: 'directMethod';
	directMethodName: string | null; // null means: Access to all direct methods
}>;
export type D2CMessageGrantRequest = GrantRequestBase<{
	type: 'd2cMessages';
}>;

export type GrantRequest =
	| TelemetryGrantRequest
	| DeviceTwinGrantRequest
	| ConnectionStateGrantRequest
	| DesiredPropertyGrantRequest
	| DirectMethodGrantRequest
	| D2CMessageGrantRequest;

type SubscriptionRequestBase<T> = {
	deviceId: string;
	sessionId: string;
} & T;
export type TelemetrySubscriptionRequest = SubscriptionRequestBase<{
	type: 'telemetry';
	telemetryKey: string | null; // null means: Access to all telemetry keys
}>;
export type DeviceTwinSubscriptionRequest = SubscriptionRequestBase<{
	type: 'deviceTwin';
}>;
export type ConnectionStateSubscriptionRequest = SubscriptionRequestBase<{
	type: 'connectionState';
}>;
export type D2CMessageSubscriptionRequest = SubscriptionRequestBase<{
	type: 'd2cMessages';
}>;

export type SubscriptionRequest =
	| TelemetrySubscriptionRequest // null means: Access to all telemetry keys
	| DeviceTwinSubscriptionRequest
	| ConnectionStateSubscriptionRequest
	| D2CMessageSubscriptionRequest;

export type ConnectionState = {
	connected: boolean;
};

export type MessageBase<T> = {
	deviceId: DeviceId;
	timestamp: string;
} & T;

export type TelemetryMessage = MessageBase<{
	telemetry: Record<string, unknown>;
}>;

export type ConnectionStateMessage = MessageBase<{
	connectionState: boolean;
}>;

export type DeviceTwinMessage = MessageBase<{
	deviceTwin: TwinUpdate;
}>;

export type D2CMessage = MessageBase<{
	message: Record<string, unknown>;
}>;

export type Message =
	| TelemetryMessage
	| ConnectionStateMessage
	| DeviceTwinMessage
	| D2CMessage;

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

// Typeguards

export const isGrantRequest = (request: unknown): request is GrantRequest => {
	return (
		!!request &&
		typeof (request as GrantRequest).deviceId === 'string' &&
		typeof (request as GrantRequest).sessionId === 'string'
	);
};

export const isTelemetryGrantRequest = (
	request: unknown
): request is TelemetryGrantRequest => {
	return (
		!!request &&
		isGrantRequest(request) &&
		(request as TelemetryGrantRequest).type === 'telemetry' &&
		typeof (request as TelemetryGrantRequest).telemetryKey === 'string'
	);
};
export const isDeviceTwinGrantRequest = (
	request: unknown
): request is DeviceTwinGrantRequest => {
	return (
		!!request &&
		isGrantRequest(request) &&
		(request as GrantRequest).type === 'deviceTwin'
	);
};
export const isConnectionStateGrantRequest = (
	request: unknown
): request is ConnectionStateGrantRequest => {
	return (
		!!request &&
		isGrantRequest(request) &&
		(request as GrantRequest).type === 'connectionState'
	);
};
export const isDesiredPropertyGrantRequest = (
	request: unknown
): request is DesiredPropertyGrantRequest => {
	return (
		!!request &&
		isGrantRequest(request) &&
		(request as GrantRequest).type === 'desiredProperties'
	);
};
export const isDirectMethodGrantRequest = (
	request: unknown
): request is DirectMethodGrantRequest => {
	return (
		!!request &&
		isGrantRequest(request) &&
		(request as GrantRequest).type === 'directMethod' &&
		typeof (request as DirectMethodGrantRequest).directMethodName === 'string'
	);
};
export const isD2CMessageGrantRequest = (
	request: unknown
): request is D2CMessageGrantRequest => {
	return (
		!!request &&
		isGrantRequest(request) &&
		(request as GrantRequest).type === 'd2cMessages'
	);
};

export type LastValueResponse<T> = {
	deviceId: string;
	data: T;
	timestamp: string;
};

export type CachedValueType =
	| string
	| boolean
	| number
	| Record<string, unknown>;

export type LastValueObj<T extends CachedValueType> = {
	value: T;
	timestamp: string; // iso date
};
export type LastValueTelemetryResponse = LastValueResponse<
	Record<string, LastValueObj<CachedValueType>>
>;
export type LastValueDeviceTwinResponse = LastValueResponse<TwinUpdate>;
export type LastValueConnectionStateResponse = LastValueResponse<boolean>;

export type LastValuesBodyConfig = {
	connectionState?: boolean;
	deviceTwin?: boolean;
	telemetry?: string[];
};
export type LastValuesRequestBody = Record<string, LastValuesBodyConfig>;
