FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN rm -f package-lock.json && npm install

COPY . .

# NEXT_PUBLIC_ vars are baked in at build time
ENV NEXT_PUBLIC_APP_URL=https://socialmediadost.com
ENV NEXT_PUBLIC_APP_NAME="Social Media Dost"
ENV NODE_ENV=production

RUN npx next build

EXPOSE 3000
ENV PORT=3000

CMD ["npx", "next", "start"]
