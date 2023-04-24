import { FC, useState } from 'react';
import { useMultiTelemetry } from './library';

type Props = {
	deviceId: string;
	datapoints: string[];
};

export const TestMultiTelemetryObject: FC<Props> = ({ deviceId }) => {
	const [ts, setTs] = useState<string | undefined>('');
	const [grantError, setGrantError] = useState<string>('');
	const [subError, setSubError] = useState<string>('');
	const { telemetry, toggleTelemetry, isSubscribed } = useMultiTelemetry({
		initialSubscribers: { [deviceId]: ['nestedobject', 'geoposition'] },
		onData: (deviceId, message, timestamp) => {
			setTs(timestamp);
			console.log('useMultiTelemetry', deviceId, message, timestamp);
		},
		onGrantError: error => setGrantError(error),
		onSubscriptionError: error => setSubError(error),
	});

	return (
		<div style={{ display: 'flex' }}>
			<div style={{ width: '33.3%' }}>
				<h3>UseMultiTelemetry</h3>
				{['simulated-device'].map(id => {
					return (
						<div key={id}>
							<h3>{id}</h3>
							{['nestedobject', 'geoposition'].map(dp => {
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
				<div>grant error: {grantError.toString()}</div>
				<div>sub error: {subError.toString()}</div>
			</div>
		</div>
	);
};
