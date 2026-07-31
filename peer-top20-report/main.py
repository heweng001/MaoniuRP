#!/usr/bin/env python3
"""
同行 Top20 报告生成器

参考 maoniu-report-master 项目中的 sameIndustryAnalyseList 模块，
将同行 top20 数据导出为 HTML / Excel 报告。

用法示例:
  python main.py --demo
  python main.py --input sample_data.json
  python main.py --input sample_data.json --category "Wireless Chargers"
  python main.py --report-id 12345
"""

from __future__ import annotations

import argparse
import sys
from datetime import datetime
from pathlib import Path

from api_client import fetch_report_by_id, load_json_file
from data_processor import process_same_industry_data
from report_excel import export_excel_report
from report_html import generate_html_report

SAMPLE_DATA = Path(__file__).parent / "sample_data.json"
DEFAULT_OUTPUT_DIR = Path(__file__).parent / "output"


def build_output_paths(keyword: str, output_dir: Path) -> tuple[Path, Path]:
    date_str = datetime.now().strftime("%Y-%m-%d")
    safe_keyword = keyword.replace("/", "-").replace("\\", "-").strip() or "report"
    base_name = f"{safe_keyword}-top同行询盘榜-{date_str}"
    return output_dir / f"{base_name}.html", output_dir / f"{base_name}.xlsx"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="生成同行 Top20 报告（HTML + Excel）")
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--input", "-i", help="输入 JSON 文件路径（含 sameIndustryAnalyseList）")
    source.add_argument("--report-id", "-r", type=int, help="从 ma.maoniux.com 拉取已有报告 ID")
    source.add_argument("--demo", action="store_true", help="使用内置示例数据生成报告")

    parser.add_argument("--category", "-c", help="指定展示的叶子类目名称")
    parser.add_argument("--output-dir", "-o", default=str(DEFAULT_OUTPUT_DIR), help="输出目录")
    parser.add_argument("--html-only", action="store_true", help="仅生成 HTML")
    parser.add_argument("--excel-only", action="store_true", help="仅生成 Excel")
    parser.add_argument("--api-base", default="https://ma.maoniux.com/api/v1/report", help="报告 API 地址")
    return parser.parse_args()


def load_source_data(args: argparse.Namespace) -> dict:
    if args.demo:
        return load_json_file(str(SAMPLE_DATA))
    if args.input:
        return load_json_file(args.input)
    return fetch_report_by_id(args.report_id, api_base=args.api_base)


def main() -> int:
    args = parse_args()
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    try:
        raw_data = load_source_data(args)
        reports = process_same_industry_data(raw_data)
    except Exception as exc:
        print(f"错误：{exc}", file=sys.stderr)
        return 1

    if not reports:
        print("错误：未找到可处理的同行数据", file=sys.stderr)
        return 1

    keyword_label = (
        reports[0].keyword
        if len(reports) == 1
        else "、".join(report["keyword"] for report in reports)
    )
    html_path, excel_path = build_output_paths(keyword_label, output_dir)
    title = f"{keyword_label}-top同行询盘榜-{datetime.now().strftime('%Y-%m-%d')}"

    generated: list[str] = []

    if not args.excel_only:
        html_content = generate_html_report(
            reports,
            title=title,
            selected_category=args.category,
        )
        html_path.write_text(html_content, encoding="utf-8")
        generated.append(str(html_path))

    if not args.html_only:
        export_excel_report(
            reports,
            excel_path,
            selected_category=args.category,
        )
        generated.append(str(excel_path))

    print("报告生成成功：")
    for path in generated:
        print(f"  - {path}")

    for report in reports:
        categories = ", ".join(c.category for c in report.categories)
        print(f"关键词 [{report.keyword}] 可用类目：{categories}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
