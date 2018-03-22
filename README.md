ensemble-transposer ingests JSON data that follows a standard format
([example](http://fhwr-unflattener.herokuapp.com/)), adds metadata, and spits
out a JSON file with the data and metadata combined in the format that
[Ensemble](https://github.com/mozilla/ensemble) expects.

## Development

### Install

1. [Install Node and NPM](https://nodejs.org/en/download/)
2. [Install Docker](https://docs.docker.com/install/)
3. [Install Docker Compose](https://docs.docker.com/compose/install/)
1. Run `npm install`

### Run

`docker-compose up`
