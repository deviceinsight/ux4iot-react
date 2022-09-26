import {
	TelemetryGrantRequest,
	DeviceTwinGrantRequest,
	DirectMethodGrantRequest,
	ConnectionStateGrantRequest,
	DesiredPropertyGrantRequest,
	D2CMessageGrantRequest,
} from '../library';

export const mockedTelemetryGrant = (
	sessionId: string
): TelemetryGrantRequest => ({
	type: 'telemetry',
	deviceId: 'mockedDeviceId',
	telemetryKey: 'mockedTelemetryKey',
	sessionId,
});
export const mockedTelemetryGrant2 = (
	sessionId: string
): TelemetryGrantRequest => ({
	type: 'telemetry',
	deviceId: 'mockedDeviceId2',
	telemetryKey: 'mockedTelemetryKey2',
	sessionId,
});
export const mockedDeviceTwinGrant = (
	sessionId: string
): DeviceTwinGrantRequest => ({
	type: 'deviceTwin',
	deviceId: 'mockedDeviceId',
	sessionId,
});
export const mockedDirectMethodGrant = (
	sessionId: string
): DirectMethodGrantRequest => ({
	type: 'directMethod',
	deviceId: 'mockedDeviceId',
	directMethodName: 'mockedDirectMethod',
	sessionId,
});
export const mockedConnectionStateGrant = (
	sessionId: string
): ConnectionStateGrantRequest => ({
	type: 'connectionState',
	deviceId: 'mockedDeviceId',
	sessionId,
});
export const mockedDesiredPropertiesGrant = (
	sessionId: string
): DesiredPropertyGrantRequest => ({
	type: 'desiredProperties',
	deviceId: 'mockedDeviceId',
	sessionId,
});
export const mockedD2CMessagesGrant = (
	sessionId: string
): D2CMessageGrantRequest => ({
	type: 'd2cMessages',
	deviceId: 'mockedDeviceId',
	sessionId,
});
