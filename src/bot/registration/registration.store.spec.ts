import { REGISTRATION_TTL_MS, RegistrationStore } from './registration.store';

describe('RegistrationStore', () => {
  let store: RegistrationStore;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-30T00:00:00.000Z'));
    store = new RegistrationStore();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const sample = { telegramId: '123', fullName: 'Budi', nim: '1301999', telegramUsername: 'budi' };

  it('stores and returns a pending request', () => {
    store.upsert(sample);
    expect(store.has('123')).toBe(true);
    expect(store.get('123')?.fullName).toBe('Budi');
    expect(store.list()).toHaveLength(1);
  });

  it('expires a request exactly after the 2-minute TTL', () => {
    store.upsert(sample);

    // Just before expiry — still present.
    jest.advanceTimersByTime(REGISTRATION_TTL_MS - 1000);
    expect(store.has('123')).toBe(true);

    // Past the TTL — pruned on read.
    jest.advanceTimersByTime(2000);
    expect(store.has('123')).toBe(false);
    expect(store.get('123')).toBeUndefined();
    expect(store.list()).toHaveLength(0);
  });

  it('reports remaining time and clears it after expiry', () => {
    store.upsert(sample);
    expect(store.msRemaining('123')).toBe(REGISTRATION_TTL_MS);
    jest.advanceTimersByTime(REGISTRATION_TTL_MS + 1);
    expect(store.msRemaining('123')).toBe(0);
  });

  it('re-submitting resets the 2-minute timer', () => {
    store.upsert(sample);
    jest.advanceTimersByTime(REGISTRATION_TTL_MS - 5000);
    store.upsert(sample); // resubmit
    jest.advanceTimersByTime(10000); // would have expired the first one
    expect(store.has('123')).toBe(true);
  });

  it('removes a request explicitly (e.g. on approval)', () => {
    store.upsert(sample);
    store.remove('123');
    expect(store.has('123')).toBe(false);
  });

  it('lists multiple requests oldest-first', () => {
    store.upsert({ ...sample, telegramId: '1' });
    jest.advanceTimersByTime(1000);
    store.upsert({ ...sample, telegramId: '2' });
    expect(store.list().map((r) => r.telegramId)).toEqual(['1', '2']);
  });
});
