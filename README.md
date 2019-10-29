ensemble-transposer re-formats existing data so that it can be used by the
[Firefox Public Data Report](https://data.firefox.com).

Mozilla already publishes raw data: numbers and identifiers. That's great, but
it can be difficult to work with. ensemble-transposer takes that raw data,
organizes it, adds useful information like explanations, and generates a series
of files that are much easier for developers to work with.
[Ensemble](https://github.com/mozilla/ensemble), the platform that powers the
Firefox Public Data Report, uses this improved and re-formatted data to build
dashboards.

Other applications are also welcome to use the data that ensemble-transposer
outputs. See the [API documentation](#API) for more information.

ensemble-transposer can easily enhance any data that adheres to [this
format](https://public-data.telemetry.mozilla.org/prod/usage_report_data/v1/master/fxhealth.json).
It can also process Redash dashboards (see this [example configuration
file](docs/example-redash-config.json)). Let us know if you have any questions
or if you have a dataset that you would like us to spruce up.

## API

Re-formatted data is currently hosted under the data.firefox.com domain, but you
are also welcome to run ensemble-transposer yourself and host the re-formatted
data elsewhere.

* **Valid `platform` values:** *desktop*
* **Valid `datasetName` values:** *hardware*, *user-activity*, *usage-behavior*
* **Valid `categoryName` values:** Listed in the output of the
  */datasets/[platform]/[datasetName]* endpoint
* **Valid `metricName` values:** Listed in the output of the
  */datasets/[platform]/[datasetName]* endpoint

### /datasets/[platform]/[datasetName]/index.json

For example: https://data.firefox.com/datasets/desktop/user-activity/index.json

A summary of the given dataset. For example, this includes a description of the
dataset and a list of all metrics within it.

### /datasets/[platform]/[datasetName]/[categoryName]/[metricName]/index.json

For example: https://data.firefox.com/datasets/desktop/user-activity/Italy/YAU/index.json

Everything you need to know about a given metric in a given category. For
example, this includes a title, a description, and a set of suggested axis
labels.

## Development

### Setup

1. Install [Docker](https://docs.docker.com/install/)
2. Create a new [Amazon S3](https://aws.amazon.com/s3/) bucket
3. Copy *.env-dist* to *.env* and provide values for all environment variables

### Inspecting output

Run `make start` and inspect that data that is uploaded to S3.

### Testing

Run `make test` to lint code and run standard tests.

Run `make compare` to compare the data in your S3 bucket to the data in the
production S3 bucket. This can be useful when upgrading packages or refactoring
code, for example.

## Deployment

This project is meant to be run as a cloud task, like a Lambda function or
Google Cloud Function. The main function is specified as the value of `main` in
*package.json*. Most services read this value and do the right thing. If not,
you may need to manually point your service to that function.

Before triggering the function, be sure to create an [Amazon
S3](https://aws.amazon.com/s3/) bucket and set the following environment
variables:

* `AWS_BUCKET_NAME`
* `AWS_REGION`
* `AWS_ACCESS_KEY_ID`
* `AWS_SECRET_ACCESS_KEY`

## Notes

### Versioning

We maintain a version number for this project in *package.json*. It should be
incremented whenever new code is pushed.

The number looks like a semantic version number, but [semver isn't meant for
applications](https://softwareengineering.stackexchange.com/a/255201). We
instead follow these basic guidelines: the first number is incremented for major
changes, the second number is incremented for medium-sized changes, and the
third number is incremented for small changes.
