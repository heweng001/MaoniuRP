import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getTokenFromRequest, requireAdmin, requireAuth } from './authMiddleware.js';
import {
  createUser,
  deleteUser,
  initAuthStore,
  listUsersForOperator,
  listParentCandidatesForOperator,
  login,
  logout,
  registerWithInviteCode,
  getSessionUser,
  updateUser,
  canViewReportByCreator,
  getUserDirectory,
} from './authService.js';
import { getReportCache, listPerformanceReports, listReportCache, saveReportCache, REPORT_TYPES, findBestShopInquiryCache, shouldReuseShopInquiryCache } from './cacheService.js';
import { getExtensionInfo, streamExtensionZip, watchExtensionBuild } from './extensionService.js';
import { normalizeAlibabaShopUrl } from './shopUrl.js';
import { parseKeywordsInput } from './mockData.js';
import { createReportFromInput } from './reportService.js';
import { buildShopInquiryIncompleteNote, buildTop20IncompleteNote } from './reportIncomplete.js';
import { buildShopInquiryTitle, generateShopInquiryHtml } from './shopInquiryReport.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function formatDuration(ms) {
  const value = Number(ms) || 0;
  if (value < 1000) {
    return `${value}ms`;
  }
  return `${(value / 1000).toFixed(1)}s`;
}

const app = express();
const PORT = process.env.PORT || 3456;

function buildTop20Input(body) {
  const { keywords, keywordText, rawData } = body || {};
  if (!rawData) {
    throw new Error('缺少插件抓取数据，请先在 Chrome 中通过插件完成抓取');
  }

  const keywordList = Array.isArray(keywords)
    ? keywords.map((item) => String(item).trim()).filter(Boolean)
    : parseKeywordsInput(keywordText);

  return {
    keywordList,
    input: {
      rawData,
      peerUrls: [],
    },
    options: {},
  };
}

app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, message: 'AI操盘手-重制版服务运行中' });
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    const result = await login(username, password);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || '登录失败' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, inviteCode } = req.body || {};
    const result = await registerWithInviteCode({ username, password, inviteCode });
    res.json({ success: true, ...result, message: '注册成功' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || '注册失败' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  logout(getTokenFromRequest(req));
  res.json({ success: true });
});

app.get('/api/auth/me', async (req, res) => {
  const user = await getSessionUser(getTokenFromRequest(req));
  if (!user) {
    return res.status(401).json({ success: false, message: '未登录' });
  }
  return res.json({ success: true, user });
});

app.get('/api/extension/info', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const info = getExtensionInfo();
  res.json({ success: info.available, ...info });
});

app.get('/api/extension/download', async (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    await streamExtensionZip(res);
  } catch (error) {
    if (!res.headersSent) {
      res.status(404).json({
        success: false,
        message: error.message || '插件下载失败',
      });
    }
  }
});

app.use('/api', requireAuth());

app.get('/api/users', async (req, res) => {
  try {
    const users = await listUsersForOperator(req.user);
    res.json({ success: true, users });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.get('/api/users/parent-options/:targetId', async (req, res) => {
  try {
    const users = await listParentCandidatesForOperator(req.user, req.params.targetId);
    res.json({ success: true, users });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.post('/api/users', requireAuth(), async (req, res) => {
  try {
    const user = await createUser(req.body || {}, req.user);
    res.json({ success: true, user });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const user = await updateUser(req.params.id, req.body || {}, req.user);
    res.json({ success: true, user });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.delete('/api/users/:id', requireAdmin(), async (req, res) => {
  try {
    await deleteUser(req.params.id, req.user);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.get('/api/cache', async (req, res) => {
  try {
    let items = await listReportCache();
    if (req.user.role !== 'admin') {
      const { byUsername } = await getUserDirectory();
      items = items.filter((item) => canViewReportByCreator(req.user, item.createdBy, byUsername));
    }
    res.json({ success: true, items });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.get('/api/cache/:id', async (req, res) => {
  try {
    const item = await getReportCache(req.params.id);
    if (req.user.role !== 'admin') {
      const { byUsername } = await getUserDirectory();
      if (!canViewReportByCreator(req.user, item.createdBy, byUsername)) {
        return res.status(403).json({ success: false, message: '无权查看该缓存报告' });
      }
    }
    res.json({ success: true, item });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

app.get('/api/performance', requireAdmin(), async (req, res) => {
  try {
    const items = await listPerformanceReports();
    res.json({ success: true, items });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.post('/api/reports/top20', async (req, res) => {
  const startedAt = Date.now();
  try {
    const { keywordList, input, options } = buildTop20Input(req.body);
    const searchPageCount = Math.min(
      20,
      Math.max(1, Number.parseInt(req.body?.searchPageCount, 10) || 5),
    );
    const serverRenderStartedAt = Date.now();
    const report = await createReportFromInput(input, options);
    const serverRenderMs = Date.now() - serverRenderStartedAt;
    const pluginTimings = req.body?.timings || req.body?.rawData?.timings || null;
    const scrapeStats = req.body?.scrapeStats || pluginTimings || null;
    const isComplete = req.body?.isComplete ?? scrapeStats?.isComplete ?? true;
    const timings = pluginTimings
      ? {
          ...pluginTimings,
          serverRenderMs,
          serverMs: Number(req.body?.serverMs) || serverRenderMs,
          pluginMs: Number(req.body?.pluginMs) || pluginTimings.totalMs || 0,
          totalMs: Number(req.body?.durationMs) || Date.now() - startedAt,
          isComplete,
        }
      : {
          serverRenderMs,
          serverMs: Number(req.body?.serverMs) || serverRenderMs,
          totalMs: Number(req.body?.durationMs) || Date.now() - startedAt,
          isComplete,
        };
    const reportStatus = isComplete ? 'success' : 'incomplete';
    const incompleteNote = reportStatus === 'incomplete' ? buildTop20IncompleteNote(scrapeStats) : '';
    const baseMessage = `已生成 Top 同行报告（${keywordList.length} 个关键词，参数${searchPageCount}，总耗时${formatDuration(timings.totalMs)}）`;
    const statusMessage = baseMessage;
    const cacheItem = await saveReportCache({
      title: report.title,
      type: REPORT_TYPES.TOP20,
      createdBy: req.user.username,
      targetObject: keywordList.join(', '),
      pluginVersion: req.body?.pluginVersion || '',
      status: reportStatus,
      durationMs: timings.totalMs,
      errorMessage: incompleteNote,
      html: report.html,
      reports: report.reports,
      payload: {
        keywords: keywordList,
        searchPageCount,
        timings,
        scrapeStats,
        isComplete,
      },
    });

    res.json({
      success: true,
      cacheId: cacheItem.id,
      title: report.title,
      keywordLabel: report.keywordLabel,
      reports: report.reports,
      html: report.html,
      timings,
      status: reportStatus,
      isComplete,
      message: statusMessage,
    });
  } catch (error) {
    const failedKeywords = parseKeywordsInput(req.body?.keywordText);
    await saveReportCache({
      title: req.body?.title || 'Top同行报告',
      type: REPORT_TYPES.TOP20,
      createdBy: req.user.username,
      targetObject: failedKeywords.join(', '),
      pluginVersion: req.body?.pluginVersion || '',
      status: 'failed',
      durationMs: Number(req.body?.durationMs) || Date.now() - startedAt,
      errorMessage: error.message || '报告生成失败',
      payload: {
        keywords: failedKeywords,
      },
    }).catch(() => {});

    res.status(400).json({
      success: false,
      message: error.message || '报告生成失败',
    });
  }
});

app.post('/api/reports/shop-inquiry', async (req, res) => {
  const startedAt = Date.now();
  const rawShopUrl = String(req.body?.shopUrl || '').trim();
  try {
    const normalized = normalizeAlibabaShopUrl(rawShopUrl);
    if (!normalized.valid) {
      throw new Error(normalized.message);
    }

    const categories = req.body?.categories;
    if (!Array.isArray(categories)) {
      throw new Error('缺少插件返回的类目询盘数据');
    }

    const normalizedShopUrl = normalized.shopUrl;
    const scrapeStats = req.body?.stats || null;
    const scrapeTimings = req.body?.timings || null;
    const pluginMs = Number(req.body?.pluginMs) || 0;
    const isComplete = req.body?.isComplete ?? scrapeStats?.isComplete ?? true;
    const productsPerCategory = Math.min(
      20,
      Math.max(1, Number.parseInt(req.body?.productsPerCategory, 10) || 2),
    );
    const totalMs = Number(req.body?.durationMs) || Date.now() - startedAt;
    const bestCached = await findBestShopInquiryCache(normalizedShopUrl);
    let finalCategories = categories;
    let reusedFromCache = false;
    let reuseNote = '';

    if (shouldReuseShopInquiryCache(categories, scrapeStats, bestCached)) {
      finalCategories = bestCached.categories;
      reusedFromCache = true;
      reuseNote = `本次未解析到类目，已采用 ${bestCached.createdBy} 于 ${bestCached.createdAt} 的完整数据（${bestCached.categoryCount} 个类目）`;
    }

    const reportStatus = finalCategories.length ? (isComplete ? 'success' : 'incomplete') : 'failed';
    const incompleteNote =
      reportStatus === 'incomplete'
        ? buildShopInquiryIncompleteNote(scrapeStats, scrapeTimings)
        : '';

    const serverStartedAt = Date.now();
    const title = buildShopInquiryTitle(normalizedShopUrl);
    const html = generateShopInquiryHtml({
      shopUrl: normalizedShopUrl,
      categories: finalCategories,
      title,
      incompleteNote,
    });
    const serverMs = Date.now() - serverStartedAt;
    const timings = {
      ...(scrapeTimings || {}),
      samplingGroupCount: scrapeStats?.samplingGroupCount,
      sampledProductIdTotal: scrapeStats?.sampledProductIdTotal,
      uniqueProducts: scrapeStats?.uniqueProducts ?? scrapeTimings?.uniqueProducts,
      compareCandidates: scrapeStats?.compareCandidates ?? scrapeTimings?.compareCandidates,
      platformLeafCategories:
        scrapeStats?.platformLeafCategories ?? scrapeTimings?.platformLeafCategories,
      pluginMs,
      serverMs,
      totalMs: Number(req.body?.durationMs) || Date.now() - startedAt,
    };

    const cacheItem = await saveReportCache({
      title,
      type: REPORT_TYPES.SHOP_INQUIRY,
      createdBy: req.user.username,
      targetObject: normalizedShopUrl,
      pluginVersion: req.body?.pluginVersion || '',
      status: reportStatus,
      durationMs: Number(req.body?.durationMs) || Date.now() - startedAt,
      errorMessage: incompleteNote,
      html,
      payload: {
        shopUrl: normalizedShopUrl,
        categories: finalCategories,
        originalShopUrl: normalized.originalInput,
        productsPerCategory,
        scrapeStats,
        timings,
        isComplete: reusedFromCache ? true : isComplete,
        reusedFromCache,
        reusedFromCacheId: reusedFromCache ? bestCached.id : null,
      },
    });

    const shopHeadline = `已生成指定同行询盘分布（参数${productsPerCategory}，总耗时${formatDuration(totalMs)}）`;
    const baseMessage = normalized.wasCorrected
      ? `${normalized.correctionHint}；${shopHeadline}`
      : shopHeadline;
    const statusMessage = reuseNote ? `${reuseNote}；${baseMessage}` : baseMessage;

    res.json({
      success: true,
      cacheId: cacheItem.id,
      title,
      shopUrl: normalizedShopUrl,
      categories: finalCategories,
      html,
      status: reportStatus,
      isComplete: reusedFromCache ? true : isComplete,
      timings,
      wasCorrected: normalized.wasCorrected,
      correctionHint: normalized.correctionHint,
      reusedFromCache,
      message: reuseNote ? `${reuseNote}；${statusMessage}` : statusMessage,
    });
  } catch (error) {
    await saveReportCache({
      title: rawShopUrl ? buildShopInquiryTitle(rawShopUrl) : '指定同行询盘分布',
      type: REPORT_TYPES.SHOP_INQUIRY,
      createdBy: req.user.username,
      targetObject: rawShopUrl || '',
      pluginVersion: req.body?.pluginVersion || '',
      status: 'failed',
      durationMs: Number(req.body?.durationMs) || Date.now() - startedAt,
      errorMessage: error.message || '报告生成失败',
      payload: { shopUrl: rawShopUrl },
    }).catch(() => {});

    res.status(400).json({
      success: false,
      message: error.message || '报告生成失败',
    });
  }
});

app.post('/api/reports/export/html', async (req, res) => {
  try {
    if (req.body?.html) {
      const filename = encodeURIComponent(`${req.body.title || 'report'}.html`);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename}`);
      return res.send(req.body.html);
    }

    const { input, options } = buildTop20Input(req.body);
    const report = await createReportFromInput(input, options);
    const filename = encodeURIComponent(`${report.title}.html`);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename}`);
    res.send(report.html);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'HTML 导出失败',
    });
  }
});

await initAuthStore();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`AI操盘手-重制版 已启动: http://localhost:${PORT}`);
  console.log(`局域网访问: http://<本机IP>:${PORT}`);
  console.log('默认管理员: admin / maoniu@9527');

  const extensionInfo = getExtensionInfo();
  if (extensionInfo.available) {
    console.log(`插件包: v${extensionInfo.version} (${extensionInfo.builtAt})`);
  } else {
    console.log(`插件包: 未构建 (${extensionInfo.message})`);
  }

  watchExtensionBuild((info) => {
    if (info.available) {
      console.log(`插件包已更新: v${info.version} (${info.builtAt})`);
    }
  });
});
