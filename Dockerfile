FROM node:8

ENV NPM_CONFIG_LOGLEVEL=info \
    PORT=8000

EXPOSE $PORT

WORKDIR /app
COPY package*.json /app/
RUN npm install

COPY . /app/
