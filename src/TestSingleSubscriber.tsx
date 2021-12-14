import { FC, useState } from 'react';
import { useTelemetry } from './library/useTelemetry';

type Props = {
	deviceId: string;
	datapointName: string;
};
export const TestSingleSubscriber: FC<Props> = ({
	deviceId,
	datapointName,
}) => {
	const [ts, setTs] = useState<string | undefined>('');
	const value = useTelemetry(deviceId, datapointName, {
		onData: (data, timestamp) => {
			setTs(timestamp);
			console.log(
				`received telemetry from useTelemetry ${data} at ${timestamp}`
			);
		},
		onGrantError: error => console.log(error),
	});

	return (
		<div>
			<h3>UseTelemetry</h3>
			<div>{value}</div>
			<div>
				Subscribed to deviceId {deviceId} and telemetryKey {datapointName}
			</div>
			<div>Value: {value}</div>
			<div>
				Received at <pre>{ts}</pre>
			</div>
		</div>
	);
};
