"""从 ma.maoniux.com 获取已有报告数据"""

from __future__ import annotations

import json
from typing import Any

import requests

DEFAULT_API_BASE = "https://ma.maoniux.com/api/v1/report"


def fetch_report_by_id(report_id: int, *, api_base: str = DEFAULT_API_BASE) -> dict[str, Any]:
    response = requests.get(f"{api_base}/{report_id}", timeout=30)
    response.raise_for_status()
    payload = response.json()
    content = payload.get("content")
    if isinstance(content, str):
        return json.loads(content)
    if isinstance(content, dict):
        return content
    raise ValueError("报告详情中缺少 content 字段")


def load_json_file(path: str) -> dict[str, Any]:
    with open(path, "r", encoding="utf-8") as file:
        return json.load(file)
