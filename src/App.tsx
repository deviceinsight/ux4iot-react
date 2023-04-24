import { useState } from 'react';
import { Ux4iotContextProvider } from './library/Ux4iotContext';
import { TestInvokeDirectMethod } from './TestInvokeDirectMethod';
import { TestPatchDesiredProperties } from './TestPatchDesiredProperties';
import { TestSingleSubscriber } from './TestSingleSubscriber';
import { TestSubscriber } from './TestSubscriber';
import { TestMultiTelemetry } from './TestMultiTelemetry';
import { TestMultiConnectionState } from './TestMultiConnectionState';
import { TestD2CMessageSubscriber } from './TestD2CMessageSubscriber';
import { ToggleableBox } from './ToggleableBox';
import { TestMultiTelemetryObject } from './TestMultiTelemetryObject';

const { VITE_UX4IOT_CONNECTION_STRING } = import.meta.env;

function App(): JSX.Element | null {
	const [reload, setReload] = useState(0);
	const [kill, setKill] = useState(false);
	const [connectionReason, setConnectionReason] = useState<string>();
	const [connectionDesc, setConnectionDesc] = useState<string>();
	if (!VITE_UX4IOT_CONNECTION_STRING) {
		console.error('VITE_UX4IOT_CONNECTION_STRING is missing.');
		return null;
	}

	return (
		<div key={reload} className="App">
			<button
				onClick={() => {
					setReload(reload === 0 ? 1 : 0);
				}}
			>
				Reload
			</button>
			<button onClick={() => setKill(!kill)}>{kill ? 'Revive' : 'Kill'}</button>
			{!kill && (
				<Ux4iotContextProvider
					options={{
						adminConnectionString: VITE_UX4IOT_CONNECTION_STRING,
						onSocketConnectionUpdate: (reason, description) => {
							setConnectionReason(reason);
							setConnectionDesc(description);
						},
					}}
				>
					<div>
						<div>Connection Reason: ${connectionReason}</div>
						<div>Connection Desc: ${connectionDesc}</div>
					</div>
					<ToggleableBox label="Show App">
						<TestSubscriber datapoints={[]} deviceId="simulated-device" />
					</ToggleableBox>
					<ToggleableBox label="Show MultiTelemetry">
						<TestMultiTelemetry datapoints={[]} deviceId="simulated-device" />
					</ToggleableBox>
					<ToggleableBox label="Show MultiConnectionState">
						<TestMultiConnectionState deviceIds={['simulated-device']} />
					</ToggleableBox>
					<ToggleableBox label="Show Temperature Subscriber">
						<TestSingleSubscriber
							deviceId="simulated-device"
							datapointName="temperature"
						/>
					</ToggleableBox>
					<ToggleableBox label="Show MultiTelemetry Object Subscriber">
						<TestMultiTelemetryObject
							datapoints={[]}
							deviceId="simulated-device"
						/>
					</ToggleableBox>
					<ToggleableBox label="Show Geoposition Subscriber">
						<TestSingleSubscriber
							deviceId="simulated-device"
							datapointName="geoposition"
						/>
					</ToggleableBox>
					<ToggleableBox label="Show Nested Object Subscriber">
						<TestSingleSubscriber
							deviceId="simulated-device"
							datapointName="nestedobject"
						/>
					</ToggleableBox>
					<ToggleableBox label="Show D2C Message Subscriber">
						<TestD2CMessageSubscriber deviceId="simulated-device" />
					</ToggleableBox>
					<ToggleableBox label="Invoke Direct Method">
						<TestInvokeDirectMethod deviceId="simulated-device" />
					</ToggleableBox>
					<ToggleableBox label="Patch Desired Properties">
						<TestPatchDesiredProperties deviceId="simulated-device" />
					</ToggleableBox>
				</Ux4iotContextProvider>
			)}
		</div>
	);
}

export default App;
