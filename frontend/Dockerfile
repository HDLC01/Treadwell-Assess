# Next.js standalone build (web service).
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# next.config bakes rewrites() at build time, so the api URL must be set HERE
# (compose's runtime env is ignored for the rewrite). Defaults to the compose service.
ARG API_INTERNAL_URL=http://api:8897
ENV API_INTERNAL_URL=${API_INTERNAL_URL}
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
