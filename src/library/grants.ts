import {
	ConnectionStateGrantRequest,
	DesiredPropertyGrantRequest,
	DeviceTwinGrantRequest,
	DirectMethodGrantRequest,
	RawD2CMessageGrantRequest,
	TelemetryGrantRequest,
} from './ux4iot-shared';

export function createTelemetryGrant(
	sessionId: string,
	deviceId: string,
	telemetryKey: string
): TelemetryGrantRequest {
	return {
		grantType: 'subscribeToTelemetry',
		deviceId,
		sessionId,
		telemetryKey,
	};
}

export function createDeviceTwinGrant(
	sessionId: string,
	deviceId: string
): DeviceTwinGrantRequest {
	return {
		grantType: 'subscribeToDeviceTwin',
		deviceId,
		sessionId,
	};
}

export function createConnectionStateGrant(
	sessionId: string,
	deviceId: string
): ConnectionStateGrantRequest {
	return {
		grantType: 'subscribeToConnectionState',
		deviceId,
		sessionId,
	};
}

export function createDirectMethodGrant(
	sessionId: string,
	deviceId: string,
	directMethodName: string
): DirectMethodGrantRequest {
	return {
		grantType: 'invokeDirectMethod',
		deviceId,
		sessionId,
		directMethodName,
	};
}

export function createPatchDesiredPropertiesGrant(
	sessionId: string,
	deviceId: string
): DesiredPropertyGrantRequest {
	return {
		grantType: 'modifyDesiredProperties',
		deviceId,
		sessionId,
	};
}

export function createRawD2CMessageGrant(
	sessionId: string,
	deviceId: string
): RawD2CMessageGrantRequest {
	return {
		grantType: 'subscribeToD2CMessages',
		deviceId,
		sessionId,
	};
}
