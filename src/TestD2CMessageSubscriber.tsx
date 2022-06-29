import { FC, useState } from 'react';
import { useD2CMessages } from './library/useD2CMessages';

type Props = {
	deviceId: string;
};

export const TestD2CMessageSubscriber: FC<Props> = ({ deviceId }) => {
	const [ts, setTs] = useState<string | undefined>('');
	const lastMessage = useD2CMessages(deviceId, {
		onData: (message, timestamp) => {
			setTs(timestamp);
			console.log('useD2CMessages received message:', message, 'at', timestamp);
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
