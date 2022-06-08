import { SubscriptionErrorCallback } from '../types';
import { SubscriptionRequest, Message } from '../ux4iot-shared';
import { GrantableArgs, Grantable } from './Grantable';

export type SubscriptionArgs = GrantableArgs & {
	onSubscriptionError?: SubscriptionErrorCallback;
};

export abstract class Subscription extends Grantable {
	isSubscribed: boolean;
	onSubscriptionError?: SubscriptionErrorCallback;

	constructor(args: SubscriptionArgs) {
		super(args);
		this.onSubscriptionError = args.onSubscriptionError;
		this.isSubscribed = false;
	}

	protected abstract createSubscription():
		| Omit<SubscriptionRequest, 'sessionId'>
		| Omit<SubscriptionRequest, 'sessionId'>[];
	abstract isEqual(subscription: Subscription): boolean;
	abstract onData(data: Message): void;

	public async subscribe() {
		if (this.isSubscribed) {
			return;
		}
		if (!this.granted) await this.askForGrant();
		if (this.granted) {
			try {
				await this.api.subscribe(this.createSubscription());
				this.isSubscribed = true;
			} catch (error) {
				this.onSubscriptionError && this.onSubscriptionError(error);
			}
		}
	}

	public async unsubscribe() {
		if (!this.isSubscribed) {
			return;
		}
		if (!this.granted) await this.askForGrant();
		if (this.granted) {
			try {
				await this.api.unsubscribe(this.createSubscription());
				this.isSubscribed = false;
			} catch (error) {
				this.onSubscriptionError && this.onSubscriptionError(error);
			}
		}
	}

	public hasSubscription(): boolean {
		return this.isSubscribed;
	}
}
