FROM ubuntu:16.04

RUN apt-get update && apt-get upgrade -y

RUN apt-get install build-essential -y

RUN apt-get install redis-server -y

RUN apt-get install curl -y

RUN curl -sL https://deb.nodesource.com/setup_10.x -o nodesource_setup.sh

RUN chmod +x nodesource_setup.sh 

RUN ./nodesource_setup.sh

RUN apt-get install -y nodejs

RUN apt-get install -y git-core

EXPOSE 6379

# start redis server in container with redis-server --daemonize yes