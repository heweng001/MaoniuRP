import ExcelJS from 'exceljs';

const HEADERS = [
  '排名',
  '公司名称',
  '店铺链接',
  '主营产品',
  '类目',
  '类目访问',
  '类目询盘',
  '询盘率',
  '全店线上订单量',
  '全店线上订单金额',
  '商家星等级',
  '供应商年限',
];

function styleHeaderRow(row) {
  row.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFAFAFA' },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
      left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
      bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
      right: { style: 'thin', color: { argb: 'FFD9D9D9' } },
    };
  });
}

function styleDataRow(row) {
  row.eachCell((cell) => {
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
      left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
      bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
      right: { style: 'thin', color: { argb: 'FFD9D9D9' } },
    };
  });
}

function writeCategorySheet(sheet, keyword, category) {
  sheet.mergeCells('A1:L1');
  sheet.getCell('A1').value = `${category.category} 类目询盘同行 top20 排行榜`;
  sheet.getCell('A1').font = { size: 14, bold: true };

  sheet.mergeCells('A2:L2');
  sheet.getCell('A2').value = `关键词：${keyword}`;

  const headerRow = sheet.getRow(4);
  headerRow.values = HEADERS;
  styleHeaderRow(headerRow);

  let currentRow = 5;
  for (const row of category.rows) {
    const dataRow = sheet.getRow(currentRow);
    dataRow.values = [
      row.rank,
      row.companyName,
      row.home,
      row.mainProducts,
      row.platformCategory,
      row.pageViews,
      row.inquiries,
      row.inquiryRate,
      row.transactionNumber,
      row.transactionPrice,
      row.displayStarLevel,
      row.supplierYear,
    ];
    styleDataRow(dataRow);
    currentRow += 1;
  }

  const summary = category.summary;
  const summaryRow = sheet.getRow(currentRow);
  summaryRow.values = [
    '同行平均统计',
    '',
    '',
    '',
    summary.pageViews,
    summary.inquiries,
    summary.inquiryRate,
    summary.transactionNumber,
    summary.transactionPrice,
    summary.displayStarLevel,
    summary.supplierYear,
  ];
  summaryRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFFBE6' },
    };
  });
  styleDataRow(summaryRow);

  sheet.columns = [
    { width: 8 },
    { width: 24 },
    { width: 28 },
    { width: 24 },
    { width: 28 },
    { width: 12 },
    { width: 12 },
    { width: 10 },
    { width: 14 },
    { width: 16 },
    { width: 12 },
    { width: 12 },
  ];
}

export function buildExcelWorkbook(reports, { selectedCategory } = {}) {
  const workbook = new ExcelJS.Workbook();

  for (const report of reports) {
    const categoryName = selectedCategory || report.defaultCategory;
    const category =
      report.categories.find((item) => item.category === categoryName) ||
      report.categories[0];
    if (!category) {
      continue;
    }

    const sheetName = `${report.keyword}-${category.category}`.slice(0, 31);
    const sheet = workbook.addWorksheet(sheetName);
    writeCategorySheet(sheet, report.keyword, category);
  }

  if (!workbook.worksheets.length) {
    throw new Error('没有可导出的类目数据');
  }

  return workbook;
}

export async function exportExcelReport(reports, outputPath, options = {}) {
  const workbook = buildExcelWorkbook(reports, options);
  await workbook.xlsx.writeFile(outputPath);
  return outputPath;
}

export async function exportExcelToBuffer(reports, options = {}) {
  const workbook = buildExcelWorkbook(reports, options);
  return workbook.xlsx.writeBuffer();
}
