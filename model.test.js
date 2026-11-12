'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Wallet = require('./model');

test('tổng và danh mục khớp dữ liệu mẫu', () => {
  const {transactions} = Wallet.seed('2026-11-09');
  assert.equal(transactions.length, 7);
  assert.ok(transactions.every(row => row.type === 'out'));
  assert.equal(Wallet.totalSpent(transactions), 4020000);
  assert.equal(Wallet.byCategory(transactions)['Ăn uống'], 1560000);
  assert.equal(Wallet.period(transactions, '2026-12').length, 0);
});

test('cảnh báo ở 80%, chạm ở 100% và vượt nếu lớn hơn hạn mức', () => {
  assert.equal(Wallet.budgetStatus(79,100).level, 'normal');
  assert.equal(Wallet.budgetStatus(80,100).level, 'near');
  assert.equal(Wallet.budgetStatus(100,100).remaining, 0);
  assert.equal(Wallet.budgetStatus(100,100).level, 'near');
  assert.equal(Wallet.budgetStatus(101,100).level, 'over');
  assert.deepEqual(Wallet.budgetStatus(1860000,1800000),
    {spent:1860000,cap:1800000,remaining:-60000,percent:103,level:'over'});
});

test('kiểm tra tiền nguyên dương và ngày hợp lệ', () => {
  for (const value of [0, -1, 1.5, 1000000001]) assert.equal(Wallet.validAmount(value), false);
  assert.equal(Wallet.validAmount(1000000000), true);
  assert.equal(Wallet.validDate('2028-02-29'), true);
  assert.equal(Wallet.validDate('2026-02-29'), false);
  assert.equal(Wallet.validDate('2026-13-01'), false);
});
