#!/bin/bash

echo "> Rebuilding Measure Bundles and Loading CQF-Ruler"
if ! ./travis/rebuild_bundles.sh; then
  exit 1
fi

#cd fhir-patient-generator

# Use make commands to test measures and/or
# compare calculation results against the
# existing patient sets.

node ./travis/calculateMeasures.js