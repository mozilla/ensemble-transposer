ensemble-transposer fetches raw data from Mozilla's data engineers, adds
metadata to it, and makes it available over various API endpoints.
[Ensemble](https://github.com/mozilla/ensemble) fetches the data from these
endpoints to generate data dashboards.

ensemble-transposer can easily ingest and process data that follows ([this
format](http://fhwr-unflattener.herokuapp.com/)).

## API

### /datasets/[datasetName]

For example: */datasets/user-activity*

A summary of the given dataset, including a list of all metric names, a list of
all categories, and more.

### /dataset/[datasetName]/[categoryName]/[metricName]

For example: */datasets/user-activity/Italy/YAU*

The data and metadata for the given metric in the given category. Includes a
title, a description, chart configuration options, and more.

## Development

### Running

#### For development

1. Install [Docker CE](https://docs.docker.com/install/)
2. Run `npm run dev`

Any of the environment variables in *.env* can be overridden. For example:
`PORT=1234 npm run dev`

If docker-compose did not shut down properly the last time it was used, the
development server may not work. To resolve this, run `npm run stopdev` and then
run `npm run dev` again.

#### In production

Run the Docker container and a Redis server side-by-side. Any of the environment
variables in *.env* can be overridden and most should be.

### Testing

Run `npm test`

### Notes

#### Running redis-cli

To connect to the redis server of the Docker container, run `npm run redis-cli`.

#### Versioning

To adhere to [Dockerflow](https://github.com/mozilla-services/Dockerflow), we
maintain a version number for this project. We try to update it when we deploy
new code. The version number is specified in package.json.

The number looks like a semantic version number, but [semver isn't suitable for
applications](https://softwareengineering.stackexchange.com/a/255201). We
instead follow this basic guideline: the first number is incremented for major
changes, the second number is incremented for medium changes, and the third
number is incremented for small changes.

#### How this works

A little more about how this works:

ensemble-transposer ingests raw data from Mozilla's data engineers. It then uses
the transpose script to reformat the data (so that it is keyed by metric rather
than keyed by date) and add metadata like chart descriptions. The result is a
single big JSON file which includes all data for all metrics in all categories.
We call this the "transposed data."

The transposed data is cached locally using Redis. The various endpoints then
pick and choose from that file, serving up only the content that is relevant.

We don't strictly need to generate and store one big transposed file for each
dataset. They aren't even served. They function only as intermediate data stores
from which the actual endpoints can pick and choose. Each endpoint could very
well process and format its own data directly. Perhaps that will be done some
day. But this approach was easiest to implement for now given that Ensemble
*did* at one point ingest the big, transposed data file wholesale. (Plus, it
allows us to serve the single, big transposed file down the road if we ever want
to.)
