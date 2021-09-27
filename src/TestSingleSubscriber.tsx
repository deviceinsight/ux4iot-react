import { FC } from 'react';
import { useSingleTelemetry } from './library/useSingleTelemetry';

type Props = {
	deviceId: string;
	datapointName: string;
};
export const TestSingleSubscriber: FC<Props> = ({
	deviceId,
	datapointName,
}) => {
	const value = useSingleTelemetry(deviceId, datapointName, {
		onGrantError: error => console.log(error),
	});

	return (
		<div>
			<h3>UseSingleTelemetry</h3>
			<div>
				Subscribed to deviceId {deviceId} and telemetryKey {datapointName}
			</div>
			<div>Value: {value}</div>
		</div>
	);
};
