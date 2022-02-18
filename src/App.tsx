import { useEffect, useState } from 'react';
import { Ux4iotContextProvider } from './library/Ux4iotContext';
import { TestInvokeDirectMethod } from './TestInvokeDirectMethod';
import { TestPatchDesiredProperties } from './TestPatchDesiredProperties';
import { TestSingleSubscriber } from './TestSingleSubscriber';
import { TestRawD2CMessageSubscriber } from './TestRawD2CMessageSubscriber';
import { TestSubscriber } from './TestSubscriber';

const { REACT_APP_UX4IOT_CONNECTION_STRING } = process.env;

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
	const [showApp3, setShowApp3] = useState(true);
	const [showApp4, setShowApp4] = useState(false);
	const [kill, setKill] = useState(false);
	const [renders, setRenders] = useState(20);
	const rerender = useRerender(renders);
	if (!REACT_APP_UX4IOT_CONNECTION_STRING) {
		console.error('REACT_APP_UX4IOT_CONNECTION_STRING is missing.');
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
						adminConnectionString: REACT_APP_UX4IOT_CONNECTION_STRING,
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
						<label>Show App ?</label>
						<input
							type="checkbox"
							checked={showApp2}
							onChange={() => setShowApp2(!showApp2)}
						/>
						{showApp2 && (
							<TestSubscriber datapoints={[]} deviceId="simulated-device" />
						)}
					</div>
					<div>
						<label>Show App ?</label>
						<input
							type="checkbox"
							checked={showApp3}
							onChange={() => setShowApp3(!showApp3)}
						/>
						{showApp3 && (
							<TestSingleSubscriber
								deviceId="simulated-device"
								datapointName="temperature"
							/>
						)}
					</div>
					<div>
						<label>Show App ?</label>
						<input
							type="checkbox"
							checked={showApp4}
							onChange={() => setShowApp4(!showApp4)}
						/>
						{showApp4 && (
							<TestRawD2CMessageSubscriber deviceId="simulated-device" />
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
