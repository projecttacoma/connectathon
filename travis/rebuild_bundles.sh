#!/bin/bash

tooling_jar=./travis/tooling/tooling-1.0.4-SNAPSHOT-jar-with-dependencies.jar
rebuild_log=./travis/tooling/rebuildRun.log

# Remove EXM165 because it is unfinished
rm ./fhir4/input/resources/measure/measure-EXM165_FHIR4-8.5.000.json
rm ./fhir4/input/pagecontent/cql/EXM165_FHIR4-8.5.000.cql

java -jar $tooling_jar -RefreshIG -ip="./fhir4/" -iv=fhir4 -t -d -p -v 2>&1 -fs http://localhost:8080/cqf-ruler-r4/fhir | tee $rebuild_log

if grep -q '^0 Measures failed refresh' $rebuild_log && grep -q '^0 Measures refreshed, but not bundled' $rebuild_log; then
  echo "Bundle rebuild appears to be successful"
else
  echo "Bundle rebuild appears to have failed"
  exit 1
fi