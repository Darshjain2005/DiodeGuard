FROM node:20-alpine

WORKDIR /app

# Copy package definition files
COPY package*.json ./

# Install node dependencies
RUN npm install

# Copy frontend source code
COPY . .

EXPOSE 5173

CMD ["npx", "vite", "--host"]
