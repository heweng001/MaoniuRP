export function parseInquiryNumeric(value) {
  if (value === null || value === undefined) {
    return 0;
  }
  const text = String(value).trim().replace(/,/g, '');
  const match = text.match(/(\d+)/);
  return match ? Number.parseInt(match[1], 10) : 0;
}

export function formatInquiryDisplay(value) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  return String(value);
}

function normalizePath(categories, category) {
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
    leafCount: 0,
    leafInquiry: '',
    isLeaf: false,
  };
}

export function buildCategoryTree(categories = []) {
  const root = createNode({ categoryId: 'root', categoryName: '全部类目' }, 0);

  for (const category of categories) {
    const path = normalizePath(categories, category);
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
    node.leafInquiry = formatInquiryDisplay(category.iquiries);
    node.leafCount += 1;
  }

  return root;
}

export function formatAggregateInquiry(sum, hasPlus) {
  if (!sum) {
    return '0';
  }
  return hasPlus ? `${sum}+` : String(sum);
}

export function flattenTreeNodes(node, expandedPrefix = 'root', rows = []) {
  const children = [...node.children.values()].sort((a, b) => b.inquirySum - a.inquirySum);
  for (const child of children) {
    const nodeId = `${expandedPrefix}/${child.id}`;
    const hasChildren = child.children.size > 0;
    rows.push({
      id: nodeId,
      name: child.name,
      level: child.level,
      inquiry: child.isLeaf && !hasChildren
        ? child.leafInquiry
        : formatAggregateInquiry(child.inquirySum, child.hasPlus),
      hasChildren,
      isLeaf: child.isLeaf && !hasChildren,
      parentId: expandedPrefix,
    });
    if (hasChildren) {
      flattenTreeNodes(child, nodeId, rows);
    }
  }
  return rows;
}

export function computeShopInquirySummary(categories = []) {
  const tree = buildCategoryTree(categories);
  let hasPlus = false;
  let total = 0;
  for (const category of categories) {
    total += parseInquiryNumeric(category.iquiries);
    if (String(category.iquiries || '').includes('+')) {
      hasPlus = true;
    }
  }
  return {
    totalInquiry: formatAggregateInquiry(total, hasPlus),
    leafCount: categories.length,
    topLevel: [...tree.children.values()]
      .sort((a, b) => b.inquirySum - a.inquirySum)
      .map((node) => ({
        name: node.name,
        inquiry: formatAggregateInquiry(node.inquirySum, node.hasPlus),
        childCount: node.children.size,
      })),
  };
}
