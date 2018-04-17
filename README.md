ensemble-transposer fetches raw data which has been generated by Mozilla data
engineers, adds metadata to it, and serves JSON with the data and metadata
combined. A related project, [Ensemble](https://github.com/mozilla/ensemble),
fetches this JSON and uses it to render dashboards.

The JSON that ensemble-transposer ingests follows a standard format
([example](http://fhwr-unflattener.herokuapp.com/)). The JSON that
ensemble-transposer generates and serves also follows a standard format
([example](http://ensemble-transposer.herokuapp.com/hardware/)). Because of
this, we can easily generate an Ensemble dashboard for any dataset that has been
[formatted properly](http://fhwr-unflattener.herokuapp.com/).

## Development

### Install

1. [Install Node and NPM](https://nodejs.org/en/download/)
2. [Install Docker](https://docs.docker.com/install/)
3. [Install Docker Compose](https://docs.docker.com/compose/install/)
1. Run `npm install`

### Run

Run `docker-compose up`

### Test

Run `yarn validate` (**NB:** not `yarn test`; although `yarn test` does run some
tests, `yarn validate` does additional quality assurance like linting JavaScript
and checking for security vulnerabilities)
