import axios from 'axios';
import { FC, useCallback, useState } from 'react';
import { IoTHubResponse } from './library';
import { usePatchDesiredProperties } from './library';

type Props = {
	deviceId: string;
};

export const TestPatchDesiredProperties: FC<Props> = ({ deviceId }) => {
	const [desired, setDesired] = useState<Record<string, string>>({
		desiredProperty1: 'value1',
		desiredProperty2: 'value2',
	});
	const [result, setResult] = useState<IoTHubResponse | null>(null);
	const [error, setError] = useState<string>('');
	const [loading, setLoading] = useState<boolean>(false);

	const patch = usePatchDesiredProperties(deviceId, {
		onGrantError: error => {
			console.log('usepatchdesiredproperties', error);
			setError(error);
		},
	});

	const onClick = useCallback(async () => {
		try {
			setLoading(false);
			const response = await patch(desired);
			if (response) {
				setResult(response);
			}
		} catch (error) {
			if (axios.isAxiosError(error)) {
				console.log(error.response);
			}
		} finally {
			setLoading(false);
		}
	}, [desired, patch]);

	return (
		<div>
			<h3>Set Desired Properties</h3>
			<div>
				<label>Desired Property 1</label>
				<input
					type="text"
					value={desired.desiredProperty1}
					onChange={({ target: { value } }) =>
						setDesired({ ...desired, desiredProperty1: value })
					}
				/>
			</div>
			<div>
				<label>Desired Property 2</label>
				<input
					type="text"
					value={desired.desiredProperty2}
					onChange={({ target: { value } }) =>
						setDesired({ ...desired, desiredProperty2: value })
					}
				/>
			</div>
			<div>
				<button onClick={onClick}>Patch</button>
			</div>
			<div>
				Result:
				<pre>{JSON.stringify(result, null, 2)}</pre>
			</div>
			<div>Loading: {loading}</div>
			<div>Error: {error}</div>
		</div>
	);
};
