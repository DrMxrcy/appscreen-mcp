# AppScreen MCP server — Streamable HTTP transport
#
# The base image tag MUST match the playwright version resolved by package-lock.json.
# The Playwright image ships browsers under PLAYWRIGHT_BROWSERS_PATH for that exact
# version only; a mismatch makes chromium.launchPersistentContext fail at runtime.
FROM mcr.microsoft.com/playwright:v1.59.1-jammy

LABEL org.opencontainers.image.source="https://github.com/AppSolves/appscreen-mcp"
LABEL description="MCP server driving the AppScreen screenshot generator over Streamable HTTP"

ENV NODE_ENV=production \
    MCP_TRANSPORT=http \
    PORT=3000 \
    HOME=/home/pwuser \
    APPSCREEN_OUTPUT_DIR=/home/pwuser/AppScreenMCP/outputs \
    APPSCREEN_BROWSER_PROFILE_DIR=/home/pwuser/AppScreenMCP/browser-profile

WORKDIR /app

# Install deps first so the layer caches across source edits.
# --include=dev is required because NODE_ENV=production would otherwise drop the
# typescript toolchain that `npm run build` needs. --ignore-scripts skips playwright's
# browser download; the base image already ships the browsers for this exact version.
COPY package.json package-lock.json ./
RUN npm ci --include=dev --ignore-scripts

# Build, then strip the dev toolchain back out of the runtime image.
COPY tsconfig.json ./
COPY src ./src
RUN npm run build \
    && npm prune --omit=dev \
    && npm cache clean --force

# These two must exist in the image: Docker creates a missing named-volume mountpoint
# as root, which the unprivileged runtime user could then not write to.
RUN mkdir -p "$APPSCREEN_OUTPUT_DIR" "$APPSCREEN_BROWSER_PROFILE_DIR" \
    && chown -R pwuser:pwuser /home/pwuser /app

# Chromium sandboxing needs privileges this container does not have; run unprivileged
# instead so a browser escape does not land on root.
USER pwuser

EXPOSE 3000

# /health is unauthenticated by design so the orchestrator can probe it.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
