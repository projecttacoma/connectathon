const fs = require('fs');
const http = require('http');
const process = require('process')
const measureReportCompare = require('./measureReportCompare');

const PERIOD_START = '2019-01-01';
const PERIOD_END = '2019-12-31';

async function getCQFMeasureList() {
  return new Promise((resolve, reject) => {
    http.get("http://localhost:8080/cqf-ruler-r4/fhir/Measure", (res) => {
      
      if (res.statusCode != 200) {
        reject(`Status code ${res.statusCode} was unexpected when listing measures.`);
        return;
      }

      res.setEncoding('utf8');
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        try {
          const measureSearchBundle = JSON.parse(rawData);

          const measureListing = measureSearchBundle.entry.map((entry) => {
            let cmsId = entry.resource.identifier.find((identifier) => { return identifier.system == "http://hl7.org/fhir/cqi/ecqm/Measure/Identifier/cms" });
            let exmId = "EXM_UNKNOWN";
            if (cmsId) {
              exmId = `EXM_${cmsId.value}`
            }
            return {
              fullUrl: entry.fullUrl,
              id: entry.resource.id,
              exmId: exmId
            };
          });

          resolve(measureListing);
        } catch (e) {
          reject(`Failed to parse result from cqf-ruler: ${e.message}`);
          return;
        }
      });
    });
  });
}

async function getTestMeasureList() {
  let fpgDir = fs.readdirSync('./fhir-patient-generator/')
  let applicableMeasuresDirs = fpgDir.filter((dir) => { return dir.startsWith("EXM_") });
  let measureDirInfo = applicableMeasuresDirs.map((measureDir) => {
    let testDirInfo = {
      exmId: measureDir,
      path: `./fhir-patient-generator/${measureDir}/patients-r4`
    };
    let measureReportFile = fs.readdirSync(testDirInfo.path).find((filename) => { return filename.includes('measure-report.json')});
    if (measureReportFile) {
      testDirInfo.measureReportPath = `${testDirInfo.path}/${measureReportFile}`;
    }
    return testDirInfo;
  });

  return measureDirInfo;
}

async function loadTestDataFolder(testDataFolder) {
  // use data in all subfolders. ex. numerator, denominator, etc.
  let subfolders = fs.readdirSync(testDataFolder, { withFileTypes: true })
    .filter((dir) => { return dir.isDirectory() })
    .map((dir) => { return dir.name })

  let bundleResourceInfos = [];
  for (let subfolder of subfolders) {
    // skip measure-reports folder
    if (subfolder == 'measure-reports') continue;
    let subfolderPath = testDataFolder + '/' + subfolder;
    let patientBundles = fs.readdirSync(subfolderPath)
    for (let patientBundleName of patientBundles) {
      if (!patientBundleName.endsWith(".json")) continue;
      process.stdout.write('.');
      //console.log(`Loading bundle ${subfolderPath}/${patientBundleName}`)
      let newResourceInfo = await loadPatientBundle(`${subfolderPath}/${patientBundleName}`)
      bundleResourceInfos.push(newResourceInfo);
    }
  }
  console.log();
  return bundleResourceInfos;
}

async function loadPatientBundle(patientBundlePath) {
  return new Promise((resolve, reject) => {
    let req = http.request("http://localhost:8080/cqf-ruler-r4/fhir",
      {
        method: 'POST',
        headers: {
          "Content-Type": 'application/json'
        }
      }, (res) => {
        if (res.statusCode != 200) {
          reject(`Status code ${res.statusCode} was unexpected when posting bundle. ${patientBundlePath}`);
          return;
        }

        res.setEncoding('utf8');
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
          let transactionResult = JSON.parse(rawData);
          let resourcesCreated = transactionResult.entry.map((entry) => {
            return entry.response.location.replace("/_history/1", '');
          })
          resolve({
            originalBundle: patientBundlePath,
            resources: resourcesCreated
          });
        });
      });

    let bundleStream = fs.createReadStream(patientBundlePath);
    bundleStream.pipe(req);
  });
}

async function deleteBundleResources(bundleResourceInfos) {
  for (let bundleResourceInfo of bundleResourceInfos) {
    process.stdout.write('.');
    //console.log("Deleting resources from " + bundleResourceInfo.originalBundle)
    await deleteResources(bundleResourceInfo.resources);
  }
  console.log();
}

async function deleteResources(resourcesToDelete) {
  let deleteTransaction = {
    resourceType: 'Bundle',
    id: 'big-delete',
    type: 'transaction',
    entry: resourcesToDelete.map((resource) => {
      return {
        request: {
          method: 'DELETE',
          url: resource
        }
      };
    })
  };

  return new Promise((resolve, reject) => {
    let req = http.request("http://localhost:8080/cqf-ruler-r4/fhir",
      {
        method: 'POST',
        headers: {
          "Content-Type": 'application/json'
        }
      }, (res) => {
        if (res.statusCode != 200) {
          reject(`Status code ${res.statusCode} was unexpected when deleting data.`);
          return;
        } else {
          resolve();
        }
      });
    req.write(JSON.stringify(deleteTransaction));
    req.end();
  });
}

async function getFakeMeasureReport(measureId) {
  return loadReferenceMeasureReport('./travis/exm124-mr.json');
}

async function loadReferenceMeasureReport(measureReportPath) {
  return new Promise((resolve, reject) => {
    fs.readFile(measureReportPath, (err, data) => {
      if (err) reject(err);
      resolve(JSON.parse(data));
    });
  });
}

async function getMeasureReport(measureId) {
  return new Promise((resolve, reject) => {
    let dotTimer;
    console.log(`Executing measure ${measureId}`);
    let req = http.request(`http://localhost:8080/cqf-ruler-r4/fhir/Measure/${measureId}/$evaluate-measure?reportType=patient-list&periodStart=${PERIOD_START}&periodEnd=${PERIOD_END}`,
      {
        method: 'GET',
        timeout: 2400000 //40 minute timeout because this is slow for some measures.
      }, (res) => {
        clearInterval(dotTimer);
        console.log();
        console.timeEnd(`Execute ${measureId}`);
        if (res.statusCode != 200) {
          reject(`Status code ${res.statusCode} was unexpected when posting bundle.`);
          return;
        } else {
          res.setEncoding('utf8');
          let rawData = '';
          res.on('data', (chunk) => { rawData += chunk; });
          res.on('end', () => {
            resolve(JSON.parse(rawData));
          });
        }
      }
    );

    req.on('error', (e) => {
      console.error(e);
      reject(e);
    });
    req.end();
    console.time(`Execute ${measureId}`);
    // Dots are required to keep travis from giving up.
    dotTimer = setInterval(() => { process.stdout.write('.') }, 10000);
  });
}



async function calculateMeasuresAndCompare() {
  // look for an argument on the command line to indicate the only measure to run. i.e. EXM_105
  let onlyMeasureExmId;
  if (process.argv[2]) {
    onlyMeasureExmId = process.argv[2];
    console.log(`Only running ${onlyMeasureExmId}`);
  }

  // grab info on measures in cqf-ruler and measures in test data
  let measureDiffInfo = [];
  let cqfMeasures = await getCQFMeasureList();
  let testPatientMeasures = await getTestMeasureList();

  // if we are testing only one measure check it exists in both test data and cqf-ruler
  if (onlyMeasureExmId &&
    (!cqfMeasures.some((cqfMeasure) => cqfMeasure.exmId == onlyMeasureExmId) ||
    !testPatientMeasures.some((testMeasure) => testMeasure.exmId == onlyMeasureExmId))) {
      throw new Error(`Measure ${onlyMeasureExmId} was not found in cqf-ruler or in test data and was the only measure requested.`)
  }

  // iterate over test data measures
  for (let testPatientMeasure of testPatientMeasures) {
    // skip if this isn't the only one we should run
    if (onlyMeasureExmId && testPatientMeasure.exmId != onlyMeasureExmId) continue;

    // check if there is a MeasureReport to compare to
    if (!testPatientMeasure.measureReportPath) {
      console.log(`No Reference MeasureReport found for ${testPatientMeasure.exmId}`);

      // if we are only runing one measure throw an error if we cannot find the report
      if (onlyMeasureExmId) {
        throw new Error(`Measure ${onlyMeasureExmId} does not have a reference MeasureReport and was the only measure requested.`)
      } else {
        continue;
      }
    }

    let cqfMeasure = cqfMeasures.find((measure) => measure.exmId == testPatientMeasure.exmId)
    if (!cqfMeasure) {
      console.log(`Measure ${testPatientMeasure.exmId} not found in cqf-ruler.`)
    }

    console.log(`Loading test data for ${testPatientMeasure.exmId}`);
    let bundleResourceInfos = await loadTestDataFolder(testPatientMeasure.path);

    let report = await getMeasureReport(cqfMeasure.id)
    let referenceReport = await loadReferenceMeasureReport(testPatientMeasure.measureReportPath);

    let badPatients = measureReportCompare.compareMeasureReports(referenceReport, report)

    measureDiffInfo.push({
      exmId: testPatientMeasure.exmId,
      badPatients: badPatients
    })

    console.log(`Removing test data for ${testPatientMeasure.exmId}`);
    await deleteBundleResources(bundleResourceInfos);
  }

  return measureDiffInfo;
}


calculateMeasuresAndCompare()
  .then((measureDiffInfo) => {
    console.log();
    console.log("--- RESULTS ---");
    console.log();
    let hasDifferences = false;

    measureDiffInfo.forEach((measureDiff) => {
      console.log(`MEASURE ${measureDiff.exmId}`);
      if (measureDiff.badPatients.length > 0) {
        hasDifferences = true;
        measureDiff.badPatients.forEach((patient) => {
          console.log(`|- ${patient.patientName}`);
          patient.issues.forEach((issue) => {
            console.log(`|   ${issue}`)
          });
        });
      } else {
        console.log("  No Issues!");
      }
      console.log();
    });


    if (hasDifferences) {
      process.exit(1);
    }
  })
  .catch((reason) => {
    console.error(reason);
    process.exit(2);
  });