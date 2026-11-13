FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
EXPOSE 5000
# Create/upgrade the tables, then start the API
CMD ["sh", "-c", "npm run migrate && npm start"]