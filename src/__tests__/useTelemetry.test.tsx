import { TelemetryCallback, useTelemetry } from '../library';
import { act, render, waitFor } from '@testing-library/react';
import React, { FC, useState } from 'react';

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

export const BoolComponent: FC = () => {
	const [customValue, setCustomValue] = useState<boolean>();
	const value = useTelemetry<boolean>(deviceId, telemetryKey, {
		onData: v => setCustomValue(v),
	});

	return (
		<>
			<div data-testid="value">
				{value === undefined ? 'undefined' : value ? 'true' : 'false'}
			</div>
			<div data-testid="customValue">
				{customValue === undefined ? 'undefined' : value ? 'true' : 'false'}
			</div>
		</>
	);
};

describe('useTelemetry', () => {
	it('handles boolean values', async () => {
		const { queryByTestId } = render(<BoolComponent />);

		await waitFor(() => {
			expect(queryByTestId('value')).toHaveTextContent('undefined');
			expect(queryByTestId('customValue')).toHaveTextContent('undefined');
		});

		await act(async () =>
			ux4iot.registered?.onTelemetry(deviceId, { sampleTelemetryKey: true })
		);

		await waitFor(() => {
			expect(queryByTestId('value')).toHaveTextContent('true');
			expect(queryByTestId('customValue')).toHaveTextContent('true');
		});

		await act(async () =>
			ux4iot.registered?.onTelemetry(deviceId, { sampleTelemetryKey: false })
		);

		await waitFor(() => {
			expect(queryByTestId('value')).toHaveTextContent('false');
			expect(queryByTestId('customValue')).toHaveTextContent('false');
		});
	});
});
