/** HTML 报告生成器 */

import { normalizeAlibabaShopUrl } from './shopUrl.js';

function renderTable(category) {
  const rows = category.rows
    .map((row) => {
      const companyCell = row.home
        ? `<a href="${row.home}" target="_blank" rel="noreferrer">${row.companyName}</a>`
        : `${row.companyName}`;
      const shopNormalized = normalizeAlibabaShopUrl(row.home || '');
      const shopCell = shopNormalized.valid
        ? `<a href="${shopNormalized.shopUrl}" target="_blank" rel="noreferrer">查全店询盘</a>`
        : '-';
      return `
        <tr>
          <td class="center">第${row.rank}名</td>
          <td class="center">${companyCell}</td>
          <td class="center col-main">${row.mainProducts}</td>
          <td class="center">${row.platformCategory || '-'}</td>
          <td class="center">${row.pageViews}</td>
          <td class="center">${row.inquiries}</td>
          <td class="center">${row.inquiryRate}</td>
          <td class="center">${row.transactionNumber}</td>
          <td class="center">${row.transactionPrice}</td>
          <td class="center">${row.displayStarLevel}</td>
          <td class="center">${row.supplierYear}</td>
          <td class="center">${shopCell}</td>
        </tr>`;
    })
    .join('');

  const summary = category.summary;
  const summaryRow = `
    <tr class="summary-row">
      <td class="center" colspan="4">同行平均统计</td>
      <td class="center">${summary.pageViews}</td>
      <td class="center">${summary.inquiries}</td>
      <td class="center">${summary.inquiryRate}</td>
      <td class="center">${summary.transactionNumber}</td>
      <td class="center">${summary.transactionPrice}</td>
      <td class="center">${summary.displayStarLevel}</td>
      <td class="center">${summary.supplierYear}</td>
      <td class="center">-</td>
    </tr>`;

  return `
    <table>
      <thead>
        <tr>
          <th>排名</th>
          <th>公司名称</th>
          <th>主营产品</th>
          <th>类目</th>
          <th>类目访问</th>
          <th>类目询盘</th>
          <th>询盘率</th>
          <th>全店线上订单量</th>
          <th>全店线上订单金额</th>
          <th>商家星等级</th>
          <th>供应商年限</th>
          <th>查全店询盘</th>
        </tr>
      </thead>
      <tbody>${rows}${summaryRow}</tbody>
    </table>`;
}

export function generateHtmlReport(reports, { title, selectedCategory } = {}) {
  const today = new Date().toISOString().slice(0, 10);
  const sections = reports
    .map((report) => {
      const categoryName = selectedCategory || report.defaultCategory;
      let category =
        report.categories.find((item) => item.category === categoryName) ||
        report.categories[0];
      if (!category) {
        return '';
      }

      return `
        <section class="report-section">
          <h2>${category.category} 类目询盘同行 top 排行榜</h2>
          <p class="note">
            关键词：<strong>${report.keyword}</strong>；
            访客、询盘为该店铺在 <strong>${category.category}</strong> 类目下近 6 个月数据。
            线上订单量及金额为全店近 6 个月数据。
          </p>
          ${renderTable(category)}
        </section>`;
    })
    .join('');

  const reportTitle = title || `Top 同行报告 - ${today}`;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${reportTitle}</title>
  <style>
    body { font-family: "Microsoft YaHei", Arial, sans-serif; margin: 16px; color: #1f2937; background: #f8fafc; font-size: 12px; }
    .container { max-width: 1400px; margin: 0 auto; background: #fff; padding: 16px 20px; border: 1px solid #e5e7eb; }
    h1 { margin: 0 0 6px; font-size: 18px; }
    .meta { color: #6b7280; margin-bottom: 16px; font-size: 11px; }
    h2 { font-size: 14px; margin: 0 0 8px; }
    .note { color: #6b7280; font-size: 11px; line-height: 1.5; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { border: 1px solid #d1d5db; padding: 5px 6px; }
    .col-main { max-width: 100px; white-space: normal; word-break: break-word; }
    th { background: #f3f4f6; font-weight: 600; }
    .center { text-align: center; }
    .summary-row { background: #fffbeb; font-weight: 600; }
    a { color: #2563eb; text-decoration: none; }
    .report-section + .report-section { margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; }
    .footer { margin-top: 20px; color: #9ca3af; font-size: 10px; }
    @media print { body { background: #fff; margin: 0; } .container { border: none; padding: 0; } }
  </style>
</head>
<body>
  <div class="container">
    <h1>${reportTitle}</h1>
    <div class="meta">生成时间：${today}</div>
    ${sections}
    <p class="footer">AI操盘手-重制版 · 版权所有 © 福建贸牛科技股份有限公司</p>
  </div>
</body>
</html>`;
}
