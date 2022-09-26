import { useEffect, useState } from 'react';
import { Ux4iotContextProvider } from './library/Ux4iotContext';
import { TestInvokeDirectMethod } from './TestInvokeDirectMethod';
import { TestPatchDesiredProperties } from './TestPatchDesiredProperties';
import { TestSingleSubscriber } from './TestSingleSubscriber';
import { TestSubscriber } from './TestSubscriber';
import { TestMultiTelemetry } from './TestMultiTelemetry';
import { TestMultiConnectionState } from './TestMultiConnectionState';
import { TestD2CMessageSubscriber } from './TestD2CMessageSubscriber';

const { VITE_UX4IOT_CONNECTION_STRING } = import.meta.env;

const useRerender = (n: number) => {
	const [counter, setCounter] = useState(0);

	useEffect(() => {
		if (counter < n) {
			setCounter(counter + 1);
		}
	}, [counter, n]);

	return counter;
};

function App(): JSX.Element | null {
	const [reload, setReload] = useState(0);
	const [showApp, setShowApp] = useState(false);
	const [showApp2, setShowApp2] = useState(false);
	const [showApp3, setShowApp3] = useState(false);
	const [showTemperature, setShowTemperature] = useState(false);
	const [showGeoposition, setShowGeoposition] = useState(false);
	const [showNestedObject, setShowNestedObject] = useState(false);
	const [showApp4, setShowApp4] = useState(false);
	const [kill, setKill] = useState(false);
	const [renders, setRenders] = useState(0);
	const rerender = useRerender(renders);
	if (!VITE_UX4IOT_CONNECTION_STRING) {
		console.error('VITE_UX4IOT_CONNECTION_STRING is missing.');
		return null;
	}

	console.log('app rerender', rerender);

	return (
		<div key={reload} className="App">
			<button
				onClick={() => {
					setReload(reload === 0 ? 1 : 0);
					setRenders(renders + 20);
				}}
			>
				Reload
			</button>
			{!kill && (
				<Ux4iotContextProvider
					options={{
						adminConnectionString: VITE_UX4IOT_CONNECTION_STRING,
						onSocketConnectionUpdate: (reason, description) => {
							console.log(reason, description);
						},
					}}
				>
					<div>
						<label>Show App ?</label>
						<input
							type="checkbox"
							checked={showApp}
							onChange={() => setShowApp(!showApp)}
						/>
						{showApp && (
							<TestSubscriber datapoints={[]} deviceId="simulated-device" />
						)}
					</div>
					<div>
						<label>Show MultiTelemetry ?</label>
						<input
							type="checkbox"
							checked={showApp2}
							onChange={() => setShowApp2(!showApp2)}
						/>
						{showApp2 && (
							<TestMultiTelemetry datapoints={[]} deviceId="simulated-device" />
						)}
					</div>
					<div>
						<label>Show MultiConnectionState ?</label>
						<input
							type="checkbox"
							checked={showApp3}
							onChange={() => setShowApp3(!showApp3)}
						/>
						{showApp3 && (
							<TestMultiConnectionState deviceIds={['simulated-device']} />
						)}
					</div>
					<div>
						<label>Show Temperature Subscriber</label>
						<input
							type="checkbox"
							checked={showTemperature}
							onChange={() => setShowTemperature(!showTemperature)}
						/>
						{showTemperature && (
							<TestSingleSubscriber
								deviceId="simulated-device"
								datapointName="temperature"
							/>
						)}
					</div>
					<div>
						<label>Show Geoposition Subscriber</label>
						<input
							type="checkbox"
							checked={showGeoposition}
							onChange={() => setShowGeoposition(!showGeoposition)}
						/>
						{showGeoposition && (
							<TestSingleSubscriber
								deviceId="simulated-device"
								datapointName="geoposition"
							/>
						)}
					</div>
					<div>
						<label>Show Nested Object Subscriber</label>
						<input
							type="checkbox"
							checked={showNestedObject}
							onChange={() => setShowNestedObject(!showNestedObject)}
						/>
						{showNestedObject && (
							<TestSingleSubscriber
								deviceId="simulated-device"
								datapointName="nestedobject"
							/>
						)}
					</div>
					<div>
						<label>Show D2C Message Subscriber</label>
						<input
							type="checkbox"
							checked={showApp4}
							onChange={() => setShowApp4(!showApp4)}
						/>
						{showApp4 && (
							<TestD2CMessageSubscriber deviceId="simulated-device" />
						)}
					</div>
					<div>
						<TestInvokeDirectMethod deviceId="simulated-device" />
					</div>
					<div>
						<TestPatchDesiredProperties deviceId="simulated-device" />
					</div>
				</Ux4iotContextProvider>
			)}
			<button onClick={() => setKill(!kill)}>{kill ? 'Revive' : 'Kill'}</button>
		</div>
	);
}

export default App;
