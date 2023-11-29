import { FC, useState } from 'react';
import { useD2CMessages } from './library';

type Props = {
	deviceId: string;
};

export const TestD2CMessageSubscriber: FC<Props> = ({ deviceId }) => {
	const [ts, setTs] = useState<string | undefined>('');
	const lastMessage = useD2CMessages(deviceId, {
		onData: (deviceId, message, timestamp) => {
			setTs(timestamp);
			console.log(
				`Received message from ${deviceId} at ${timestamp}: ${JSON.stringify(
					message
				)}`
			);
		},
	});

	return (
		<div>
			<h3>UseD2CMessages</h3>
			<div>Subscribed to deviceId {deviceId}</div>
			<div>
				Raw Message: <pre>{JSON.stringify(lastMessage, null, 2)}</pre>
			</div>
			<div>
				Received at <pre>{ts}</pre>
			</div>
		</div>
	);
};
