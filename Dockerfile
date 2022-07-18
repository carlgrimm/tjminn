FROM node:lts-alpine
ENV NODE_ENV=production
WORKDIR /usr/src/app
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
# we need a few things to make the barcode extractor work with alpine linux
RUN apk add --no-cache libgcc libstdc++ gcompat 
RUN npm install --production
COPY . .
EXPOSE 3000
RUN chown -R node /usr/src/app
USER node
#run node in strict mode
CMD ["node", "--use_strict", "app.js"]
