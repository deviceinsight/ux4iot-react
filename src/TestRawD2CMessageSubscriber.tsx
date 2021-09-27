import { FC } from 'react';
import { useD2CMessage } from './library/useD2CMessage';

type Props = {
	deviceId: string;
};
export const TestRawD2CMessageSubscriber: FC<Props> = ({ deviceId }) => {
	const lastMessage = useD2CMessage(deviceId, {
		onData: message => {
			console.log('useD2CMessage received message:', message);
		},
	});

	return (
		<div>
			<h3>UseD2CMessage</h3>
			<div>Subscribed to deviceId {deviceId}</div>
			<div>
				Raw Message: <pre>{JSON.stringify(lastMessage, null, 2)}</pre>
			</div>
		</div>
	);
};
