import {
	ComponentType,
	createContext,
	ReactNode,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from 'react';
import { InitializationOptions } from './base/types';
import { Ux4iot } from './base/Ux4iot';

type Ux4iotProviderProps = {
	options: InitializationOptions;
	children?: ReactNode;
};

type Ux4iotContextProps = { ux4iot: Ux4iot | undefined; sessionId: string };

export const Ux4iotContext = createContext<Ux4iotContextProps>({
	ux4iot: undefined,
	sessionId: '',
});
export const Ux4iotContextProvider: ComponentType<Ux4iotProviderProps> = ({
	options,
	children,
}) => {
	const optionsRef = useRef(options);
	const [sessionId, setSessionId] = useState('');
	const [ux4iot, setUx4iot] = useState<Ux4iot>();

	function onSessionId(sessionId: string) {
		setSessionId(sessionId);
	}

	const initialize = useCallback(async () => {
		if (!ux4iot) {
			try {
				const ux4iot = await Ux4iot.create(optionsRef.current, onSessionId);
				setUx4iot(ux4iot);
			} catch (error) {
				console.error(error);
			}
		}
	}, [ux4iot]);

	useEffect(() => {
		optionsRef.current = options;
	}, [options]);

	useEffect(() => {
		initialize();

		return () => {
			if (ux4iot) {
				ux4iot.destroy();
				setUx4iot(undefined);
				setSessionId('');
			}
		};
	}, [ux4iot, initialize]);

	return (
		<Ux4iotContext.Provider value={{ ux4iot, sessionId }}>
			{children}
		</Ux4iotContext.Provider>
	);
};

export const useUx4iot = () => {
	return useContext(Ux4iotContext);
};
