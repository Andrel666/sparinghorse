# The new UI as its own container: build with Node, serve with nginx, forward the API to the
# Sparing Horse container (SH_API_UPSTREAM, default sparinghorse:8770).
FROM node:20.18.1-alpine AS build
WORKDIR /ui
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM nginx:1.27.3-alpine
ENV SH_API_UPSTREAM=sparinghorse:8770
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /ui/dist /usr/share/nginx/html
EXPOSE 80
