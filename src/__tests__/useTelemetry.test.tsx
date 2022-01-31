import { TelemetryCallback, useTelemetry } from '../library';
import { act, render, waitFor } from '@testing-library/react';
import React, { useState } from 'react';

interface Ux4iotMock {
	registered?: {
		onTelemetry: TelemetryCallback;
	};
	registerTelemetrySubscriber: (
		subscriberId: string,
		deviceId: string,
		telemetryKey: string,
		onTelemetry: TelemetryCallback
	) => void;
	cleanupSubscriberId: () => void;
}

const ux4iot: Ux4iotMock = {
	registerTelemetrySubscriber: (
		subscriberId: string,
		deviceId: string,
		telemetryKey: string,
		onTelemetry: TelemetryCallback
	) => {
		ux4iot.registered = { onTelemetry: onTelemetry };
	},
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	cleanupSubscriberId: () => {},
};

jest.mock('react', () => {
	const ActualReact = jest.requireActual('react');
	return {
		...ActualReact,
		useContext: () => ux4iot,
	};
});

const deviceId = 'sampleDevice';
const telemetryKey = 'sampleTelemetryKey';

export const BoolComponent = () => {
	const [value, setValue] = useState<boolean | undefined>(undefined);

	useTelemetry<boolean>(deviceId, telemetryKey, {
		onData: data => {
			setValue(data);
		},
	});

	return (
		<div data-testid="value">
			{value === undefined ? 'undefined' : value ? 'true' : 'false'}
		</div>
	);
};

describe('useTelemetry', () => {
	it('handles boolean values', async () => {
		const { queryByTestId } = render(<BoolComponent />);

		await waitFor(() =>
			expect(queryByTestId('value')).toHaveTextContent('undefined')
		);

		await act(async () =>
			ux4iot.registered?.onTelemetry(deviceId, { sampleTelemetryKey: true })
		);

		await waitFor(() =>
			expect(queryByTestId('value')).toHaveTextContent('true')
		);

		await act(async () =>
			ux4iot.registered?.onTelemetry(deviceId, { sampleTelemetryKey: false })
		);

		await waitFor(() =>
			expect(queryByTestId('value')).toHaveTextContent('false')
		);
	});
});
