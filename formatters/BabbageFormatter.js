const decimal = require('decimal');
const Formatter = require('./Formatter');

/**
 * Format data which is structured like the old Firefox Hardware Report data.
 *
 * This was previously done by a project named workshop a.k.a. fhwr-unflattener.
 * https://github.com/mozilla/workshop
 *
 * Although we can format this type of data, we may not want to advertise this
 * fact. The configuration file is much more complex. The Quantum format is much
 * easier to work with.
 */
module.exports = class extends Formatter {
    async getSummary() {
        this.apiVersion = '1.0.0';
        this.defaultCategory = 'default';
        this.defaultPopulation = 'default';
        this.valueMultiplier = 100;

        const summary = {};

        const unsortedDates = new Set(this.rawData.map(entry => entry.date));
        const sortedDates = Array.from(unsortedDates).sort().reverse();

        summary.title = this.config.options.title;
        summary.description = this.config.options.description;
        summary.categories = [this.defaultCategory];
        summary.metrics = Object.keys(this.config.options.metrics);

        if (this.config.options.summaryMetrics) {
            summary.summaryMetrics = this.config.options.summaryMetrics;
        }

        summary.dates = sortedDates;

        if (this.config.options.dashboard && this.config.options.dashboard.sectioned) {
            summary.sections = this.config.options.dashboard.sections;
        }

        summary.apiVersion = this.apiVersion;

        return summary;
    }

    async getMetric(categoryName, metricName) {
        const metric = {};

        const metricConfig = this.config.options.metrics[metricName];
        const data = { populations: {} };

        const fieldsRegex = new RegExp(metricConfig.patterns.fields);
        this.rawData.forEach(entry => {
            const matchingFields = Object.keys(entry).filter(fieldName => {
                return fieldsRegex.test(fieldName);
            });

            if (matchingFields.length === 1) {
                data.populations[this.defaultPopulation] = data.populations[this.defaultPopulation] || [];
                this.pushSingleDataPoint(
                    data.populations[this.defaultPopulation],
                    entry,
                    matchingFields[0],
                )
            } else if (matchingFields.length > 1) {
                if (!metricConfig.patterns.populations) {
                    throw new Error(`No population pattern specified for metric "${metricName}" in dataset "${this.datasetName}"`);
                }

                this.pushMultiplePopulations(
                    data.populations,
                    metricConfig,
                    entry,
                    matchingFields,
                    metricConfig.patterns.populations,
                )
            }
        });

        const annotations = this.getAnnotations(categoryName, metricName);

        metric.title = metricConfig.title;
        metric.description = metricConfig.description;
        metric.type = metricConfig.type;

        if (metricConfig.axes) {
            metric.axes = metricConfig.axes;
        }

        metric.data = data;

        if (annotations) {
            metric.annotations = annotations;
        }

        metric.apiVersion = this.apiVersion;

        return metric;
    }

    pushSingleDataPoint(arr, entry, field) {
        const value = decimal(
            entry[field]
        ).mul(this.valueMultiplier).toNumber();

        arr.push({
            x: entry.date,
            y: value,
        });
    }

    pushMultiplePopulations(obj, metricConfig, entry, matchingFields, populationsPattern) {
        let createdAnyGroups = false;
        let groupTotals = {};

        matchingFields.forEach(fieldName => {
            const fieldValue = entry[fieldName];
            const populationsRegex = new RegExp(populationsPattern);

            // This isn't really documented anywhere (except here I guess) but
            // the populations regex should always contain exactly one group
            // which represents the population name.
            //
            // In other words, we don't care about the whole match. Just the
            // first group.
            const rawPopulationName = fieldName.match(populationsRegex)[1];

            const populationName = this.getPopulationName(
                metricConfig,
                rawPopulationName,
            );

            const replacementGroup = this.getReplacementGroup(metricConfig, rawPopulationName);

            if (replacementGroup) {
                createdAnyGroups = true;

                if (groupTotals[replacementGroup.name]) {
                    groupTotals[replacementGroup.name] = decimal(
                        groupTotals[replacementGroup.name]
                    ).add(fieldValue).toNumber();
                } else {
                    groupTotals[replacementGroup.name] = fieldValue;
                }
            } else if (!this.populationIsExcluded(metricConfig, rawPopulationName)) {
                const value = decimal(
                    fieldValue
                ).mul(this.valueMultiplier).toNumber();

                obj[populationName] = obj[populationName] || [];
                obj[populationName].push({
                    x: entry.date,
                    y: value,
                });
            }
        });

        if (createdAnyGroups) {
            Object.keys(groupTotals).forEach(groupName => {
                const value = decimal(
                    groupTotals[groupName]
                ).mul(this.valueMultiplier).toNumber();

                obj[groupName] = obj[groupName] || [];
                obj[groupName].push({
                    x: entry.date,
                    y: value,
                });
            });
        }
    }

    getPopulationName(metricConfig, rawPopulationName) {
        if (!metricConfig.populationModifications) return rawPopulationName;

        let populationName = rawPopulationName;

        if (metricConfig.populationModifications.renames) {
            const rename = metricConfig.populationModifications.renames.find(r => {
                return r.from === rawPopulationName;
            });

            if (rename) {
                populationName = rename.to;
            }
        } else if (metricConfig.populationModifications.append) {
            const append = metricConfig.populationModifications.append;
            const appendRegex = new RegExp(append.matchPattern);
            if (appendRegex.test(rawPopulationName)) {
                populationName = rawPopulationName + append.value;
            }
        }

        return populationName;
    }

    getReplacementGroup(metricConfig, rawPopulationName) {
        if (!metricConfig.populationModifications) return;
        if (!metricConfig.populationModifications.replacementGroups) return;

        return metricConfig.populationModifications.replacementGroups.find(rg => {
            const memberRegex = new RegExp(rg.memberPattern);
            return memberRegex.test(rawPopulationName);
        });
    }

    populationIsExcluded(metricConfig, rawPopulationName) {
        if (!metricConfig.populationModifications) return false;
        if (!metricConfig.populationModifications.exclusions) return false;

        return metricConfig.populationModifications.exclusions.includes(
            rawPopulationName
        );
    }
}
