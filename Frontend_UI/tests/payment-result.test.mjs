import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parsePaymentReturn, isConfirmedPayment, paymentErrorMessage } from '../src/utils/paymentResult.ts';

test('Payment URL only permits confirmation with canonical API ID, token and success return code', () => {
  assert.equal(parsePaymentReturn(new URLSearchParams('orderId=62&paymentToken=signed&vnp_ResponseCode=00')).canConfirm, true);
  for (const id of ['', '0', '-1', '01', '1.5', '1e2', '2147483648', 'abc'])
    assert.equal(parsePaymentReturn(new URLSearchParams({ orderId: id, paymentToken: 'signed', vnp_ResponseCode: '00' })).canConfirm, false);
  for (const query of ['orderId=62&vnp_ResponseCode=00', 'orderId=62&paymentToken=+', 'orderId=62&paymentToken=signed&vnp_ResponseCode=24'])
    assert.equal(parsePaymentReturn(new URLSearchParams(query)).canConfirm, false);
});

test('A result is usable only when backend ID matches and amount is a finite nonnegative number; zero is valid', () => {
  assert.equal(isConfirmedPayment({ orderId: 62, amount: 0 }, 62), true);
  assert.equal(isConfirmedPayment({ orderId: 62, amount: 290000 }, 62), true);
  for (const result of [null, {}, { orderId: 61, amount: 290000 }, { orderId: '62', amount: 1 }, ...[-1, NaN, Infinity, '290000', null].map(amount => ({ orderId: 62, amount }))])
    assert.equal(isConfirmedPayment(result, 62), false);
});

test('Payment errors retain useful backend rejection but hide local server addresses', () => {
  assert.equal(paymentErrorMessage(new Error('Kết quả thanh toán đã hết hạn.')), 'Kết quả thanh toán đã hết hạn.');
  assert.doesNotMatch(paymentErrorMessage(new Error('Back-end (http://localhost:5156) Server API')), /localhost|5156/);
});
