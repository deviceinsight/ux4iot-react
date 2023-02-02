import { FC, ReactNode, useState } from 'react';

type Props = {
	label: string;
	initialShow?: boolean;
	children: ReactNode;
};

export const ToggleableBox: FC<Props> = ({ label, children, initialShow }) => {
	const [show, setShow] = useState<boolean>(!!initialShow);
	return (
		<div>
			<label>{label}</label>
			<input type="checkbox" checked={show} onChange={() => setShow(!show)} />
			{show && children}
		</div>
	);
};
