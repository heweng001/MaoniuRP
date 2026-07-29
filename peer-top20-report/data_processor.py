"""数据处理模块 - 移植自 sameIndustryAnalysis.jsx"""

from __future__ import annotations

import html
import re
from dataclasses import dataclass
from typing import Any


def parse_to_number(value: Any) -> float:
    if value is None or value == "":
        return float("nan")
    text = str(value).replace(",", "").replace("+", "").replace("$", "").replace(" ", "")
    try:
        return float(text)
    except ValueError:
        return float("nan")


def calculate_avg(values: list[float], fix_number: int = 2) -> str | int | float:
    valid = [v for v in values if v == v]  # filter NaN
    if not valid:
        return "N/A"
    total = sum(valid)
    if fix_number == -1:
        return int(total / len(valid))
    return round(total / len(valid), fix_number)


def unescape_html(text: str) -> str:
    if not text:
        return ""
    return html.unescape(re.sub(r"<[^>]+>", "", str(text)))


@dataclass
class PeerRow:
    rank: int
    company_name: str
    home: str
    main_products: str
    total_product_count: str
    page_views: str
    inquiries: str
    inquiry_rate: str
    transaction_number: str
    transaction_price: str
    display_star_level: str
    supplier_year: str


@dataclass
class CategoryGroup:
    category: str
    rows: list[PeerRow]
    summary: dict[str, Any]


@dataclass
class KeywordReport:
    keyword: str
    categories: list[CategoryGroup]
    default_category: str


def build_peer_row(record: dict[str, Any], rank: int) -> PeerRow:
    page_views = parse_to_number(record.get("pageViews"))
    inquiries = parse_to_number(record.get("iquiries"))
    if page_views == page_views and page_views > 0 and inquiries == inquiries:
        inquiry_rate = f"{(inquiries / page_views) * 100:.2f}%"
    else:
        inquiry_rate = "N/A"

    return PeerRow(
        rank=rank,
        company_name=str(record.get("companyName", "")),
        home=str(record.get("home", "")),
        main_products=unescape_html(record.get("mainProducts", "")),
        total_product_count=str(record.get("totalProductCount", "")),
        page_views=str(record.get("pageViews", "")),
        inquiries=str(record.get("iquiries", "")),
        inquiry_rate=inquiry_rate,
        transaction_number=str(record.get("transactionNumber", "")),
        transaction_price=str(record.get("transactionPrice", "")),
        display_star_level=str(record.get("displayStarLevel", "")),
        supplier_year=str(record.get("supplierYear", "")),
    )


def build_summary(records: list[dict[str, Any]]) -> dict[str, Any]:
    total_product_count = calculate_avg(
        [parse_to_number(r.get("totalProductCount")) for r in records], 0
    )
    page_views = calculate_avg([parse_to_number(r.get("pageViews")) for r in records], 0)
    inquiries = calculate_avg([parse_to_number(r.get("iquiries")) for r in records], 0)
    transaction_number = calculate_avg(
        [parse_to_number(r.get("transactionNumber")) for r in records], -1
    )
    transaction_price = calculate_avg(
        [parse_to_number(r.get("transactionPrice")) for r in records], 0
    )
    display_star_level = calculate_avg(
        [parse_to_number(r.get("displayStarLevel")) for r in records], -1
    )
    supplier_year = calculate_avg(
        [parse_to_number(r.get("supplierYear")) for r in records], -1
    )

    page_views_num = parse_to_number(page_views)
    inquiries_num = parse_to_number(inquiries)
    if page_views_num == page_views_num and page_views_num > 0 and inquiries_num == inquiries_num:
        inquiry_rate = f"{(inquiries_num / page_views_num) * 100:.2f}%"
    else:
        inquiry_rate = "N/A"

    return {
        "total_product_count": total_product_count,
        "page_views": page_views,
        "inquiries": inquiries,
        "inquiry_rate": inquiry_rate,
        "transaction_number": transaction_number,
        "transaction_price": f"${transaction_price}" if transaction_price != "N/A" else "N/A",
        "display_star_level": display_star_level,
        "supplier_year": supplier_year,
    }


def build_category_group(category: str, records: list[dict[str, Any]]) -> CategoryGroup:
    top20 = records[:20]
    rows = [build_peer_row(record, index + 1) for index, record in enumerate(top20)]
    return CategoryGroup(category=category, rows=rows, summary=build_summary(top20))


def process_same_industry_data(data: dict[str, Any]) -> list[KeywordReport]:
    """解析 sameIndustryAnalyseList 数据结构，生成报告所需内容。"""
    source = data.get("sameIndustryAnalyseList", data)
    if not isinstance(source, list):
        raise ValueError("输入数据缺少 sameIndustryAnalyseList 字段或格式不正确")

    reports: list[KeywordReport] = []
    for item in source:
        keyword = str(item.get("keyword", ""))
        grouped = item.get("effectDataCategoryGrouped") or []
        categories: list[CategoryGroup] = []

        if grouped:
            for group in grouped:
                category = str(group.get("category", "未分类"))
                values = group.get("value") or []
                categories.append(build_category_group(category, values))
            default_category = categories[0].category if categories else "未分类"
        else:
            effect_data = item.get("effectData") or []
            default_category = str(
                effect_data[0].get("category", "默认类目") if effect_data else "默认类目"
            )
            categories = [build_category_group(default_category, effect_data)]

        reports.append(
            KeywordReport(
                keyword=keyword,
                categories=categories,
                default_category=default_category,
            )
        )

    return reports
