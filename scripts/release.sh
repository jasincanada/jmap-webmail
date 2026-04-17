#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}=== Release to GitHub ===${NC}"

# 1. Ensure we're on master
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "master" ]; then
    echo -e "${RED}Error: Must be on master branch${NC}"
    exit 1
fi

# 2. Run lint
echo -e "${YELLOW}Running lint...${NC}"
npm run lint --silent || {
    echo -e "${RED}Lint failed. Fix errors before releasing.${NC}"
    exit 1
}
echo -e "${GREEN}✓ Lint passed${NC}"

# 3. Run type check
echo -e "${YELLOW}Running type check...${NC}"
npx tsc --noEmit || {
    echo -e "${RED}Type check failed. Fix errors before releasing.${NC}"
    exit 1
}
echo -e "${GREEN}✓ Type check passed${NC}"

# 4. Check for Claude/AI references in shipped code (not .md, not test files)
echo -e "${YELLOW}Checking for Claude/AI references in code...${NC}"
CLAUDE_HITS=$(grep -ri "claude\|anthropic" \
    --include="*.ts" --include="*.tsx" --include="*.js" --include="*.json" \
    --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.claude \
    --exclude="CLAUDE.md" --exclude="TODO.md" \
    -l 2>/dev/null || true)

if [ -n "$CLAUDE_HITS" ]; then
    echo -e "${RED}Error: Found Claude/AI references in code files:${NC}"
    echo "$CLAUDE_HITS"
    grep -ri "claude\|anthropic" \
        --include="*.ts" --include="*.tsx" --include="*.js" --include="*.json" \
        --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.claude \
        --exclude="CLAUDE.md" --exclude="TODO.md" \
        -n 2>/dev/null | head -10
    exit 1
fi
echo -e "${GREEN}✓ No Claude/AI references${NC}"

# 5. Switch to public-release
echo -e "${YELLOW}Switching to public-release branch...${NC}"
git checkout public-release

# 6. Define which files to update (code only, not config/docs)
CODE_FILES=(
    "app/"
    "components/"
    "contexts/"
    "hooks/"
    "i18n/"
    "lib/"
    "stores/"
    "locales/"
    "next.config.ts"
    "instrumentation.ts"
    "Dockerfile"
    ".dockerignore"
    ".github/"
)

# 7. Checkout code files from master
echo -e "${YELLOW}Updating code files from master...${NC}"
for path in "${CODE_FILES[@]}"; do
    if git ls-tree master -- "$path" &>/dev/null; then
        git checkout master -- "$path" 2>/dev/null || true
    fi
done

# 8. Update package.json dependencies (preserve metadata, update versions)
echo -e "${YELLOW}Updating package.json dependencies...${NC}"
git checkout master -- package-lock.json

node -e "
const fs = require('fs');
const master = JSON.parse(fs.readFileSync('/dev/stdin', 'utf8'));
const current = JSON.parse(fs.readFileSync('package.json', 'utf8'));

current.version = master.version;
current.dependencies = master.dependencies;
current.devDependencies = master.devDependencies;

delete current.private;
if (current.scripts) {
  delete current.scripts['seed:demo'];
}

fs.writeFileSync('package.json', JSON.stringify(current, null, 2) + '\n');
console.log('✓ Dependencies merged');
" < <(git show master:package.json)

git add package.json package-lock.json

# 9. Generate VERSION file from package.json (single source of truth)
node -e "console.log(require('./package.json').version)" > VERSION
git add VERSION

# 10. Check for forbidden files in staging
echo -e "${YELLOW}Checking for forbidden files...${NC}"
FORBIDDEN_PATTERNS=("CLAUDE.md" "TODO.md" "docs/ARCHITECTURE.md" "docs/superpowers/" "scripts/seed-demo.ts" ".claude/")
HAS_FORBIDDEN=0
for pattern in "${FORBIDDEN_PATTERNS[@]}"; do
    if git status --short | grep -q "$pattern"; then
        echo -e "${RED}Error: Forbidden file detected: $pattern${NC}"
        HAS_FORBIDDEN=1
    fi
done

if [ "$HAS_FORBIDDEN" -eq 1 ]; then
    echo -e "${RED}Aborting: removing forbidden files and returning to master${NC}"
    git checkout public-release -- . 2>/dev/null || true
    git checkout master
    exit 1
fi
echo -e "${GREEN}✓ No forbidden files${NC}"

# 10. Show what changed
echo ""
echo -e "${YELLOW}Changes to be committed:${NC}"
git status --short
echo ""

echo -e "${GREEN}✓ All checks passed${NC}"
echo ""
echo -e "${YELLOW}Review the changes above, then run:${NC}"
echo "  git add -A"
echo "  git commit -S --author=\"Matthieu MALVACHE <matthieu@root.cloud>\" -m \"feat: Your message\""
echo "  git push github public-release:main"
echo "  git checkout master"
