#!/usr/bin/env bash
# ============================================================
# setup-claude.sh — Claude Code 团队环境一键配置脚本
# ============================================================
# 用途：自动安装 Claude Code CLI、配置 DeepSeek API 后端、
#       注册 Marketplace、安装全局插件和项目依赖。
#
# 用法：
#   chmod +x scripts/setup-claude.sh
#   ./scripts/setup-claude.sh
#
# 前置条件：
#   - Node.js >= 18.x
#   - npm >= 9.x
#   - DeepSeek API Key（从 https://platform.deepseek.com 获取）
# ============================================================

set -euo pipefail

# --------------- 颜色输出 ---------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC}   $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()   { echo -e "${RED}[ERR]${NC}  $1"; }

# --------------- 步骤 0：检查前置条件 ---------------
echo ""
echo "=============================================="
echo "  Claude Code 团队环境配置"
echo "  项目：DuMiMessager (ws-server)"
echo "=============================================="
echo ""

info "检查前置条件..."

# 检查 Node.js
if ! command -v node &> /dev/null; then
    error "未找到 Node.js，请先安装 Node.js >= 18.x"
    echo "  下载地址: https://nodejs.org/"
    exit 1
fi
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    warn "Node.js 版本为 $(node -v)，建议 >= 18.x"
fi
success "Node.js $(node -v)"

# 检查 npm
if ! command -v npm &> /dev/null; then
    error "未找到 npm"
    exit 1
fi
success "npm $(npm -v)"

# --------------- 步骤 1：获取 API Key ---------------
echo ""
info "步骤 1/7：配置 DeepSeek API Key"
echo "  如果你还没有 API Key，请访问 https://platform.deepseek.com 获取"
echo ""

if [ -n "${DEEPSEEK_API_KEY:-}" ]; then
    API_KEY="$DEEPSEEK_API_KEY"
    info "从环境变量 DEEPSEEK_API_KEY 读取"
else
    read -r -p "  请输入你的 DeepSeek API Key: " API_KEY
    if [ -z "$API_KEY" ]; then
        error "API Key 不能为空"
        exit 1
    fi
fi

# --------------- 步骤 2：安装 Claude Code CLI ---------------
echo ""
info "步骤 2/7：安装 Claude Code CLI..."

if command -v claude &> /dev/null; then
    CURRENT_VERSION=$(claude --version 2>&1 | head -1 || echo "unknown")
    info "Claude Code 已安装 ($CURRENT_VERSION)，尝试更新..."
    npm install -g @anthropic-ai/claude-code || warn "更新失败，继续使用当前版本"
else
    info "正在安装 @anthropic-ai/claude-code..."
    npm install -g @anthropic-ai/claude-code
fi
success "Claude Code CLI 就绪"

# --------------- 步骤 3：配置 settings.json ---------------
echo ""
info "步骤 3/7：配置 ~/.claude/settings.json..."

CLAUDE_SETTINGS="$HOME/.claude/settings.json"

# 备份现有配置
if [ -f "$CLAUDE_SETTINGS" ]; then
    BACKUP="$HOME/.claude/settings.json.backup.$(date +%Y%m%d%H%M%S)"
    cp "$CLAUDE_SETTINGS" "$BACKUP"
    info "已备份现有配置到 $BACKUP"
fi

# 确保目录存在
mkdir -p "$HOME/.claude"

# 如果已有配置，合并 env 字段；否则创建新配置
if [ -f "$CLAUDE_SETTINGS" ] && command -v node &> /dev/null; then
    # 使用 Node.js 合并 JSON
    node -e "
        const fs = require('fs');
        const path = '$CLAUDE_SETTINGS';
        let config = {};
        try { config = JSON.parse(fs.readFileSync(path, 'utf8')); } catch(e) {}

        config.env = config.env || {};
        config.env.ANTHROPIC_AUTH_TOKEN = '$API_KEY';
        config.env.ANTHROPIC_BASE_URL = 'https://api.deepseek.com/anthropic';
        config.env.ANTHROPIC_MODEL = 'deepseek-v4-pro';
        config.env.ANTHROPIC_DEFAULT_OPUS_MODEL = 'deepseek-v4-pro[1M]';
        config.env.ANTHROPIC_DEFAULT_OPUS_MODEL_NAME = 'deepseek-v4-pro';
        config.env.ANTHROPIC_DEFAULT_SONNET_MODEL = 'deepseek-v4-pro[1M]';
        config.env.ANTHROPIC_DEFAULT_SONNET_MODEL_NAME = 'deepseek-v4-pro';
        config.env.ANTHROPIC_DEFAULT_HAIKU_MODEL = 'deepseek-v4-pro';
        config.env.ANTHROPIC_DEFAULT_FABLE_MODEL = 'deepseek-v4-pro[1M]';
        config.env.ANTHROPIC_DEFAULT_FABLE_MODEL_NAME = 'deepseek-v4-pro';
        config.env.AUTHROPIC_SMALL_FAST_MODEL = 'deepseek-v4-pro';
        config.env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE = '0.5';
        config.env.CLAUDE_CODE_AUTO_COMPACT_WINDOW = '1000000';
        config.env.DISABLE_COMPACT = '1';
        config.model = 'deepseek-v4-pro';

        // 添加 extraKnownMarketplaces
        config.extraKnownMarketplaces = config.extraKnownMarketplaces || {};
        config.extraKnownMarketplaces['anthropic-agent-skills'] = {
            source: { repo: 'anthropics/skills', source: 'github' }
        };
        config.extraKnownMarketplaces['claude-hud'] = {
            source: { repo: 'jarrodwatts/claude-hud', source: 'github' }
        };

        // 添加 enabledPlugins
        config.enabledPlugins = config.enabledPlugins || {};
        config.enabledPlugins['claude-hud@claude-hud'] = true;
        config.enabledPlugins['document-skills@anthropic-agent-skills'] = true;
        config.enabledPlugins['example-skills@anthropic-agent-skills'] = true;

        fs.writeFileSync(path, JSON.stringify(config, null, 2) + '\n');
        console.log('配置已写入 ' + path);
    "
else
    # 全新创建
    cat > "$CLAUDE_SETTINGS" << JSONEOF
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "$API_KEY",
    "ANTHROPIC_BASE_URL": "https://api.deepseek.com/anthropic",
    "ANTHROPIC_MODEL": "deepseek-v4-pro",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "deepseek-v4-pro[1M]",
    "ANTHROPIC_DEFAULT_OPUS_MODEL_NAME": "deepseek-v4-pro",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "deepseek-v4-pro[1M]",
    "ANTHROPIC_DEFAULT_SONNET_MODEL_NAME": "deepseek-v4-pro",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "deepseek-v4-pro",
    "ANTHROPIC_DEFAULT_FABLE_MODEL": "deepseek-v4-pro[1M]",
    "ANTHROPIC_DEFAULT_FABLE_MODEL_NAME": "deepseek-v4-pro",
    "AUTHROPIC_SMALL_FAST_MODEL": "deepseek-v4-pro",
    "CLAUDE_AUTOCOMPACT_PCT_OVERRIDE": "0.5",
    "CLAUDE_CODE_AUTO_COMPACT_WINDOW": "1000000",
    "DISABLE_COMPACT": "1"
  },
  "model": "deepseek-v4-pro",
  "extraKnownMarketplaces": {
    "anthropic-agent-skills": {
      "source": { "repo": "anthropics/skills", "source": "github" }
    },
    "claude-hud": {
      "source": { "repo": "jarrodwatts/claude-hud", "source": "github" }
    }
  },
  "enabledPlugins": {
    "claude-hud@claude-hud": true,
    "document-skills@anthropic-agent-skills": true,
    "example-skills@anthropic-agent-skills": true
  }
}
JSONEOF
fi

success "~/.claude/settings.json 配置完成"

# --------------- 步骤 4：创建项目权限配置 ---------------
echo ""
info "步骤 4/7：创建项目权限配置..."

SETTINGS_LOCAL="$(pwd)/.claude/settings.local.json"

if [ -f "$SETTINGS_LOCAL" ]; then
    info ".claude/settings.local.json 已存在，跳过创建"
else
    mkdir -p "$(pwd)/.claude"
    cat > "$SETTINGS_LOCAL" << 'JSONEOF'
{
  "permissions": {
    "allow": [
      "Bash(npm run *)",
      "Bash(git *)",
      "Bash(pkill -f \"vite dev\")",
      "Bash(pkill -f \"node.*server\")",
      "Bash(sqlite3 *)",
      "Bash(node *)",
      "mcp__webstorm__read_file",
      "mcp__webstorm__search_in_files_by_text",
      "mcp__webstorm__find_files_by_name_keyword",
      "mcp__webstorm__list_directory_tree",
      "mcp__webstorm__replace_text_in_file",
      "mcp__webstorm__find_files_by_glob",
      "mcp__webstorm__search_file",
      "mcp__webstorm__search_text"
    ]
  }
}
JSONEOF
    success ".claude/settings.local.json 已创建"
fi

# --------------- 步骤 5：安装 npm 依赖 ---------------
echo ""
info "步骤 5/7：安装项目 npm 依赖..."

npm install
success "npm 依赖安装完成"

# --------------- 步骤 6：安装全局插件 ---------------
echo ""
info "步骤 6/7：安装全局插件..."

# 这些插件通过 enabledPlugins 配置会自动加载
# 但首次使用需要从 marketplace 下载缓存
info "尝试安装 claude-hud..."
claude plugin install claude-hud@claude-hud 2>&1 || warn "claude-hud 安装失败（可能已安装或需手动安装）"

info "尝试安装 document-skills..."
claude plugin install document-skills@anthropic-agent-skills 2>&1 || warn "document-skills 安装失败（可能已安装或需手动安装）"

info "尝试安装 example-skills..."
claude plugin install example-skills@anthropic-agent-skills 2>&1 || warn "example-skills 安装失败（可能已安装或需手动安装）"

success "插件安装流程完成"

# --------------- 步骤 7：验证 ---------------
echo ""
info "步骤 7/7：验证配置..."

echo ""
echo "=============================================="
echo "  ${GREEN}✔ 配置完成！${NC}"
echo "=============================================="
echo ""
echo "  已完成的配置："
echo "    ✓ Node.js 环境检查"
echo "    ✓ Claude Code CLI 安装"
echo "    ✓ DeepSeek API 后端配置"
echo "    ✓ Marketplace 注册"
echo "    ✓ 全局插件启用"
echo "    ✓ 项目权限配置"
echo "    ✓ npm 依赖安装"
echo ""
echo "  验证步骤："
echo "    1. 进入项目目录:  cd $(pwd)"
echo "    2. 启动 Claude Code: claude"
echo "    3. 测试 Skill:      /ui-styling"
echo "    4. 查看配置:        /status"
echo ""
echo "  项目级 Skills（已随项目克隆到 .claude/skills/）："
echo "    - banner-design    - slides"
echo "    - brand            - ui-styling"
echo "    - design           - ui-ux-pro-max"
echo "    - design-system"
echo ""
echo "  全局 Skills 需要在 Claude Code 中手动安装，"
echo "  详见 CLAUDE.md 第 4 节。"
echo ""
echo "  更多信息请查看 CLAUDE.md"
echo ""
