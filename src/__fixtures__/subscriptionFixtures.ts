import {
	TelemetrySubscriptionRequest,
	DeviceTwinSubscriptionRequest,
	ConnectionStateSubscriptionRequest,
	RawD2CMessageSubscriptionRequest,
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
export const mockedRawD2CMessagesSubscription = (
	sessionId: string
): RawD2CMessageSubscriptionRequest => ({
	type: 'd2cMessages',
	deviceId: 'mockedDeviceId',
	sessionId,
});
