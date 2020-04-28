
function findCorrespondingGroup(referenceGroup, report) {
  return report.group.find((group) => {
    return referenceGroup.id == group.id
  });
}

function findCorrespondingPopulation(referencePopulation, group) {
  return group.population.find((population) => {
    return referencePopulation.code.coding[0].code == population.code.coding[0].code
  });
}

function grabReferencedResource(reference, report) {
  let id = reference.replace('#', '');
  return report.contained.find((resource) => { return resource.id == id });
}

function addBadPatientEntry(badPatientsList, patientName, issueMessage) {
  let badPatient = badPatientsList.find((badPatient) => badPatient.patientName == patientName );
  if (!badPatient) {
    badPatient = { patientName: patientName, issues: [] };
    badPatientsList.push(badPatient);
  }

  badPatient.issues.push(issueMessage);
}


function compareMeasureReports(referenceReport, report) {
  let badPatientsList = []

  console.log(`Comparing reports for ${referenceReport.measure}`);

  // iterate groups in referenceReport
  referenceReport.group.forEach(referenceGroup => {

    console.log(`  Comparing group: ${referenceGroup.id}`)
    // find corresponding group in report
    let group = findCorrespondingGroup(referenceGroup, report);

    // iterate populations
    referenceGroup.population.forEach(referencePopulation => {

      console.log(`    Comparing population: ${referencePopulation.code.coding[0].display}`)
      // find corresponding population
      let population = findCorrespondingPopulation(referencePopulation, group);

      // grab lists of patients
      let referenceList = grabReferencedResource(referencePopulation.subjectResults.reference, referenceReport);
      let list = grabReferencedResource(population.subjectResults.reference, report);

      // Turn into list of patient names from reference report, default to [] if list is empty/nonexistent
      let referencePatientNames = [];
      if (referenceList.entry) {
        referencePatientNames = referenceList.entry.map((entry) => { return entry.item.display; });
      }

      // Turn into list of patient names from calculated report. default to [] if list is empty/nonexistent
      let patientNames = [];
      if (list.entry) {
        patientNames = list.entry.map((entry) => { return entry.item.display; });
      }

      // compare lists
      let missingPatients = referencePatientNames.filter((patientName) => { return !patientNames.includes(patientName) });
      let unexpectedPatients = patientNames.filter((patientName) => { return !referencePatientNames.includes(patientName) });

      console.log(`      Expected ${referencePatientNames.length} - Actual ${patientNames.length}`);
      missingPatients.forEach(patientName => {
        console.log(`        MISSING    ${patientName}`);
        addBadPatientEntry(badPatientsList, patientName, `Missing from ${referenceGroup.id} - ${referencePopulation.code.coding[0].display}`)
      });
      unexpectedPatients.forEach(patientName => {
        console.log(`        UNEXPECTED ${patientName}`);
        addBadPatientEntry(badPatientsList, patientName, `Unexpected in ${referenceGroup.id} - ${referencePopulation.code.coding[0].display}`)
      });
      // build list of patients and their membership as we do this
    });
  });

  // return list of patients
  return badPatientsList;
}

module.exports.compareMeasureReports = compareMeasureReports;