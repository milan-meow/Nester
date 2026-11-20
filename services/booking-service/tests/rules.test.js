const { bookingProblem, whoCanSet } = require('../src/rules');

const now = new Date('2026-12-01T10:00:00Z');
const rent = { id: 'p1', ownerId: 'o1', purpose: 'rent', status: 'available' };
const sale = { ...rent, purpose: 'sale' };
const me = { id: 'u1' };

describe('bookingProblem', () => {
  test.each([
    ['own listing', rent, { id: 'o1' }, { kind: 'rent_request' }, /own listing/],
    ['not available', { ...rent, status: 'rented' }, me, { kind: 'rent_request' }, /no longer available/],
    ['offer on rental', rent, me, { kind: 'offer', amount: 5 }, /for rent/],
    ['rent request on sale', sale, me, { kind: 'rent_request' }, /for sale/],
    ['offer without amount', sale, me, { kind: 'offer' }, /amount/],
    ['viewing without date', sale, me, { kind: 'viewing' }, /visit date/],
    ['viewing in the past', sale, me, { kind: 'viewing', visitDate: '2026-11-01T10:00:00Z' }, /future/],
  ])('%s', (_name, property, user, data, expected) => {
    expect(bookingProblem(property, user, data, now)).toMatch(expected);
  });

  test.each([
    [rent, { kind: 'rent_request' }],
    [sale, { kind: 'offer', amount: 100 }],
    [sale, { kind: 'viewing', visitDate: '2026-12-05T10:00:00Z' }],
  ])('valid request %#', (property, data) => {
    expect(bookingProblem(property, me, data, now)).toBeNull();
  });
});

describe('whoCanSet', () => {
  test('owner decides, requester cancels, finals are final', () => {
    expect(whoCanSet({ status: 'pending' }, 'accepted')).toBe('owner');
    expect(whoCanSet({ status: 'pending' }, 'rejected')).toBe('owner');
    expect(whoCanSet({ status: 'pending' }, 'cancelled')).toBe('requester');
    expect(whoCanSet({ status: 'accepted' }, 'rejected')).toBeNull();
    expect(whoCanSet({ status: 'cancelled' }, 'accepted')).toBeNull();
  });
});
