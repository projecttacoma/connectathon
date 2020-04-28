#!/bin/bash

echo "> Cloning FHIR Generated Patients..."
git clone --single-branch --branch measure-reports-regen https://github.com/projecttacoma/fhir-patient-generator.git

echo "> Fetching CQF-tooling JAR"
./travis/download_cqf_tooling.sh

echo "> Setting Up cqf-ruler docker instance"
cd fhir-patient-generator
make .new-cqf-ruler
make .wait-cqf-ruler
