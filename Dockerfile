# ── Build stage ────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

# ── Runtime stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled output
COPY --from=builder /app/dist ./dist

# Copy default templates (can be overridden by a mounted volume)
COPY templates/ ./templates/

# Copy skills
COPY skills/ ./skills/

# Railway / other platforms inject PORT at runtime
ENV PORT=3000
ENV TEMPLATES_DIR=/app/templates
ENV SKILLS_DIR=/app/skills

EXPOSE 3000

CMD ["node", "dist/index.js"]
