import { Ux4iot } from '../library/base/Ux4iot';
const getSessionIdMock = jest.fn();
jest.mock('../library/base/Ux4iotApi', () => {
	return {
		Ux4iotApi: jest.fn().mockImplementation(() => ({
			...jest.requireActual('../library/base/Ux4iotApi'),
			getSessionId: getSessionIdMock,
		})),
	};
});

describe('Ux4iot', () => {
	it('initializes correctly', () => {
		const ux4iot = new Ux4iot({
			adminConnectionString: '',
		});

		expect(getSessionIdMock).toBeCalledTimes(1);
	});
});
