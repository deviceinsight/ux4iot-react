import { FC } from 'react';
import { useMultiConnectionState } from './library';

type Props = {
	deviceIds: string[];
};

export const TestMultiConnectionState: FC<Props> = ({ deviceIds }) => {
	const { connectionStates, toggleConnectionState, isSubscribed } =
		useMultiConnectionState({
			initialSubscribers: deviceIds,
			onData: (deviceId, connectionState) => {
				console.log('useMultiConnectionState', deviceId, connectionState);
			},
			onGrantError: error => console.log(error),
		});

	return (
		<div style={{ display: 'flex' }}>
			<div style={{ width: '33.3%' }}>
				<h3>UseMultiConnectionState</h3>
				{[
					'simulated-device',
					'simulated-device-2',
					'device-that-doesnt-exist',
				].map(id => {
					return (
						<div key={id}>
							<h3>{id}</h3>
							<div key={id}>
								<label>{id}</label>
								<input
									type="checkbox"
									checked={isSubscribed(id)}
									onChange={() => toggleConnectionState(id)}
								/>
							</div>
						</div>
					);
				})}
				<div style={{ padding: 50 }}>
					data: <pre>{JSON.stringify(connectionStates, null, 2)}</pre>
				</div>
			</div>
		</div>
	);
};
