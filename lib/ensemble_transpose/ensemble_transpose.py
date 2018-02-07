import json
import urllib
import os

from urllib.request import urlopen

# https://stackoverflow.com/a/15713991/4297741
def _is_url(str):
    return urllib.parse.urlparse(str).scheme != ""


def transpose(manifest_filename):
    manifest_data = json.load(open(manifest_filename))
    extra_metadata = manifest_data['extra_metadata']
    source = manifest_data['source']
    charts = {}
    populations = {}

    if _is_url(source):
        source_data = json.loads(urlopen(source).read())
    else:
        source_data = json.load(open(source))

    def _find_section(metric_name):
        for sm in extra_metadata["sections"]:
            if metric_name in sm["charts"]:
                return get_key(sm["title"])

        return ''

    def _get_human_readable_title(metric_name):
        if metric_name in extra_metadata["chart_titles"]:
            return extra_metadata["chart_titles"][metric_name]
        else:
            return metric_name

    def _get_description(metric_name):
        if metric_name in extra_metadata["chart_descriptions"]:
            return extra_metadata["chart_descriptions"][metric_name]

    def _add_population(population_name, metric_name, entry):
        if population_name not in populations[metric_name]:
            populations[metric_name][population_name] = Population(population_name)
            charts[metric_name].add_population(populations[metric_name][population_name])

        if type(entry["metrics"][metric_name]) is list:
            data_point = entry["metrics"][metric_name][population_name]
        else:
            data_point = entry["metrics"][metric_name]

        if isinstance(data_point, float):
            data_point *= 100

        new_point = (entry["date"], data_point)
        populations[metric_name][population_name].add_point(new_point)


    report = Report(extra_metadata['title'],
                    extra_metadata['description'],
                    extra_metadata['sections'])

    for entry in source_data['data']:
        for metric_name in entry["metrics"]:

            if metric_name not in charts:
                units = None
                if "units" in extra_metadata:
                    units = extra_metadata["units"]

                section = _find_section(metric_name)
                title = _get_human_readable_title(metric_name)
                description = _get_description(metric_name)
                charts[metric_name] = Chart(title, description, section, units)
                report.add_chart(charts[metric_name])

            if metric_name not in populations:
                populations[metric_name] = {}

            if type(entry["metrics"][metric_name]) is list:
                for population_name in entry["metrics"][metric_name]:
                    _add_population(population_name, metric_name, entry)
            else:
                _add_population("default", metric_name, entry)

    return report.render_json()


def get_key(title):
    return title.replace(' ', '').lower()


def _is_dict_w_strings(value, expected_keys):
    """
    Returns True if value is a dictionary containing exactly the set of
    expected keys, and all string values, False otherwise.
    """
    if not isinstance(value, dict):
        return False
    if len(value) != len(expected_keys):
        return False
    for key in expected_keys:
        if key not in value:
            return False
    for v in value.values():
        if not isinstance(v, str):
            return False
    return True


def _is_point(value):
    """
    Returns True if value is a 2-tuple, False otherwise.
    """
    if not isinstance(value, tuple):
        return False
    if len(value) != 2:
        return False
    return True


class Population(object):
    """
    Data accumulator and JSON renderer for a population
    """
    def __init__(self, name):
        self.name = name
        self.data = []

    def add_point(self, point):
        """
        Accepts a single 2-tuple and appends it to the chart's set of data
        points. Raises TypeError if point is not a 2-tuple.
        """
        if not _is_point(point):
            raise TypeError("'point' must be a 2-tuple")
        self.data.append(point)

    def get_name(self):
        return self.name

    def render_json(self):
        """
        Returns an Ensemble-formatted JSON string rendering of the population
        data.
        """
        output = []
        for d in self.data:
            output.append({"x": d[0], "y": d[1]})
        return output


class Chart(object):
    """
    Data accumulator and JSON renderer for Ensemble's 'chart' entity.
    """
    def __init__(self, title="", desc="", section="", units=None, labels=None):
        """
        Raises TypeError when any arguments are of the wrong type or format.
        """
        args = locals()
        for arg in ["title", "section"]:
            if not isinstance(args[arg], str):
                err_msg = "Argument '%s' must be a string" % arg
                raise TypeError(err_msg)
        self.title = title
        self.desc = desc
        self.section = section
        if units is not None:
            self.set_units(units)
        else:
            self.units = None
        if labels is not None:
            self.set_labels(labels)
        else:
            self.labels = None
        self.populations = []

    def set_units(self, units):
        """
        Raises TypeError if units is not a dict with an "x" or "y" key (or both)
        and strings as values.
        """
        if (not _is_dict_w_strings(units, ["x", "y"]) and
            not _is_dict_w_strings(units, ["x"]) and
            not _is_dict_w_strings(units, ["y"])):
            err_msg = "'set_units' only accepts dicts of format " + \
                      "`{'x': <string_value>, 'y': <string_value>}`"
            raise TypeError(err_msg)
        self.units = units

    def set_labels(self, labels):
        """
        Raises TypeError if labels is not a dict w 'x', 'y' as keys and string
        values.
        """
        if not _is_dict_w_strings(labels, ["x", "y"]):
            err_msg = "'set_labels' only accepts dicts of format " + \
                      "`{'x': <string_value>, 'y': <string_value>}`"
            raise TypeError(err_msg)
        self.labels = labels

    def add_population(self, population):
        """
        Add a population to this chart.
        """
        self.populations.append(population)

    def render_json(self):
        """
        Returns an Ensemble-formatted JSON string rendering of the chart data.
        """
        output = {}
        output["title"] = self.title
        if self.desc:
            output["description"] = self.desc
        if self.section:
            output["section"] = self.section
        if self.units:
            output["units"] = self.units
        if self.labels:
            output["labels"] = self.labels
        populations = {}
        for pop in self.populations:
            populations[pop.get_name()] = pop.render_json()
        output["populations"] = populations
        return output


class Report(object):
    """
    Data accumulator and JSON renderer for Ensemble's 'report' entity, a
    collection of charts.
    """
    def __init__(self, title="", desc="", section_metadata=None):
        """
        Raises TypeError when any arguments are of the wrong type or format.
        """
        args = locals()
        for arg in ["title", "desc"]:
            if not isinstance(args[arg], str):
                err_msg = "Argument '%s' must be a string" % arg
                raise TypeError(err_msg)
        self.title = title
        self.desc = desc
        self.ensemble_version = '0.0.2'
        self.sections = []
        self.set_sections(section_metadata)
        self.charts = []

    def add_section(self, section):
        """
        Appends specified section to the sections list. Raises TypeError if
        section is not a dict w 'key' and 'title' keys and string
        values. Raises ValueError if a section with the specified 'key' value
        already exists.
        """
        if not _is_dict_w_strings(section, ["key", "title"]):
            err_msg = "'set_sections' only accepts dicts of format " + \
                      "`{'key': <string_value>, 'title': <string_value>}`"
            raise TypeError(err_msg)
        this_key = section["key"]
        for existing in self.sections:
            # This is a nested loop when called from 'set_sections', but I'm
            # guessing there will never be enough sections for this to be much
            # of a problem.
            if existing["key"] == this_key:
                err_msg = ("Section with 'key' value of '%s' already exists" %
                           this_key)
                raise ValueError(err_msg)
        self.sections.append(section)

    def set_sections(self, section_metadata):
        for sm in section_metadata:
            key = get_key(sm['title'])
            self.add_section({"key": key, "title": sm['title']})

    def add_chart(self, chart):
        """
        Appends provided chart object to this report's charts list. Raises
        TypeError if the argument is not an instance of the Chart class.
        """
        if not isinstance(chart, Chart):
            raise TypeError("'chart' must be an instance of the Chart class.")
        self.charts.append(chart)

    def render_json(self):
        """
        Returns an Ensemble-formatted JSON string rendering of the report and
        all of its charts.
        """
        output = {}
        output["title"] = self.title
        output["version"] = self.ensemble_version

        if self.desc:
            output["description"] = self.desc

        if self.sections:
            output["sections"] = self.sections

        charts = []
        for chart in self.charts:
            charts.append(chart.render_json())
        output["charts"] = charts

        return output
