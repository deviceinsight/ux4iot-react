import {
	ComponentType,
	createContext,
	ReactNode,
	useContext,
	useEffect,
	useRef,
} from 'react';
import { GrantableState } from './state/GrantableState';
import { InitializationOptions } from './types';
import { Ux4iot } from './Ux4iot';

type Ux4iotProviderProps = {
	options: InitializationOptions;
	children?: ReactNode;
};

let ux4iotInstance: Ux4iot;

export const Ux4iotContext = createContext<Ux4iot | undefined>(undefined);
export const Ux4iotContextProvider: ComponentType<Ux4iotProviderProps> = ({
	options,
	children,
}) => {
	const ux4iot = useRef<Ux4iot>(ux4iotInstance || new Ux4iot(options));
	if (!ux4iotInstance) {
		ux4iotInstance = ux4iot.current;
	}

	useEffect(() => {
		const ux4iotInstance = ux4iot.current;
		return () => {
			ux4iotInstance.destroy();
		};
	}, []);

	return (
		<Ux4iotContext.Provider value={ux4iot.current}>
			{children}
		</Ux4iotContext.Provider>
	);
};

export function useUx4iot(): GrantableState {
	const ux4iot = useContext(Ux4iotContext);

	if (ux4iot === undefined) {
		throw new Error(
			'ux4iot-react hooks must be used within a Ux4iotContextProvider'
		);
	}

	return ux4iot.grantableState;
}
