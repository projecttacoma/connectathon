#!/bin/bash

cd fhir-patient-generator
git checkout ci-param-tool-rebase
make all all-r4 CI_TOOL=true

# Use make commands to test measures and/or
# compare calculation results against the
# existing patient sets.
