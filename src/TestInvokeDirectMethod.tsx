import { FC, useCallback, useState } from 'react';
import { useDirectMethod } from './library/useDirectMethod';

type Props = {
	deviceId: string;
};

export const TestInvokeDirectMethod: FC<Props> = ({ deviceId }) => {
	const reboot = useDirectMethod(deviceId, 'version');
	const [error, setError] = useState<string>('');
	const [loading, setLoading] = useState<boolean>(false);
	const [delay, setDelay] = useState<number>(1000);
	const [rebootResult, setRebootResult] = useState<unknown>();

	const handleClick = useCallback(() => {
		setLoading(true);
		setError('');
		reboot({ delay })
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
			<h3>Invoke Direct Method "version"</h3>
			<div>
				<label>Reboot</label>
				<input type="button" onClick={handleClick} />
			</div>
			<div>
				<label>Reboot</label>
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
