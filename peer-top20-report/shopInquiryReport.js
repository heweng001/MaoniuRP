import {
  buildCategoryTree,
  computeShopInquirySummary,
  formatAggregateInquiry,
  formatInquiryRate,
} from './shopInquiryTree.js';

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderTreeRows(node, parentKey = 'root', rows = []) {
  const children = [...node.children.values()].sort((a, b) => b.inquirySum - a.inquirySum);
  for (const child of children) {
    const rowKey = `${parentKey}::${child.id}`;
    const hasChildren = child.children.size > 0;
    const inquiryText =
      child.isLeaf && !hasChildren
        ? child.leafInquiry
        : formatAggregateInquiry(child.inquirySum, child.hasPlus);
    const pageViewsText =
      child.isLeaf && !hasChildren
        ? child.leafPageViews
        : child.pageViewsSum
          ? String(child.pageViewsSum)
          : '-';
    const inquiryRateText =
      child.isLeaf && !hasChildren
        ? formatInquiryRate(child.leafInquiry, child.leafPageViews)
        : formatInquiryRate(child.inquirySum, child.pageViewsSum);
    rows.push({
      rowKey,
      parentKey,
      level: child.level,
      name: child.name,
      inquiryText,
      pageViewsText,
      inquiryRateText,
      hasChildren,
      collapsed: hasChildren,
    });
    if (hasChildren) {
      renderTreeRows(child, rowKey, rows);
    }
  }
  return rows;
}

function renderTreeBodyRows(rows) {
  return rows
    .map((row) => {
      const indent = 12 + (row.level - 1) * 18;
      const toggle = row.hasChildren
        ? `<button type="button" class="tree-toggle" data-target="${escapeHtml(row.rowKey)}" aria-expanded="true">-</button>`
        : '<span class="tree-placeholder"></span>';
      return `
        <tr class="tree-row" data-row-key="${escapeHtml(row.rowKey)}" data-parent-key="${escapeHtml(row.parentKey)}" data-has-children="${row.hasChildren ? '1' : '0'}">
          <td class="tree-name" style="padding-left:${indent}px">${toggle}<span>${escapeHtml(row.name)}</span></td>
          <td class="center">${escapeHtml(row.pageViewsText)}</td>
          <td class="center">${escapeHtml(row.inquiryText)}</td>
          <td class="center">${escapeHtml(row.inquiryRateText)}</td>
        </tr>`;
    })
    .join('');
}

export function buildShopInquiryTitle(shopUrl) {
  let host = shopUrl;
  try {
    host = new URL(shopUrl).hostname.replace('.en.alibaba.com', '');
  } catch {
    /* keep raw */
  }
  const dateStr = new Date().toISOString().slice(0, 10);
  return `${host}-指定同行询盘分布-${dateStr}`;
}

export function generateShopInquiryHtml({ shopUrl, categories = [], title, incompleteNote = '' }) {
  const reportTitle = title || buildShopInquiryTitle(shopUrl);
  const today = new Date().toISOString().slice(0, 10);
  const summary = computeShopInquirySummary(categories);
  const tree = buildCategoryTree(categories);
  const rows = renderTreeRows(tree);
  const topLevelSummary = summary.topLevel
    .map(
      (item) =>
        `<li><strong>${escapeHtml(item.name)}</strong>：${escapeHtml(item.inquiry)}（${item.childCount} 个子级）</li>`,
    )
    .join('');
  const incompleteBanner = incompleteNote
    ? `<div class="incomplete-banner">⚠ ${escapeHtml(incompleteNote)}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(reportTitle)}</title>
  <style>
    body { font: 12px/1.45 "Microsoft YaHei", sans-serif; color: #1f2937; margin: 24px; }
    h1 { font-size: 18px; margin: 0 0 8px; }
    .meta, .summary-box { color: #6b7280; margin-bottom: 12px; font-size: 11px; }
    .incomplete-banner { background: #fffbeb; border: 1px solid #fcd34d; color: #92400e; border-radius: 6px; padding: 10px 12px; margin-bottom: 12px; font-size: 11px; }
    .summary-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 12px; }
    .summary-box strong { color: #111827; }
    .summary-box ul { margin: 8px 0 0; padding-left: 18px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { border: 1px solid #d1d5db; padding: 6px 8px; }
    th { background: #f3f4f6; text-align: left; }
    .center { text-align: center; }
    .tree-toggle { width: 18px; height: 18px; margin-right: 6px; border: 1px solid #cbd5e1; background: #fff; cursor: pointer; font-size: 11px; line-height: 1; vertical-align: middle; }
    .tree-placeholder { display: inline-block; width: 24px; }
    .hidden { display: none; }
    .footer { margin-top: 16px; color: #9ca3af; font-size: 10px; }
  </style>
</head>
<body>
  <h1>指定同行询盘分布</h1>
  ${incompleteBanner}
  <p class="meta">店铺：<strong>${escapeHtml(shopUrl)}</strong> · 生成日期 ${today} · 近 6 个月类目访客与询盘</p>
  <div class="summary-box">
    <div>总询盘数：<strong>${escapeHtml(summary.totalInquiry)}</strong> · 总访客数：<strong>${escapeHtml(summary.totalPageViews)}</strong> · 叶子类目：<strong>${summary.leafCount}</strong></div>
    ${topLevelSummary ? `<ul>${topLevelSummary}</ul>` : ''}
  </div>
  <table>
    <thead>
      <tr>
        <th>类目</th>
        <th class="center">类目访客</th>
        <th class="center">类目询盘</th>
        <th class="center">询盘率</th>
      </tr>
    </thead>
    <tbody>${renderTreeBodyRows(rows) || '<tr><td colspan="4" class="center">暂无数据</td></tr>'}</tbody>
  </table>
  <p class="footer">AI操盘手-重制版 · 版权所有 © 福建贸牛科技股份有限公司</p>
  <script>
    function setVisible(rowKey, visible) {
      document.querySelectorAll('[data-parent-key="' + rowKey + '"]').forEach(function (row) {
        row.classList.toggle('hidden', !visible);
        if (!visible) {
          var toggle = row.querySelector('.tree-toggle');
          if (toggle) {
            toggle.textContent = '+';
            toggle.setAttribute('aria-expanded', 'false');
          }
          setVisible(row.dataset.rowKey, false);
        }
      });
    }
    document.querySelectorAll('.tree-toggle').forEach(function (button) {
      button.addEventListener('click', function () {
        var expanded = button.getAttribute('aria-expanded') === 'true';
        button.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        button.textContent = expanded ? '+' : '-';
        setVisible(button.dataset.target, !expanded);
      });
    });
  </script>
</body>
</html>`;
}

export function renderShopInquiryPreviewHtml({ shopUrl, categories = [], incompleteNote = '' }) {
  const summary = computeShopInquirySummary(categories);
  const tree = buildCategoryTree(categories);
  const rows = renderTreeRows(tree);
  const topLevelSummary = summary.topLevel
    .map(
      (item) =>
        `<li><strong>${escapeHtml(item.name)}</strong>：${escapeHtml(item.inquiry)}（${item.childCount} 个子级）</li>`,
    )
    .join('');
  const incompleteBanner = incompleteNote
    ? `<div class="incomplete-banner">⚠ ${escapeHtml(incompleteNote)}</div>`
    : '';

  return `
    <section class="report-section shop-tree-report" data-shop-tree="1">
      <h4>指定同行询盘分布</h4>
      ${incompleteBanner}
      <p class="report-note">店铺：${escapeHtml(shopUrl)} · 近 6 个月类目访客与询盘</p>
      <div class="summary-box">
        <div>总询盘数：<strong>${escapeHtml(summary.totalInquiry)}</strong> · 总访客数：<strong>${escapeHtml(summary.totalPageViews)}</strong> · 叶子类目：<strong>${summary.leafCount}</strong></div>
        ${topLevelSummary ? `<ul class="summary-list">${topLevelSummary}</ul>` : ''}
      </div>
      <table class="report-table shop-tree-table">
        <thead><tr><th>类目</th><th>类目访客</th><th>类目询盘</th><th>询盘率</th></tr></thead>
        <tbody>${renderTreeBodyRows(rows) || '<tr><td colspan="4">暂无数据</td></tr>'}</tbody>
      </table>
    </section>`;
}
