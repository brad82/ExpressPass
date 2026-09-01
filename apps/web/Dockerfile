FROM node:24-alpine AS build
WORKDIR /app
ARG VITE_API_BASE_URL
ARG VITE_OIDC_AUTHORITY
ARG VITE_OIDC_CLIENT_ID
ARG VITE_OIDC_REDIRECT_URI
ARG VITE_OIDC_POST_LOGOUT_REDIRECT_URI
ARG VITE_OIDC_SCOPE
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_OIDC_AUTHORITY=$VITE_OIDC_AUTHORITY
ENV VITE_OIDC_CLIENT_ID=$VITE_OIDC_CLIENT_ID
ENV VITE_OIDC_REDIRECT_URI=$VITE_OIDC_REDIRECT_URI
ENV VITE_OIDC_POST_LOGOUT_REDIRECT_URI=$VITE_OIDC_POST_LOGOUT_REDIRECT_URI
ENV VITE_OIDC_SCOPE=$VITE_OIDC_SCOPE
COPY package*.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm install
COPY . .
RUN test -n "$VITE_API_BASE_URL" \
  && test -n "$VITE_OIDC_AUTHORITY" \
  && test -n "$VITE_OIDC_CLIENT_ID" \
  && test -n "$VITE_OIDC_REDIRECT_URI" \
  && test -n "$VITE_OIDC_POST_LOGOUT_REDIRECT_URI" \
  && test -n "$VITE_OIDC_SCOPE"
RUN npm run build -w packages/shared && npm run build -w apps/web

FROM nginx:1.27-alpine
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/.docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
