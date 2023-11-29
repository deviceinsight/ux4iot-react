import { FC, useState } from 'react';
import { useMultiTelemetry, useConnectionState, useDeviceTwin } from './library';

type Props = {
	deviceId: string;
	datapoints: string[];
};

export const TestSubscriber: FC<Props> = ({ deviceId }) => {
	const [ts, setTs] = useState<string | undefined>('');
	const { telemetry, toggleTelemetry, isSubscribed } = useMultiTelemetry({
		initialSubscribers: { [deviceId]: ['temperature', 'pressure'] },
		onData: (deviceId, message, timestamp) => {
			setTs(timestamp);
			console.log('useMultiTelemetry', deviceId, message, timestamp);
		},
		onGrantError: error => console.log(error),
	});
	const [myState, setMyState] = useState<number>(0);
	const twin = useDeviceTwin(deviceId, {
		onData: twin => {
			setMyState(myState + 1);
		},
		onGrantError: error => console.log(error),
	});
	const connectionState = useConnectionState(deviceId);

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
			<div style={{ width: '33.3%' }}>
				<h3>UseDeviceTwin</h3>
				<div style={{ padding: 50 }}>
					data: <pre>{JSON.stringify(twin, null, 2)}</pre>
				</div>
			</div>
			<div style={{ width: '33.3%' }}>
				<h3>UseConnectionState</h3>
				<div style={{ padding: 50 }}>
					data: <pre>{JSON.stringify(connectionState, null, 2)}</pre>
				</div>
			</div>
		</div>
	);
};
