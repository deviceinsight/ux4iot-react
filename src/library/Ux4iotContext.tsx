import {
	ComponentType,
	createContext,
	ReactNode,
	useContext,
	useEffect,
	useRef,
	useState,
} from 'react';
import { InitializationOptions } from './types';
import { Ux4iot } from './base/Ux4iot';

type Ux4iotProviderProps = {
	options: InitializationOptions;
	children?: ReactNode;
};

type Ux4iotContextProps = { ux4iot: Ux4iot | undefined; sessionId: string };

let ux4iotInstance: Ux4iot;

export const Ux4iotContext = createContext<Ux4iotContextProps>({
	ux4iot: undefined,
	sessionId: '',
});
export const Ux4iotContextProvider: ComponentType<Ux4iotProviderProps> = ({
	options,
	children,
}) => {
	const [sessionId, setSessionId] = useState('');

	const ux4iot = useRef<Ux4iot>(
		ux4iotInstance ||
			new Ux4iot(options, (id: string) => {
				console.log('called onSessionIdChange', id);
			})
	);
	if (!ux4iotInstance) {
		ux4iotInstance = ux4iot.current;
	}

	function onSessionIdChange(id: string) {
		setSessionId(id);
	}
	ux4iot.current.onSessionId = onSessionIdChange;

	useEffect(() => {
		const instance = ux4iot.current;
		return () => {
			instance.destroy();
			ux4iotInstance = undefined;
		};
	}, []);

	return (
		<Ux4iotContext.Provider value={{ ux4iot: ux4iot.current, sessionId }}>
			{children}
		</Ux4iotContext.Provider>
	);
};

export function useUx4iot(): { ux4iot: Ux4iot; sessionId: string } {
	const { ux4iot, sessionId } = useContext(Ux4iotContext);
	console.log('rendered');

	if (ux4iot === undefined) {
		throw new Error(
			'ux4iot-react hooks must be used within a Ux4iotContextProvider'
		);
	}

	return { ux4iot, sessionId };
}
