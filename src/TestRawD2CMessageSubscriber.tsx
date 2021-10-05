import { FC } from 'react';
import { useD2CMessages } from './library/useD2CMessages';

type Props = {
	deviceId: string;
};
export const TestRawD2CMessageSubscriber: FC<Props> = ({ deviceId }) => {
	const lastMessage = useD2CMessages(deviceId, {
		onData: message => {
			console.log('useD2CMessages received message:', message);
		},
	});

	return (
		<div>
			<h3>UseD2CMessages</h3>
			<div>Subscribed to deviceId {deviceId}</div>
			<div>
				Raw Message: <pre>{JSON.stringify(lastMessage, null, 2)}</pre>
			</div>
		</div>
	);
};
