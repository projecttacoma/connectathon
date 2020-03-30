#!/bin/bash

cd fhir-patient-generator
git checkout ci-tool-makefile-param
make all all-r4 CI_TOOL=TRUE

# Use make commands to test measures and/or
# compare calculation results against the
# existing patient sets.
