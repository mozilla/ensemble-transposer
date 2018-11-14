ensemble-transposer re-formats existing data so that it can be used by the
[Firefox Public Data Report](https://data.firefox.com).

Mozilla already publishes raw data: numbers and identifiers. That's great, but
it can be difficult to work with. ensemble-transposer takes that raw data,
organizes it, adds useful information like explanations, and generates a series
of files that are much easier for developers to work with.
[Ensemble](https://github.com/mozilla/ensemble), the platform that powers the
Firefox Public Data Report, uses this improved and re-formatted data to build
dashboards. Other applications are also welcome to use the data that
ensemble-transposer outputs.

ensemble-transposer can easily enhance any data that adheres to [this
format](https://public-data.telemetry.mozilla.org/prod/usage_report_data/v1/master/fxhealth.json").
Let us know if you have any questions about this format or if you have a dataset
that you would like us to spruce up.

## API

### /datasets/[datasetName]

For example: */datasets/user-activity*

A summary of the given dataset. For example, this includes a description of the
dataset and a list of all metrics within it.

### /dataset/[datasetName]/[categoryName]/[metricName]

For example: */datasets/user-activity/Italy/YAU*

Everything you need to know about a given metric in a given category. For
example, this includes a title, a description, and a set of suggested axis
labels.

## Running

### Development

1. Install [Docker CE](https://docs.docker.com/install/)
2. Install [Node and NPM](https://nodejs.org/en/download/)
3. Run `npm run dev`

Any of the environment variables in *.env* can be overridden. For example:

`PORT=1234 npm run dev`

If docker-compose does not shut down properly, it may not work later. To remedy
this situation, run `npm run stopdev` (setting the `PORT` environment variable
to match the value passed in to `npm run dev` earlier) and then run `npm run
dev` again.

### Production

Run the Docker container. Any of the environment variables in *.env* can be
overridden. Most should be.

## Testing

Run `npm test`

To compare the local API and the production API, run `npm run compare`. This can
be useful when upgrading packages or refactoring code, for example.

## Notes

### Versioning

To adhere to [Dockerflow](https://github.com/mozilla-services/Dockerflow), we
maintain a version number for this project in *package.json*. It should be
incremented whenever new code is pushed.

The number looks like a semantic version number, but [semver isn't meant for
applications](https://softwareengineering.stackexchange.com/a/255201). We
instead follow these basic guidelines: the first number is incremented for major
changes, the second number is incremented for medium-sized changes, and the
third number is incremented for small changes.
