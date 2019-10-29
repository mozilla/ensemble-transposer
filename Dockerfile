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
COPY src ./src
COPY config ./config
COPY .eslintignore .eslintrc.js ./

CMD ["npm", "start"]
