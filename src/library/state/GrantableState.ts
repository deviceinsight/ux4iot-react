import { Ux4iotApi } from '../data/Ux4iotApi';
import {
	DeviceTwinArgs,
	DeviceTwinSubscription,
} from '../data/DeviceTwinSubscription';
import { Grantable } from '../data/Grantable';
import {
	TelemetryArgs,
	TelemetrySubscription,
} from '../data/TelemetrySubscription';
import { Subscription } from '../data/Subscription';
import {
	ConnectionStateArgs,
	ConnectionStateSubscription,
} from '../data/ConnectionStateSubscription';
import {
	D2CMessageArgs,
	D2CMessageSubscription,
} from '../data/D2CMessageSubscription';
import {
	DirectMethodArgs,
	DirectMethodGrantable,
} from '../data/DirectMethodGrantable';
import {
	PatchDesiredPropertiesArgs,
	PatchDesiredPropertiesGrantable,
} from '../data/PatchDesiredPropertiesGrantable';

// const delimiter = '___';

// function makeSubKey(...args: string[]) {
// 	return args.join(delimiter);
// }

// function parseSubKey(subKey: string): string[] {
// 	return subKey.split(delimiter);
// }

export class GrantableState {
	api: Ux4iotApi;
	desiredState: Grantable[];

	constructor(api: Ux4iotApi) {
		this.api = api;
		this.desiredState = [];
		//@ts-ignore
		window.ux4iotGrantableState = this;
	}

	async subscribeAll() {
		await Promise.all(
			Object.values(this.desiredState).map(
				g => g instanceof Subscription && g.subscribe()
			)
		);
	}
	async unsubscribeAll() {
		await Promise.all(
			Object.values(this.desiredState).map(
				g => g instanceof Subscription && g.unsubscribe()
			)
		);
	}

	async establishAll() {
		await Promise.all(
			this.desiredState.map(g =>
				g instanceof Subscription ? g.subscribe() : g.askForGrant()
			)
		);
	}

	getRemainingSubscriptions(s: Subscription): Subscription[] {
		const subscriptions = [];

		for (const g of this.desiredState) {
			if (g instanceof Subscription && g.isEqual(s)) {
				subscriptions.push(g);
			}
		}
		return subscriptions;
	}

	removeGrantable(grantable: Grantable | undefined) {
		if (!grantable) {
			return;
		}
		this.desiredState = this.desiredState.filter(g => g !== grantable);
		if (
			grantable instanceof Subscription &&
			this.getRemainingSubscriptions(grantable).length === 0
		) {
			console.log('unsubscribing', grantable);
			grantable.unsubscribe();
		}
	}

	addAndExecute<T extends Grantable>(g: T): T {
		this.desiredState.push(g);

		g instanceof Subscription ? g.subscribe() : g.askForGrant();

		return g;
	}

	addTelemetrySubscription(args: Omit<TelemetryArgs, 'api'>) {
		return this.addAndExecute(
			new TelemetrySubscription({ ...args, api: this.api })
		);
	}

	addConnectionStateSubscription(args: Omit<ConnectionStateArgs, 'api'>) {
		return this.addAndExecute(
			new ConnectionStateSubscription({ ...args, api: this.api })
		);
	}

	addDeviceTwinSubscription(args: Omit<DeviceTwinArgs, 'api'>) {
		return this.addAndExecute(
			new DeviceTwinSubscription({ ...args, api: this.api })
		);
	}

	addD2CMessageSubscription(args: Omit<D2CMessageArgs, 'api'>) {
		return this.addAndExecute(
			new D2CMessageSubscription({ ...args, api: this.api })
		);
	}

	addDirectMethodGrantable(args: Omit<DirectMethodArgs, 'api'>) {
		return this.addAndExecute(
			new DirectMethodGrantable({ ...args, api: this.api })
		);
	}

	addPatchDesiredPropertiesGrantable(
		args: Omit<PatchDesiredPropertiesArgs, 'api'>
	) {
		return this.addAndExecute(
			new PatchDesiredPropertiesGrantable({ ...args, api: this.api })
		);
	}
}
