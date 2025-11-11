# Use official Playwright image with browsers pre-installed
FROM mcr.microsoft.com/playwright:focal

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the function code
COPY . .

# Expose the Cloud Function port
ENV PORT=8080

# Start the function using functions-framework
RUN npm install -g @google-cloud/functions-framework

CMD ["functions-framework", "--target=scrapeZoomTranscript", "--signature-type=http", "--port=8080"]
