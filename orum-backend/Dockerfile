# Stage 1: Build
FROM node:18-alpine as builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .

# Stage 2: Production
FROM node:18-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=builder /usr/src/app/src ./src
COPY --from=builder /usr/src/app/public ./public
COPY --from=builder /usr/src/app/migrate.js ./
COPY --from=builder /usr/src/app/test-login.js ./
COPY --from=builder /usr/src/app/check-bcrypt.js ./
COPY --from=builder /usr/src/app/sync-calls.js ./

EXPOSE 4000
CMD ["npm", "start"]
