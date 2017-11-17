#!/usr/bin/env bash

PYTHONPATH=$PYTHONPATH:lib python3 -c "from ensemble_transpose import transpose; transpose('manifests/firefox-hardware-report.json')"
