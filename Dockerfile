FROM node:24-slim
RUN npm install -g pnpm@10.11.0
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
ENV HOSTNAME="0.0.0.0"
EXPOSE 3000
CMD ["pnpm", "start"]
