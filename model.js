'use strict';

const Wallet = (() => {
  const expenses = ['Ăn uống', 'Di chuyển', 'Nhà ở', 'Học tập', 'Giải trí', 'Mua sắm', 'Khác'];
  const income = ['Lương', 'Trợ cấp', 'Học bổng', 'Khác'];
  const limit = 1000000000;
  const pad = n => String(n).padStart(2, '0');
  const localDate = (date = new Date()) => [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join('-');
  const validMonth = value => /^20\d{2}-(0[1-9]|1[0-2])$/.test(value);
  const validAmount = value => Number.isSafeInteger(value) && value > 0 && value <= limit;
  const validDate = value => validMonth(value.slice(0, 7)) &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) && localDate(new Date(value + 'T12:00:00')) === value;
  const period = (rows, month) => rows.filter(row => row.date.slice(0, 7) === month);
  const totalSpent = rows => rows.reduce((sum, row) => sum + (row.type === 'out' ? row.amount : 0), 0);
  function byCategory(rows) {
    const totals = Object.fromEntries(expenses.map(name => [name, 0]));
    for (const row of rows) if (row.type === 'out') totals[row.category] += row.amount;
    return totals;
  }
  function budgetStatus(spent, cap) {
    return {spent, cap, remaining: cap - spent, percent: Math.floor(spent / cap * 100),
      level: spent > cap ? 'over' : spent >= cap * 0.8 ? 'near' : 'normal'};
  }
  function seed(today) {
    const month = today.slice(0, 7);
    const day = Number(today.slice(8));
    const input = [
      [2, 'Nhà ở', 1700000, 'Tiền phòng'],
      [3, 'Ăn uống', 650000, 'Đi chợ đầu tháng'],
      [4, 'Học tập', 320000, 'Giáo trình'],
      [6, 'Di chuyển', 260000, 'Xăng và gửi xe'],
      [7, 'Ăn uống', 530000, 'Bữa ăn trong tuần'],
      [8, 'Giải trí', 180000, 'Xem phim'],
      [9, 'Ăn uống', 380000, 'Ăn trưa và đi chợ'],
    ];
    const transactions = input.map(([d, category, amount, note]) =>
      ({id: 'demo-' + (d - 1), date: month + '-' + pad(Math.min(d, day)), type: 'out', category, amount, note}));
    const budgets = [['Ăn uống', 1800000], ['Di chuyển', 500000], ['Học tập', 600000]]
      .map(([category, cap]) => ({month, category, cap}));
    return {version: 1, demo: true, transactions, budgets};
  }
  return {expenses, income, limit, localDate, validMonth, validDate, validAmount, period, totalSpent, byCategory, budgetStatus, seed};
})();

if (typeof module === 'object') module.exports = Wallet;
