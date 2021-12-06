import {
	ComponentType,
	createContext,
	ReactNode,
	useEffect,
	useRef,
	useState,
} from 'react';
import { InitializationOptions } from './types';
import { Ux4iot } from './Ux4iot';

type Ux4iotContextProps = Ux4iot | undefined;

type Ux4iotProviderProps = {
	options: InitializationOptions;
	children?: ReactNode;
};

export const Ux4iotContext = createContext<Ux4iotContextProps>(undefined);

export const Ux4iotContextProvider: ComponentType<Ux4iotProviderProps> = ({
	options,
	children,
}) => {
	const [ux4iot, setUx4iot] = useState<Ux4iot>();
	const initializing = useRef(false);

	useEffect(() => {
		async function initialize() {
			if (!ux4iot && !initializing.current) {
				initializing.current = true;
				const instance = await Ux4iot.create(options);
				setUx4iot(instance);
				initializing.current = false;
			}
		}
		initialize();
	}, [options, ux4iot]);

	useEffect(() => {
		return () => {
			ux4iot?.destroy();
		};
	}, [ux4iot]);

	return (
		<Ux4iotContext.Provider value={ux4iot}>{children}</Ux4iotContext.Provider>
	);
};
