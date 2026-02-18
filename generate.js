#!/usr/bin/env node

/**
 * AI News Daily Webpage Generator
 * Generates static HTML pages for daily AI news
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const CONFIG = {
  templatePath: './template.html',
  outputDir: './out',           // Vercel deploy output
  dataDir: './data',             // Daily data input
  screenshotsDir: './public/screenshots',
  baseUrl: 'https://ai-news-daily.vercel.app',
};

// Read template
function readTemplate() {
  return fs.readFileSync(CONFIG.templatePath, 'utf8');
}

// Format date for display
function formatDate(date) {
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });
}

// Generate HTML for a single item
function generateItemHTML(item, index) {
  let html = `
    <div class="item priority">
      <h3>${index + 1}. ${item.title}</h3>
      <div class="meta">👤 ${item.author} - ${item.date}</div>
      <p>${item.summary}</p>
  `;

  if (item.screenshot) {
    html += `<img class="screenshot" src="${item.screenshot}" alt="${item.title}">`;
  }

  if (item.link) {
    html += `<a class="link" href="${item.link}" target="_blank">🔗 原文链接</a>`;
  }

  html += `</div>`;
  return html;
}

// Generate HTML for newsletter items
function generateNewsletterHTML(items) {
  return items.map((item, i) => `
    <div class="item">
      <h3>${i + 1}. ${item.title}</h3>
      <div class="meta">📰 来源: ${item.source}</div>
      <p>${item.summary}</p>
      <a class="link" href="${item.link}" target="_blank">🔗 原文链接</a>
    </div>
  `).join('');
}

// Generate HTML for paper items
function generatePaperHTML(items) {
  return items.map((item, i) => `
    <div class="item">
      <h3>${i + 1}. ${item.title}</h3>
      <div class="meta">👤 ${item.authors}</div>
      <p>${item.summary}</p>
      <a class="link" href="${item.link}" target="_blank">📄 论文链接</a>
    </div>
  `).join('');
}

// Generate HTML for GitHub items
function generateGitHubHTML(items) {
  return items.map((item, i) => `
    <div class="card">
      <h4>${i + 1}. ${item.name}</h4>
      <p>${item.description}</p>
      <p>⭐ ${item.stars} Stars</p>
      <a class="link" href="${item.link}" target="_blank">🔗 GitHub 链接</a>
    </div>
  `).join('<div class="grid">', '</div>');
}

// Generate HTML for X posts
function generateXPostHTML(items) {
  return items.map((item, i) => `
    <div class="item priority">
      <h3>${i + 1}. ${item.title}</h3>
      <div class="meta">👤 ${item.author} - ${item.date}</div>
      <p>${item.summary}</p>
      ${item.screenshot ? `<img class="screenshot" src="${item.screenshot}" alt="${item.title}">` : ''}
      <a class="link" href="${item.link}" target="_blank">🔗 原文链接</a>
    </div>
  `).join('');
}

// Generate HTML for tool items
function generateToolHTML(items) {
  return items.map((item, i) => `
    <div class="card">
      <h4>${i + 1}. ${item.name}</h4>
      <p>${item.description}</p>
      <a class="link" href="${item.link}" target="_blank">🔗 官网链接</a>
    </div>
  `).join('<div class="grid">', '</div>');
}

// Generate HTML for generic items (Discord, HN, Reddit, etc.)
function generateGenericHTML(items, options = {}) {
  return items.map((item, i) => {
    let meta = '';
    if (options.sourceLabel) {
      meta = `<div class="meta">${options.sourceLabel}: ${item.source || item.author || ''}</div>`;
    }
    
    return `
      <div class="item">
        <h3>${i + 1}. ${item.title}</h3>
        ${meta}
        <p>${item.summary}</p>
        <a class="link" href="${item.link}" target="_blank">${options.linkText || '🔗 原文链接'}</a>
      </div>
    `;
  }).join('');
}

// Main generation function
function generatePage(date = new Date()) {
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  const dateDisplay = formatDate(date);
  const dataFile = path.join(CONFIG.dataDir, `${dateStr}.json`);

  console.log(`📅 Generating page for ${dateStr}...`);

  // Read data file or use sample data
  let data;
  try {
    if (fs.existsSync(dataFile)) {
      data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    } else {
      console.log('📝 No data file found, using sample data');
      data = generateSampleData(dateStr);
    }
  } catch (err) {
    console.error('Error reading data:', err);
    data = generateSampleData(dateStr);
  }

  // Read and replace template
  let html = readTemplate();

  // Replace date
  html = html.replace(/{DATE}/g, dateDisplay);
  html = html.replace(/{TIME}/g, '17:25');

  // Replace counts
  html = html.replace(/{INSIGHT_COUNT}/g, data.insights?.length || 0);
  html = html.replace(/{NEWSLETTER_COUNT}/g, data.newsletters?.length || 0);
  html = html.replace(/{PAPER_COUNT}/g, data.papers?.length || 0);
  html = html.replace(/{X_COUNT}/g, data.xPosts?.length || 0);
  html = html.replace(/{DISCORD_COUNT}/g, data.discord?.length || 0);
  html = html.replace(/{GITHUB_COUNT}/g, data.github?.length || 0);
  html = html.replace(/{HN_COUNT}/g, data.hn?.length || 0);
  html = html.replace(/{REDDIT_COUNT}/g, data.reddit?.length || 0);
  html = html.replace(/{TOOL_COUNT}/g, data.tools?.length || 0);
  html = html.replace(/{AGENT_COUNT}/g, data.agent?.length || 0);
  html = html.replace(/{VALLEY_COUNT}/g, data.valley?.length || 0);
  html = html.replace(/{CHINA_COUNT}/g, data.china?.length || 0);

  // Replace content sections
  html = html.replace(/{INSIGHTS_HTML}/g, 
    (data.insights || []).map((item, i) => `
      <div class="item priority">
        <h3>${i + 1}. ${item.title}</h3>
        <div class="meta">👤 ${item.author} - ${item.date}</div>
        <p>${item.summary}</p>
        ${item.screenshot ? `<img class="screenshot" src="${item.screenshot}" alt="${item.title}">` : ''}
        ${item.link ? `<a class="link" href="${item.link}" target="_blank">🔗 原文链接</a>` : ''}
      </div>
    `).join('')
  );

  html = html.replace(/{NEWSLETTER_HTML}/g, generateNewsletterHTML(data.newsletters || []));
  html = html.replace(/{PAPERS_HTML}/g, generatePaperHTML(data.papers || []));
  html = html.replace(/{X_POSTS_HTML}/g, generateXPostHTML(data.xPosts || []));
  html = html.replace(/{DISCORD_HTML}/g, generateGenericHTML(data.discord || [], { sourceLabel: '👤 来源' }));
  html = html.replace(/{GITHUB_HTML}/g, generateGitHubHTML(data.github || []));
  html = html.replace(/{HN_HTML}/g, generateGenericHTML(data.hn || []));
  html = html.replace(/{REDDIT_HTML}/g, generateGenericHTML(data.reddit || [], { sourceLabel: '👤 Posted by', linkText: '🔗 Reddit 链接' }));
  html = html.replace(/{TOOLS_HTML}/g, generateToolHTML(data.tools || []));
  html = html.replace(/{AGENT_HTML}/g, generateGenericHTML(data.agent || []));
  html = html.replace(/{VALLEY_HTML}/g, generateGenericHTML(data.valley || []));
  html = html.replace(/{CHINA_HTML}/g, generateGenericHTML(data.china || []));

  // Replace screenshots link
  html = html.replace(/{SCREENSHOTS_LINK}/g, `${CONFIG.baseUrl}/screenshots/${dateStr}/`);

  // Output path
  const outputPath = path.join(CONFIG.outputDir, `${dateStr}.html`);

  // Ensure output directory exists
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, html);

  console.log(`✅ Generated: ${outputPath}`);
  console.log(`🌐 URL: ${CONFIG.baseUrl}/${dateStr}.html`);

  return outputPath;
}

// Generate sample data for testing
function generateSampleData(dateStr) {
  return {
    date: dateStr,
    insights: [
      {
        title: "Andrej Karpathy: 2025 LLM 年度回顾",
        author: "@karpathy",
        date: "2025年12月19日",
        summary: "Karpathy 发布 '2025 LLM Year in Review'，总结了过去一年的重要范式变化。",
        link: "https://x.com/karpathy/status/2002118205729562949",
        screenshot: `/screenshots/${dateStr}/core_1_karpathy_2025.png`
      },
      {
        title: "Sam Altman: GPT-4.5 和 GPT-5 路线图更新",
        author: "@sama",
        date: "2025年",
        summary: "OpenAI CEO 分享产品路线图简化计划，GPT-5 将整合 o3 技术。",
        link: "https://x.com/sama/status/1889755723078443244",
        screenshot: `/screenshots/${dateStr}/core_2_sama_roadmap.png`
      },
      {
        title: "Yann LeCun: Meta Code World Model (CWM)",
        author: "@ylecun",
        date: "2025年3月",
        summary: "Meta 首席 AI 科学家发布 320 亿参数的 CWM 模型，通过代理推理改进代码生成。",
        link: "https://x.com/ylecun/status/1970967341052854748",
        screenshot: `/screenshots/${dateStr}/core_3_ylecun_codeworldmodel.png`
      }
    ],
    newsletters: [
      { title: "Latent Space", source: "swyx & Alessio", summary: "AI 工程师圈内质量极高的 Newsletter。", link: "https://latent.space/" },
      { title: "The Batch", source: "DeepLearning.AI", summary: "Andrew Ng 主编的 AI 周刊。", link: "https://www.deeplearning.ai/the-batch/" },
      { title: "Ahead of AI", source: "Sebastian Raschka", summary: "学术研究与工业应用平衡的 AI 研究通讯。", link: "https://sebastianraschka.com/newsletter/" }
    ],
    papers: [
      { title: "SmolVLM: 紧凑型多模态模型", authors: "Stanford & Hugging Face", summary: "MIT 与 Hugging Face 联合发布的资源高效推理多模态模型。", link: "https://huggingface.co/papers/2504.05299" },
      { title: "Qwen2.5-32B 后训练管道", authors: "Alibaba DAMO Academy", summary: "基于公开数据训练，在 AIME 2025 达到 74.4% 准确率。", link: "https://github.com/dair-ai/ML-Papers-of-the-Week" }
    ],
    xPosts: [
      { title: "OpenAI: GPT-5.2 正式发布", author: "@OpenAI", date: "2025年12月11日", summary: "GPT-5.2 版本现已向所有用户推出。", link: "https://x.com/OpenAI/status/1999182098859700363", screenshot: `/screenshots/${dateStr}/x_1_openai_gpt52.png` },
      { title: "DeepSeek: V3.2-Exp 实验版发布", author: "@DeepSeekAI", date: "2025年", summary: "引入 DeepSeek Sparse Attention，API 价格下调 50%+。", link: "https://x.com/deepseek_ai/status/1972604768309871061", screenshot: `/screenshots/${dateStr}/x_2_deepseek_v32.png` }
    ],
    discord: [
      { title: "LangChain 2025 年架构演进", source: "LangChain Discord", summary: "LangChain 在 2025 年的架构演进使多代理范式成为可能。", link: "https://uplatz.com/blog/a-comparative-architectural-analysis-of-llm-agent-frameworks-langchain-llamaindex-and-autogpt-in-2025/" }
    ],
    github: [
      { name: "Claude Code", description: "Anthropic 的 AI 编程助手。", stars: "新发布", link: "https://github.com/anthropics/claude-code" },
      { name: "llama.cpp", description: "轻量级 LLM 推理框架。", stars: "78,000+", link: "https://github.com/ggerganov/llama.cpp" },
      { name: "AutoGPT", description: "自主 AI Agent 框架。", stars: "150,000+", link: "https://github.com/Significant-Gravitas/AutoGPT" }
    ],
    hn: [
      { title: "Karpathy 的 2025 LLM 年度回顾引发热议", summary: "Andrej Karpathy 的年度回顾文章在 HN 引发广泛讨论。", link: "https://news.ycombinator.com/" }
    ],
    reddit: [
      { title: "r/mlscaling: 2025 LLM 年度回顾", author: "r/mlscaling", summary: "ML/AI/DL 研究社区讨论 Karpathy 的年度总结。", link: "https://www.reddit.com/r/mlscaling/comments/1pr3o60/2025_llm_year_in_review_andrej_karpathy/" }
    ],
    tools: [
      { name: "Claude Code", description: "Anthropic 发布的 AI 编程助手。", link: "https://claude.com/code" },
      { name: "SmolVLM", description: "轻量级多模态模型。", link: "https://huggingface.co/smolvlm" }
    ],
    agent: [
      { title: "2025 年 Agent 架构演进", summary: "LangChain、LlamaIndex、AutoGPT 三大框架在 2025 年的架构演进。", link: "https://uplatz.com/blog/a-comparative-architectural-analysis-of-llm-agent-frameworks-langchain-llamaindex-and-autogpt-in-2025/" }
    ],
    valley: [
      { title: "OpenAI 产品线简化", summary: "OpenAI 宣布简化 GPT-4.5 和 GPT-5 产品线。", link: "https://x.com/sama/status/1889755723078443244" }
    ],
    china: [
      { title: "DeepSeek 引爆全球开源社区", summary: "DeepSeek 在 2025 年引发全球关注。", link: "https://medium.com/@ant-oss/open-source-llm-development-2025-landscape-trends-and-insights-4e821bceba68" }
    ]
  };
}

// Generate index page
function generateIndex() {
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>📰 AI 资讯日报 - 首页</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; line-height: 1.6; }
        .container { max-width: 900px; margin: 0 auto; padding: 40px 20px; }
        header { text-align: center; padding: 60px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 16px; margin-bottom: 40px; }
        header h1 { font-size: 3em; margin-bottom: 15px; }
        header p { font-size: 1.2em; opacity: 0.9; }
        .latest { background: white; border-radius: 12px; padding: 30px; margin-bottom: 30px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
        .latest h2 { color: #667eea; margin-bottom: 20px; }
        .latest a { display: block; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 10px; font-size: 1.3em; transition: transform 0.2s; }
        .latest a:hover { transform: scale(1.02); }
        .archive h2 { color: #333; margin-bottom: 20px; }
        .archive-list { display: grid; gap: 15px; }
        .archive-item { background: white; padding: 20px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        .archive-item a { color: #667eea; text-decoration: none; font-weight: 500; }
        .archive-item a:hover { text-decoration: underline; }
        .archive-item span { color: #888; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>📰 AI 资讯日报</h1>
            <p>每日精选高质量 AI 资讯 | 核心洞察 + 论文 + 开源 + 工具</p>
        </header>

        <div class="latest">
            <h2>📢 最新日报</h2>
            <a href="/2026-02-18.html">📰 2026年2月18日 - 点击查看今日 AI 资讯</a>
        </div>

        <div class="archive">
            <h2>📁 历史归档</h2>
            <div class="archive-list">
                <div class="archive-item">
                    <a href="/2026-02-18.html">📰 2026年2月18日</a>
                    <span>🌟 核心洞察 + X截图</span>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;

  fs.writeFileSync(path.join(CONFIG.outputDir, 'index.html'), html);
  console.log('✅ Generated index.html');
}

// CLI usage
const args = process.argv.slice(2);
const dateArg = args[0];

if (dateArg) {
  // Generate for specific date
  const date = new Date(dateArg);
  generatePage(date);
} else {
  // Generate for today and index
  generatePage(new Date());
  generateIndex();
}

console.log('🎉 All pages generated successfully!');
