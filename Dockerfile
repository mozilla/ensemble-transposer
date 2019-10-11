FROM node:8.16.2

WORKDIR /app

# Install node requirements and clean up unneeded cache data
COPY package*.json ./
RUN npm install && \
    npm cache clear --force && \
    rm -rf ~app/.node-gyp

# Copy all other needed files into the image
#
# NB: Docker copies the contents of directories, not the directories themselves,
# to the specified target. That's why we need to name target directories.
COPY config ./config
COPY tests ./tests
COPY transpose ./transpose
COPY .eslintignore .
COPY .eslintrc.js .
COPY start.js .

CMD ["npm", "start"]
