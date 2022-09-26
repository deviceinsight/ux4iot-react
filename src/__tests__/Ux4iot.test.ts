import { Ux4iot } from '../library/base/Ux4iot';
jest.mock('socket.io-client', () => {
	return {
		...jest.requireActual('socket.io-client'),
		io: jest.fn().mockImplementation(() => ({
			on: () => undefined,
		})),
	};
});
const getSessionIdMock = jest.fn();
jest.mock('../library/base/Ux4iotApi', () => {
	return {
		Ux4iotApi: jest.fn().mockImplementation(() => ({
			...jest.requireActual('../library/base/Ux4iotApi'),
			getSessionId: getSessionIdMock,
			getSocketURL: () => `fake`,
		})),
	};
});

describe('Ux4iot', () => {
	it('should make exactly one call to getSessionId on initialization', () => {
		new Ux4iot({ adminConnectionString: '' });

		expect(getSessionIdMock).toBeCalledTimes(1);
	});
});
