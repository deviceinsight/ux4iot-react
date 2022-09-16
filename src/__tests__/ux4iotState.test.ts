import { TelemetrySubscriptionRequest } from '../library';
import * as ux4iotState from '../library/base/ux4iotState';
import {
	mockedConnectionStateGrant,
	mockedDesiredPropertiesGrant,
	mockedDeviceTwinGrant,
	mockedDirectMethodGrant,
	mockedD2CMessagesGrant,
	mockedTelemetryGrant,
	mockedTelemetryGrant2,
} from '../__fixtures__/grantFixtures';
import {
	mockedConnectionStateSubscription,
	mockedDeviceTwinSubscription,
	mockedD2CMessagesSubscription,
	mockedTelemetrySubscription,
	mockedTelemetrySubscription2,
	mockedTelemetrySubscription3,
} from '../__fixtures__/subscriptionFixtures';

const sessionId = 'sessionId';

describe('ux4iotState', () => {
	it('has initial structure', () => {
		const state = ux4iotState.state;
		expect(state).toEqual({
			grants: {
				deviceTwin: [],
				connectionState: [],
				d2cMessages: [],
				telemetry: [],
				desiredProperties: [],
				directMethod: [],
			},
			subscriptions: {},
		});
	});

	it('adds grants', () => {
		ux4iotState.addGrant(mockedTelemetryGrant(sessionId));
		ux4iotState.addGrant(mockedTelemetryGrant2(sessionId));
		ux4iotState.addGrant(mockedConnectionStateGrant(sessionId));
		ux4iotState.addGrant(mockedDeviceTwinGrant(sessionId));
		ux4iotState.addGrant(mockedD2CMessagesGrant(sessionId));
		ux4iotState.addGrant(mockedDesiredPropertiesGrant(sessionId));
		ux4iotState.addGrant(mockedDirectMethodGrant(sessionId));

		expect(ux4iotState.state.grants).toEqual({
			connectionState: [
				{
					deviceId: 'mockedDeviceId',
					type: 'connectionState',
					sessionId: 'sessionId',
				},
			],
			d2cMessages: [
				{
					deviceId: 'mockedDeviceId',
					type: 'd2cMessages',
					sessionId: 'sessionId',
				},
			],
			desiredProperties: [
				{
					deviceId: 'mockedDeviceId',
					type: 'desiredProperties',
					sessionId: 'sessionId',
				},
			],
			deviceTwin: [
				{
					deviceId: 'mockedDeviceId',
					type: 'deviceTwin',
					sessionId: 'sessionId',
				},
			],
			directMethod: [
				{
					deviceId: 'mockedDeviceId',
					directMethodName: 'mockedDirectMethod',
					type: 'directMethod',
					sessionId: 'sessionId',
				},
			],
			telemetry: [
				{
					deviceId: 'mockedDeviceId',
					type: 'telemetry',
					sessionId: 'sessionId',
					telemetryKey: 'mockedTelemetryKey',
				},
				{
					deviceId: 'mockedDeviceId2',
					type: 'telemetry',
					sessionId: 'sessionId',
					telemetryKey: 'mockedTelemetryKey2',
				},
			],
		});
	});

	it('correctly determines hasGrantForSubscription', () => {
		const telemetrySub = mockedTelemetrySubscription(sessionId);
		const telemetrySub2 = mockedTelemetrySubscription2(sessionId);
		const telemetrySub3 = mockedTelemetrySubscription3(sessionId);
		const deviceTwinSub = mockedDeviceTwinSubscription(sessionId);
		const d2cMessageSub = mockedD2CMessagesSubscription(sessionId);
		const connectionStateSub = mockedConnectionStateSubscription(sessionId);

		expect(ux4iotState.hasGrantForSubscription(telemetrySub)).toBe(true);
		expect(ux4iotState.hasGrantForSubscription(telemetrySub2)).toBe(true);
		expect(ux4iotState.hasGrantForSubscription(telemetrySub3)).toBe(false);
		expect(ux4iotState.hasGrantForSubscription(deviceTwinSub)).toBe(true);
		expect(ux4iotState.hasGrantForSubscription(d2cMessageSub)).toBe(true);
		expect(ux4iotState.hasGrantForSubscription(connectionStateSub)).toBe(true);
	});
	it('removes grants', () => {
		ux4iotState.removeGrant(mockedTelemetryGrant2(sessionId));
		ux4iotState.removeGrant(mockedConnectionStateGrant(sessionId));
		ux4iotState.removeGrant(mockedDeviceTwinGrant(sessionId));
		ux4iotState.removeGrant(mockedD2CMessagesGrant(sessionId));
		ux4iotState.removeGrant(mockedDesiredPropertiesGrant(sessionId));
		ux4iotState.removeGrant(mockedDirectMethodGrant(sessionId));

		expect(ux4iotState.state.grants).toEqual({
			deviceTwin: [],
			connectionState: [],
			d2cMessages: [],
			telemetry: [
				{
					deviceId: 'mockedDeviceId',
					type: 'telemetry',
					sessionId: 'sessionId',
					telemetryKey: 'mockedTelemetryKey',
				},
			],
			desiredProperties: [],
			directMethod: [],
		});
	});

	it('adds subscriptions', () => {
		const m = jest.fn();
		const telemetrySub = mockedTelemetrySubscription(sessionId);
		const deviceTwinSub = mockedDeviceTwinSubscription(sessionId);
		const d2cMessageSub = mockedD2CMessagesSubscription(sessionId);
		const connectionStateSub = mockedConnectionStateSubscription(sessionId);

		ux4iotState.addSubscription('sub1', telemetrySub, m);
		ux4iotState.addSubscription('sub2', deviceTwinSub, m);
		ux4iotState.addSubscription('sub3', d2cMessageSub, m);
		ux4iotState.addSubscription('sub4', connectionStateSub, m);

		expect(ux4iotState.state.subscriptions).toEqual({
			sub1: [
				{
					deviceId: 'mockedDeviceId',
					onData: m,
					telemetryKeys: ['mockedTelemetryKey'],
					type: 'telemetry',
					sessionId,
				},
			],
			sub2: [
				{
					deviceId: 'mockedDeviceId',
					onData: m,
					type: 'deviceTwin',
					sessionId,
				},
			],
			sub3: [
				{
					deviceId: 'mockedDeviceId',
					onData: m,
					type: 'd2cMessages',
					sessionId,
				},
			],
			sub4: [
				{
					deviceId: 'mockedDeviceId',
					onData: m,
					type: 'connectionState',
					sessionId,
				},
			],
		});
	});

	it('adds new telemetry subscriptions correctly', () => {
		const m = jest.fn();
		const telemetrySub2 = mockedTelemetrySubscription2(sessionId);
		const telemetrySub3 = mockedTelemetrySubscription3(sessionId);

		ux4iotState.addSubscription('sub1', telemetrySub2, m);
		ux4iotState.addSubscription('sub1', telemetrySub3, m);

		/* 
      using JSON.stringify here since otherwise the jest compiler says 
      Received: serializes to the same string
      which I couldnt fix
    */
		expect(JSON.stringify(ux4iotState.state.subscriptions)).toEqual(
			JSON.stringify({
				sub1: [
					{
						type: 'telemetry',
						deviceId: 'mockedDeviceId',
						telemetryKeys: ['mockedTelemetryKey', 'mockedTelemetryKey2'],
						onData: m,
						sessionId,
					},
					{
						type: 'telemetry',
						deviceId: 'mockedDeviceId2',
						telemetryKeys: ['mockedTelemetryKey2'],
						onData: m,
						sessionId,
					},
				],
				sub2: [
					{
						type: 'deviceTwin',
						deviceId: 'mockedDeviceId',
						onData: m,
						sessionId,
					},
				],
				sub3: [
					{
						type: 'd2cMessages',
						deviceId: 'mockedDeviceId',
						onData: m,
						sessionId,
					},
				],
				sub4: [
					{
						type: 'connectionState',
						deviceId: 'mockedDeviceId',
						onData: m,
						sessionId,
					},
				],
			})
		);
	});

	it('checks for subscriptions correctly', () => {
		const telemetrySub = mockedTelemetrySubscription(sessionId);
		const telemetrySub2 = mockedTelemetrySubscription2(sessionId);
		const telemetrySub3 = mockedTelemetrySubscription3(sessionId);
		const deviceTwinSub = mockedDeviceTwinSubscription(sessionId);
		const d2cMessageSub = mockedD2CMessagesSubscription(sessionId);
		const connectionStateSub = mockedConnectionStateSubscription(sessionId);
		const unknownSub: TelemetrySubscriptionRequest = {
			type: 'telemetry',
			deviceId: 'mockedDeviceId',
			telemetryKey: 'a',
			sessionId,
		};

		expect(ux4iotState.hasSubscription('sub1', telemetrySub)).toBe(true);
		expect(ux4iotState.hasSubscription('sub1', telemetrySub2)).toBe(true);
		expect(ux4iotState.hasSubscription('sub1', telemetrySub3)).toBe(true);
		expect(ux4iotState.hasSubscription('sub1', unknownSub)).toBe(false);
		expect(ux4iotState.hasSubscription('sub2', deviceTwinSub)).toBe(true);
		expect(ux4iotState.hasSubscription('sub3', d2cMessageSub)).toBe(true);
		expect(ux4iotState.hasSubscription('sub4', connectionStateSub)).toBe(true);
		expect(ux4iotState.hasSubscription('sub4', d2cMessageSub)).toBe(false);
		expect(ux4iotState.hasSubscription('sub5', connectionStateSub)).toBe(false);
	});

	it('removes telemetry subscriptions', () => {
		const telemetrySub = mockedTelemetrySubscription(sessionId);
		const deviceTwinSub = mockedDeviceTwinSubscription(sessionId);
		const d2cMessageSub = mockedD2CMessagesSubscription(sessionId);
		const connectionStateSub = mockedConnectionStateSubscription(sessionId);

		ux4iotState.removeSubscription('sub1', telemetrySub);
		ux4iotState.removeSubscription('sub2', deviceTwinSub);
		ux4iotState.removeSubscription('sub3', d2cMessageSub);
		ux4iotState.removeSubscription('sub4', connectionStateSub);
		const m = jest.fn();

		expect(JSON.stringify(ux4iotState.state.subscriptions)).toEqual(
			JSON.stringify({
				sub1: [
					{
						type: 'telemetry',
						deviceId: 'mockedDeviceId',
						telemetryKeys: ['mockedTelemetryKey2'],
						onData: m,
						sessionId,
					},
					{
						type: 'telemetry',
						deviceId: 'mockedDeviceId2',
						telemetryKeys: ['mockedTelemetryKey2'],
						onData: m,
						sessionId,
					},
				],
			})
		);
	});

	it('cleans up subscriberId', () => {
		ux4iotState.cleanSubId('sub1');

		expect(ux4iotState.state.subscriptions).toEqual({});
	});
});
