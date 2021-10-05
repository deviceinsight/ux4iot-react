import { getDPDiff } from '../library/useMultiTelemetry';

const prev = {
	a: ['1', '2', '4'],
	b: ['3', '5', '8'],
};
const current = {
	a: ['1', '2', '10'],
	c: ['6', '7', '9'],
};
const expected = {
	added: {
		a: ['10'],
		c: ['6', '7', '9'],
	},
	removed: {
		a: ['4'],
		b: ['3', '5', '8'],
	},
	hasAdded: true,
	hasRemoved: true,
};
describe('DPDiff', () => {
	it('correctly diffs complex objects', () => {
		const result = getDPDiff(prev, current);

		console.log('received result', result);

		expect(result).toMatchObject(expected);
	});
});
