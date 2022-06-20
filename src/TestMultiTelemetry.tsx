import { FC, useState } from 'react';
import { useMultiTelemetry } from './library';

type Props = {
	deviceId: string;
	datapoints: string[];
};

export const TestMultiTelemetry: FC<Props> = ({ deviceId }) => {
	const [ts, setTs] = useState<string | undefined>('');
	const { telemetry, toggleTelemetry, isSubscribed } = useMultiTelemetry({
		initialSubscribers: { [deviceId]: ['temperature', 'pressure'] },
		onData: (deviceId, message, timestamp) => {
			setTs(timestamp);
			console.log('useMultiTelemetry', deviceId, message, timestamp);
		},
		onGrantError: error => console.log(error),
	});

	return (
		<div style={{ display: 'flex' }}>
			<div style={{ width: '33.3%' }}>
				<h3>UseMultiTelemetry</h3>
				{[
					'simulated-device',
					'simulated-device-2',
					'device-that-doesnt-exist',
				].map(id => {
					return (
						<div key={id}>
							<h3>{id}</h3>
							{['temperature', 'pressure', 'state'].map(dp => {
								return (
									<div key={dp}>
										<label>{dp}</label>
										<input
											type="checkbox"
											checked={isSubscribed(id, dp)}
											onChange={() => toggleTelemetry(id, dp)}
										/>
									</div>
								);
							})}
						</div>
					);
				})}
				<div style={{ padding: 50 }}>
					data: <pre>{JSON.stringify(telemetry, null, 2)}</pre>
				</div>
				<div>
					Received at <pre>{ts}</pre>
				</div>
			</div>
		</div>
	);
};
