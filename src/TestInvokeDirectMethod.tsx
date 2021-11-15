import { FC, useCallback, useState } from 'react';
import { useDirectMethod } from './library/useDirectMethod';

type Props = {
	deviceId: string;
};

export const TestInvokeDirectMethod: FC<Props> = ({ deviceId }) => {
	const reboot = useDirectMethod(deviceId, 'setSendInterval');
	const [error, setError] = useState<string>('');
	const [loading, setLoading] = useState<boolean>(false);
	const [delay, setDelay] = useState<number>(1000);
	const [rebootResult, setRebootResult] = useState<unknown>();

	const handleClick = useCallback(() => {
		setLoading(true);
		setError('');
		reboot({ delay: delay.toString() })
			.then(response => {
				console.log('success', response);
				setRebootResult(response);
			})
			.catch(error => {
				console.log('oops');
				setError(error.toString());
			})
			.finally(() => {
				setLoading(false);
			});
	}, [reboot, delay]);

	return (
		<div>
			<h3>Invoke Direct Method "set send interval"</h3>
			<div>
				<button type="button" onClick={handleClick}>
					Set Send Interval
				</button>
			</div>
			<div>
				<label>Send Interval</label>
				<input
					type="number"
					value={delay}
					onChange={({ target: { value } }) => setDelay(parseInt(value))}
				/>
			</div>
			<div>
				<div>
					Result:
					<pre>{JSON.stringify(rebootResult, null, 2)}</pre>
				</div>
				<div>Loading: {loading}</div>
				<div>Error: {error}</div>
			</div>
		</div>
	);
};
