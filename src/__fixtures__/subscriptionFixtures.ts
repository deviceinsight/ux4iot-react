import {
	TelemetrySubscriptionRequest,
	DeviceTwinSubscriptionRequest,
	ConnectionStateSubscriptionRequest,
	D2CMessageSubscriptionRequest,
} from '../library';

export const mockedTelemetrySubscription = (
	sessionId: string
): TelemetrySubscriptionRequest => ({
	type: 'telemetry',
	deviceId: 'mockedDeviceId',
	telemetryKey: 'mockedTelemetryKey',
	sessionId,
});
export const mockedTelemetrySubscription2 = (
	sessionId: string
): TelemetrySubscriptionRequest => ({
	type: 'telemetry',
	deviceId: 'mockedDeviceId2',
	telemetryKey: 'mockedTelemetryKey2',
	sessionId,
});
export const mockedTelemetrySubscription3 = (
	sessionId: string
): TelemetrySubscriptionRequest => ({
	type: 'telemetry',
	deviceId: 'mockedDeviceId',
	telemetryKey: 'mockedTelemetryKey2',
	sessionId,
});
export const mockedDeviceTwinSubscription = (
	sessionId: string
): DeviceTwinSubscriptionRequest => ({
	type: 'deviceTwin',
	deviceId: 'mockedDeviceId',
	sessionId,
});
export const mockedConnectionStateSubscription = (
	sessionId: string
): ConnectionStateSubscriptionRequest => ({
	type: 'connectionState',
	deviceId: 'mockedDeviceId',
	sessionId,
});
export const mockedD2CMessagesSubscription = (
	sessionId: string
): D2CMessageSubscriptionRequest => ({
	type: 'd2cMessages',
	deviceId: 'mockedDeviceId',
	sessionId,
});
