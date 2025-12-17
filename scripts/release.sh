#!/bin/bash
set -e

# Colors
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

# 4. Check for Claude references in code
echo -e "${YELLOW}Checking for Claude references...${NC}"
if grep -ri "claude" --include="*.ts" --include="*.tsx" --include="*.js" --exclude-dir=node_modules --exclude-dir=.next 2>/dev/null | grep -v "// claude" | head -5; then
    echo -e "${RED}Warning: Found Claude references in code files${NC}"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 5. Switch to public-release
echo -e "${YELLOW}Switching to public-release branch...${NC}"
git checkout public-release

# 6. Define which files to update (code only, not config/docs)
CODE_FILES=(
    "app/"
    "components/"
    "contexts/"
    "hooks/"
    "lib/"
    "stores/"
    "locales/"
)

# 7. Checkout code files from master
echo -e "${YELLOW}Updating code files from master...${NC}"
for path in "${CODE_FILES[@]}"; do
    if [ -e "../../../$path" ] || git ls-tree -d master -- "$path" &>/dev/null; then
        git checkout master -- "$path" 2>/dev/null || true
    fi
done

# 8. Show what changed
echo -e "${YELLOW}Changes to be committed:${NC}"
git status --short

# 9. Check for forbidden files
FORBIDDEN_FILES=("CLAUDE.md" "TODO.md" "scripts/seed-demo.ts" ".claude")
for file in "${FORBIDDEN_FILES[@]}"; do
    if git status --short | grep -q "$file"; then
        echo -e "${RED}Error: Forbidden file detected: $file${NC}"
        git checkout public-release -- . 2>/dev/null || true
        git checkout master
        exit 1
    fi
done

# 10. Final check for Claude in diff
if git diff --cached | grep -i claude; then
    echo -e "${RED}Error: Claude reference found in diff${NC}"
    git checkout public-release -- . 2>/dev/null || true
    git checkout master
    exit 1
fi

echo -e "${GREEN}✓ All checks passed${NC}"
echo ""
echo -e "${YELLOW}Review the changes above, then run:${NC}"
echo "  git add -A"
echo "  git commit -S --author=\"Matthieu MALVACHE <matthieu@root.cloud>\" -m \"feat: Your message\""
echo "  git push github public-release:main"
echo "  git checkout master"
