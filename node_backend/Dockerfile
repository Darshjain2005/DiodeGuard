FROM node:20-alpine

WORKDIR /app

# Copy package definition files
COPY package*.json ./

# Install node dependencies
RUN npm install

# Copy application source code
COPY . .

EXPOSE 5000

CMD ["node", "server.js"]
