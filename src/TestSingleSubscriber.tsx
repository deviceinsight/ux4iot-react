import { FC } from 'react';
import { useTelemetry } from './library/useTelemetry';

type Props = {
	deviceId: string;
	datapointName: string;
};
export const TestSingleSubscriber: FC<Props> = ({
	deviceId,
	datapointName,
}) => {
	const value = useTelemetry(deviceId, datapointName, {
		onGrantError: error => console.log(error),
	});

	return (
		<div>
			<h3>UseTelemetry</h3>
			<div>
				Subscribed to deviceId {deviceId} and telemetryKey {datapointName}
			</div>
			<div>Value: {value}</div>
		</div>
	);
};
