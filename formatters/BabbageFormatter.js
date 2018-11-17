const decimal = require('decimal');
const Formatter = require('./Formatter');
const QuantumFormatter = require('./QuantumFormatter');

/**
 * Format data which is similar to the data that the old Firefox Hardware Report
 * used. This formatting was previously done by a project called workshop a.k.a.
 * fhwr-unflattener.
 *
 * https://github.com/mozilla/workshop
 *
 * Although we can format Hardware Report-style data, we may not want to
 * advertise this fact. It would be easier for us if people made their data
 * available to ensemble-transposer in the quantum format.

 */
module.exports = class extends Formatter {
    constructor(...args) {
        super(...args);

        this.quantumData = this.modifyPopulations(this.babbageToQuantum(this.rawData));
        if (this.config.options.populationModifications) {
            this.quantumData = this.modifyPopulations(this.quantumData);
        }

        this.quantumFormatter = new QuantumFormatter(this.config, this.quantumData, this.rawAnnotations);
    }

    getSummary() {
        return this.quantumFormatter.getSummary();
    }

    getMetric(categoryName, metricName) {
        return this.quantumFormatter.getMetric(categoryName, metricName);
    }

    babbageToQuantum(rawData) {
        const quantumRawData = { default: [] };

        rawData.forEach((day, index) => {
            const entry = { metrics: {} };
            const fieldNames = Object.keys(day);

            fieldNames.forEach(fieldName => {
                const value = rawData[index][fieldName];

                if (this.config.options.fieldNameModifications) {
                    const fnm = this.config.options.fieldNameModifications.find(e => {
                        return e.from === fieldName;
                    });

                    if (fnm) {
                        fieldName = fnm.to;
                    }
                }

                const split = fieldName.split(/_(.+)/);
                const metricName = split[0];
                const populationName = split[1];

                // Preserve the date property
                if (fieldName === 'date') {
                    entry.date = value;

                // Ignore fields which we don't use
                } else if (this.config.options.ignoredFields.includes(fieldName)) {
                    return;

                // Ignore field groups which we don't use
                } else if (this.config.options.ignoredFieldGroups.includes(metricName)) {
                    return;

                // Use everything else
                } else {
                    entry.metrics[metricName] = entry.metrics[metricName] || {};

                    // Avoid artifacts from floating point arithmetic when multiplying by 100
                    entry.metrics[metricName][populationName] = decimal(value).mul(100).toNumber();
                }
            });

            quantumRawData.default.push(entry);
        });

        return quantumRawData;
    }

    modifyPopulations(quantumRawData) {
        const populationModifications = this.config.options.populationModifications;

        // For each entry in the quantum-formatted data
        quantumRawData.default.forEach(entry => {

            // For each metric NAME in that entry
            Object.keys(entry.metrics).forEach(metricName => {
                if (metricName in populationModifications) {

                    // Process removals
                    if (populationModifications[metricName].removals) {
                        populationModifications[metricName].removals.forEach(populationToBeRemoved => {
                            delete entry.metrics[metricName][populationToBeRemoved];
                        });
                    }

                    // Process renames
                    if (populationModifications[metricName].renames) {
                        populationModifications[metricName].renames.forEach(renameMeta => {
                            if (entry.metrics[metricName][renameMeta.from]) {
                                entry.metrics[metricName][renameMeta.to] = entry.metrics[metricName][renameMeta.from];
                                delete entry.metrics[metricName][renameMeta.from];
                            }
                        });
                    }

                    // Process replacement groups
                    if (populationModifications[metricName].replacementGroups) {
                        populationModifications[metricName].replacementGroups.forEach(rg => {
                            let combinedPopulationsValue = 0;
                            let processedAtLeastOneMember = false;

                            rg.members.forEach(populationToSubsume => {
                                if (populationToSubsume in entry.metrics[metricName]) {
                                    processedAtLeastOneMember = true;
                                    combinedPopulationsValue = decimal(combinedPopulationsValue).add(entry.metrics[metricName][populationToSubsume]).toNumber();
                                    delete entry.metrics[metricName][populationToSubsume];
                                }
                            });

                            if (processedAtLeastOneMember) {
                                entry.metrics[metricName][rg.name] = combinedPopulationsValue;
                            }
                        });
                    } // if (populationModifications[metricName].replacementGroups) {

                    // If there's only one population, make the value of that
                    // population the value of the metric.
                    // https://github.com/mozilla/workshop/issues/10
                    if (typeof entry.metrics[metricName] === 'object' && Object.keys(entry.metrics[metricName]).length === 1) {
                        const value = entry.metrics[metricName][Object.keys(entry.metrics[metricName])[0]];
                        entry.metrics[metricName] = value;
                    }

                } // if (metricName in populationModifications)

            }); // For each metric NAME in that entry

        }); // For each entry

        return quantumRawData;
    }
}
