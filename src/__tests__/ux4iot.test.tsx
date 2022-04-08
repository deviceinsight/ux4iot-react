jest.mock('socket.io-client');
jest.mock('axios', () => {
	return {
		_esModule: true,
		default: {
			...jest.requireActual('axios'),
			create: jest.fn().mockImplementation(() => {
				return {
					post: () => {
						console.log('post executed');
						return 'abc';
					},
				};
			}),
		},
	};
});

import { TwinData } from 'azure-iothub/dist/twin';
import { Ux4iot } from '../library/Ux4iot';

const mockedTwin: TwinData = {
	deviceId: 'deviceId1',
	etag: 'etag',
	tags: {},
	properties: {
		reported: {},
		desired: {},
	},
};

describe('ux4iot class', () => {
	afterAll(() => {
		jest.clearAllMocks();
	});
	// it('creates ux4iot class and calls initialize', async () => {
	//   const ux4iot = await Ux4iot.create({adminConnectionString: 'secret'})
	// })
	it('registers telemetry subscriber and executes onData', async () => {
		const ux4iot = await Ux4iot.create({
			adminConnectionString: 'Endpoint=abc;SharedAccessKey=secret',
		});

		const mockedCallback = jest.fn();
		const expectedDeviceId = 'deviceId1';

		ux4iot.registerTelemetrySubscriber(
			'id',
			expectedDeviceId,
			'telemetryKey1',
			mockedCallback
		);

		const telemetry = { telemetryKey1: 123 };

		//@ts-ignore
		ux4iot.onData({
			deviceId: expectedDeviceId,
			telemetry,
		});
		expect(mockedCallback).toBeCalledTimes(1);
		expect(mockedCallback).toBeCalledWith(
			expectedDeviceId,
			telemetry,
			undefined
		);
	});
	it('registers telemetry subscriber and does not execute onData on unmatching properties', async () => {
		const ux4iot = await Ux4iot.create({
			adminConnectionString: 'Endpoint=abc;SharedAccessKey=secret',
		});

		const mockedCallback = jest.fn();
		const deviceId = 'deviceId1';

		ux4iot.registerTelemetrySubscriber(
			'id',
			deviceId,
			'telemetryKey1',
			mockedCallback
		);

		const telemetry = { unmatchingTelemetryKey: 123 };

		//@ts-ignore
		ux4iot.onData({
			deviceId,
			telemetry,
		});
		expect(mockedCallback).not.toBeCalled();
	});
	it('registers connectionState subscriber and executes onData', async () => {
		const ux4iot = await Ux4iot.create({
			adminConnectionString: 'Endpoint=abc;SharedAccessKey=secret',
		});

		const mockedCallback = jest.fn();
		const expectedDeviceId = 'deviceId1';

		ux4iot.registerConnectionStateSubscriber(
			'id',
			expectedDeviceId,
			mockedCallback
		);

		//@ts-ignore
		ux4iot.onData({
			deviceId: expectedDeviceId,
			connectionState: {
				connected: true,
			},
		});
		//@ts-ignore
		ux4iot.onData({
			deviceId: expectedDeviceId,
			telemetry: {
				key: 'value',
			},
		});
		expect(mockedCallback).toBeCalledTimes(1);
		expect(mockedCallback).toBeCalledWith(expectedDeviceId, true);
	});
	it('registers connectionState subscriber and does not execute onData on unmatching properties', async () => {
		const ux4iot = await Ux4iot.create({
			adminConnectionString: 'Endpoint=abc;SharedAccessKey=secret',
		});

		const mockedCallback = jest.fn();
		const expectedDeviceId = 'deviceId1';

		ux4iot.registerConnectionStateSubscriber(
			'id',
			expectedDeviceId,
			mockedCallback
		);

		//@ts-ignore
		ux4iot.onData({
			deviceId: 'someOtherDeviceId',
			connectionState: {
				connected: true,
			},
		});
		//@ts-ignore
		ux4iot.onData({
			deviceId: expectedDeviceId,
			telemetry: {
				key: 'value',
			},
		});
		expect(mockedCallback).not.toBeCalled();
	});
	it('registers deviceTwin subscriber and executes onData', async () => {
		const ux4iot = await Ux4iot.create({
			adminConnectionString: 'Endpoint=abc;SharedAccessKey=secret',
		});

		const mockedCallback = jest.fn();
		const expectedDeviceId = 'deviceId1';

		ux4iot.registerDeviceTwinSubscriber('id', expectedDeviceId, mockedCallback);

		//@ts-ignore
		ux4iot.onData({ deviceId: expectedDeviceId, deviceTwin: mockedTwin });

		expect(mockedCallback).toBeCalledTimes(1);
		expect(mockedCallback).toBeCalledWith(expectedDeviceId, mockedTwin);
	});
	it('registers deviceTwin subscriber and does not execute onData on unmatching properties', async () => {
		const ux4iot = await Ux4iot.create({
			adminConnectionString: 'Endpoint=abc;SharedAccessKey=secret',
		});

		const mockedCallback = jest.fn();
		const expectedDeviceId = 'deviceId1';

		ux4iot.registerDeviceTwinSubscriber('id', expectedDeviceId, mockedCallback);

		//@ts-ignore
		ux4iot.onData({ deviceId: 'someOtherDeviceId', deviceTwin: mockedTwin });
		//@ts-ignore
		ux4iot.onData({ deviceId: expectedDeviceId, telemetry: { key: 'value' } });

		expect(mockedCallback).not.toBeCalled();
	});
	it('registers raw message subscriber and executes onData', async () => {
		const ux4iot = await Ux4iot.create({
			adminConnectionString: 'Endpoint=abc;SharedAccessKey=secret',
		});

		const mockedCallback = jest.fn();
		const expectedDeviceId = 'deviceId1';
		const expectedMessage = { dp1: 1, dp2: 2 };

		ux4iot.registerRawD2CMessageSubscriber(
			'id',
			expectedDeviceId,
			mockedCallback
		);

		//@ts-ignore
		ux4iot.onData({ deviceId: expectedDeviceId, message: expectedMessage });

		expect(mockedCallback).toBeCalledTimes(1);
		expect(mockedCallback).toBeCalledWith(
			expectedDeviceId,
			expectedMessage,
			undefined
		);
	});
	it('registers raw message subscriber and does not execute onData on unmatching properties', async () => {
		const ux4iot = await Ux4iot.create({
			adminConnectionString: 'Endpoint=abc;SharedAccessKey=secret',
		});

		const mockedCallback = jest.fn();
		const expectedDeviceId = 'deviceId1';

		ux4iot.registerRawD2CMessageSubscriber(
			'id',
			expectedDeviceId,
			mockedCallback
		);

		//@ts-ignore
		ux4iot.onData({ deviceId: 'someOtherDeviceId', deviceTwin: mockedTwin });
		//@ts-ignore
		ux4iot.onData({ deviceId: expectedDeviceId, telemetry: { key: 'value' } });

		expect(mockedCallback).not.toBeCalled();
	});
});
