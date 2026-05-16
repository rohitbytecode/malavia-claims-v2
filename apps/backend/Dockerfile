FROM node:20-alpine AS builder

WORKDIR /app

# Enable pnpm
RUN corepack enable

COPY package.json pnpm-lock.yaml* ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

FROM node:20-alpine AS runner

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --prod --frozen-lockfile

COPY --from=builder /app/dist ./dist
COPY ecosystem.config.cjs ./

EXPOSE 5000

# Install PM2 globally
RUN npm install -g pm2

CMD ["pm2-runtime", "ecosystem.config.cjs"]
