"""HTML 报告生成器"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from data_processor import CategoryGroup, KeywordReport


def _render_table(category: CategoryGroup) -> str:
    header = """
    <thead>
      <tr>
        <th>排名</th>
        <th>公司名称</th>
        <th>主营产品</th>
        <th>产品总数</th>
        <th>类目访问</th>
        <th>类目询盘</th>
        <th>询盘率</th>
        <th>全店线上订单量</th>
        <th>全店线上订单金额</th>
        <th>商家星等级</th>
        <th>供应商年限</th>
      </tr>
    </thead>
    """

    body_rows = []
    for row in category.rows:
        company_cell = (
            f'<a href="{row.home}" target="_blank" rel="noreferrer">{row.company_name}</a>'
            if row.home
            else row.company_name
        )
        body_rows.append(
            f"""
            <tr>
              <td class="center">第{row.rank}名</td>
              <td class="center">{company_cell}</td>
              <td class="center">{row.main_products}</td>
              <td class="center">{row.total_product_count}</td>
              <td class="center">{row.page_views}</td>
              <td class="center">{row.inquiries}</td>
              <td class="center">{row.inquiry_rate}</td>
              <td class="center">{row.transaction_number}</td>
              <td class="center">{row.transaction_price}</td>
              <td class="center">{row.display_star_level}</td>
              <td class="center">{row.supplier_year}</td>
            </tr>
            """
        )

    summary = category.summary
    summary_row = f"""
    <tr class="summary-row">
      <td class="center" colspan="2">同行平均统计</td>
      <td class="center">{summary["total_product_count"]}</td>
      <td class="center">{summary["page_views"]}</td>
      <td class="center">{summary["inquiries"]}</td>
      <td class="center">{summary["inquiry_rate"]}</td>
      <td class="center">{summary["transaction_number"]}</td>
      <td class="center">{summary["transaction_price"]}</td>
      <td class="center">{summary["display_star_level"]}</td>
      <td class="center">{summary["supplier_year"]}</td>
    </tr>
    """

    return f"""
    <table>
      {header}
      <tbody>
        {''.join(body_rows)}
        {summary_row}
      </tbody>
    </table>
    """


def generate_html_report(
    reports: list[KeywordReport],
    *,
    title: str | None = None,
    selected_category: str | None = None,
) -> str:
    today = datetime.now().strftime("%Y-%m-%d")
    sections: list[str] = []

    for report in reports:
        category_name = selected_category or report.default_category
        category = next((c for c in report.categories if c.category == category_name), None)
        if category is None and report.categories:
            category = report.categories[0]
            category_name = category.category

        if category is None:
            continue

        sections.append(
            f"""
            <section class="report-section">
              <h2>{category_name} 类目询盘同行 top20 排行榜</h2>
              <p class="note">
                关键词：<strong>{report.keyword}</strong>；
                报告中的访客，询盘，订单量，订单额均为最近6个月的汇总数据，订单额单位为usd。
              </p>
              {_render_table(category)}
            </section>
            """
        )

    report_title = title or f"同行 Top20 报告 - {today}"

    return f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{report_title}</title>
  <style>
    body {{
      font-family: "Microsoft YaHei", Arial, sans-serif;
      margin: 24px;
      color: #222;
      background: #f7f8fa;
    }}
    .container {{
      max-width: 1400px;
      margin: 0 auto;
      background: #fff;
      padding: 24px 32px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
    }}
    h1 {{
      margin: 0 0 8px;
      font-size: 28px;
    }}
    .meta {{
      color: #666;
      margin-bottom: 24px;
    }}
    h2 {{
      font-size: 20px;
      margin: 0 0 12px;
    }}
    .note {{
      color: #666;
      font-size: 14px;
      line-height: 1.6;
      margin-bottom: 16px;
    }}
    table {{
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }}
    th, td {{
      border: 1px solid #d9d9d9;
      padding: 8px 6px;
    }}
    th {{
      background: #fafafa;
      font-weight: 600;
    }}
    .center {{
      text-align: center;
    }}
    .summary-row {{
      background: #fffbe6;
      font-weight: 600;
    }}
    a {{
      color: #1677ff;
      text-decoration: none;
    }}
    .report-section + .report-section {{
      margin-top: 40px;
      padding-top: 24px;
      border-top: 1px solid #eee;
    }}
    @media print {{
      body {{ background: #fff; margin: 0; }}
      .container {{ box-shadow: none; padding: 0; }}
    }}
  </style>
</head>
<body>
  <div class="container">
    <h1>{report_title}</h1>
    <div class="meta">生成时间：{today}</div>
    {''.join(sections)}
  </div>
</body>
</html>
"""
