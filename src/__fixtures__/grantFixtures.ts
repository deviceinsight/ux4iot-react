import {
	TelemetryGrantRequest,
	DeviceTwinGrantRequest,
	DirectMethodGrantRequest,
	ConnectionStateGrantRequest,
	DesiredPropertyGrantRequest,
	RawD2CMessageGrantRequest,
} from '../library';

export const mockedTelemetryGrant = (
	sessionId: string
): TelemetryGrantRequest => ({
	grantType: 'subscribeToTelemetry',
	deviceId: 'mockedDeviceId',
	telemetryKey: 'mockedTelemetryKey',
	sessionId: sessionId,
});
export const mockedTelemetryGrant2 = (
	sessionId: string
): TelemetryGrantRequest => ({
	grantType: 'subscribeToTelemetry',
	deviceId: 'mockedDeviceId2',
	telemetryKey: 'mockedTelemetryKey2',
	sessionId: sessionId,
});
export const mockedDeviceTwinGrant = (
	sessionId: string
): DeviceTwinGrantRequest => ({
	grantType: 'subscribeToDeviceTwin',
	deviceId: 'mockedDeviceId',
	sessionId: sessionId,
});
export const mockedDirectMethodGrant = (
	sessionId: string
): DirectMethodGrantRequest => ({
	grantType: 'invokeDirectMethod',
	deviceId: 'mockedDeviceId',
	directMethodName: 'mockedDirectMethod',
	sessionId: sessionId,
});
export const mockedConnectionStateGrant = (
	sessionId: string
): ConnectionStateGrantRequest => ({
	grantType: 'subscribeToConnectionState',
	deviceId: 'mockedDeviceId',
	sessionId: sessionId,
});
export const mockedDesiredPropertiesGrant = (
	sessionId: string
): DesiredPropertyGrantRequest => ({
	grantType: 'modifyDesiredProperties',
	deviceId: 'mockedDeviceId',
	sessionId: sessionId,
});
export const mockedRawD2CMessagesGrant = (
	sessionId: string
): RawD2CMessageGrantRequest => ({
	grantType: 'subscribeToD2CMessages',
	deviceId: 'mockedDeviceId',
	sessionId: sessionId,
});
