(function initShopTreeClient(global) {
  function parseInquiryNumeric(value) {
    const text = String(value ?? '').trim().replace(/,/g, '');
    const match = text.match(/(\d+)/);
    return match ? Number.parseInt(match[1], 10) : 0;
  }

  function formatAggregateInquiry(sum, hasPlus) {
    if (!sum) return '0';
    return hasPlus ? `${sum}+` : String(sum);
  }

  function escapeHtml(text) {
    return String(text ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function normalizePath(category) {
    if (Array.isArray(category.categoryPath) && category.categoryPath.length) {
      return category.categoryPath.map((item) => ({
        categoryId: String(item.categoryId || item.categoryName || ''),
        categoryName: String(item.categoryName || item.categoryId || '未分类'),
      }));
    }
    return [
      {
        categoryId: String(category.categoryId || category.categoryName || '未分类'),
        categoryName: String(category.categoryName || category.categoryId || '未分类'),
      },
    ];
  }

  function createNode(segment, level) {
    return {
      id: String(segment.categoryId || segment.categoryName),
      name: String(segment.categoryName || segment.categoryId || '未分类'),
      level,
      children: new Map(),
      inquirySum: 0,
      hasPlus: false,
      leafInquiry: '',
      isLeaf: false,
    };
  }

  function buildCategoryTree(categories) {
    const root = createNode({ categoryId: 'root', categoryName: '全部类目' }, 0);
    for (const category of categories || []) {
      const path = normalizePath(category);
      const inquiryNum = parseInquiryNumeric(category.iquiries);
      const hasPlus = String(category.iquiries || '').includes('+');
      let node = root;
      root.inquirySum += inquiryNum;
      if (hasPlus) root.hasPlus = true;
      for (let index = 0; index < path.length; index += 1) {
        const segment = path[index];
        const key = String(segment.categoryId || segment.categoryName);
        if (!node.children.has(key)) {
          node.children.set(key, createNode(segment, index + 1));
        }
        const child = node.children.get(key);
        child.inquirySum += inquiryNum;
        if (hasPlus) child.hasPlus = true;
        node = child;
      }
      node.isLeaf = true;
      node.leafInquiry = String(category.iquiries ?? '-');
    }
    return root;
  }

  function computeSummary(categories) {
    let total = 0;
    let hasPlus = false;
    for (const category of categories || []) {
      total += parseInquiryNumeric(category.iquiries);
      if (String(category.iquiries || '').includes('+')) hasPlus = true;
    }
    const tree = buildCategoryTree(categories);
    return {
      totalInquiry: formatAggregateInquiry(total, hasPlus),
      leafCount: (categories || []).length,
      topLevel: [...tree.children.values()]
        .sort((a, b) => b.inquirySum - a.inquirySum)
        .map((node) => ({
          name: node.name,
          inquiry: formatAggregateInquiry(node.inquirySum, node.hasPlus),
          childCount: node.children.size,
        })),
    };
  }

  function renderTreeRows(node, parentKey, rows) {
    const children = [...node.children.values()].sort((a, b) => b.inquirySum - a.inquirySum);
    for (const child of children) {
      const rowKey = `${parentKey}::${child.id}`;
      const hasChildren = child.children.size > 0;
      rows.push({
        rowKey,
        parentKey,
        level: child.level,
        name: child.name,
        inquiryText:
          child.isLeaf && !hasChildren
            ? child.leafInquiry
            : formatAggregateInquiry(child.inquirySum, child.hasPlus),
        hasChildren,
      });
      if (hasChildren) renderTreeRows(child, rowKey, rows);
    }
    return rows;
  }

  function renderPreview({ shopUrl, categories }) {
    const summary = computeSummary(categories);
    const rows = renderTreeRows(buildCategoryTree(categories), 'root', []);
    const topLevelSummary = summary.topLevel
      .map(
        (item) =>
          `<li><strong>${escapeHtml(item.name)}</strong>：${escapeHtml(item.inquiry)}（${item.childCount} 个子级）</li>`,
      )
      .join('');
    const bodyRows = rows
      .map((row) => {
        const indent = 12 + (row.level - 1) * 18;
      const toggle = row.hasChildren
        ? `<button type="button" class="tree-toggle" data-target="${escapeHtml(row.rowKey)}" aria-expanded="true">-</button>`
        : '<span class="tree-placeholder"></span>';
      return `
        <tr class="tree-row" data-row-key="${escapeHtml(row.rowKey)}" data-parent-key="${escapeHtml(row.parentKey)}">
            <td class="tree-name" style="padding-left:${indent}px">${toggle}<span>${escapeHtml(row.name)}</span></td>
            <td>${escapeHtml(row.inquiryText)}</td>
          </tr>`;
      })
      .join('');

    return `
      <section class="report-section shop-tree-report">
        <h4>指定同行询盘分布</h4>
        <p class="report-note">店铺：${escapeHtml(shopUrl)} · 近 6 个月类目询盘</p>
        <div class="summary-box">
          <div>总询盘数：<strong>${escapeHtml(summary.totalInquiry)}</strong> · 叶子类目：<strong>${summary.leafCount}</strong></div>
          ${topLevelSummary ? `<ul class="summary-list">${topLevelSummary}</ul>` : ''}
        </div>
        <table class="report-table shop-tree-table">
          <thead><tr><th>类目</th><th>类目询盘</th></tr></thead>
          <tbody>${bodyRows || '<tr><td colspan="2">暂无数据</td></tr>'}</tbody>
        </table>
      </section>`;
  }

  function setVisible(container, rowKey, visible) {
    container.querySelectorAll(`[data-parent-key="${rowKey}"]`).forEach((row) => {
      row.classList.toggle('hidden', !visible);
      if (!visible) {
        const toggle = row.querySelector('.tree-toggle');
        if (toggle) {
          toggle.textContent = '+';
          toggle.setAttribute('aria-expanded', 'false');
        }
        setVisible(container, row.dataset.rowKey, false);
      }
    });
  }

  function bindToggles(container) {
    if (!container) return;
    container.querySelectorAll('.tree-toggle').forEach((button) => {
      button.addEventListener('click', () => {
        const expanded = button.getAttribute('aria-expanded') === 'true';
        button.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        button.textContent = expanded ? '+' : '-';
        setVisible(container, button.dataset.target, !expanded);
      });
    });
  }

  global.ShopTreeClient = {
    renderPreview,
    bindToggles,
  };
})(window);
