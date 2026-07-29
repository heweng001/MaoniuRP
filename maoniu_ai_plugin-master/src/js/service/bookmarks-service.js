export default {
  async checkBookmarks() {
    const maybeBookmarked = [
      "ai.maoniunet.com",
      "ai.maoniux.com",
      "saas.maoniunet.com/login?system=superman",
      "saas.maoniux.com/login?system=superman",
    ];

    for (const bookmark of maybeBookmarked) {
      try {
        const results = await wrapPromise(bookmark);
        return { success: true, data: results };
      } catch (err) {
        console.log(`${bookmark} The page is not bookmarked!`);
        return { success: false, message: "未找到书签" };
      }
    }
  },
};

function wrapPromise(bookmark) {
  return new Promise((resolve, reject) => {
    chrome.bookmarks.search(
      { query: bookmark }, // 要搜索的 URL
      (results) => {
        // 处理搜索结果
        if (results.length > 0) {
          console.log(`${bookmark} The page is bookmarked!`);
          resolve(results);
        } else {
          reject();
        }
      }
    );
  });
}
