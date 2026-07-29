#!/usr/bin/env node
/**
 * 同行 Top20 报告生成器
 *
 * 参考 maoniu-report-master 中的 sameIndustryAnalyseList 模块，
 * 将同行 top20 数据导出为 HTML / Excel 报告。
 *
 * 用法:
 *   node index.js --demo
 *   node index.js --input sample_data.json
 *   node index.js --input sample_data.json --category "Wireless Chargers"
 *   node index.js --report-id 12345
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { fetchReportById, loadJsonFile } from './apiClient.js';
import { processSameIndustryData } from './dataProcessor.js';
import { exportExcelReport } from './reportExcel.js';
import { generateHtmlReport } from './reportHtml.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SAMPLE_DATA = path.join(__dirname, 'sample_data.json');
const DEFAULT_OUTPUT_DIR = path.join(__dirname, 'output');

function printHelp() {
  console.log(`同行 Top20 报告生成器

用法:
  node index.js --demo
  node index.js --input <json文件>
  node index.js --report-id <报告ID>

选项:
  --category, -c     指定展示的叶子类目
  --output-dir, -o   输出目录（默认 ./output）
  --html-only        仅生成 HTML
  --excel-only       仅生成 Excel
  --api-base         报告 API 地址
`);
}

function parseArgs(argv) {
  const args = {
    demo: false,
    input: '',
    reportId: '',
    category: '',
    outputDir: DEFAULT_OUTPUT_DIR,
    htmlOnly: false,
    excelOnly: false,
    apiBase: 'https://ma.maoniux.com/api/v1/report',
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--demo') {
      args.demo = true;
    } else if (arg === '--html-only') {
      args.htmlOnly = true;
    } else if (arg === '--excel-only') {
      args.excelOnly = true;
    } else if (arg === '--input' || arg === '-i') {
      args.input = argv[i + 1] || '';
      i += 1;
    } else if (arg === '--report-id' || arg === '-r') {
      args.reportId = argv[i + 1] || '';
      i += 1;
    } else if (arg === '--category' || arg === '-c') {
      args.category = argv[i + 1] || '';
      i += 1;
    } else if (arg === '--output-dir' || arg === '-o') {
      args.outputDir = argv[i + 1] || DEFAULT_OUTPUT_DIR;
      i += 1;
    } else if (arg === '--api-base') {
      args.apiBase = argv[i + 1] || args.apiBase;
      i += 1;
    }
  }

  return args;
}

function buildOutputPaths(keyword, outputDir) {
  const dateStr = new Date().toISOString().slice(0, 10);
  const safeKeyword = (keyword || 'report').replace(/[\\/]/g, '-');
  const baseName = `${safeKeyword}-询盘top20店铺明细表-${dateStr}`;
  return {
    html: path.join(outputDir, `${baseName}.html`),
    excel: path.join(outputDir, `${baseName}.xlsx`),
  };
}

async function loadSourceData(args) {
  if (args.demo) {
    return loadJsonFile(SAMPLE_DATA);
  }
  if (args.input) {
    return loadJsonFile(args.input);
  }
  if (args.reportId) {
    return fetchReportById(Number(args.reportId), args.apiBase);
  }
  throw new Error('请指定 --demo、--input 或 --report-id 之一');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return 0;
  }

  if (!args.demo && !args.input && !args.reportId) {
    printHelp();
    return 1;
  }

  fs.mkdirSync(args.outputDir, { recursive: true });

  let rawData;
  try {
    rawData = await loadSourceData(args);
  } catch (error) {
    console.error(`错误：${error.message}`);
    return 1;
  }

  let reports;
  try {
    reports = processSameIndustryData(rawData);
  } catch (error) {
    console.error(`错误：${error.message}`);
    return 1;
  }

  if (!reports.length) {
    console.error('错误：未找到可处理的同行数据');
    return 1;
  }

  const keywordLabel = reports.length === 1 ? reports[0].keyword : 'multi-keywords';
  const outputPaths = buildOutputPaths(keywordLabel, args.outputDir);
  const title = `${keywordLabel}-询盘top20店铺明细表-${new Date().toISOString().slice(0, 10)}`;
  const generated = [];

  if (!args.excelOnly) {
    const html = generateHtmlReport(reports, {
      title,
      selectedCategory: args.category || undefined,
    });
    fs.writeFileSync(outputPaths.html, html, 'utf-8');
    generated.push(outputPaths.html);
  }

  if (!args.htmlOnly) {
    await exportExcelReport(reports, outputPaths.excel, {
      selectedCategory: args.category || undefined,
    });
    generated.push(outputPaths.excel);
  }

  console.log('报告生成成功：');
  generated.forEach((filePath) => console.log(`  - ${filePath}`));
  reports.forEach((report) => {
    const categories = report.categories.map((item) => item.category).join(', ');
    console.log(`关键词 [${report.keyword}] 可用类目：${categories}`);
  });

  return 0;
}

main().then((code) => {
  process.exit(code);
});
