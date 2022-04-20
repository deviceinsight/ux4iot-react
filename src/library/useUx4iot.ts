import {useContext} from 'react';
import {Ux4iotContext} from './Ux4iotContext';
import {Ux4iot} from './Ux4iot';

export const useUx4iot = (): Ux4iot | undefined => {
	return useContext(Ux4iotContext);
};
